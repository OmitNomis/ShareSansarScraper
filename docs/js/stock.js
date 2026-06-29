// Per-stock price chart, fed by the per-symbol files build_site_data.py writes
// to api/history/<SYMBOL>.json. Chart.js, dressed down to fit the brutalist theme.

document.addEventListener("DOMContentLoaded", initStock);

// Brutalist palette (matches css/styles.css tokens).
const COLORS = {
  primary: "#111111", // ink — the bold main line
  compare: "#ff6fb5", // pink
  volume: "#34d1f5", // cyan
};

const RANGE_DAYS = { "1m": 30, "3m": 91, "6m": 182, "1y": 365 };

const fmtInt = (n) => new Intl.NumberFormat("en").format(Math.round(n));
const fmtNum = (n) =>
  new Intl.NumberFormat("en", { maximumFractionDigits: 2 }).format(n);
const fmtAxis = (n) =>
  new Intl.NumberFormat("en", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(n);

const state = {
  symbols: [],
  symbolSet: new Set(),
  primary: null,
  compareSym: null,
  metric: "price", // "price" | "volume"
  range: "all",
  chart: null,
  cache: new Map(), // symbol -> history JSON
};

// --- DOM ---
const els = {};
function cacheEls() {
  els.symbolInput = document.getElementById("symbol-input");
  els.compareInput = document.getElementById("compare-input");
  els.clearCompare = document.getElementById("clear-compare");
  els.datalist = document.getElementById("symbol-list");
  els.rangeSeg = document.getElementById("range-seg");
  els.metricSeg = document.getElementById("metric-seg");
  els.meta = document.getElementById("chart-meta");
  els.state = document.getElementById("chart-state");
  els.canvas = document.getElementById("price-chart");
}

async function initStock() {
  cacheEls();
  configureChartDefaults();

  try {
    const resp = await fetch("api/symbols.json");
    if (!resp.ok) throw new Error(`symbols HTTP ${resp.status}`);
    state.symbols = await resp.json();
    state.symbolSet = new Set(state.symbols);
  } catch (error) {
    console.error("Could not load symbols:", error);
    showError("Could not load the symbol list. Try refreshing.");
    return;
  }

  els.datalist.innerHTML = state.symbols
    .map((s) => `<option value="${s}"></option>`)
    .join("");

  // Deep-link support: ?symbol=NABIL&compare=ADBL
  const params = new URLSearchParams(window.location.search);
  const wanted = (params.get("symbol") || "").toUpperCase();
  const wantedCmp = (params.get("compare") || "").toUpperCase();

  state.primary = state.symbolSet.has(wanted) ? wanted : defaultSymbol();
  if (state.symbolSet.has(wantedCmp) && wantedCmp !== state.primary) {
    state.compareSym = wantedCmp;
  }

  els.symbolInput.value = state.primary;
  els.compareInput.value = state.compareSym || "";
  wireEvents();
  syncMetricAvailability();
  render();
}

function defaultSymbol() {
  for (const pick of ["NABIL", "NTC", "ADBL"]) {
    if (state.symbolSet.has(pick)) return pick;
  }
  return state.symbols[0];
}

// --------------------------- data plumbing ---------------------------
async function fetchHistory(symbol) {
  if (state.cache.has(symbol)) return state.cache.get(symbol);
  const resp = await fetch(`api/history/${encodeURIComponent(symbol)}.json`);
  if (!resp.ok) throw new Error(`history HTTP ${resp.status}`);
  const data = await resp.json();
  state.cache.set(symbol, data);
  return data;
}

// history JSON (compact columnar) -> { labels, price, volume }
function buildSeries(history) {
  const ci = {};
  history.cols.forEach((c, i) => (ci[c] = i));
  const labels = history.rows.map((r) => r[ci.d]);
  const price = history.rows.map((r) =>
    r[ci.ltp] != null ? r[ci.ltp] : r[ci.c]
  );
  const volume = history.rows.map((r) => r[ci.vol]);
  return { labels, price, volume };
}

function sliceByRange(series, range) {
  const days = RANGE_DAYS[range];
  if (!days || !series.labels.length) return series;
  const last = window.NEPSE.parseArchiveDate(series.labels[series.labels.length - 1]);
  const cutoff = new Date(last);
  cutoff.setDate(cutoff.getDate() - days);
  let start = series.labels.findIndex(
    (d) => window.NEPSE.parseArchiveDate(d) >= cutoff
  );
  if (start < 0) start = 0;
  return {
    labels: series.labels.slice(start),
    price: series.price.slice(start),
    volume: series.volume.slice(start),
  };
}

// Normalize a value array to % change from its first non-null point.
function toPct(values) {
  const base = values.find((v) => v != null && v !== 0);
  if (base == null) return values.map(() => null);
  return values.map((v) => (v == null ? null : ((v - base) / base) * 100));
}

function dateMap(series) {
  const m = Object.create(null);
  series.labels.forEach((d, i) => (m[d] = series.price[i]));
  return m;
}

// ------------------------------ render -------------------------------
async function render() {
  if (!state.primary) return;
  showLoading();

  let primaryHist;
  try {
    primaryHist = await fetchHistory(state.primary);
  } catch {
    showError(`No price history for “${state.primary}”.`);
    return;
  }

  const pSeries = sliceByRange(buildSeries(primaryHist), state.range);
  const labels = pSeries.labels;
  const comparing = !!state.compareSym;
  const metric = comparing ? "price" : state.metric; // volume only in single mode

  const datasets = [];

  if (metric === "volume") {
    datasets.push(volumeDataset(state.primary, pSeries.volume));
  } else if (!comparing) {
    datasets.push(lineDataset(state.primary, pSeries.price, COLORS.primary));
  } else {
    datasets.push(lineDataset(state.primary, toPct(pSeries.price), COLORS.primary));
    try {
      const cmpHist = await fetchHistory(state.compareSym);
      const cmap = dateMap(buildSeries(cmpHist));
      const aligned = labels.map((d) => (d in cmap ? cmap[d] : null));
      datasets.push(lineDataset(state.compareSym, toPct(aligned), COLORS.compare));
    } catch {
      // compare symbol failed to load — just show the primary normalized line
    }
  }

  drawChart(labels, datasets, metric, comparing);
  updateMeta(pSeries, comparing);
  hideLoading();
}

function lineDataset(label, data, color) {
  return {
    label,
    data,
    borderColor: color,
    backgroundColor: color,
    borderWidth: 3,
    tension: 0, // sharp, brutalist lines
    pointRadius: 0,
    pointHoverRadius: 5,
    pointStyle: "rect",
    pointHoverBackgroundColor: color,
    pointHoverBorderColor: "#111111",
    pointHoverBorderWidth: 2,
    spanGaps: true,
  };
}

function volumeDataset(label, data) {
  return {
    type: "bar",
    label: `${label} volume`,
    data,
    backgroundColor: COLORS.volume,
    borderColor: "#111111",
    borderWidth: 1.5,
  };
}

function drawChart(labels, datasets, metric, comparing) {
  if (state.chart) state.chart.destroy();

  const yFmt = (value) => {
    if (metric === "volume") return fmtAxis(value);
    if (comparing) return `${value > 0 ? "+" : ""}${value}%`;
    return `Rs ${fmtAxis(value)}`;
  };

  const valueFmt = (v) => {
    if (v == null) return null;
    if (metric === "volume") return fmtInt(v);
    if (comparing) return `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`;
    return `Rs ${fmtNum(v)}`;
  };

  state.chart = new Chart(els.canvas, {
    type: metric === "volume" ? "bar" : "line",
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: {
          display: comparing,
          labels: { boxWidth: 14, boxHeight: 14, font: { weight: 700 } },
        },
        tooltip: {
          backgroundColor: "#111111",
          titleColor: "#ffffff",
          bodyColor: "#ffffff",
          cornerRadius: 0,
          padding: 10,
          displayColors: comparing,
          titleFont: { family: "'Space Mono', monospace", weight: 700 },
          bodyFont: { family: "'Space Mono', monospace", weight: 700 },
          callbacks: {
            title: (items) =>
              items.length ? window.NEPSE.formatArchiveDate(items[0].label) : "",
            label: (ctx) => {
              const out = valueFmt(ctx.parsed.y);
              return out == null ? null : `${ctx.dataset.label}: ${out}`;
            },
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          border: { color: "#111111", width: 2 },
          ticks: { maxTicksLimit: 8, autoSkip: true, maxRotation: 0 },
        },
        y: {
          grid: { color: "rgba(17,17,17,0.08)" },
          border: { color: "#111111", width: 2 },
          ticks: { callback: yFmt },
        },
      },
    },
  });
}

function updateMeta(series, comparing) {
  if (!series.labels.length) {
    els.meta.hidden = true;
    return;
  }
  const last = series.price[series.price.length - 1];
  const first = series.labels[0];
  const lastDate = series.labels[series.labels.length - 1];

  let html = `<span class="pill">${escapeHtml(state.primary)}</span>`;
  if (comparing) {
    html += ` <span class="pill pill-pink">${escapeHtml(state.compareSym)}</span>`;
    html += ` <span class="chart-meta-note">normalized % change</span>`;
  } else if (last != null) {
    html += ` <span class="chart-meta-note">last Rs ${fmtNum(last)}</span>`;
  }
  html += ` <span class="chart-meta-note">${series.labels.length} sessions · ${first} → ${lastDate}</span>`;
  els.meta.innerHTML = html;
  els.meta.hidden = false;
}

// ------------------------------ events -------------------------------
function wireEvents() {
  els.symbolInput.addEventListener("change", () => {
    const val = els.symbolInput.value.trim().toUpperCase();
    if (state.symbolSet.has(val)) {
      state.primary = val;
      els.symbolInput.value = val;
      if (state.compareSym === val) clearCompare();
      updateUrl();
      render();
    } else if (val) {
      els.symbolInput.value = state.primary; // revert invalid entry
    }
  });

  els.compareInput.addEventListener("change", () => {
    const val = els.compareInput.value.trim().toUpperCase();
    if (!val) {
      clearCompare();
      return;
    }
    if (state.symbolSet.has(val) && val !== state.primary) {
      state.compareSym = val;
      els.compareInput.value = val;
      els.clearCompare.classList.remove("visually-hidden");
      syncMetricAvailability();
      updateUrl();
      render();
    } else {
      els.compareInput.value = state.compareSym || "";
    }
  });

  els.clearCompare.addEventListener("click", clearCompare);

  els.rangeSeg.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-range]");
    if (!btn) return;
    state.range = btn.dataset.range;
    setActive(els.rangeSeg, btn);
    render();
  });

  els.metricSeg.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-metric]");
    if (!btn || state.compareSym) return; // metric locked while comparing
    state.metric = btn.dataset.metric;
    setActive(els.metricSeg, btn);
    render();
  });
}

function clearCompare() {
  state.compareSym = null;
  els.compareInput.value = "";
  els.clearCompare.classList.add("visually-hidden");
  syncMetricAvailability();
  updateUrl();
  render();
}

// Volume view makes no sense for a normalized comparison, so lock it.
function syncMetricAvailability() {
  const locked = !!state.compareSym;
  els.metricSeg.classList.toggle("is-disabled", locked);
  els.metricSeg.querySelectorAll("button").forEach((b) => (b.disabled = locked));
}

function setActive(group, activeBtn) {
  group.querySelectorAll("button").forEach((b) => b.classList.remove("active"));
  activeBtn.classList.add("active");
}

function updateUrl() {
  const params = new URLSearchParams();
  params.set("symbol", state.primary);
  if (state.compareSym) params.set("compare", state.compareSym);
  history.replaceState(null, "", `${location.pathname}?${params}`);
}

// ------------------------------ states -------------------------------
const SPINNER_HTML =
  '<div class="spinner" role="status" aria-label="Loading"></div><p>Loading chart&hellip;</p>';

function showLoading() {
  els.state.innerHTML = SPINNER_HTML;
  els.state.classList.remove("visually-hidden");
}
function hideLoading() {
  els.state.classList.add("visually-hidden");
}
function showError(message) {
  els.meta.hidden = true;
  if (state.chart) {
    state.chart.destroy();
    state.chart = null;
  }
  els.state.classList.remove("visually-hidden");
  els.state.innerHTML = `<div class="error-message"><span class="err-emoji" aria-hidden="true">⚠</span>${escapeHtml(
    message
  )}</div>`;
}

function configureChartDefaults() {
  Chart.defaults.font.family = "'Space Mono', 'Courier New', monospace";
  Chart.defaults.font.weight = 700;
  Chart.defaults.color = "#111111";
}

function escapeHtml(s) {
  return String(s).replace(
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
}
