"""Turn the CSV archive in docs/Data into small JSON files the static site
(and outside consumers) can fetch directly.

Run after the spider:  python build_site_data.py

It is idempotent — a full rebuild from the CSVs every time — so it is safe to
run even on days the scrape was skipped (nothing changes). Output lives under
docs/api/:

  meta.json            archive-wide stats (feeds README badges + the site)
  symbols.json         every symbol ever seen, sorted
  latest.json          the most recent session, normalized
  history/<SYMBOL>.json per-symbol time series (compact columnar form)
  recap/latest.json    headline numbers for the latest session

The ShareSansar CSV header drifted over time (newer files inserted LTP,
"Close - LTP" and "Close - LTP %"), so everything maps columns *by name*, never
by position, and falls back to Close when LTP is absent.
"""

import csv
import json
import os
import sys
from datetime import datetime, timezone

DATA_DIR = os.path.join("docs", "Data")
API_DIR = os.path.join("docs", "api")
HISTORY_DIR = os.path.join(API_DIR, "history")
RECAP_DIR = os.path.join(API_DIR, "recap")

# Canonical field  ->  the CSV header(s) it can come from (first match wins).
FIELD_SOURCES = {
    "open": ["Open"],
    "high": ["High"],
    "low": ["Low"],
    "close": ["Close"],
    "ltp": ["LTP", "Close"],          # old files have no LTP → use Close
    "vwap": ["VWAP"],
    "vol": ["Vol"],
    "prevClose": ["Prev. Close"],
    "turnover": ["Turnover"],
    "trans": ["Trans."],
    "diffPct": ["Diff %"],
    "high52": ["52 Weeks High"],
    "low52": ["52 Weeks Low"],
}

# Compact columns for the per-symbol history files.
HISTORY_COLS = ["d", "o", "h", "l", "c", "ltp", "vwap", "vol", "to", "dp"]
HISTORY_FIELD_BY_COL = {
    "o": "open", "h": "high", "l": "low", "c": "close", "ltp": "ltp",
    "vwap": "vwap", "vol": "vol", "to": "turnover", "dp": "diffPct",
}


def num(raw):
    """Parse a CSV cell like '1,514,017.00' or '-1.68' or '' into a float/None."""
    if raw is None:
        return None
    s = str(raw).strip().replace(",", "").replace("%", "")
    if s in ("", "-"):
        return None
    try:
        return float(s)
    except ValueError:
        return None


def compact(value):
    """Round for JSON and drop the trailing .0 on whole numbers to save bytes."""
    if value is None:
        return None
    r = round(value, 2)
    return int(r) if r == int(r) else r


def list_csv_dates():
    """All YYYY_MM_DD keys present in docs/Data, oldest first."""
    files = [f for f in os.listdir(DATA_DIR) if f.endswith(".csv")]
    dates = []
    for f in files:
        stem = f[:-4]
        try:
            datetime.strptime(stem, "%Y_%m_%d")
        except ValueError:
            continue  # skip combined_excel etc.
        dates.append(stem)
    return sorted(dates)


def read_session(date_key):
    """Return a list of normalized {symbol, open, ...} dicts for one day."""
    path = os.path.join(DATA_DIR, f"{date_key}.csv")
    rows = []
    with open(path, "r", encoding="utf-8", newline="") as fh:
        reader = csv.DictReader(fh)
        for raw in reader:
            symbol = (raw.get("Symbol") or "").strip()
            if not symbol or symbol.lower() == "symbol":
                continue
            rec = {"symbol": symbol}
            for field, sources in FIELD_SOURCES.items():
                value = None
                for header in sources:
                    if header in raw:
                        value = num(raw[header])
                        if value is not None:
                            break
                rec[field] = compact(value)
            rows.append(rec)
    return rows


def write_json(path, payload):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as fh:
        json.dump(payload, fh, ensure_ascii=False, separators=(",", ":"))
        fh.write("\n")


def iso(date_key):
    return date_key.replace("_", "-")


def build_recap(date_key, rows):
    """Headline numbers for the latest session."""
    movers = [r for r in rows if r.get("diffPct") is not None]
    gainers = sorted(movers, key=lambda r: r["diffPct"], reverse=True)[:5]
    losers = sorted(movers, key=lambda r: r["diffPct"])[:5]

    def slim(r):
        return {"symbol": r["symbol"], "diffPct": r["diffPct"], "ltp": r.get("ltp")}

    with_turnover = [r for r in rows if r.get("turnover") is not None]
    most_active = max(with_turnover, key=lambda r: r["turnover"], default=None)

    advances = sum(1 for r in movers if r["diffPct"] > 0)
    declines = sum(1 for r in movers if r["diffPct"] < 0)
    total_turnover = compact(sum(r["turnover"] for r in with_turnover))

    return {
        "date": iso(date_key),
        "symbols": len(rows),
        "advances": advances,
        "declines": declines,
        "unchanged": sum(1 for r in movers if r["diffPct"] == 0),
        "totalTurnover": total_turnover,
        "totalTransactions": compact(
            sum(r["trans"] for r in rows if r.get("trans") is not None)
        ),
        "topGainers": [slim(r) for r in gainers],
        "topLosers": [slim(r) for r in losers],
        "mostActive": (
            {"symbol": most_active["symbol"], "turnover": most_active["turnover"]}
            if most_active
            else None
        ),
        "headline": headline(advances, declines, gainers, losers, total_turnover),
    }


def fmt_turnover(value):
    """Human Rs string: 3.95B / 12.4M / 4,200 (no external deps)."""
    if value is None:
        return "n/a"
    n = float(value)
    if n >= 1e9:
        return f"Rs {n / 1e9:.2f}B"
    if n >= 1e6:
        return f"Rs {n / 1e6:.2f}M"
    return f"Rs {n:,.0f}"


def headline(advances, declines, gainers, losers, total_turnover):
    """A free, deterministic one-line recap (no LLM)."""
    if advances > declines:
        breadth = f"a green session — {advances} advancers outpaced {declines} decliners"
    elif declines > advances:
        breadth = f"a red session — {declines} decliners outweighed {advances} advancers"
    else:
        breadth = f"a flat session — advancers and decliners tied at {advances}"

    bits = [f"NEPSE had {breadth}"]
    if gainers:
        g = gainers[0]
        bits.append(f"{g['symbol']} led gainers (+{g['diffPct']:.2f}%)")
    if losers:
        l = losers[0]
        bits.append(f"{l['symbol']} led losers ({l['diffPct']:.2f}%)")
    bits.append(f"turnover {fmt_turnover(total_turnover)}")
    return "; ".join(bits) + "."


def main():
    if not os.path.isdir(DATA_DIR):
        print(f"No data directory at {DATA_DIR}; nothing to build.")
        return

    dates = list_csv_dates()
    if not dates:
        print("No dated CSV files found; nothing to build.")
        return

    history = {}        # symbol -> {date_key -> compact row}
    all_symbols = set()
    latest_rows = []

    for date_key in dates:
        rows = read_session(date_key)
        if date_key == dates[-1]:
            latest_rows = rows
        for r in rows:
            sym = r["symbol"]
            all_symbols.add(sym)
            history.setdefault(sym, {})[date_key] = [
                iso(date_key)
                if col == "d"
                else r.get(HISTORY_FIELD_BY_COL[col])
                for col in HISTORY_COLS
            ]

    # --- per-symbol history (compact columnar) ---
    for sym, by_date in history.items():
        ordered = [by_date[d] for d in sorted(by_date)]
        write_json(
            os.path.join(HISTORY_DIR, f"{sym}.json"),
            {"symbol": sym, "cols": HISTORY_COLS, "rows": ordered},
        )

    # --- latest session ---
    write_json(
        os.path.join(API_DIR, "latest.json"),
        {"date": iso(dates[-1]), "count": len(latest_rows), "rows": latest_rows},
    )

    # --- symbols index ---
    symbols_sorted = sorted(all_symbols)
    write_json(os.path.join(API_DIR, "symbols.json"), symbols_sorted)

    # --- recap for the latest day ---
    write_json(os.path.join(RECAP_DIR, "latest.json"), build_recap(dates[-1], latest_rows))

    # --- archive-wide meta (badges + site) ---
    write_json(
        os.path.join(API_DIR, "meta.json"),
        {
            "lastUpdated": iso(dates[-1]),
            "firstDate": iso(dates[0]),
            "tradingDays": len(dates),
            "symbols": len(symbols_sorted),
            "symbolsLatest": len(latest_rows),
            "generatedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        },
    )

    print(
        f"Built docs/api: {len(dates)} sessions, {len(symbols_sorted)} symbols, "
        f"latest {iso(dates[-1])}."
    )


if __name__ == "__main__":
    # --rebuild is accepted for clarity; the default already does a full rebuild.
    if "--help" in sys.argv or "-h" in sys.argv:
        print(__doc__)
    else:
        main()
