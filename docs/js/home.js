// Landing page: live "top movers" ticker + headline stats, all from the
// real archive (newest CSV + the file list).

document.addEventListener("DOMContentLoaded", initHome);

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
