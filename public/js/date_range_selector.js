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

    // Keep track of loaded months and their price maps
    const monthCache = new Map();

    // Fetch only visible month
    async function fetchMonthPrices(from, to, year, month, targetStore = null) {
        const key = `${from}->${to}:${year}-${String(month).padStart(2, '0')}`;
        if (monthCache.has(key)) {
            if (targetStore) Object.assign(targetStore, monthCache.get(key));
            return;
        }

        try {
            const res = await fetch(`/api/price-calendar?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&year=${year}&month=${month}`);
            const json = await res.json();

            const entries = Object.fromEntries(json.map(({ date, price }) => [date, price]));

            if (targetStore) Object.assign(targetStore, entries); // Write into outbound/inbound
            monthCache.set(key, entries); // Cache for later
        } catch (err) {
            console.error('Month price fetch failed:', err);
        }
    }

    // Picker state
    let picker          = null; // Easepick instance
    let outboundPrices  = {};   // {date: price}
    let inboundPrices   = {};
    let currentPrices   = {};
    monthCache.clear(); // Reset cache on each init
    let clickCounter    = 0;    // Track clicks inside round-trip workflow
    let preservedStartDate = null;

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
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth() + 1;

        outboundPrices = {};
        inboundPrices = {};
        monthCache.clear();

        // Load outbound prices into outboundPrices
        await fetchMonthPrices(from, to, year, month, outboundPrices);

        // Load inbound prices into inboundPrices
        await fetchMonthPrices(to, from, year, month, inboundPrices);

        // Use outbound prices by default
        currentPrices = outboundPrices;

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
                const preloadedMonths = new Set(); // Track once-per-month prefetch

                // Render price tags on each calendar day
                pkr.on('view', async ({ detail: { view, date, target } }) => {
                    if (view !== 'CalendarDay') return;

                    const y = date.getFullYear();
                    const m = date.getMonth() + 1;
                    const d = date.getDate();
                    const ymd = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

                    const isInbound = (clickCounter === 1 && tripSel.value === 'roundtrip');
                    const dirFrom = isInbound ? toSel.value : fromSel.value;
                    const dirTo   = isInbound ? fromSel.value : toSel.value;
                    const store   = isInbound ? inboundPrices : outboundPrices;

                    const key = `${dirFrom}->${dirTo}:${y}-${String(m).padStart(2, '0')}`;

                    // ✅ Preload all dates for this month once
                    if (!monthCache.has(key) && !preloadedMonths.has(key)) {
                        preloadedMonths.add(key);
                        await fetchMonthPrices(dirFrom, dirTo, y, m, store);
                        // trigger full redraw of calendar view
                        pkr.setStartDate(preservedStartDate, true);

                        // Also manually set the plugin state:
                        const range = pkr.plugin?.RangePlugin;

                        if (range && preservedStartDate) {
                            range.state = 1; // 0 = idle, 1 = waiting for end date
                        }

                        return; // skip this cell until rerender
                    }

                    const price = store[ymd];
                    if (typeof price !== 'number' || isNaN(price)) return;
                    if (target.querySelector('.custom-tag')) return;

                    const tag = document.createElement('span');
                    tag.className = 'price-tag custom-tag';
                    tag.textContent = `€${price}`;
                    tag.style.cssText = `
                        display: block;
                        font-size: 0.75rem;
                    `;
                    target.append(tag);
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
                            preservedStartDate = picker.getStartDate();
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

        if (preservedStartDate) {
            picker.setStartDate(preservedStartDate, true);
            const range = picker.plugin?.RangePlugin;
            if (range) range.state = 1;
        }

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
