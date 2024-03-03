from pathlib import Path

import scrapy


class ShareSansarSpider(scrapy.Spider):
    name = "market"
    start_urls = [
        "https://www.sharesansar.com/today-share-price/",
    ]

    def parse(self, response):
        for row in response.xpath("//table//tr"):
            data = {
                'direct_data': row.xpath(".//td/text()").getall(),
                'link_data': row.xpath(".//td/a/text()").getall(),
            }
            yield data