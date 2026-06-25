// Shared helpers across all pages.

// Parse a "YYYY_MM_DD" / "YYYY-MM-DD" string into a *local* Date.
// Building from parts avoids the UTC-midnight off-by-one you get from
// `new Date("2026-06-24")` in negative-offset timezones.
const parseArchiveDate = (raw) => {
  const [y, m, d] = raw.replace(/[_-]/g, "-").split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
};

// "2026_06_24" -> "June 24, 2026"
const formatArchiveDate = (raw) => {
  const date = parseArchiveDate(raw);
  if (!date) return raw;
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

// "2026_06_24" -> "Wed"
const weekdayShort = (raw) => {
  const date = parseArchiveDate(raw);
  if (!date) return "";
  return date.toLocaleDateString("en-US", { weekday: "short" });
};

// expose for the page-specific scripts
window.NEPSE = { parseArchiveDate, formatArchiveDate, weekdayShort };

// Fill any "#last-updated-date" element with the newest archived date.
const updateLastModifiedDate = async () => {
  const el = document.getElementById("last-updated-date");
  if (!el) return;
  try {
    const response = await fetch("Data/list_of_csv_files.txt");
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const firstLine = (await response.text()).trim().split("\n")[0];
    const dateKey = firstLine && firstLine.replace(".csv", "").trim();
    // The element only holds the date; each page supplies its own label.
    el.textContent = dateKey ? formatArchiveDate(dateKey) : "No data available";
  } catch (error) {
    console.error("Error getting last modified date:", error);
    el.textContent = "unavailable";
  }
};

// Responsive navigation toggle.
const initNav = () => {
  const toggle = document.getElementById("nav-toggle");
  const links = document.getElementById("nav-links");
  if (!toggle || !links) return;

  toggle.addEventListener("click", () => {
    const open = links.classList.toggle("open");
    toggle.setAttribute("aria-expanded", String(open));
  });

  // Collapse after tapping a link on mobile.
  links.addEventListener("click", (e) => {
    if (e.target.closest("a")) {
      links.classList.remove("open");
      toggle.setAttribute("aria-expanded", "false");
    }
  });
};

document.addEventListener("DOMContentLoaded", () => {
  initNav();
  updateLastModifiedDate();
});
