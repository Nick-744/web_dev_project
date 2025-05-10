// public/js/globe.js  — centred, resize-safe random-flights
console.log('[globe.js] Script loaded.');

let globe;  // <-- needed outside for the resize handler

window.addEventListener('load', () => {
  const el = document.getElementById('globeViz');
  if (!el)  return console.error('[globe.js] #globeViz not found');
  if (typeof Globe !== 'function') return console.error('[globe.js] Globe lib missing');

  /* ---------- initialise globe --------------------------------------- */
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

  globe.width(window.innerWidth);
  globe.height(window.innerHeight);
  globe.controls().autoRotate = true;
  globe.controls().autoRotateSpeed = 0.3;
  globe.pointOfView({ lat: 30, lng: 0, altitude: 2 }, 0);

  /* ---------- random flights ----------------------------------------- */
  const CITY_COORDS = window.CITY_COORDS || {
    Athens:  { lat: 37.9838, lng: 23.7275 },
    London:  { lat: 51.5074, lng: -0.1278 },
    Paris:   { lat: 48.8566, lng: 2.3522 },
    NewYork: { lat: 40.7128, lng: -74.0060 },
    Tokyo:   { lat: 35.6764, lng: 139.6500 },
    Sydney:  { lat: -33.8688, lng: 151.2093 },
    Dubai:   { lat: 25.2048, lng: 55.2708 }
  };
  const cityList = Object.keys(CITY_COORDS);
  const arcs = [];

  function addRandomFlight() {
    let from, to;
    do {
      from = cityList[Math.random() * cityList.length | 0];
      to   = cityList[Math.random() * cityList.length | 0];
    } while (from === to);
    arcs.push({
      startLat: CITY_COORDS[from].lat,
      startLng: CITY_COORDS[from].lng,
      endLat:   CITY_COORDS[to].lat,
      endLng:   CITY_COORDS[to].lng
    });
  }
  function populateFlights(n = 15) {
    arcs.length = 0;
    for (let i = 0; i < n; i++) addRandomFlight();
    globe.arcsData(arcs);
  }
  populateFlights();
  setInterval(populateFlights, 20000);

  console.log('[globe.js] Globe ready.');
});

/* ---------- keep canvas perfectly centred on resize ------------------ */
window.addEventListener('resize', () => {
  if (globe) {
    globe.width(window.innerWidth);
    globe.height(window.innerHeight);
  }
});
