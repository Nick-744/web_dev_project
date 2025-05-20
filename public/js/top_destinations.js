document.addEventListener('DOMContentLoaded', () => {
    const overlay = document.getElementById('pageOverlay');
    
    // Fade-out overlay on arrival after small delay for smoothness
    setTimeout(() => {
        overlay.classList.add('hidden');
    }, 200);

    // Handle Navigation Fade-Out
    document.querySelectorAll('a[href]').forEach(link => {
        link.addEventListener('click', (e) => {
            const href = link.getAttribute('href');
            if (!href.startsWith('#') && !link.hasAttribute('data-no-fade')) {
                e.preventDefault();
                overlay.classList.remove('hidden');
                setTimeout(() => window.location.href = href, 500);
            }
        });
    });

    // Smooth image loading
    const images = document.querySelectorAll('.image-wrapper img');
    images.forEach(img => {
        if (img.complete) {
            img.classList.add('loaded');
        } else {
            img.addEventListener('load', () => img.classList.add('loaded'));
            img.addEventListener('error', () => img.classList.add('loaded'));
        }
    });

    // Initialize Chart Immediately
    const ctx = document.getElementById('destinationsChart').getContext('2d');
    const statsScript = document.getElementById('stats-data');
    const stats = statsScript ? JSON.parse(statsScript.textContent) : [];

    if (stats.length > 0) {
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: stats.map(d => d.name),
                datasets: [{
                    label: 'Favorites',
                    data: stats.map(d => d.favorites_count),
                    backgroundColor: '#f97316',
                    borderRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { beginAtZero: true },
                    x: { ticks: { maxRotation: 0, minRotation: 0 } }
                },
                plugins: {
                    //tooltip: { enabled: false }, // Hovering in the chart stats
                    legend: { display: false },
                    title: { display: false }
                }
            }
        });
    } else {
        document.getElementById('chartWrapper').style.display = 'none';
    }
});
