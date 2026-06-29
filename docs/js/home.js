// Landing page: live "top movers" ticker + headline stats, all from the
// real archive (newest CSV + the file list).

document.addEventListener("DOMContentLoaded", () => {
  initHome();
  renderRecap();
});

const setText = (id, value) => {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
};

const toNumber = (v) => {
  if (v == null) return NaN;
  return parseFloat(String(v).replace(/,/g, "").replace(/%/g, "").trim());
};

const escapeHtml = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      }[c])
  );

async function initHome() {
  try {
    const listResp = await fetch("Data/list_of_csv_files.txt");
    if (!listResp.ok) throw new Error(`list HTTP ${listResp.status}`);

    const dates = (await listResp.text())
      .trim()
      .split("\n")
      .map((line) => line.match(/(\d{4}_\d{2}_\d{2})/)?.[1])
      .filter(Boolean);

    if (!dates.length) return tickerFallback();

    // The list is newest-first.
    const latest = dates[0];
    const earliest = dates[dates.length - 1];

    setText("stat-days", dates.length.toLocaleString());
    const since = window.NEPSE.parseArchiveDate(earliest);
    if (since) setText("stat-since", String(since.getFullYear()));

    const csvResp = await fetch(`Data/${latest}.csv`);
    if (!csvResp.ok) return tickerFallback();

    const parsed = Papa.parse(await csvResp.text(), {
      header: true,
      skipEmptyLines: true,
    });
    const rows = (parsed.data || []).filter((r) => (r.Symbol || "").trim());

    setText("stat-symbols", rows.length.toLocaleString());
    buildTicker(rows, latest);
  } catch (error) {
    console.error("Home init failed:", error);
    tickerFallback();
  }
}

function buildTicker(rows, latest) {
  const track = document.getElementById("ticker-track");
  if (!track) return;

  const movers = rows
    .map((r) => ({
      sym: (r.Symbol || "").trim(),
      chg: toNumber(r["Diff %"]),
    }))
    .filter((m) => m.sym && !Number.isNaN(m.chg))
    .sort((a, b) => Math.abs(b.chg) - Math.abs(a.chg))
    .slice(0, 28)
    .sort((a, b) => b.chg - a.chg);

  if (!movers.length) return tickerFallback();

  const itemHtml = (m) => {
    const cls = m.chg > 0 ? "up" : m.chg < 0 ? "down" : "";
    const arrow = m.chg > 0 ? "▲" : m.chg < 0 ? "▼" : "—";
    const sign = m.chg > 0 ? "+" : "";
    return `<span class="ticker-item"><span class="sym">${escapeHtml(
      m.sym
    )}</span> <span class="chg ${cls}">${arrow} ${sign}${m.chg.toFixed(
      2
    )}%</span></span>`;
  };

  // Duplicate the set so the -50% scroll loops seamlessly.
  const set = movers.map(itemHtml).join("");
  track.innerHTML = set + set;
  track.setAttribute(
    "aria-label",
    `Top movers for ${window.NEPSE.formatArchiveDate(latest)}`
  );
}

function tickerFallback() {
  const track = document.getElementById("ticker-track");
  if (track) {
    track.innerHTML =
      '<span class="ticker-item">Latest session data unavailable right now &mdash; try the Preview page.</span>';
  }
}

// ----------------------------- Market recap -----------------------------
// Pre-computed by build_site_data.py, so the page just renders it.

const fmtInt = (n) => new Intl.NumberFormat("en").format(n);
const fmtCompact = (n) =>
  new Intl.NumberFormat("en", {
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(n);

async function renderRecap() {
  const dateEl = document.getElementById("recap-date");
  const tilesEl = document.getElementById("recap-tiles");
  const moversEl = document.getElementById("recap-movers");
  if (!tilesEl || !moversEl) return;

  try {
    const resp = await fetch("api/recap/latest.json");
    if (!resp.ok) throw new Error(`recap HTTP ${resp.status}`);
    const r = await resp.json();

    if (dateEl) {
      dateEl.textContent = `${window.NEPSE.formatArchiveDate(r.date)} · ${fmtInt(
        r.symbols
      )} symbols traded`;
    }

    const tiles = [
      { label: "Advances", value: fmtInt(r.advances), cls: "up" },
      { label: "Declines", value: fmtInt(r.declines), cls: "down" },
      { label: "Unchanged", value: fmtInt(r.unchanged), cls: "" },
      { label: "Turnover", value: `Rs ${fmtCompact(r.totalTurnover)}`, cls: "" },
      { label: "Transactions", value: fmtInt(r.totalTransactions), cls: "" },
    ];
    tilesEl.innerHTML = tiles
      .map(
        (t) => `
        <div class="recap-tile ${t.cls}">
          <div class="recap-tile-num">${t.value}</div>
          <div class="recap-tile-label">${t.label}</div>
        </div>`
      )
      .join("");

    const summaryEl = document.getElementById("recap-summary");
    if (summaryEl && r.headline) {
      summaryEl.textContent = r.headline;
      summaryEl.hidden = false;
    }

    moversEl.innerHTML =
      moverCard("Top gainers", r.topGainers) +
      moverCard("Top losers", r.topLosers);
  } catch (error) {
    console.error("Recap render failed:", error);
    const section = document.getElementById("recap");
    if (section) section.hidden = true;
  }
}

function moverCard(title, movers) {
  const rows = (movers || [])
    .map((m) => {
      const cls = m.diffPct > 0 ? "up" : m.diffPct < 0 ? "down" : "";
      const arrow = m.diffPct > 0 ? "▲" : m.diffPct < 0 ? "▼" : "—";
      const sign = m.diffPct > 0 ? "+" : "";
      const ltp = m.ltp == null ? "" : `Rs ${fmtInt(m.ltp)}`;
      return `<li>
        <a class="mover-sym" href="stock.html?symbol=${encodeURIComponent(
          m.symbol
        )}">${escapeHtml(m.symbol)}</a>
        <span class="mover-ltp">${ltp}</span>
        <span class="mover-chg ${cls}">${arrow} ${sign}${m.diffPct.toFixed(
        2
      )}%</span>
      </li>`;
    })
    .join("");
  return `<article class="card mover-card">
    <h3 class="mover-title">${escapeHtml(title)}</h3>
    <ol class="mover-list">${rows}</ol>
  </article>`;
}
