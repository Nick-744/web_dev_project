async function loadCities() {
    try {
        const response = await fetch('/api/cities');
        if (!response.ok) throw new Error('Failed to fetch cities');

        const cities = await response.json();
        const fromSelect = document.getElementById('fromInput');
        const toSelect = document.getElementById('toInput');

        cities.forEach(city => {
            const fromOption = document.createElement('option');
            fromOption.value = city;
            fromOption.textContent = city;
            fromSelect.appendChild(fromOption);

            const toOption = document.createElement('option');
            toOption.value = city;
            toOption.textContent = city;
            toSelect.appendChild(toOption);
        });
    } catch (error) {
        console.error('Error loading cities:', error);
    }
}

window.addEventListener('DOMContentLoaded', () => {
    loadCities();

    const returnContainer = document.getElementById('returnDateContainer');
    const tripTypeSelect = document.getElementById('tripType');
    const returnDateInput = document.getElementById('returnDate');

    function updateReturnDateVisibility() {
        if (tripTypeSelect.value === 'roundtrip') {
            returnContainer.classList.add('show');
        } else {
            returnContainer.classList.remove('show');
            returnDateInput.value = "";
        }
    }

    tripTypeSelect.addEventListener('change', updateReturnDateVisibility);
    updateReturnDateVisibility();
});

document.addEventListener('DOMContentLoaded', () => {
    const formBox = document.querySelector('.floating-form-box');
    const globe = document.getElementById('globeViz');
    const form = document.getElementById('flightForm');

    form.addEventListener('submit', (e) => {
        e.preventDefault(); // Prevent immediate submit
        
        // Trigger form validation
        if (!form.checkValidity()) {
            form.reportValidity();
            return; // Invalid fields will show built-in validation
        }

        if (formBox) {
            formBox.classList.add('slide-out'); // Trigger slide-out
        }
        if (globe) {
            globe.classList.remove('fade-in');
            globe.classList.add('fade-out');
        }

        // Submit after animation completes
        setTimeout(() => {
            form.submit();
        }, 500); // Match animation duration
    });
});
