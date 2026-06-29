# ShareSansar Scraper — NEPSE Historical Data Archive

A self-updating archive of daily share prices from the Nepal Stock Exchange (NEPSE). A [Scrapy](https://scrapy.org/) spider scrapes the [ShareSansar today's-share-price page](https://www.sharesansar.com/today-share-price) every trading day via GitHub Actions, saves each day as a CSV, rolls everything into a single Excel workbook, and publishes a JSON API + a static site.

[![Last updated](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fraw.githubusercontent.com%2FOmitNomis%2FShareSansarScraper%2Fmaster%2Fdocs%2Fapi%2Fmeta.json&query=%24.lastUpdated&label=last%20updated&color=brightgreen)](https://omitnomis.github.io/ShareSansarScraper/)
[![Trading days](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fraw.githubusercontent.com%2FOmitNomis%2FShareSansarScraper%2Fmaster%2Fdocs%2Fapi%2Fmeta.json&query=%24.tradingDays&label=trading%20days&color=blue)](https://omitnomis.github.io/ShareSansarScraper/download.html)
[![Symbols tracked](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fraw.githubusercontent.com%2FOmitNomis%2FShareSansarScraper%2Fmaster%2Fdocs%2Fapi%2Fmeta.json&query=%24.symbols&label=symbols&color=orange)](https://omitnomis.github.io/ShareSansarScraper/stock.html)

## 🌐 Live site

**Browse, chart, and download the data here — no code required:**

### 👉 https://omitnomis.github.io/ShareSansarScraper/

The site (served by GitHub Pages from the [`docs/`](./docs) folder) lets you:

- See a **daily market recap** — top gainers/losers, turnover, and breadth at a glance
- **Chart** any symbol's full price history, and compare two stocks side by side
- **Preview** any trading day's prices online
- **Download** individual days as CSV, or the full history as a combined Excel file

Data goes back to March 2024 and updates automatically every trading day.

---

## How it works

1. A scheduled GitHub Action runs the Scrapy spider once a day.
2. The spider scrapes the share-price table and writes it to `docs/Data/YYYY_MM_DD.csv` — **unless** the market was closed (weekend/holiday), in which case ShareSansar still shows the previous session and the scrape is skipped to avoid duplicate days.
3. All CSVs are merged into `docs/Data/combined_excel.xlsx`, one worksheet per day (latest first).
4. `build_site_data.py` turns the CSV archive into small JSON files under `docs/api/` (see [JSON API](#json-api)).
5. The Action commits the new files, which publishes them to the live GitHub Pages site.

## Project structure

```
ShareSansarScraper/
├── docs/                         # GitHub Pages site + scraped data
│   ├── index.html                #   landing page (recap + top movers)
│   ├── download.html             #   download page
│   ├── preview.html              #   per-day table preview
│   ├── stock.html                #   per-symbol price charts (Chart.js)
│   ├── about.html                #   about + API docs
│   ├── js/                       #   vanilla JS, one file per page
│   ├── css/styles.css            #   neobrutalist design system
│   ├── api/                      #   generated JSON API (see below)
│   └── Data/                     #   scraped output
│       ├── YYYY_MM_DD.csv        #     one CSV per trading day
│       └── combined_excel.xlsx   #     all days as Excel worksheets
├── ShareSansarDataScrape/
│   ├── settings.py               # Scrapy settings
│   └── spiders/market.py         # the "market" spider
├── build_site_data.py            # CSV archive → docs/api/*.json
├── .github/workflows/scrape_action.yml  # daily automation
└── requirements.txt
```

---

## JSON API

Every trading day the archive is also published as small JSON files under
[`docs/api/`](./docs/api) — no auth, no rate limits, served straight from GitHub Pages.
Base URL: `https://omitnomis.github.io/ShareSansarScraper/api/`

| Endpoint | What it returns |
| --- | --- |
| `meta.json` | Archive stats: `lastUpdated`, `firstDate`, `tradingDays`, `symbols`, `symbolsLatest`. |
| `symbols.json` | Array of every symbol ever traded, sorted. |
| `latest.json` | The most recent session: `{ date, count, rows[] }` with normalized OHLC/LTP/volume/turnover. |
| `history/{SYMBOL}.json` | One symbol's full price history, compact columnar: `{ symbol, cols, rows }`. |
| `recap/latest.json` | Latest-session highlights: breadth, turnover, top gainers/losers, and a plain-text `headline`. |

The full manifest lives at [`docs/api/index.json`](./docs/api/index.json). Example:

```js
const meta = await (await fetch(
  "https://omitnomis.github.io/ShareSansarScraper/api/meta.json"
)).json();

const nabil = await (await fetch(
  "https://omitnomis.github.io/ShareSansarScraper/api/history/NABIL.json"
)).json();
// nabil.cols === ["d","o","h","l","c","ltp","vwap","vol","to","dp"]
```

> Note: `ltp` falls back to `close` for sessions older than the LTP column, since the
> ShareSansar table layout changed over time. Numbers are JSON numbers (commas/`%` stripped).

---

## Running it yourself

### Prerequisites

[Python](https://www.python.org/downloads/) installed on your system.

### 1. Clone the repository

```bash
git clone https://github.com/OmitNomis/ShareSansarScraper.git
cd ShareSansarScraper
```

### 2. Set up a virtual environment (recommended)

```bash
python -m venv venv
```

Activate it:

- **Windows:** `venv\Scripts\activate`
- **macOS / Linux:** `source venv/bin/activate`

### 3. Install dependencies

```bash
pip install -r requirements.txt
```

### 4. Run the scraper, then build the API files

```bash
scrapy crawl market      # scrape today's prices → docs/Data/ + combined_excel.xlsx
python build_site_data.py # regenerate docs/api/*.json from the CSV archive
```

`build_site_data.py` is a full, idempotent rebuild — safe to run any time, even when
no new data was scraped.

---

## Automation

The daily scrape is handled by [`.github/workflows/scrape_action.yml`](./.github/workflows/scrape_action.yml):

- **Schedule:** runs every day at 11:15 AM UTC (5:00 PM Nepal Time) via cron.
- **On push:** also runs on every push to `master`.
- **Steps:** checks out the repo → sets up Python 3.10 → caches & installs dependencies → runs the `market` spider → runs `build_site_data.py` → commits and pushes any new data back to `master`.

On days the market is closed nothing changes, so the commit step is a clean no-op and
the job stays green. Because the data lives in `docs/`, every successful run instantly
updates the live site.

## License

See [LICENSE](./LICENSE).
