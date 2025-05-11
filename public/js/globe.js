console.log('[globe.js] Script loaded.');

let globe;

window.addEventListener('load', () => {
    const el = document.getElementById('globeViz');
    const footer = document.querySelector('.footer');

    if (!el) return console.error('[globe.js] #globeViz not found');
    if (typeof Globe !== 'function') return console.error('[globe.js] Globe library not loaded');

    // Initialize Globe
    globe = Globe()(el)
        .globeImageUrl('https://i.imgur.com/ZyNPC40.jpg')
        .backgroundColor('rgba(0,0,0,0)')
        .showAtmosphere(true)
        .atmosphereColor('#3a228a')
        .atmosphereAltitude(0.25)
        .pointsData([])
        .arcsData([])
        .pointAltitude(0.015)
        .pointColor(() => '#f97316')
        .pointRadius(0.3)
        .arcColor(() => ['#ffffff', '#f97316'])
        .arcDashLength(0.3)
        .arcDashGap(1)
        .arcDashInitialGap(() => Math.random())
        .arcDashAnimateTime(2000)
        .enablePointerInteraction(false);

    const CITY_COORDS = window.CITY_COORDS || {
        Athens: { lat: 37.9838, lng: 23.7275 },
        London: { lat: 51.5074, lng: -0.1278 },
        Paris: { lat: 48.8566, lng: 2.3522 },
        NewYork: { lat: 40.7128, lng: -74.0060 },
        Tokyo: { lat: 35.6764, lng: 139.6500 },
        Sydney: { lat: -33.8688, lng: 151.2093 },
        Dubai: { lat: 25.2048, lng: 55.2708 }
    };

    const cityList = Object.keys(CITY_COORDS);

    const generateRandomFlights = (count = 15) => {
        const arcs = Array.from({ length: count }, () => {
            let from, to;
            do {
                from = cityList[Math.floor(Math.random() * cityList.length)];
                to = cityList[Math.floor(Math.random() * cityList.length)];
            } while (from === to);

            return {
                startLat: CITY_COORDS[from].lat,
                startLng: CITY_COORDS[from].lng,
                endLat: CITY_COORDS[to].lat,
                endLng: CITY_COORDS[to].lng
            };
        });
        globe.arcsData(arcs);
    };

    const resizeGlobe = () => {
        globe.width(window.innerWidth);
        globe.height(window.innerHeight);
    };

    resizeGlobe();

    // Smooth Rotation Start
    globe.controls().autoRotate = true;
    globe.controls().autoRotateSpeed = 0;
    globe.pointOfView({ lat: 30, lng: 0, altitude: 2 }, 0);

    // Gradually Increase Rotation Speed for Smooth Start
    let currentSpeed = 0;
    const targetSpeed = 0.4;
    const acceleration = 0.01;

    const increaseRotationSpeed = () => {
        if (currentSpeed < targetSpeed) {
            currentSpeed += acceleration;
            globe.controls().autoRotateSpeed = currentSpeed;
            requestAnimationFrame(increaseRotationSpeed);
        }
    };
    increaseRotationSpeed();

    generateRandomFlights();

    // Smooth Reveal of Globe and Footer
    setTimeout(() => {
        requestAnimationFrame(() => {
            el.classList.add('visible');
            footer?.classList.add('visible');
        });
    }, 500);

    console.log('[globe.js] Globe initialized with smooth transitions.');
});

window.addEventListener('resize', () => {
    if (globe) {
        globe.width(window.innerWidth);
        globe.height(window.innerHeight);
    }
});
