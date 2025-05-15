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
        Athens:       { lat: 37.9838,  lng: 23.7275   },
        London:       { lat: 51.5074,  lng: -0.1278   },
        Paris:        { lat: 48.8566,  lng: 2.3522    },
        NewYork:      { lat: 40.7128,  lng: -74.0060  },
        Tokyo:        { lat: 35.6764,  lng: 139.6500  },
        Sydney:       { lat: -33.8688, lng: 151.2093  },
        Dubai:        { lat: 25.2048,  lng: 55.2708   },
        Rome:         { lat: 41.9028,  lng: 12.4964   },
        Berlin:       { lat: 52.5200,  lng: 13.4050   },
        Madrid:       { lat: 40.4168,  lng: -3.7038   },
        Toronto:      { lat: 43.6532,  lng: -79.3832  },
        LosAngeles:   { lat: 34.0522,  lng: -118.2437 },
        Beijing:      { lat: 39.9042,  lng: 116.4074  },
        Moscow:       { lat: 55.7558,  lng: 37.6176   },
        Cairo:        { lat: 30.0444,  lng: 31.2357   },
        Bangkok:      { lat: 13.7563,  lng: 100.5018  },
        Singapore:    { lat: 1.3521,   lng: 103.8198  },
        RioDeJaneiro: { lat: -22.9068, lng: -43.1729  },
        Johannesburg: { lat: -26.2041, lng: 28.0473   },
        MexicoCity:   { lat: 19.4326,  lng: -99.1332  }
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

    // Start from left and far away
    globe.pointOfView({ lat: 30, lng: -90, altitude: 5 }, 0);
    globe.controls().autoRotate = false;

    // Trigger Fade-In Class and Animate to Center View
    setTimeout(() => {
        el.classList.add('fade-in'); // CSS handles opacity and zoom

        globe.pointOfView({ lat: 30, lng: 0, altitude: 3 }, 2000); // Smooth move over 2s
        globe.controls().autoRotate = true;
        globe.controls().autoRotateSpeed = 0.4;
    }, 300); // Delay to ensure rendering starts before animation

    setTimeout(() => {
        document.getElementById('globeOverlay')?.classList.add('fade-out');
    }, 500); // Adjust timing to match your globe animation

    generateRandomFlights();

    console.log('[globe.js] Globe initialized with smooth transitions.');
});

window.addEventListener('resize', () => {
    if (globe) {
        globe.width(window.innerWidth);
        globe.height(window.innerHeight);
    }
});
