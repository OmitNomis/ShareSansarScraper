document.addEventListener("DOMContentLoaded", () => {
  // DOM Elements
  const lastUpdatedDateEl = document.getElementById("last-updated-date");
  const downloadCsvsBtn = document.getElementById("download-csvs-btn");
  const toggleCsvBtn = document.getElementById("toggle-csv-btn");
  const toggleIcon = document.getElementById("toggle-icon");
  const toggleText = document.getElementById("toggle-text");
  const csvListContainer = document.getElementById("csv-list-container");
  const csvFilesList = document.getElementById("csv-files-list");
  const searchCsvInput = document.getElementById("search-csv");
  const clearSearchBtn = document.getElementById("clear-search-btn");
  const tableContainer = document.getElementById("table-container");
  const tableSearchInput = document.getElementById("table-search");
  const clearTableSearchBtn = document.getElementById("clear-table-search-btn");
  const downloadProgress = document.getElementById("download-progress");
  const noResultsMessage = document.getElementById("no-results-message");

  let currentTableData = []; // Store the currently displayed table data
  let currentSearchTerm = ""; // Store the current table search term

  // --- Utility Functions ---

  // Fetch and display last updated date
  function fetchLastUpdatedDate() {
    fetch("Data/combined_excel.xlsx")
      .then((response) => response.headers.get("Last-Modified"))
      .then((lastModified) => {
        const formattedDate = new Date(lastModified).toLocaleString();
        lastUpdatedDateEl.textContent = formattedDate;
      })
      .catch((error) => {
        console.error("Error fetching last updated date:", error);
        lastUpdatedDateEl.textContent = "Failed to load last updated date.";
      });
  }

  // --- Event Handlers ---

  // Toggle CSV list visibility
  function setupToggleCSVList() {
    console.log("Setting up toggle CSV list");
    console.log("toggleIcon:", toggleIcon);

    toggleCsvBtn.addEventListener("click", () => {
      const isExpanded = toggleCsvBtn.getAttribute("aria-expanded") === "true";
      toggleCsvBtn.setAttribute("aria-expanded", !isExpanded);
      csvListContainer.style.display = isExpanded ? "none" : "block";

      // Debug statements
      console.log("isExpanded:", isExpanded);
      console.log(
        "Setting toggleIcon textContent to:",
        isExpanded ? "arrow_drop_down" : "arrow_drop_up"
      );

      // Ensure the icon names match Material Icons
      toggleIcon.textContent = isExpanded ? "arrow_drop_down" : "arrow_drop_up";
      toggleText.textContent = isExpanded ? "Show CSVs" : "Hide CSVs";
    });
  }

  // Download all CSVs as ZIP
  function setupDownloadAllCSVs() {
    downloadCsvsBtn.addEventListener("click", () => {
      downloadCsvsBtn.disabled = true; // Disable button
      downloadProgress.classList.remove("visually-hidden");

      fetch("Data/list_of_csv_files.txt")
        .then((response) => response.text())
        .then((csvList) => {
          const csvFiles = csvList.trim().split("\n");
          const zip = new JSZip();
          const fetchPromises = csvFiles.map((csvFile) =>
            fetch(`Data/${csvFile.trim()}`)
              .then((response) => response.blob())
              .then((blob) => zip.file(csvFile.trim(), blob))
          );

          Promise.all(fetchPromises)
            .then(() =>
              zip.generateAsync({
                type: "blob",
              })
            )
            .then((content) => {
              saveAs(content, "all_csv_files.zip");
              downloadCsvsBtn.disabled = false; // Re-enable button
              downloadProgress.classList.add("visually-hidden");
            })
            .catch((error) => {
              console.error("Error generating ZIP:", error);
              downloadCsvsBtn.disabled = false; // Re-enable on error
              downloadProgress.classList.add("visually-hidden");
              alert("Failed to download ZIP. Please try again.");
            });
        })
        .catch((error) => {
          console.error("Error fetching CSV list:", error);
          downloadCsvsBtn.disabled = false; // Re-enable on error
          downloadProgress.classList.add("visually-hidden");
          alert("Failed to fetch CSV list.  Please try again.");
        });
    });
  }

  // Fetch and display the list of CSV files
  function fetchAndDisplayCSVList() {
    fetch("Data/list_of_csv_files.txt")
      .then((response) => response.text())
      .then((csvList) => {
        const csvFiles = csvList.trim().split("\n");
        csvFilesList.innerHTML = ""; // Clear previous list
        csvFiles.forEach((csvFile) => {
          const listItem = document.createElement("li");
          listItem.setAttribute("role", "listitem");

          const link = document.createElement("a");
          link.href = `Data/${csvFile.trim()}`;
          link.textContent = csvFile.trim();
          link.addEventListener("click", (event) => {
            event.preventDefault();
            fetchAndDisplayCSVData(csvFile.trim()); // Preview
          });

          const downloadButton = document.createElement("button");
          downloadButton.innerHTML = `<span class="material-symbols-outlined">download</span> Download`;
          downloadButton.classList.add("download-button");
          downloadButton.addEventListener("click", (event) => {
            event.preventDefault();
            const a = document.createElement("a");
            a.href = link.href;
            a.download = csvFile.trim(); // Set filename for download
            a.click();
          });

          listItem.appendChild(link);
          listItem.appendChild(downloadButton);
          csvFilesList.appendChild(listItem);
        });

        if (csvFiles.length > 0) {
          setupSearchFilter(csvFiles);
        }
      })
      .catch((error) => {
        console.error("Error fetching CSV files list:", error);
        csvFilesList.innerHTML = "<li>Failed to load CSV files.</li>";
      });
  }

  // Set up CSV list search
  function setupSearchFilter() {
    searchCsvInput.addEventListener("input", () => {
      const searchTerm = searchCsvInput.value.toLowerCase();
      filterCSVList(searchTerm);
    });

    clearSearchBtn.addEventListener("click", () => {
      searchCsvInput.value = "";
      filterCSVList("");
      clearSearchBtn.classList.add("visually-hidden");
    });

    searchCsvInput.addEventListener("input", () => {
      clearSearchBtn.classList.toggle(
        "visually-hidden",
        searchCsvInput.value.length === 0
      );
    });
  }

  // Filter the CSV list
  function filterCSVList(searchTerm) {
    const listItems = csvFilesList.querySelectorAll("li");
    listItems.forEach((item) => {
      const link = item.querySelector("a");
      const text = link.textContent.toLowerCase();
      item.style.display = text.includes(searchTerm) ? "flex" : "none";
    });
  }

  // Fetch and display CSV data in a table
  function fetchAndDisplayCSVData(csvFile) {
    fetch(`Data/${csvFile}`)
      .then((response) => response.text())
      .then((csvData) => {
        Papa.parse(csvData, {
          header: true,
          dynamicTyping: true,
          skipEmptyLines: true,
          complete: (results) => {
            currentTableData = results.data; // Store for filtering
            // Apply existing table search term, if any
            if (currentSearchTerm) {
              renderTable(filterTableData(currentSearchTerm));
              tableSearchInput.value = currentSearchTerm; // Keep search input populated
              clearTableSearchBtn.classList.remove("visually-hidden");
            } else {
              renderTable(currentTableData);
            }

            //Focus on the input after rendering
            tableSearchInput.focus();

            // Check if any data exists after initial load
            if (results.data.length === 0) {
              noResultsMessage.classList.remove("visually-hidden"); // Show "No results"
            } else {
              noResultsMessage.classList.add("visually-hidden");
            }
          },
          error: (error) => {
            console.error("CSV parsing error:", error);
            tableContainer.innerHTML = "<p>Error parsing CSV data.</p>";
            tableSearchInput.disabled = true;
          },
        });
      })
      .catch((error) => {
        console.error("Error fetching CSV data:", error);
        tableContainer.innerHTML = "<p>Error fetching CSV data.</p>";
        tableSearchInput.disabled = true;
      });
  }

  // Render the parsed CSV data as an HTML table
  function renderTable(data) {
    tableContainer.innerHTML = ""; // Clear previous content

    if (!data || data.length === 0) {
      tableContainer.innerHTML =
        "<p>No data to display. Select a CSV from the list above.</p>";
      return;
    }

    const table = document.createElement("table");
    const thead = document.createElement("thead");
    const tbody = document.createElement("tbody");

    // Create table header
    const headerRow = document.createElement("tr");
    if (data[0]) {
      Object.keys(data[0]).forEach((key) => {
        const th = document.createElement("th");
        th.textContent = key;
        headerRow.appendChild(th);
      });
    }
    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Create table body
    data.forEach((rowData) => {
      const row = document.createElement("tr");
      Object.values(rowData).forEach((value) => {
        const td = document.createElement("td");
        td.textContent = value === null ? "" : value;
        row.appendChild(td);
      });
      tbody.appendChild(row);
    });
    table.appendChild(tbody);
    tableContainer.appendChild(table);
  }

  // Set up table data search
  function setupTableSearch() {
    tableSearchInput.addEventListener("input", () => {
      currentSearchTerm = tableSearchInput.value.toLowerCase(); // Store search term
      const filteredData = filterTableData(currentSearchTerm);
      renderTable(filteredData);
      // Show "No results" message if filtered data is empty
      if (filteredData.length === 0) {
        noResultsMessage.classList.remove("visually-hidden");
      } else {
        noResultsMessage.classList.add("visually-hidden");
      }
    });

    clearTableSearchBtn.addEventListener("click", () => {
      tableSearchInput.value = "";
      currentSearchTerm = ""; // Clear stored search term
      renderTable(currentTableData); // Re-render original data
      clearTableSearchBtn.classList.add("visually-hidden");
      noResultsMessage.classList.add("visually-hidden"); // Hide "No results"
    });

    tableSearchInput.addEventListener("input", () => {
      clearTableSearchBtn.classList.toggle(
        "visually-hidden",
        tableSearchInput.value.length === 0
      );
      // Show "No results" immediately as user types
      if (filterTableData(tableSearchInput.value.toLowerCase()).length === 0) {
        noResultsMessage.classList.remove("visually-hidden");
      } else {
        noResultsMessage.classList.add("visually-hidden");
      }
    });
  }

  // Filter the table data
  function filterTableData(searchTerm) {
    if (!currentTableData) {
      return []; // No data to filter
    }
    return currentTableData.filter((row) => {
      return Object.values(row).some((value) => {
        return (
          value !== null && value.toString().toLowerCase().includes(searchTerm)
        );
      });
    });
  }

  // --- Initialization ---

  fetchLastUpdatedDate();
  fetchAndDisplayCSVList(); // Removed populateCSVSelect
  setupToggleCSVList();
  setupDownloadAllCSVs();
  setupTableSearch(); // Moved this up, as it's independent
});
