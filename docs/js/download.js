document.addEventListener("DOMContentLoaded", () => {
  const downloadCsvsBtn = document.getElementById("download-csvs-btn");
  const downloadProgress = document.getElementById("download-progress");
  const csvList = document.getElementById("csv-files-list");
  const searchCsv = document.getElementById("search-csv");
  const clearSearchBtn = document.getElementById("clear-search-btn");
  let allFiles = [];

  const loadCsvFiles = async () => {
    try {
      const response = await fetch("Data/");
      const data = await response.text();
      // Extract all CSV file names from directory listing
      allFiles = Array.from(data.matchAll(/href="([^"]*\.csv)"/g))
        .map((match) => match[1])
        .sort()
        .reverse(); // Most recent first

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
              <a href="preview.html?date=${date}" class="csv-link">${file.replace(
          "/docs/Data/",
          ""
        )}</a>
              <button class="download-button" data-file="${file.replace(
                "/docs/Data/",
                ""
              )}">
                  <span class="material-symbols-outlined">download</span>
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

      // Download all files and add to zip
      const downloads = allFiles.map(async (file) => {
        const response = await fetch(`Data/${file.replace("/docs/Data/", "")}`);
        const blob = await response.blob();
        zip.file(file.replace("/docs/Data/", ""), blob);
      });

      await Promise.all(downloads);

      // Generate and download zip
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
