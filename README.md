**Automated Web Scraping with Scrapy**

This project automates the scraping of data from the website `https://www.sharesansar.com/today-share-price` using Scrapy, a web crawling and scraping framework for Python. The scraped data is then saved into a CSV file.

**Setup:**

1. **Installation:**

   - Ensure you have Python installed on your system.
   - Install Scrapy and Pandas libraries if not already installed:
     ```
     pip install scrapy pandas openpyxl
     ```

2. **Code Configuration:**
   - Copy the provided Python code into a Python file within your project directory.

**Execution:**

- The Scrapy spider named `market` is configured to scrape data from the specified URL (`https://www.sharesansar.com/today-share-price`).
- To run the scraper manually, execute the following command in your terminal within the project directory:
  ```
  scrapy crawl market
  ```
  This command will trigger the spider to scrape data from the website.

**Notes:**

- The scraped data is stored in a CSV file with the naming convention `YYYY_MM_DD.csv` in the `Data` directory within your project.
- The script utilizes the `datetime.now()` function to generate the current date in the format specified.
- The scraping process is automated through a GitHub workflow, but details for setting up the workflow are not provided here.
