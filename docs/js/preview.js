document.addEventListener("DOMContentLoaded", () => {
  const tableSearch = document.getElementById("table-search");
  const clearTableSearchBtn = document.getElementById("clear-table-search-btn");
  const tableContainer = document.getElementById("table-container");
  const noResultsMessage = document.getElementById("no-results-message");
  const datePicker = document.getElementById("date-picker");
  const prevDateBtn = document.getElementById("prev-date");
  const nextDateBtn = document.getElementById("next-date");
  const loadingSpinner = document.getElementById("loading-spinner");

  let currentData = [];
  let availableDates = [];
  let currentDateIndex = -1;
  let currentSearchTerm = "";

  const showLoading = () => {
    loadingSpinner.classList.remove("visually-hidden");
    tableContainer.innerHTML = "";
  };

  const hideLoading = () => {
    loadingSpinner.classList.add("visually-hidden");
  };

  const createTable = (data) => {
    if (!data || !data.length) return "";

    const headers = Object.keys(data[0]);
    const headerRow = headers.map((h) => `<th>${h}</th>`).join("");
    const rows = data
      .map((row) => {
        return `<tr>${headers
          .map((h) => `<td>${row[h] || ""}</td>`)
          .join("")}</tr>`;
      })
      .join("");

    return `
            <table>
                <thead><tr>${headerRow}</tr></thead>
                <tbody>${rows}</tbody>
            </table>
        `;
  };

  const filterData = (searchTerm) => {
    if (!searchTerm) {
      return currentData;
    }
    return currentData.filter((row) =>
      Object.values(row).some((value) =>
        String(value).toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
  };

  const formatDateForFile = (date) => {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}_${month}_${day}`;
  };

  const formatDateForDisplay = (dateStr) => {
    return dateStr.replace(/_/g, "-");
  };

  const addDownloadButton = (date) => {
    const existingButton = document.querySelector(".csv-download-btn");
    if (existingButton) {
      existingButton.remove();
    }

    const downloadBtn = document.createElement("button");
    downloadBtn.className = "btn btn-primary csv-download-btn";
    downloadBtn.innerHTML = `
        <img
                  src="assets/icons/download.svg"
                  alt="ZIP folder"
                  class="icon"
                  aria-hidden="true" />
        Download Current CSV
    `;
    downloadBtn.addEventListener("click", () => {
      const link = document.createElement("a");
      link.href = `Data/${date}.csv`;
      link.download = `${date}.csv`;
      link.click();
    });

    const searchRow = document.querySelector(".search-row");
    searchRow.after(downloadBtn);
  };

  const initializeDatePicker = async () => {
    try {
      showLoading();
      const response = await fetch("Data/list_of_csv_files.txt");
      const data = await response.text();
      availableDates = data
        .trim()
        .split("\n")
        .map((file) => file.match(/(\d{4}_\d{2}_\d{2})\.csv/)?.[1])
        .filter(Boolean)
        .sort();

      if (availableDates.length === 0) {
        hideLoading();
        showError("No data files available");
        return;
      }

      const fp = flatpickr(datePicker, {
        dateFormat: "Y-m-d",
        minDate: formatDateForDisplay(availableDates[0]),
        maxDate: formatDateForDisplay(
          availableDates[availableDates.length - 1]
        ),
        enable: availableDates.map((date) => formatDateForDisplay(date)),
        onChange: (selectedDates) => {
          if (selectedDates.length > 0) {
            const selectedDate = formatDateForFile(selectedDates[0]);
            currentDateIndex = availableDates.indexOf(selectedDate);
            loadCSVData(selectedDate);
            updateNavigationButtons();
            addDownloadButton(selectedDate);
          }
        },
      });

      const urlParams = new URLSearchParams(window.location.search);
      const dateParam = urlParams.get("date");

      currentDateIndex = dateParam
        ? availableDates.indexOf(dateParam)
        : availableDates.length - 1;

      if (currentDateIndex === -1) currentDateIndex = availableDates.length - 1;

      const initialDate = availableDates[currentDateIndex];
      fp.setDate(formatDateForDisplay(initialDate), false);
      loadCSVData(initialDate);
      updateNavigationButtons();
      addDownloadButton(initialDate);
    } catch (error) {
      console.error("Error initializing date picker:", error);
      hideLoading();
      showError("Error loading available dates");
    }
  };

  const updateNavigationButtons = () => {
    prevDateBtn.disabled = currentDateIndex <= 0;
    nextDateBtn.disabled = currentDateIndex >= availableDates.length - 1;
  };

  const showError = (message) => {
    hideLoading();
    tableContainer.innerHTML = `
            <div class="error-message">
                <span class="material-symbols-outlined">error</span>
                ${message}
            </div>
        `;
  };

  const loadCSVData = async (date) => {
    try {
      showLoading();
      const response = await fetch(`Data/${date}.csv`);
      if (!response.ok) {
        showError(`No data available for ${formatDateForDisplay(date)}`);
        return;
      }

      const csvText = await response.text();
      Papa.parse(csvText, {
        header: true,
        complete: (results) => {
          if (!results.data || results.data.length === 0) {
            showError(`No data available for ${formatDateForDisplay(date)}`);
            return;
          }
          currentData = results.data;

          if (currentSearchTerm) {
            const filteredData = filterData(currentSearchTerm);
            tableContainer.innerHTML = createTable(filteredData);
          } else {
            tableContainer.innerHTML = createTable(currentData);
          }
          hideLoading();
        },
        error: (error) => {
          console.error("Error parsing CSV:", error);
          showError("Error parsing data");
        },
      });
    } catch (error) {
      console.error("Error loading CSV data:", error);
      showError("Error loading data");
    }
  };

  tableSearch.addEventListener("input", (e) => {
    currentSearchTerm = e.target.value;
    const filteredData = filterData(currentSearchTerm);
    tableContainer.innerHTML = createTable(filteredData);
    noResultsMessage.classList.toggle(
      "visually-hidden",
      filteredData.length > 0
    );
    clearTableSearchBtn.classList.toggle("visually-hidden", !currentSearchTerm);
  });

  clearTableSearchBtn.addEventListener("click", () => {
    currentSearchTerm = "";
    tableSearch.value = "";
    tableContainer.innerHTML = createTable(currentData);
    noResultsMessage.classList.add("visually-hidden");
    clearTableSearchBtn.classList.add("visually-hidden");
  });

  prevDateBtn.addEventListener("click", () => {
    if (currentDateIndex > 0) {
      currentDateIndex--;
      const newDate = availableDates[currentDateIndex];
      datePicker._flatpickr.setDate(formatDateForDisplay(newDate), false);
      loadCSVData(newDate);
      updateNavigationButtons();
      addDownloadButton(newDate);
    }
  });

  nextDateBtn.addEventListener("click", () => {
    if (currentDateIndex < availableDates.length - 1) {
      currentDateIndex++;
      const newDate = availableDates[currentDateIndex];
      datePicker._flatpickr.setDate(formatDateForDisplay(newDate), false);
      loadCSVData(newDate);
      updateNavigationButtons();
      addDownloadButton(newDate);
    }
  });

  initializeDatePicker();
});
