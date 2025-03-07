# **Automated Web Scraping with Scrapy**

This project automates the scraping of data from the website `https://www.sharesansar.com/today-share-price` using Scrapy, a web crawling and scraping framework for Python. The scraped data is then saved into a CSV file. The CSV files are also combined to generate an excel file that updates everyday adding a worksheet with the current day's data.

**Note:** If you're interested in accessing the data directly without running any code, you can download all the CSV or the latest combined Excel file [here](https://OmitNomis.github.io/ShareSansarScraper).

---

## **Setup:**

### - Ensure you have Python installed on your system:

Make sure Python is installed. You can download the latest version of Python from the official [Python website](https://www.python.org/downloads/).

### - **Clone the repository:**

Clone the project repository from GitHub:

```bash
git clone git@github.com:OmitNomis/ShareSansarScraper.git
```

Navigate to the project directory:

```bash
cd ShareSansarScraper
```

### - **Set up a virtual environment (optional but recommended):**

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

### - **Install project dependencies:**

Install the necessary dependencies listed in the `requirements.txt` file:

```bash
pip install -r requirements.txt
```

## **Execution:**

- The Scrapy spider named `market` is configured to scrape data from the specified URL (`https://www.sharesansar.com/today-share-price`).
- To run the scraper manually, execute the following command in your terminal within the project directory:
  ```
  scrapy crawl market
  ```
  This command will trigger the spider to scrape data from the website.

## **Notes:**

- The scraped data is stored in a CSV file with the naming convention `YYYY_MM_DD.csv` in the `Data` directory within your project.
- After each CSV is downloaded, CSV files, including the new one is combined to generate an excel file containing all CSV as worksheets.
- The script utilizes the `datetime.now()` function to generate the current date in the format specified.

## Workflow Explaination

The scraping process is automated through a GitHub workflow [scrape_action.yml](./.github/workflows/scrape_action.yml). Here is an explanation of the workflow:

- **name**: This is the name of the workflow, "Run Spider," which describes the purpose of the workflow.

- **on**: This section specifies the events that trigger the workflow.

  - **push**: The workflow runs every time there is a push to the `master` branch.
  - **schedule**: The workflow is also scheduled to run every day at 11:15 AM UTC (which is 5:00 PM Nepal Time) using a cron expression.

- **jobs**: This section defines the job to be run, named `run_spider`.

  - **runs-on**: Specifies that the job will run on the latest version of an Ubuntu runner.

- **steps**: This section contains a sequence of steps to be executed in the job.
  - **Checkout code**: This step uses the `actions/checkout@v3` action to check out the code from the repository, allowing the subsequent steps to access the codebase.
  - **Set up Python**: This step uses the `actions/setup-python@v4` action to set up Python version 3.10 on the runner.
  - **Cache dependencies**: This step uses the `actions/cache@v3` action to cache Python dependencies, speeding up subsequent runs.
    - **path**: Specifies the path to the pip cache.
    - **key**: Defines a unique key for the cache based on the operating system and the hash of the `poetry.lock` file.
    - **restore-keys**: Provides a list of keys to try when restoring the cache if an exact match is not found.
  - **Install dependencies**: This step installs the required Python packages.
    - It first upgrades `pip` to the latest version.
    - Then it installs the dependencies listed in the `requirements.txt` file.
  - **Run spider**: This step runs the Scrapy spider named `market` to scrape data from the specified website.
  - **Commit and Push Files**: This step commits and pushes the changes to the repository.
    - It configures Git with the provided user email and name.
    - Adds all changes to the Git staging area.
    - Commits the changes with the message "Share data has been successfully scrapped."
    - Pushes the committed changes to the `master` branch of the repository.
