// Date Picker

const checkIn = flatpickr("#checkIn", {
  dateFormat: "m/d/Y",
  minDate: "today",
  onChange: function(selectedDates) {
    // When a date is picked, update check-out's minDate
    if (selectedDates.length > 0) {
      checkOut.set("minDate", selectedDates[0]);
    }
  }
});

const checkOut = flatpickr("#checkOut", {
  dateFormat: "m/d/Y",
  minDate: "today"
});

document.getElementById("flightForm").addEventListener("submit", function (e) {
  e.preventDefault();

  if (!this.checkValidity()) {
    this.reportValidity(); // shows browser's native error messages
    return;
  }

  // Extra manual check in case of odd Flatpickr behavior
  const checkInVal = document.getElementById('checkIn').value;
  if (!checkInVal) {
    alert("Please select a Check In date!");
    return;
  }
});

// Globe Animation

const globe = Globe()
  (document.getElementById('globeViz'))
  .globeImageUrl('https://i.imgur.com/ZyNPC40.jpg')
  .arcsData([])
  .pointsData([]) // <- add this
  .pointAltitude(0.015)
  .pointColor(() => '#f97316') // orange points
  .pointRadius(0.3)
  .arcColor(() => ['#ffffff', '#f97316'])
  .arcDashLength(0.3)
  .arcDashGap(1)
  .arcDashInitialGap(() => Math.random())
  .arcDashAnimateTime(2000)
  .enablePointerInteraction(false);

globe.controls().autoRotate = true;
globe.controls().autoRotateSpeed = 0.3;
globe.pointOfView({ lat: 30, lng: 0, altitude: 2 }, 0);

const fromSelect = document.getElementById('fromInput');
const toSelect = document.getElementById('toInput');
Object.keys(CITY_COORDS).forEach(city => {
  fromSelect.add(new Option(city, city));
  toSelect.add(new Option(city, city));
});

let arcs = [];
let airplane = null;
let flightInterval = null;
let flightProgress = 0;

function latLngToCartesian(lat, lng, altitude = 1.01) {
  const phi = (90 - lat) * Math.PI / 180;
  const theta = (lng + 180) * Math.PI / 180;
  const radius = globe.getGlobeRadius() * altitude;
  return {
    x: radius * Math.sin(phi) * Math.cos(theta),
    y: radius * Math.cos(phi),
    z: radius * Math.sin(phi) * Math.sin(theta)
  };
}

function startAirplaneFlight(start, end) {
  const THREE = window.THREE;
  if (airplane) globe.scene().remove(airplane);
  flightProgress = 0;

  const startVec = new THREE.Vector3(...Object.values(latLngToCartesian(start.lat, start.lng)));
  const endVec = new THREE.Vector3(...Object.values(latLngToCartesian(end.lat, end.lng)));
  const midVec = new THREE.Vector3(...Object.values(latLngToCartesian(
    (start.lat + end.lat) / 2,
    (start.lng + end.lng) / 2,
    1.2
  )));
  const curve = new THREE.QuadraticBezierCurve3(startVec, midVec, endVec);

  const geometry = new THREE.ConeGeometry(0.3, 1, 8);
  geometry.rotateX(Math.PI / 2);
  const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
  airplane = new THREE.Mesh(geometry, material);
  globe.scene().add(airplane);

  if (flightInterval) clearInterval(flightInterval);
  flightInterval = setInterval(() => {
    if (flightProgress >= 1) {
      clearInterval(flightInterval);
      return;
    }
    flightProgress += 0.01;
    const pos = curve.getPoint(flightProgress);
    const tangent = curve.getTangent(flightProgress);
    airplane.position.copy(pos);
    airplane.lookAt(pos.clone().add(tangent));
  }, 30);
}

function clearFlights() {
  arcs = [];
  globe.arcsData([]);
  globe.pointsData([]); // Clear previous pins
  if (airplane) {
    globe.scene().remove(airplane);
    airplane = null;
  }
}

function updateGlobe() {
  const fromCity = fromSelect.value;
  const toCity = toSelect.value;

  if (!CITY_COORDS[fromCity] || !CITY_COORDS[toCity]) return;

  if (fromCity === toCity) {
    alert("Source and destination cannot be the same!");
    resetToDefaultWithRandomFlights();
    return;
  }

  clearFlights();

  const from = CITY_COORDS[fromCity];
  const to = CITY_COORDS[toCity];

  arcs.push({
    startLat: from.lat,
    startLng: from.lng,
    endLat: to.lat,
    endLng: to.lng
  });

  globe.arcsData(arcs);
  globe.controls().autoRotate = false;

  const midLat = (from.lat + to.lat) / 2;
  const midLng = (from.lng + to.lng) / 2;
  globe.pointOfView({ lat: midLat, lng: midLng, altitude: 2 }, 2000);

  // Add pins at the two cities
  globe.pointsData([
    { lat: from.lat, lng: from.lng },
    { lat: to.lat, lng: to.lng }
  ]);

  startAirplaneFlight(from, to);
}

function resetToDefaultWithRandomFlights() {
  globe.pointOfView({ lat: 30, lng: 0, altitude: 2 }, 1000);
  globe.controls().autoRotate = true;
  clearFlights();
  startRandomFlights();
}

// Start random flights at launch
function startRandomFlights() {
  const cities = Object.keys(CITY_COORDS);

  for (let i = 0; i < 10; i++) {
    let fromCity, toCity;
    do {
      fromCity = cities[Math.floor(Math.random() * cities.length)];
      toCity = cities[Math.floor(Math.random() * cities.length)];
    } while (fromCity === toCity);

    const from = CITY_COORDS[fromCity];
    const to = CITY_COORDS[toCity];

    arcs.push({
      startLat: from.lat,
      startLng: from.lng,
      endLat: to.lat,
      endLng: to.lng
    });
  }

  globe.arcsData(arcs);
}

startRandomFlights();

// Trigger only on button or dropdown change
document.getElementById('checkBtn').addEventListener('click', updateGlobe);
fromSelect.addEventListener('change', updateGlobe);
toSelect.addEventListener('change', updateGlobe);

window.addEventListener('resize', () => {
  globe.width([window.innerWidth]);
  globe.height([window.innerHeight]);
});

