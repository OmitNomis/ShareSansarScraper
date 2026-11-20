"""Static, crawlable pages for search engines, built from the same history data
as docs/api/. Called from build_site_data.py on every run.

  docs/chart/index.html            every symbol, with last price and change
  docs/chart/<SYMBOL>/index.html   one page per symbol: title, stats, an inline
                                   SVG price chart and the latest sessions
  docs/sitemap.xml                 regenerated each run, with real lastmod dates

The interactive Chart.js page (stock.html) stays as is; every static page links
to it with ?symbol= so people can zoom and compare.
"""

import html
import json
import os
import re
from urllib.parse import quote
from datetime import date, timedelta

SITE = "https://omitnomis.github.io/ShareSansarScraper/"
DOCS = "docs"
CHART_DIR = os.path.join(DOCS, "chart")

# Static pages that always go in the sitemap: (path, changefreq, priority).
STATIC_PAGES = [
    ("", "daily", "1.0"),
    ("download.html", "daily", "0.9"),
    ("preview.html", "daily", "0.9"),
    ("stock.html", "daily", "0.9"),
    ("chart/", "daily", "0.9"),
    ("about.html", "monthly", "0.5"),
]

RECENT_ROWS = 10      # sessions shown in the table
SVG_POINTS = 250      # about one trading year in the inline chart
NEIGHBOURS = 6        # related symbols linked on each side (alphabetical)


def slug(symbol):
    """Same rule as history_filename / stock.js: '/' and '\\' become '_'."""
    return re.sub(r"[\\/]", "_", symbol)


def page_slug(symbol):
    """URL-safe folder name for a symbol's page ('NICAD 85/86' -> 'NICAD_85_86')."""
    return re.sub(r"[^A-Za-z0-9-]", "_", symbol)


def esc(value):
    return html.escape(str(value), quote=True)


def fmt_price(n):
    return "n/a" if n is None else f"Rs {n:,.2f}"


def fmt_int(n):
    return "n/a" if n is None else f"{n:,.0f}"


def fmt_pct(n):
    return "n/a" if n is None else f"{n:+.2f}%"


def fmt_date(iso_date):
    y, m, d = (int(x) for x in iso_date.split("-"))
    return date(y, m, d).strftime("%b %d, %Y").replace(" 0", " ")


def price_of(row, ci):
    v = row[ci["ltp"]]
    return v if v is not None else row[ci["c"]]


def symbol_stats(rows, cols):
    """Headline numbers for one symbol from its compact history rows."""
    ci = {c: i for i, c in enumerate(cols)}
    priced = [(r[ci["d"]], price_of(r, ci), r) for r in rows if price_of(r, ci) is not None]
    if not priced:
        return None

    last_date, last_price, last_row = priced[-1]
    y, m, d = (int(x) for x in last_date.split("-"))
    year_ago = (date(y, m, d) - timedelta(days=365)).isoformat()

    year_rows = [p for p in priced if p[0] >= year_ago]
    highs = [r[ci["h"]] if r[ci["h"]] is not None else p for _, p, r in year_rows]
    lows = [r[ci["l"]] if r[ci["l"]] is not None else p for _, p, r in year_rows]

    first_year_price = year_rows[0][1] if year_rows else None
    change_1y = (
        (last_price - first_year_price) / first_year_price * 100
        if first_year_price
        else None
    )

    return {
        "lastDate": last_date,
        "lastPrice": last_price,
        "dayPct": last_row[ci["dp"]],
        "high52": max(highs) if highs else None,
        "low52": min(lows) if lows else None,
        "change1y": change_1y,
        "firstDate": priced[0][0],
        "sessions": len(priced),
        "series": [(p[0], p[1]) for p in priced[-SVG_POINTS:]],
        "recent": [r for _, _, r in priced[-RECENT_ROWS:]][::-1],
        "ci": ci,
    }


def svg_chart(symbol, series):
    """Small inline SVG line chart: crawlable, no JS, works without Chart.js."""
    w, h, pad = 640, 220, 10
    values = [v for _, v in series]
    lo, hi = min(values), max(values)
    span = (hi - lo) or 1
    mid = (hi + lo) / 2
    n = len(values)
    step = (w - 2 * pad) / max(n - 1, 1)
    pts = " ".join(
        f"{pad + i * step:.1f},{h - pad - (v - lo) / span * (h - 2 * pad):.1f}"
        for i, v in enumerate(values)
    )
    first_d, last_d = series[0][0], series[-1][0]
    label = (
        f"{symbol} share price from {fmt_date(first_d)} to {fmt_date(last_d)}: "
        f"low {fmt_price(lo)}, high {fmt_price(hi)}, last {fmt_price(values[-1])}"
    )
    # Axis labels are HTML around the SVG, so the text stays crisp and readable
    # while the SVG itself stretches to the container width.
    mid_d = series[n // 2][0]
    top_pct = pad / h * 100
    grid = "".join(
        f'<line x1="0" x2="{w}" y1="{y}" y2="{y}" stroke="currentColor" '
        f'stroke-opacity=".15" stroke-dasharray="4 4" vector-effect="non-scaling-stroke"/>'
        for y in (pad, h / 2, h - pad)
    )
    svg = (
        f'<svg class="static-chart" viewBox="0 0 {w} {h}" role="img" '
        f'aria-label="{esc(label)}" preserveAspectRatio="none">'
        f"<title>{esc(label)}</title>{grid}"
        f'<polyline fill="none" stroke="currentColor" stroke-width="3" '
        f'stroke-linejoin="round" vector-effect="non-scaling-stroke" points="{pts}"/>'
        f"</svg>"
    )
    return (
        '<div class="sc">'
        '<div class="sc-y" aria-hidden="true">'
        f'<span style="top:{top_pct:.2f}%">{fmt_price(hi)}</span>'
        f'<span style="top:50%">{fmt_price(mid)}</span>'
        f'<span style="top:{100 - top_pct:.2f}%">{fmt_price(lo)}</span>'
        "</div>"
        f"{svg}<div></div>"
        '<div class="sc-x" aria-hidden="true">'
        f"<span>{fmt_date(first_d)}</span><span>{fmt_date(mid_d)}</span>"
        f"<span>{fmt_date(last_d)}</span>"
        "</div></div>"
    )


HEAD_ASSETS = """
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Archivo+Black&family=Space+Grotesk:wght@400;500;700&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet" />
    <link rel="stylesheet" href="{root}css/styles.css" />
    <link rel="icon" href="{root}favicon.svg" type="image/svg+xml" />
    <link rel="icon" href="{root}assets/favicon-32.png" sizes="32x32" type="image/png" />
    <link rel="apple-touch-icon" href="{root}assets/apple-touch-icon.png" />
    <link rel="manifest" href="{root}site.webmanifest" />
    <style>
      .sc {{ display:grid; grid-template-columns:auto 1fr; column-gap:.6rem; padding:1rem 1rem .6rem; color:#111; }}
      .sc-y {{ position:relative; min-width:5.5rem; font-family:var(--font-mono); font-size:.75rem; }}
      .sc-y span {{ position:absolute; right:0; transform:translateY(-50%); white-space:nowrap; }}
      .sc-x {{ display:flex; justify-content:space-between; font-family:var(--font-mono); font-size:.75rem; padding-top:.35rem; }}
      .static-chart {{ display:block; width:100%; height:220px; }}
      @media (max-width:480px) {{
        .sc {{ padding:.6rem .5rem .4rem; }}
        .sc-y {{ min-width:4.4rem; font-size:.68rem; }}
        .sc-x {{ font-size:.68rem; }}
        .static-chart {{ height:180px; }}
      }}
      .chart-actions {{ display:flex; flex-wrap:wrap; gap:.75rem; margin-top:1rem; }}
      .sym-links {{ display:flex; flex-wrap:wrap; gap:.5rem; list-style:none; padding:0; }}
      .sym-links a {{ font-family:var(--font-mono); }}
      .sym-index {{ columns: 14rem; column-gap:1.5rem; list-style:none; padding:0; }}
      .sym-index li {{ break-inside:avoid; padding:.2rem 0; font-family:var(--font-mono); }}
      .sym-index a {{ color:var(--ink, #111); font-weight:700; }}
      .stats .stat-num {{ font-size:clamp(1.5rem, 2.6vw, 2.4rem); overflow-wrap:anywhere; }}
      .up {{ color:#0a8a2a; }} .down {{ color:#d1203a; }}
    </style>"""

NAV = """
    <a class="skip-link" href="#main-content">Skip to content</a>
    <header class="topbar">
      <div class="wrap topbar-inner">
        <a class="brand" href="{root}index.html">
          <span class="brand-mark">N</span>
          <span>NEPSE<span class="brand-slash">//</span>ARCHIVE</span>
        </a>
        <button class="nav-toggle" id="nav-toggle" aria-label="Toggle navigation" aria-expanded="false" aria-controls="nav-links"><span></span></button>
        <nav aria-label="Main navigation">
          <ul class="nav-links" id="nav-links">
            <li><a href="{root}index.html">Home</a></li>
            <li><a href="{root}download.html">Download</a></li>
            <li><a href="{root}preview.html">Preview</a></li>
            <li><a href="{root}stock.html" class="active" aria-current="page">Charts</a></li>
            <li><a href="{root}about.html">About</a></li>
          </ul>
        </nav>
      </div>
    </header>"""

FOOTER = """
    <footer class="site-footer">
      <div class="wrap">
        <p>Data sourced from ShareSansar. Unofficial archive, not affiliated.</p>
        <p>Made with <span class="heart" aria-hidden="true">&#10084;</span><span class="sr-only">love</span> by
          <a href="https://github.com/OmitNomis" target="_blank" rel="noopener noreferrer">OmitNomis</a></p>
      </div>
    </footer>
    <script src="{root}js/common.js"></script>"""


def page(root, title, description, canonical, jsonld, body):
    return f"""<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>{esc(title)}</title>
    <meta name="description" content="{esc(description)}" />
    <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1" />
    <link rel="canonical" href="{esc(canonical)}" />
    <meta property="og:site_name" content="NEPSE // Archive" />
    <meta property="og:type" content="website" />
    <meta property="og:title" content="{esc(title)}" />
    <meta property="og:description" content="{esc(description)}" />
    <meta property="og:url" content="{esc(canonical)}" />
    <meta property="og:image" content="{SITE}assets/og-image.png" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="theme-color" content="#bcff3c" />{HEAD_ASSETS.format(root=root)}
    <script type="application/ld+json">{json.dumps(jsonld, ensure_ascii=False)}</script>
  </head>
  <body>{NAV.format(root=root)}
    <main id="main-content" class="wrap">
{body}
    </main>{FOOTER.format(root=root)}
  </body>
</html>
"""


def breadcrumb(items):
    return {
        "@type": "BreadcrumbList",
        "itemListElement": [
            {"@type": "ListItem", "position": i + 1, "name": name, "item": url}
            for i, (name, url) in enumerate(items)
        ],
    }


def symbol_page(symbol, st, neighbours):
    root = "../../"
    s = slug(symbol)
    url = f"{SITE}chart/{page_slug(symbol)}/"
    ci = st["ci"]
    e = esc(symbol)

    title = f"{symbol} Share Price Chart & History (NEPSE) | NEPSE // Archive"
    description = (
        f"{symbol} share price on NEPSE: {fmt_price(st['lastPrice'])} on "
        f"{fmt_date(st['lastDate'])} ({fmt_pct(st['dayPct'])}). 52-week range "
        f"{fmt_price(st['low52'])} to {fmt_price(st['high52'])}. Free daily price "
        f"chart and history since {fmt_date(st['firstDate'])}, downloadable."
    )

    day_cls = "up" if (st["dayPct"] or 0) > 0 else "down" if (st["dayPct"] or 0) < 0 else ""
    yr_cls = "up" if (st["change1y"] or 0) > 0 else "down" if (st["change1y"] or 0) < 0 else ""

    def num2(v):
        return "n/a" if v is None else f"{v:,.2f}"

    rows_html = "\n".join(
        "<tr>"
        + f"<td>{esc(r[ci['d']])}</td>"
        + f"<td>{num2(r[ci['o']])}</td>"
        + f"<td>{num2(r[ci['h']])}</td>"
        + f"<td>{num2(r[ci['l']])}</td>"
        + f"<td>{num2(price_of(r, ci))}</td>"
        + f"<td>{fmt_int(r[ci['vol']])}</td>"
        + f"<td>{fmt_pct(r[ci['dp']])}</td>"
        + "</tr>"
        for r in st["recent"]
    )

    links = "\n".join(
        f'<li><a class="btn btn-sm" href="../{esc(page_slug(n))}/">{esc(n)} chart</a></li>'
        for n in neighbours
    )

    body = f"""      <section class="page-head" aria-labelledby="page-heading">
        <span class="kicker">NEPSE stock chart</span>
        <h1 id="page-heading">{e} share price chart</h1>
        <p>Daily price history for <strong>{e}</strong> on the Nepal Stock Exchange,
          {st['sessions']} trading sessions from {fmt_date(st['firstDate'])} to
          {fmt_date(st['lastDate'])}. Last traded at <strong>{fmt_price(st['lastPrice'])}</strong>
          on {fmt_date(st['lastDate'])}.</p>
      </section>

      <section class="stats" aria-label="{e} key numbers">
        <div class="stat"><div class="stat-num">{fmt_price(st['lastPrice'])}</div><div class="stat-label">Last price ({fmt_date(st['lastDate'])})</div></div>
        <div class="stat"><div class="stat-num {day_cls}">{fmt_pct(st['dayPct'])}</div><div class="stat-label">Day change</div></div>
        <div class="stat"><div class="stat-num">{fmt_price(st['high52'])}</div><div class="stat-label">52-week high</div></div>
        <div class="stat"><div class="stat-num">{fmt_price(st['low52'])}</div><div class="stat-label">52-week low</div></div>
        <div class="stat"><div class="stat-num {yr_cls}">{fmt_pct(st['change1y'])}</div><div class="stat-label">1-year change</div></div>
      </section>

      <section class="section" aria-labelledby="chart-heading">
        <h2 id="chart-heading">{e} price chart (last {len(st['series'])} sessions)</h2>
        <div class="chart-card">
          {svg_chart(symbol, st['series'])}
        </div>
        <div class="chart-actions">
          <a class="btn btn-primary" href="{root}stock.html?symbol={esc(quote(symbol))}">Open interactive chart</a>
          <a class="btn btn-secondary" href="{root}api/history/{esc(quote(s))}.json">Download {e} history (JSON)</a>
        </div>
      </section>

      <section class="section" aria-labelledby="recent-heading">
        <h2 id="recent-heading">{e} recent trading sessions</h2>
        <div class="table-wrapper">
          <table>
            <thead><tr><th>Date</th><th>Open</th><th>High</th><th>Low</th><th>Close/LTP</th><th>Volume</th><th>Change</th></tr></thead>
            <tbody>
{rows_html}
            </tbody>
          </table>
        </div>
      </section>

      <section class="section" aria-labelledby="more-heading">
        <h2 id="more-heading">More NEPSE stock charts</h2>
        <ul class="sym-links">
{links}
          <li><a class="btn btn-sm btn-lime" href="../">All NEPSE symbols</a></li>
        </ul>
      </section>"""

    jsonld = {
        "@context": "https://schema.org",
        "@graph": [
            {
                "@type": "WebPage",
                "@id": f"{url}#webpage",
                "url": url,
                "name": title,
                "description": description,
                "isPartOf": {"@id": f"{SITE}#website"},
                "inLanguage": "en",
                "dateModified": st["lastDate"],
            },
            {
                "@type": "Dataset",
                "name": f"{symbol} daily share price history (NEPSE)",
                "description": (
                    f"Daily open, high, low, close/LTP, VWAP, volume and turnover for "
                    f"{symbol} on the Nepal Stock Exchange, {st['firstDate']} to {st['lastDate']}."
                ),
                "url": url,
                "temporalCoverage": f"{st['firstDate']}/{st['lastDate']}",
                "isAccessibleForFree": True,
                "creator": {"@type": "Person", "name": "OmitNomis", "url": "https://github.com/OmitNomis"},
                "distribution": [
                    {
                        "@type": "DataDownload",
                        "encodingFormat": "application/json",
                        "contentUrl": f"{SITE}api/history/{quote(s)}.json",
                    }
                ],
            },
            breadcrumb(
                [("Home", SITE), ("Charts", f"{SITE}chart/"), (symbol, url)]
            ),
        ],
    }
    return page(root, title, description, url, jsonld, body)


def index_page(entries, last_date):
    root = "../"
    url = f"{SITE}chart/"
    title = "All NEPSE Stock Charts: Share Price History by Symbol | NEPSE // Archive"
    description = (
        f"Price charts and daily history for {len(entries)} Nepal Stock Exchange "
        f"symbols, updated {fmt_date(last_date)}. Pick a stock to see its chart, "
        f"52-week range and recent sessions."
    )
    items = "\n".join(
        f'<li><a href="{esc(page_slug(sym))}/">{esc(sym)}</a> '
        f'{fmt_price(st["lastPrice"])} '
        f'<span class="{"up" if (st["dayPct"] or 0) > 0 else "down" if (st["dayPct"] or 0) < 0 else ""}">'
        f'{fmt_pct(st["dayPct"])}</span></li>'
        for sym, st in entries
    )
    body = f"""      <section class="page-head" aria-labelledby="page-heading">
        <span class="kicker">Every symbol</span>
        <h1 id="page-heading">NEPSE stock charts</h1>
        <p>{len(entries)} Nepal Stock Exchange symbols with a price chart and daily
          history. Last session: {fmt_date(last_date)}. Want to compare two stocks?
          Use the <a href="{root}stock.html">interactive chart</a>.</p>
      </section>
      <section class="section" aria-label="All symbols">
        <ul class="sym-index">
{items}
        </ul>
      </section>"""
    jsonld = {
        "@context": "https://schema.org",
        "@graph": [
            {
                "@type": "CollectionPage",
                "@id": f"{url}#webpage",
                "url": url,
                "name": title,
                "description": description,
                "isPartOf": {"@id": f"{SITE}#website"},
                "dateModified": last_date,
            },
            breadcrumb([("Home", SITE), ("Charts", url)]),
        ],
    }
    return page(root, title, description, url, jsonld, body)


def write(path, text):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    # Skip rewriting identical files so git only sees real changes.
    if os.path.exists(path):
        with open(path, "r", encoding="utf-8") as fh:
            if fh.read() == text:
                return
    with open(path, "w", encoding="utf-8") as fh:
        fh.write(text)


def sitemap(last_date, symbol_dates):
    urls = [
        (f"{SITE}{path}", last_date if freq == "daily" else None, freq, prio)
        for path, freq, prio in STATIC_PAGES
    ]
    urls += [
        (f"{SITE}chart/{page_slug(sym)}/", d, "daily", "0.8")
        for sym, d in sorted(symbol_dates.items())
    ]
    out = ['<?xml version="1.0" encoding="UTF-8"?>',
           '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for loc, lastmod, freq, prio in urls:
        out.append("  <url>")
        out.append(f"    <loc>{esc(loc)}</loc>")
        if lastmod:
            out.append(f"    <lastmod>{lastmod}</lastmod>")
        out.append(f"    <changefreq>{freq}</changefreq>")
        out.append(f"    <priority>{prio}</priority>")
        out.append("  </url>")
    out.append("</urlset>")
    return "\n".join(out) + "\n"


def build(history_by_symbol, cols, last_date):
    """history_by_symbol: symbol -> ordered compact rows (as written to api/history)."""
    stats = {}
    for sym, rows in history_by_symbol.items():
        st = symbol_stats(rows, cols)
        if st:
            stats[sym] = st

    names = sorted(stats)
    live = set()
    for i, sym in enumerate(names):
        lo, hi = max(0, i - NEIGHBOURS), min(len(names), i + NEIGHBOURS + 1)
        neighbours = [n for n in names[lo:hi] if n != sym]
        path = os.path.join(CHART_DIR, page_slug(sym), "index.html")
        write(path, symbol_page(sym, stats[sym], neighbours))
        live.add(page_slug(sym))

    # Remove pages for symbols that no longer have data.
    if os.path.isdir(CHART_DIR):
        for d in os.listdir(CHART_DIR):
            p = os.path.join(CHART_DIR, d)
            if os.path.isdir(p) and d not in live:
                for f in os.listdir(p):
                    os.remove(os.path.join(p, f))
                os.rmdir(p)

    write(os.path.join(CHART_DIR, "index.html"),
          index_page([(s, stats[s]) for s in names], last_date))
    write(os.path.join(DOCS, "sitemap.xml"),
          sitemap(last_date, {s: stats[s]["lastDate"] for s in names}))
    return len(names)
