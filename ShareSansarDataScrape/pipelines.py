# Define your item pipelines here
#
# Don't forget to add your pipeline to the ITEM_PIPELINES setting
# See: https://docs.scrapy.org/en/latest/topics/item-pipeline.html


# useful for handling different item types with a single interface
from itemadapter import ItemAdapter
from datetime import datetime
import os
import csv


class SharesansardatascrapePipeline:
    def process_item(self, item, spider):
        return item


class MyPipeline:
    def process_item(self, item, spider):
        filename = os.path.join('data', f"{spider.name}_{spider.start_urls[0].split('//')[1]}_{datetime.now().strftime('%Y_%m_%d')}.csv")
        os.makedirs(os.path.dirname(filename), exist_ok=True)

        with open(filename, 'a', newline='') as csvfile:
            writer = csv.DictWriter(csvfile, fieldnames=['direct_data', 'link_data'])
            if not os.path.isfile(filename):
                writer.writeheader()
            writer.writerow(item)

        return item