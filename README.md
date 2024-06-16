**Automated Web Scraping with Scrapy**

This project automates the scraping of data from the website `https://www.sharesansar.com/today-share-price` using Scrapy, a web crawling and scraping framework for Python. The scraped data is then saved into a CSV file. The CSV files are also combined to generate an excel file that updates everyday adding a worksheet with the current day's data.

**Setup:**

1. **Installation:**

- **Ensure you have Python installed on your system:**
  Make sure Python is installed. You can download the latest version of Python from the official [Python website](https://www.python.org/downloads/).

- **Clone the repository:**
  Clone the project repository from GitHub:

  ```bash
  git clone git@github.com:OmitNomis/ShareSansarScraper.git
  ```

  Navigate to the project directory:

  ```bash
  cd ShareSansarScraper
  ```

- **Set up a virtual environment (optional but recommended):**
  Create a virtual environment to keep your project dependencies isolated:

  ```bash
  python -m venv venv
  ```

  Activate the virtual environment:

  - On Windows:
    ```bash
    venv\Scripts\activate
    ```
  - On macOS/Linux:
    ```bash
    source venv/bin/activate
    ```

- **Install project dependencies:**
  Install the necessary dependencies listed in the `requirements.txt` file:

  ```bash
  pip install -r requirements.txt
  ```

**Execution:**

- The Scrapy spider named `market` is configured to scrape data from the specified URL (`https://www.sharesansar.com/today-share-price`).
- To run the scraper manually, execute the following command in your terminal within the project directory:
  ```
  scrapy crawl market
  ```
  This command will trigger the spider to scrape data from the website.

**Notes:**

- The scraped data is stored in a CSV file with the naming convention `YYYY_MM_DD.csv` in the `Data` directory within your project.
- After each CSV is downloaded the, all the CSV files, including the new one is combined to generate an excel file containing all CSV as worksheets.
- The script utilizes the `datetime.now()` function to generate the current date in the format specified.
- The scraping process is automated through a GitHub workflow, but details for setting up the workflow are not provided here.
