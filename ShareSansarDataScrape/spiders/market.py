import scrapy
import pandas as pd
from datetime import datetime

class TableSpider(scrapy.Spider):
    name = 'market'
    start_urls = ['https://www.sharesansar.com/today-share-price']

    def parse(self, response):
        # Extracting the table rows
        rows = response.xpath('//table//tr')

        # Defining a list to store the rows
        table_data = []

        # Extracting the table headers
        header_row = rows[0]
        header_cells = header_row.xpath('.//th//text()').getall()
        # Removing whitespace from the header cells
        header_cells = [cell.strip() for cell in header_cells]

        # Adding the header row to the table data list
        table_data.append(header_cells)

        # Looping through each row after the header
        for row in rows[1:]:
            # Extracting the text from each cell
            cells = row.xpath('.//td//text()').getall()
            # Removing whitespace from the cells
            cells = [cell.strip() for cell in cells]
            # Filter out empty values from the cells
            cells = [cell for cell in cells if cell]
            # If any cell in the row has data, add it to the table data list
            if any(cells):
                table_data.append(cells)

        # Converting the table_data list into a DataFrame
        df = pd.DataFrame(table_data)

        date_str = datetime.now().strftime('%Y_%m_%d')

        file_path = f'Data/{date_str}.csv'

        # Converting the DataFrame into a CSV file
        df.to_csv(file_path, index=False)