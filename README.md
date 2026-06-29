# ShareSansar Scraper — NEPSE Historical Data Archive

A self-updating archive of daily share prices from the Nepal Stock Exchange (NEPSE). A [Scrapy](https://scrapy.org/) spider scrapes the [ShareSansar today's-share-price page](https://www.sharesansar.com/today-share-price) every trading day via GitHub Actions, saves each day as a CSV, and rolls everything into a single Excel workbook.

## 🌐 Live site

**Browse and download the data here — no code required:**

### 👉 https://omitnomis.github.io/ShareSansarScraper/

The site (served by GitHub Pages from the [`docs/`](./docs) folder) lets you:

- **Preview** any trading day's prices online
- **Download** individual days as CSV
- **Download** the full history as a single combined Excel file

Data goes back to March 2024 and updates automatically every trading day.

---

## How it works

1. A scheduled GitHub Action runs the Scrapy spider once a day.
2. The spider scrapes the share-price table and writes it to `docs/Data/YYYY_MM_DD.csv`.
3. All CSVs are merged into `docs/Data/combined_excel.xlsx`, one worksheet per day (latest first).
4. The Action commits the new files, which publishes them to the live GitHub Pages site.

## Project structure

```
ShareSansarScraper/
├── docs/                         # GitHub Pages site + scraped data
│   ├── index.html                #   landing / browse page
│   ├── download.html             #   download page
│   ├── preview.html              #   per-day preview
│   └── Data/                     #   scraped output
│       ├── YYYY_MM_DD.csv        #     one CSV per trading day
│       └── combined_excel.xlsx   #     all days as Excel worksheets
├── ShareSansarDataScrape/
│   ├── settings.py               # Scrapy settings
│   └── spiders/market.py         # the "market" spider
├── .github/workflows/scrape_action.yml  # daily automation
└── requirements.txt
```

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

### 4. Run the scraper

```bash
scrapy crawl market
```

This scrapes the current day's prices, saves `docs/Data/YYYY_MM_DD.csv`, and updates `docs/Data/combined_excel.xlsx`.

---

## Automation

The daily scrape is handled by [`.github/workflows/scrape_action.yml`](./.github/workflows/scrape_action.yml):

- **Schedule:** runs every day at 11:15 AM UTC (5:00 PM Nepal Time) via cron.
- **On push:** also runs on every push to `master`.
- **Steps:** checks out the repo → sets up Python 3.10 → caches & installs dependencies → runs the `market` spider → commits and pushes the new data back to `master`.

Because the data lives in `docs/`, every successful run instantly updates the live site.

## License

See [LICENSE](./LICENSE).
