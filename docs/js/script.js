fetch("Data/combined_excel.xlsx")
  .then((response) => response.headers.get("Last-Modified"))
  .then((lastModified) => {
    const formattedDate = new Date(lastModified).toLocaleString();
    document.getElementById("last-updated-date").textContent = formattedDate;
  })
  .catch((error) => console.error("Error fetching last updated date:", error));

function downloadAllCSVs() {
  fetch("Data/list_of_csv_files.txt")
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

      zip.generateAsync({ type: "blob" }).then((content) => {
        saveAs(content, "all_csv_files.zip");
      });
    })
    .catch((error) => console.error("Error downloading CSVs as ZIP:", error));
}

function toggleCSVList() {
  const container = document.getElementById("csv-list-container");
  const button = document.getElementById("toggle-csv-btn");

  if (container.style.display === "none") {
    container.style.display = "block";
    button.textContent = "Hide CSVs";
  } else {
    container.style.display = "none";
    button.textContent = "Show All CSVs";
  }
}

function downloadAllCSVs() {
  const downloadButton = document.getElementById("download-csvs-btn");
  downloadButton.disabled = true;

  fetch("Data/list_of_csv_files.txt")
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
          downloadButton.disabled = false;
        })
        .catch((error) => {
          console.error("Error generating ZIP file:", error);
          downloadButton.disabled = false;
        });
    })
    .catch((error) => {
      console.error("Error fetching CSVs list:", error);
      downloadButton.disabled = false;
    });
}
