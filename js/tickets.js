    const tripType = document.getElementById("tripType");
    const returnDateContainer = document.getElementById("returnDateContainer");

    tripType.addEventListener("change", () => {
      if (tripType.value === "roundtrip") {
        returnDateContainer.style.display = "block";
      } else {
        returnDateContainer.style.display = "none";
      }
    });