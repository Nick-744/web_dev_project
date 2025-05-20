document.addEventListener('DOMContentLoaded', () => {
    const fromSel        = document.getElementById('fromInput');
    const toSel          = document.getElementById('toInput');
    const tripSel        = document.getElementById('tripType');
    const depInput       = document.getElementById('departureDate');
    const retInput       = document.getElementById('returnDate');
    const retWrapper     = document.getElementById('returnDateContainer');

    // Helpers
    const today = (() => {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        return d;
    })();

    // Build REST endpoint URL
    const pricesAPI = (from, to) =>
        `/api/price-calendar?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;

    // Fetch prices and convert to { 'YYYY-MM-DD': price } map
    async function fetchPrices(from, to) {
        if (!from || !to) return {};
        try {
            const res  = await fetch(pricesAPI(from, to));
            const json = await res.json();
            return Object.fromEntries(json.map(({ date, price }) => [date, price]));
        } catch (err) {
            console.error('Price fetch failed:', err);
            return {};
        }
    }

    // Picker state
    let picker          = null; // Easepick instance
    let outboundPrices  = {};   // {date: price}
    let inboundPrices   = {};
    let currentPrices   = {};
    let clickCounter    = 0;    // Track clicks inside round-trip workflow

    // Initialise / re-initialise picker
    async function initPicker(openImmediately = false) {
        // destroy old instance (idempotent)
        if (picker) picker.destroy();

        /* Always keep return field visibility in sync with trip type
           – this single line eliminates the “show → hide → show” flicker */
        const isRoundtrip = tripSel.value === 'roundtrip';
        retWrapper.classList.toggle('show', isRoundtrip);

        // guard: need FROM / TO / tripType
        const from      = fromSel.value;
        const to        = toSel.value;
        const tripType  = tripSel.value;
        if (!from || !to || !tripType) return;

        // (re)load prices
        outboundPrices  = await fetchPrices(from, to);
        inboundPrices   = await fetchPrices(to, from);
        currentPrices   = outboundPrices;
        clickCounter    = 0;

        picker = new easepick.create({
            element     : depInput, // anchor input
            css         : ['https://cdn.jsdelivr.net/npm/@easepick/bundle@1.2.1/dist/index.css'],
            calendars   : 1,
            readonly    : true,
            zIndex      : 10_000,
            plugins     : isRoundtrip ? ['LockPlugin', 'RangePlugin']
                                      : ['LockPlugin'],
            LockPlugin  : { minDate: today },
            RangePlugin : { elementEnd: retInput },

            // Custom life-cycle hooks
            setup(pkr) {
                // Render price tags on each calendar day
                pkr.on('view', ({ detail: { view, date, target } }) => {
                    if (view !== 'CalendarDay') return;
                    const ymd   = date.format('YYYY-MM-DD');
                    const price = currentPrices[ymd];
                    if (!price) return;

                    let tag = target.querySelector('.price-tag');
                    if (!tag) {
                        tag = document.createElement('span');
                        tag.className = 'price-tag';
                        tag.style.cssText = 'display:block;font-size:0.75rem;';
                        target.append(tag);
                    }
                    tag.textContent = `€${price}`;
                });

                // ONE-WAY → simple select
                if (!isRoundtrip) {
                    pkr.on('select', ({ detail: { date } }) => {
                        depInput.value = date.format('YYYY-MM-DD');
                    });
                    return; // done
                }

                // ROUND-TRIP click logic
                pkr.on('click', (ev) => {
                    // filter out nav arrows / price-tags
                    const target = ev.detail?.target || ev.target;
                    const cls    = target?.classList;
                    if (!cls || cls.contains('next-button') || cls.contains('price')) return;

                    if (cls.contains('day') || cls.contains('price-tag')) {
                        clickCounter++;

                        // first click = switch to inbound prices
                        if (clickCounter === 1) {
                            currentPrices = inboundPrices;
                            return;
                        }

                        // second click = finalise range
                        if (clickCounter === 2) {
                            clickCounter  = 0;
                            setTimeout(() => {
                                const start = pkr.getStartDate();
                                const end   = pkr.getEndDate();

                                if (start && end) {
                                    depInput.value = start.format('YYYY-MM-DD');
                                    retInput.value = end.format('YYYY-MM-DD');
                                } else {
                                    // defensive reset (rare)
                                    depInput.value = '';
                                    retInput.value = '';
                                    console.warn('Range selection incomplete – reset.');
                                }

                                currentPrices = outboundPrices; // restore
                                pkr.hide();
                            }, 0);
                        }
                    }
                });
            }
        });

        // --- optionally open immediately
        if (openImmediately) setTimeout(() => picker.show(), 0);
    }

    // React to user parameter changes
    [fromSel, toSel, tripSel].forEach(el =>
        el.addEventListener('change', () => initPicker(/* open= */ false))
    );

    // Show picker when user clicks on either input
    document.addEventListener('click', (e) => {
        if (e.target === depInput || e.target === retInput) {
            /* if user re-opens while mid-range selection, reset logic */
            if (clickCounter > 0) {
                clickCounter  = 0;
                initPicker(/* open= */ true);
                return;
            }
            /* picker.show() will be called automatically */
        }
    });

    // Initialise for the first time (but keep closed)
    initPicker(false);
});
