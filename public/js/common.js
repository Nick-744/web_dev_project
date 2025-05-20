/* ----------- For the bg animation in auth pages! ----------
   --- Handle Smooth Background Transition for Auth Pages --- */
window.addEventListener('DOMContentLoaded', () => {
    const bg = document.querySelector('.auth-background');
    const isAuthPage = ['/login', '/register'].includes(window.location.pathname);

    if (bg && isAuthPage) {
        // Ensure background starts hidden and then fades in smoothly
        bg.classList.remove('visible'); // Reset state if needed

        // Move z-index BEFORE fade-in completes
        setTimeout(() => {
            bg.style.zIndex = '-1';
        }, 100);

        setTimeout(() => {
            bg.classList.add('visible'); // Triggers CSS fade-in
        }, 50); // Shorter delay for faster responsiveness
    }

    document.querySelectorAll('a[href]').forEach(link => {
        link.addEventListener('click', (e) => {
            const url = new URL(link.href, window.location.origin);
            const isTargetAuth = ['/login', '/register'].includes(url.pathname);

            if (bg) {
                // Smooth fade-out before navigation
                bg.classList.remove('visible');
                e.preventDefault();
                setTimeout(() => window.location.href = link.href, 800);
            }
        });
    });
});

// ----- Animation - General -----
window.addEventListener('DOMContentLoaded', () => {
    const header = document.querySelector('.top-bar');
    const footer = document.querySelector('.footer');
    const hamburgerBtn = document.getElementById('hamburgerBtn');
    const navMenu = document.getElementById('navMenu');
    const pageContainer = document.querySelector('.page-container');
    const ticketsContainer = document.querySelector('.tickets-container');
    const overlay = document.getElementById('globeOverlay');

    // Header & Footer Animation (One-Time)
    const hasAnimated = sessionStorage.getItem('headerFooterAnimated');
    if (!hasAnimated) {
        header?.classList.add('fade-in-once');
        sessionStorage.setItem('headerFooterAnimated', 'true');
    } else {
        header?.classList.add('show-instant');
        footer?.classList.add('show-instant');
    }

    // Footer Appearance
    if (footer) {
        const observer = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    footer.classList.add('visible');
                }
            });
        }, { threshold: 0.1 });
        observer.observe(footer);
    }

    // Hamburger Logic
    hamburgerBtn?.addEventListener('click', () => {
        navMenu.classList.toggle('show');
        hamburgerBtn.classList.toggle('open');
        document.body.style.overflow = navMenu.classList.contains('show') ? 'hidden' : 'hidden';
    });

    document.addEventListener('click', (e) => {
        if (!navMenu.contains(e.target) && !hamburgerBtn.contains(e.target)) {
            navMenu.classList.remove('show');
            hamburgerBtn.classList.remove('open');
            document.body.style.overflowY = 'auto';  // Allow vertical scrolling
            document.body.style.overflowX = 'hidden'; // Prevent horizontal scrolling
        }
    });

    // Fade-In on Load
    [pageContainer, ticketsContainer].forEach(el => {
        if (el) requestAnimationFrame(() => el.classList.add('fade-in'));
    });

    if (overlay) overlay.classList.add('fade-out'); // Hide overlay after load

    // Fade-Out + Overlay Before Navigation
    document.querySelectorAll('a[href]').forEach(link => {
        const url = new URL(link.href, window.location.origin);

        if (url.origin === window.location.origin) {
            link.addEventListener('click', (e) => {
                e.preventDefault();

                const formBox = document.querySelector('.floating-form-box');
                const globe = document.getElementById('globeViz');
                if (formBox) formBox.classList.add('slide-out');
                if (globe) {
                    globe.classList.remove('fade-in');
                    globe.classList.add('fade-out');
                }

                // Trigger fade-out for content
                [pageContainer, ticketsContainer].forEach(el => {
                    if (el) {
                        el.classList.remove('fade-in');
                        el.classList.add('fade-out');
                    }
                });

                // Bring back overlay immediately
                if (overlay) overlay.classList.remove('fade-out');

                setTimeout(() => {
                    window.location.href = link.href;
                }, 500); // Match transition time
            });
        }
    });
});
