document.addEventListener("DOMContentLoaded", () => {
  const downloadCsvsBtn = document.getElementById("download-csvs-btn");
  const downloadProgress = document.getElementById("download-progress");
  const csvList = document.getElementById("csv-files-list");
  const searchCsv = document.getElementById("search-csv");
  const clearSearchBtn = document.getElementById("clear-search-btn");
  let allFiles = [];

  const loadCsvFiles = async () => {
    try {
      const response = await fetch("Data/list_of_csv_files.txt");
      const data = await response.text();
      allFiles = data.trim().split("\n");
      displayCsvFiles(allFiles);
    } catch (error) {
      console.error("Error loading CSV files:", error);
      csvList.innerHTML = "<li>Error loading file list</li>";
    }
  };

  const displayCsvFiles = (files) => {
    csvList.innerHTML = files
      .map((file) => {
        const dateMatch = file.match(/(\d{4}_\d{2}_\d{2})\.csv/);
        const date = dateMatch ? dateMatch[1] : "";
        return `
          <li>
              <a href="preview.html?date=${date}" class="csv-link">${file}</a>
              <button class="download-button" data-file="${file}">
                 <img
                  src="assets/icons/download.svg"
                  alt="ZIP folder"
                  class="icon"
                  aria-hidden="true" />
                  Download
              </button>
          </li>
      `;
      })
      .join("");

    // Add click handlers for download buttons
    document.querySelectorAll(".download-button").forEach((button) => {
      button.addEventListener("click", (e) => {
        e.preventDefault();
        const fileName = button.dataset.file;
        const link = document.createElement("a");
        link.href = `Data/${fileName}`;
        link.download = fileName;
        link.click();
      });
    });
  };

  const downloadAllCsvs = async () => {
    try {
      downloadCsvsBtn.disabled = true;
      downloadProgress.classList.remove("visually-hidden");

      const zip = new JSZip();

      for (const csvFile of allFiles) {
        const response = await fetch(`Data/${csvFile.trim()}`);
        const blob = await response.blob();
        zip.file(csvFile.trim(), blob);
      }

      const zipBlob = await zip.generateAsync({ type: "blob" });
      saveAs(zipBlob, "nepse_data_all.zip");

      downloadCsvsBtn.disabled = false;
      downloadProgress.classList.add("visually-hidden");
    } catch (error) {
      console.error("Error creating ZIP:", error);
      downloadCsvsBtn.disabled = false;
      downloadProgress.classList.add("visually-hidden");
      alert("Error creating ZIP file. Please try again.");
    }
  };

  const filterFiles = (searchTerm) => {
    if (!searchTerm) {
      displayCsvFiles(allFiles);
      return;
    }
    const filteredFiles = allFiles.filter((file) =>
      file.toLowerCase().includes(searchTerm.toLowerCase())
    );
    displayCsvFiles(filteredFiles);
  };

  // Event Listeners
  downloadCsvsBtn.addEventListener("click", downloadAllCsvs);

  searchCsv.addEventListener("input", (e) => {
    const searchTerm = e.target.value;
    clearSearchBtn.classList.toggle("visually-hidden", !searchTerm);
    filterFiles(searchTerm);
  });

  clearSearchBtn.addEventListener("click", () => {
    searchCsv.value = "";
    clearSearchBtn.classList.add("visually-hidden");
    displayCsvFiles(allFiles);
  });

  // Initialize
  loadCsvFiles();
});
