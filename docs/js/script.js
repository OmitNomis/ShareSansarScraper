fetch("Data/combined_excel.xlsx")
  .then((response) => response.headers.get("Last-Modified"))
  .then((lastModified) => {
    const formattedDate = new Date(lastModified).toLocaleString();
    document.getElementById("last-updated-date").textContent = formattedDate;
  })
  .catch((error) => console.error("Error fetching last updated date:", error));

function toggleCSVList() {
  const container = document.getElementById("csv-list-container");
  if (container.style.display === "none") {
    container.style.display = "block";
  } else {
    container.style.display = "none";
  }
}

function downloadAllCSVs() {
  const downloadButton = document.getElementById("download-csvs-btn");
  downloadButton.disabled = true;

  fetch("Data/list_of_csv_files.txt") // Assuming a text file with list of CSV files
    .then((response) => response.text())
    .then((csvList) => {
      const csvFiles = csvList.trim().split("\n");
      const zip = new JSZip();

      csvFiles.forEach((csvFile) => {
        zip.file(
          csvFile.trim(),
          fetch(`Data/${csvFile.trim()}`).then((response) => response.blob()),
        );
      });

      zip
        .generateAsync({ type: "blob" })
        .then((content) => {
          saveAs(content, "all_csv_files.zip");
          downloadButton.disabled = false; // Enable the button after download
        })
        .catch((error) => {
          console.error("Error generating ZIP file:", error);
          downloadButton.disabled = false; // Enable the button if there's an error
        });
    })
    .catch((error) => {
      console.error("Error fetching CSVs list:", error);
      downloadButton.disabled = false; // Enable the button if there's an error
    });
}

fetch("Data/list_of_csv_files.txt")
  .then((response) => response.text())
  .then((csvList) => {
    const csvFiles = csvList.trim().split("\n");
    const csvFilesList = document.getElementById("csv-files-list");
    csvFiles.forEach((csvFile) => {
      const listItem = document.createElement("li");
      const link = document.createElement("a");
      link.href = `Data/${csvFile.trim()}`;
      link.textContent = csvFile.trim();
      link.download = csvFile.trim();
      const button = document.createElement("button");
      button.textContent = "Download";
      button.onclick = () => {
        const a = document.createElement("a");
        a.href = link.href;
        a.download = link.download;
        a.click();
      };
      listItem.appendChild(link);
      listItem.appendChild(button);
      csvFilesList.appendChild(listItem);
    });
  })
  .catch((error) => console.error("Error fetching CSV files list:", error));
