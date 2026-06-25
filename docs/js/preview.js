document.addEventListener("DOMContentLoaded", () => {
  const tableSearch = document.getElementById("table-search");
  const clearTableSearchBtn = document.getElementById("clear-table-search-btn");
  const tableContainer = document.getElementById("table-container");
  const noResultsMessage = document.getElementById("no-results-message");
  const datePicker = document.getElementById("date-picker");
  const prevDateBtn = document.getElementById("prev-date");
  const nextDateBtn = document.getElementById("next-date");
  const loadingSpinner = document.getElementById("loading-spinner");
  const resultMeta = document.getElementById("result-meta");
  const resultDate = document.getElementById("result-date");
  const resultCount = document.getElementById("result-count");
  const downloadCurrentWrap = document.getElementById("download-current");

  // Columns whose value is a signed change → colour green/red.
  const SIGNED_COLS = new Set([
    "Diff",
    "Diff %",
    "Close - LTP",
    "Close - LTP %",
  ]);

  let currentData = [];
  let availableDates = [];
  let currentDateIndex = -1;
  let currentSearchTerm = "";

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

  const showLoading = () => {
    loadingSpinner.classList.remove("visually-hidden");
    tableContainer.innerHTML = "";
  };
  const hideLoading = () => loadingSpinner.classList.add("visually-hidden");

  const createTable = (data) => {
    if (!data || !data.length) return "";
    const headers = Object.keys(data[0]).filter((h) => h !== "__parsed_extra");
    const headerRow = headers
      .map((h) => `<th>${escapeHtml(h)}</th>`)
      .join("");

    const rows = data
      .map((row) => {
        const cells = headers
          .map((h) => {
            const raw = row[h] == null ? "" : String(row[h]);
            let cls = "";
            if (h === "Symbol") {
              cls = "col-symbol";
            } else if (SIGNED_COLS.has(h)) {
              const n = parseFloat(raw.replace(/,/g, "").replace(/%/g, ""));
              if (!Number.isNaN(n) && n > 0) cls = "val-up";
              else if (!Number.isNaN(n) && n < 0) cls = "val-down";
            }
            return `<td${cls ? ` class="${cls}"` : ""}>${escapeHtml(
              raw
            )}</td>`;
          })
          .join("");
        return `<tr>${cells}</tr>`;
      })
      .join("");

    return `<table><thead><tr>${headerRow}</tr></thead><tbody>${rows}</tbody></table>`;
  };

  const filterData = (searchTerm) => {
    if (!searchTerm) return currentData;
    const term = searchTerm.toLowerCase();
    return currentData.filter((row) =>
      Object.values(row).some((value) =>
        String(value).toLowerCase().includes(term)
      )
    );
  };

  const updateMeta = (dateKey, shown) => {
    resultMeta.hidden = false;
    resultDate.textContent = window.NEPSE.formatArchiveDate(dateKey);
    const total = currentData.length;
    resultCount.textContent =
      shown === total
        ? `${total.toLocaleString()} symbols`
        : `${shown.toLocaleString()} of ${total.toLocaleString()} symbols`;
  };

  const renderCurrent = (dateKey) => {
    const data = currentSearchTerm ? filterData(currentSearchTerm) : currentData;
    tableContainer.innerHTML = createTable(data);
    noResultsMessage.classList.toggle("visually-hidden", data.length > 0);
    updateMeta(dateKey, data.length);
  };

  const formatDateForFile = (date) => {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}_${month}_${day}`;
  };

  const formatDateForDisplay = (dateStr) => dateStr.replace(/_/g, "-");

  const renderDownloadButton = (dateKey) => {
    downloadCurrentWrap.innerHTML = "";
    const btn = document.createElement("button");
    btn.className = "btn btn-sm csv-download-btn";
    btn.innerHTML =
      '<img src="assets/icons/download.svg" alt="" class="icon" /> Download this CSV';
    btn.addEventListener("click", () => {
      const link = document.createElement("a");
      link.href = `Data/${dateKey}.csv`;
      link.download = `${dateKey}.csv`;
      link.click();
    });
    downloadCurrentWrap.appendChild(btn);
  };

  const showError = (message) => {
    hideLoading();
    resultMeta.hidden = true;
    downloadCurrentWrap.innerHTML = "";
    tableContainer.innerHTML = `
      <div class="error-message">
        <span class="err-emoji" aria-hidden="true">⚠</span>
        ${escapeHtml(message)}
      </div>`;
  };

  const loadCSVData = async (dateKey) => {
    try {
      showLoading();
      const response = await fetch(`Data/${dateKey}.csv`);
      if (!response.ok) {
        showError(`No data available for ${formatDateForDisplay(dateKey)}`);
        return;
      }
      const csvText = await response.text();
      Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const data = (results.data || []).filter((r) =>
            Object.values(r).some((v) => String(v).trim() !== "")
          );
          if (!data.length) {
            showError(`No data available for ${formatDateForDisplay(dateKey)}`);
            return;
          }
          currentData = data;
          hideLoading();
          renderCurrent(dateKey);
          renderDownloadButton(dateKey);
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

  const updateNavigationButtons = () => {
    prevDateBtn.disabled = currentDateIndex <= 0;
    nextDateBtn.disabled = currentDateIndex >= availableDates.length - 1;
  };

  const goToDate = (dateKey) => {
    currentDateIndex = availableDates.indexOf(dateKey);
    loadCSVData(dateKey);
    updateNavigationButtons();
  };

  const initializeDatePicker = async () => {
    try {
      showLoading();
      const response = await fetch("Data/list_of_csv_files.txt");
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.text();
      availableDates = data
        .trim()
        .split("\n")
        .map((file) => file.match(/(\d{4}_\d{2}_\d{2})\.csv/)?.[1])
        .filter(Boolean)
        .sort();

      if (availableDates.length === 0) {
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
            goToDate(formatDateForFile(selectedDates[0]));
          }
        },
      });

      const dateParam = new URLSearchParams(window.location.search).get("date");
      currentDateIndex = dateParam
        ? availableDates.indexOf(dateParam)
        : availableDates.length - 1;
      if (currentDateIndex === -1)
        currentDateIndex = availableDates.length - 1;

      const initialDate = availableDates[currentDateIndex];
      fp.setDate(formatDateForDisplay(initialDate), false);
      loadCSVData(initialDate);
      updateNavigationButtons();
    } catch (error) {
      console.error("Error initializing date picker:", error);
      showError("Error loading available dates");
    }
  };

  // --- search ---
  tableSearch.addEventListener("input", (e) => {
    currentSearchTerm = e.target.value;
    clearTableSearchBtn.classList.toggle("visually-hidden", !currentSearchTerm);
    const dateKey = availableDates[currentDateIndex];
    renderCurrent(dateKey);
  });

  clearTableSearchBtn.addEventListener("click", () => {
    currentSearchTerm = "";
    tableSearch.value = "";
    clearTableSearchBtn.classList.add("visually-hidden");
    renderCurrent(availableDates[currentDateIndex]);
  });

  // --- date navigation ---
  prevDateBtn.addEventListener("click", () => {
    if (currentDateIndex > 0) {
      const newDate = availableDates[currentDateIndex - 1];
      datePicker._flatpickr.setDate(formatDateForDisplay(newDate), false);
      goToDate(newDate);
    }
  });

  nextDateBtn.addEventListener("click", () => {
    if (currentDateIndex < availableDates.length - 1) {
      const newDate = availableDates[currentDateIndex + 1];
      datePicker._flatpickr.setDate(formatDateForDisplay(newDate), false);
      goToDate(newDate);
    }
  });

  initializeDatePicker();
});
