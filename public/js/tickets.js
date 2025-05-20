// -- JS for Animations and Filter Panel Behavior --
document.addEventListener('DOMContentLoaded', () => {
    const tickets = document.querySelectorAll('.ticket-card');
    const titles = document.querySelectorAll('.tickets-container h2');
    const panel = document.querySelector('.filter-controls');

    // Title Animation
    titles.forEach((title, idx) => {
        title.style.opacity = '0';
        title.style.transform = 'translateX(-100px)';
        title.style.transition = 'transform 1.2s ease, opacity 1.2s ease';
        setTimeout(() => {
            title.style.opacity = '1';
            title.style.transform = 'translateX(0)';
        }, 200 + idx * 200);
    });

    // Cards Fade-In on Scroll
    const observer = new IntersectionObserver((entries, obs) => {
        entries.forEach((entry, idx) => {
            if (entry.isIntersecting) {
                setTimeout(() => entry.target.classList.add('show'), idx * 150);
                obs.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });

    tickets.forEach(card => observer.observe(card));

    // Filter Panel Expand/Collapse for Mobile
    if (panel) {
        panel.addEventListener('click', (e) => {
            if (window.innerWidth <= 900 && e.target === panel) {
                panel.classList.toggle('active');
            }
        });

        document.addEventListener('click', (e) => {
            if (!panel.contains(e.target) && window.innerWidth <= 900) {
                panel.classList.remove('active');
            }
        });

        window.addEventListener('resize', () => {
            if (window.innerWidth > 900) {
                panel.classList.remove('active');
            }
        });
    }
});

function loadMoreFlights() {
    const currentLimit = parseInt(new URLSearchParams(window.location.search).get('limit')) || 5;
    const newLimit = currentLimit + 5;

    const params = new URLSearchParams(window.location.search);
    params.set('limit', newLimit);

    window.location.search = params.toString();
}

function loadMoreReturnFlights() {
    const currentRLimit = parseInt(new URLSearchParams(window.location.search).get('rlimit')) || 5;
    const newRLimit = currentRLimit + 5;

    const params = new URLSearchParams(window.location.search);
    params.set('rlimit', newRLimit);

    window.location.search = params.toString();
}

// -- Heart Icon Toggle and Animation --
function toggleFavorite(buttonElement, ticketId, flightId, airlineId) {
    const isLoggedIn = window.IS_LOGGED_IN;  // read from global context
    const icon = buttonElement.querySelector('.heart-icon');

    if (!isLoggedIn) {
        showCustomToast("You need to log in to use Favorites!");
        return;
    }

    const adding = !icon.classList.contains('filled');
    icon.classList.toggle('filled');
    icon.innerHTML = adding ? '&#10084;' : '&#9825;';

    icon.classList.add('pop-spin');
    setTimeout(() => icon.classList.remove('pop-spin'), 800);

    if (adding) burstEffect(icon);

    const url = `/api/favorites/${adding ? 'add' : 'remove'}?ticketId=${ticketId}&flightId=${flightId}&airlineId=${airlineId}`;

    fetch(url, { method: 'POST' })
        .then(res => res.json())
        .then(data => {
            if (!data.success) {
                icon.classList.toggle('filled');
                icon.innerHTML = adding ? '&#9825;' : '&#10084;';
                showCustomToast("Failed to update favorites.");
            }
        })
        .catch(() => {
            icon.classList.toggle('filled');
            icon.innerHTML = adding ? '&#9825;' : '&#10084;';
            showCustomToast("Server error. Try again.");
        });
}

function burstEffect(target) {
    for (let i = 0; i < 8; i++) {
        const particle = document.createElement('div');
        particle.className = 'heart-burst';
        document.body.appendChild(particle);

        const rect = target.getBoundingClientRect();
        particle.style.left = `${rect.left + rect.width / 2}px`;
        particle.style.top = `${rect.top + rect.height / 2}px`;

        const angle = Math.random() * 2 * Math.PI;
        const distance = 60 + Math.random() * 40;

        const x = Math.cos(angle) * distance;
        const y = Math.sin(angle) * distance;

        particle.style.transform = `translate(${x}px, ${y}px)`;
        setTimeout(() => particle.remove(), 600);
    }
}

/* Custom Toast Notification if User is not logged in */
function showCustomToast(message) {
    let existingToast = document.querySelector('.custom-toast');
    if (existingToast) existingToast.remove();

    const toast = document.createElement('div');
    toast.className = 'custom-toast';

    toast.innerHTML = `
        <span>${message}</span>
        <button onclick="window.location.href='/login'" class="toast-btn">Login</button>
    `;

    document.body.appendChild(toast);

    setTimeout(() => toast.classList.add('visible'), 10);

    // Auto-dismiss after 4 seconds if not clicked
    setTimeout(() => {
        toast.classList.remove('visible');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}
