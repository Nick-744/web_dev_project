function removeFavorite(ticketId, flightId, airlineId) {
    fetch(`/api/favorites/remove?ticketId=${ticketId}&flightId=${flightId}&airlineId=${airlineId}`, { method: 'POST' })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                const card = document.getElementById(`fav-${ticketId}`);
                if (card) {
                    card.classList.add('removing');
                    setTimeout(() => card.remove(), 400);
                    heartBurst(card);
                }

                if (!document.querySelector('.favorite-card')) {
                    document.querySelector('.favorites-grid')?.remove();
                    const message = document.createElement('p');
                    message.className = 'no-favorites fade-in-card';
                    message.textContent = "You haven’t added any flights to your interest list yet!";
                    document.querySelector('.page-container').appendChild(message);
                }
            } else {
                showCustomToast("Failed to remove from favorites.");
            }
        })
        .catch(() => showCustomToast("Server error. Try again."));
}

function heartBurst(target) {
    for (let i = 0; i < 10; i++) {
        const particle = document.createElement('div');
        particle.className = 'heart-burst';
        document.body.appendChild(particle);

        const rect = target.getBoundingClientRect();
        particle.style.left = `${rect.left + rect.width / 2}px`;
        particle.style.top = `${rect.top + rect.height / 2}px`;

        const angle = Math.random() * 2 * Math.PI;
        const distance = 80 + Math.random() * 40;
        const x = Math.cos(angle) * distance;
        const y = Math.sin(angle) * distance;

        requestAnimationFrame(() => {
            particle.style.transform = `translate(${x}px, ${y}px) scale(1.5)`;
            particle.style.opacity = '0';
        });

        setTimeout(() => particle.remove(), 700);
    }
}

function showCustomToast(message) {
    let toast = document.createElement('div');
    toast.className = 'custom-toast';
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => toast.classList.add('visible'), 100);
    setTimeout(() => {
        toast.classList.remove('visible');
        setTimeout(() => toast.remove(), 300);
    }, 2000);
}
