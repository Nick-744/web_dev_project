console.log('[globe.js] Script loaded and running.');

window.addEventListener('load', () => {
    console.log('[globe.js] Window fully loaded.');

    const globeContainer = document.getElementById('globeViz');

    if (!globeContainer) {
        console.error('[globe.js] globeViz container NOT FOUND.');
        return;
    }

    if (typeof Globe !== 'function') {
        console.error('[globe.js] Globe is NOT loaded!');
        return;
    }

    const world = Globe()(globeContainer)
        .globeImageUrl('https://i.imgur.com/ZyNPC40.jpg')
        .backgroundColor('rgba(0,0,0,0)')
        .showAtmosphere(true)
        .atmosphereColor('#3a228a')
        .atmosphereAltitude(0.25);

    world.controls().autoRotate = true;
    world.controls().autoRotateSpeed = 0.3;

    console.log('[globe.js] Globe initialized successfully.');
});
