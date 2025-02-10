// Helper function to format date
const formatDate = (date) => {
  const options = {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  };
  return new Date(date).toLocaleDateString("en-US", options);
};

// Update last modified date
const updateLastModifiedDate = async () => {
  try {
    const lastUpdatedElement = document.getElementById("last-updated-date");
    if (lastUpdatedElement) {
      const response = await fetch("Data/list_of_csv_files.txt");
      if (response.ok) {
        const text = await response.text();
        const firstLine = text.split("\n")[0];
        if (firstLine) {
          const dateParts = firstLine.replace(".csv", "").split("_");
          const dateStr = `${dateParts[0]}-${dateParts[1]}-${dateParts[2]}`;
          lastUpdatedElement.textContent = `Last updated: ${formatDate(
            dateStr
          )}`;
        } else {
          lastUpdatedElement.textContent = "Last updated: No data available";
        }
      } else {
        lastUpdatedElement.textContent =
          "Last updated: Unable to fetch update time";
      }
    }
  } catch (error) {
    console.error("Error getting last modified date:", error);
    const lastUpdatedElement = document.getElementById("last-updated-date");
    if (lastUpdatedElement) {
      lastUpdatedElement.textContent =
        "Last updated: Unable to fetch update time";
    }
  }
};

// Initialize common functionality
document.addEventListener("DOMContentLoaded", () => {
  updateLastModifiedDate();
});
