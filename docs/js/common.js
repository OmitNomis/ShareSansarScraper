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
      const response = await fetch("Data/combined_excel.xlsx");
      if (response.ok) {
        const lastModified = response.headers.get("last-modified");
        lastUpdatedElement.textContent = `Last updated: ${formatDate(
          lastModified
        )}`;
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

// Handle navigation active states
const updateNavigationState = () => {
  const currentPath = window.location.pathname;
  const navLinks = document.querySelectorAll(".main-nav a");

  navLinks.forEach((link) => {
    const linkPath = link.getAttribute("href");
    if (currentPath.endsWith(linkPath)) {
      link.classList.add("active");
    } else {
      link.classList.remove("active");
    }
  });
};

// Initialize common functionality
document.addEventListener("DOMContentLoaded", () => {
  updateLastModifiedDate();
  updateNavigationState();
});
