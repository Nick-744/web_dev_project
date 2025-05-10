// tickets.js
// Function to fetch and display tickets
const tripType = document.getElementById("tripType");
const returnDateContainer = document.getElementById("returnDateContainer");
const departureDateBlock = document.getElementById("departureDateBlock");
const form = document.querySelector(".ticket-form");
const errorMsg = document.getElementById("dateError");
// Function to update layout based on trip type
function updateTripTypeLayout() {
    if (tripType.value === "roundtrip") {
      returnDateContainer.style.display = "block";
      departureDateBlock.classList.remove("colspan-2");
    } else {
      returnDateContainer.style.display = "none";
      departureDateBlock.classList.add("colspan-2");
    }
  }

// Call it once on page load
window.addEventListener("DOMContentLoaded", updateTripTypeLayout);

// Also call it when trip type changes
tripType.addEventListener("change", updateTripTypeLayout);



// Validate dates on form submit


form.addEventListener("submit", function (e) {
    errorMsg.textContent = ""; // clear previous
  const departureDate = form.querySelector('input[type="date"]');
  const returnDate = returnDateContainer.querySelector('input[type="date"]');

  if (tripType.value === "roundtrip") {
    const depValue = new Date(departureDate.value);
    const retValue = new Date(returnDate.value);

    if (retValue < depValue) {
      e.preventDefault(); // Stop form submission
      alert("Return date must be after the departure date.");
      errorMsg.textContent = "Return date must be after departure date.";
        errorMsg.classList.add("error-message");
      returnDate.focus();
    }
  }
});
