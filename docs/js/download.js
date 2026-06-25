document.addEventListener("DOMContentLoaded", () => {
  const downloadCsvsBtn = document.getElementById("download-csvs-btn");
  const progress = document.getElementById("download-progress");
  const progressText = document.getElementById("progress-text");
  const progressPct = document.getElementById("progress-pct");
  const progressFill = document.getElementById("progress-fill");
  const progressBar = progress.querySelector(".progress-bar");
  const csvList = document.getElementById("csv-files-list");
  const searchCsv = document.getElementById("search-csv");
  const clearSearchBtn = document.getElementById("clear-search-btn");
  const fileCount = document.getElementById("file-count");

  let allFiles = [];
  let building = false;

  const escapeHtml = (s) =>
    String(s).replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        }[c])
    );

  const setProgress = (pct, text) => {
    const clamped = Math.max(0, Math.min(100, Math.round(pct)));
    progressFill.style.width = `${clamped}%`;
    progressPct.textContent = `${clamped}%`;
    progressBar.setAttribute("aria-valuenow", String(clamped));
    if (text) progressText.textContent = text;
  };

  const loadCsvFiles = async () => {
    try {
      const response = await fetch("Data/list_of_csv_files.txt");
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.text();
      allFiles = data
        .trim()
        .split("\n")
        .map((f) => f.trim())
        .filter(Boolean);
      displayCsvFiles(allFiles);
    } catch (error) {
      console.error("Error loading CSV files:", error);
      csvList.innerHTML = '<li class="list-empty">Error loading file list.</li>';
      fileCount.textContent = "0 files";
    }
  };

  const displayCsvFiles = (files) => {
    fileCount.textContent = `${files.length.toLocaleString()} file${
      files.length === 1 ? "" : "s"
    }`;

    if (!files.length) {
      csvList.innerHTML = '<li class="list-empty">No files match your search.</li>';
      return;
    }

    csvList.innerHTML = files
      .map((file) => {
        const key = (file.match(/(\d{4}_\d{2}_\d{2})/) || [])[1] || "";
        const nice = key ? window.NEPSE.formatArchiveDate(key) : escapeHtml(file);
        const dow = key ? window.NEPSE.weekdayShort(key) : "";
        return `
          <li>
            <a class="file-date" href="preview.html?date=${key}">
              <img src="assets/icons/calendar-month.svg" alt="" class="icon" style="width:18px;height:18px" />
              ${nice} <span class="dow">${dow}</span>
            </a>
            <span class="file-actions">
              <a class="btn btn-sm" href="preview.html?date=${key}">Preview</a>
              <button class="btn btn-sm btn-cyan download-button" data-file="${escapeHtml(
                file
              )}" aria-label="Download ${escapeHtml(file)}">
                <img src="assets/icons/download.svg" alt="" class="icon" /> CSV
              </button>
            </span>
          </li>`;
      })
      .join("");

    csvList.querySelectorAll(".download-button").forEach((button) => {
      button.addEventListener("click", () => {
        const fileName = button.dataset.file;
        const link = document.createElement("a");
        link.href = `Data/${fileName}`;
        link.download = fileName;
        link.click();
      });
    });
  };

  const filterFiles = (searchTerm) => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return displayCsvFiles(allFiles);
    displayCsvFiles(
      allFiles.filter((file) => file.toLowerCase().includes(term))
    );
  };

  const downloadAllCsvs = async () => {
    if (building) return;
    building = true;
    downloadCsvsBtn.disabled = true;
    progress.hidden = false;
    setProgress(0, "Starting…");

    try {
      const zip = new JSZip();
      const total = allFiles.length;
      let failed = 0;

      for (let i = 0; i < total; i++) {
        const csvFile = allFiles[i].trim();
        try {
          const response = await fetch(`Data/${csvFile}`);
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          zip.file(csvFile, await response.blob());
        } catch (err) {
          failed++;
          console.warn(`Skipped ${csvFile}:`, err);
        }
        // Fetching takes the bar up to 90%; zipping covers the last 10%.
        setProgress(
          ((i + 1) / total) * 90,
          `Fetching files… ${i + 1} / ${total}`
        );
      }

      const zipBlob = await zip.generateAsync({ type: "blob" }, (meta) => {
        setProgress(90 + meta.percent * 0.1, `Compressing… ${Math.round(meta.percent)}%`);
      });

      setProgress(100, failed ? `Done (${failed} file(s) skipped)` : "Done!");
      saveAs(zipBlob, "nepse_data_all.zip");
    } catch (error) {
      console.error("Error creating ZIP:", error);
      setProgress(0, "Something went wrong. Please try again.");
    } finally {
      downloadCsvsBtn.disabled = false;
      building = false;
      // Leave the final status visible briefly, then reset.
      setTimeout(() => {
        progress.hidden = true;
        setProgress(0, "Starting…");
      }, 4000);
    }
  };

  // --- events ---
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
    searchCsv.focus();
  });

  loadCsvFiles();
});
