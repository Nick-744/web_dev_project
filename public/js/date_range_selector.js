document.addEventListener('DOMContentLoaded', () => {
    const fromSel    = document.getElementById('fromInput');
    const toSel      = document.getElementById('toInput');
    const tripSel    = document.getElementById('tripType');
    const depInput   = document.getElementById('departureDate');
    const retInput   = document.getElementById('returnDate');
    const retWrapper = document.getElementById('returnDateContainer');

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let picker = null;
    let outboundPrices = {};
    let inboundPrices  = {};
    let currentPrices  = {};
    let clickCounter   = 0;

    function pricesAPI(from, to) {
        return `/api/price-calendar?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
    }

    async function fetchPrices(from, to) {
        if (!from || !to) return {};
        try {
            const res = await fetch(pricesAPI(from, to));
            const data = await res.json();
            const map = {};
            data.forEach(({ date, price }) => (map[date] = price));
            return map;
        } catch (err) {
            console.error('Price fetch failed:', err);
            return {};
        }
    }

    async function initPicker(show = false) {
        if (picker) picker.destroy();

        const from = fromSel.value;
        const to = toSel.value;
        const tripType = tripSel.value;

        if (!from || !to || !tripType) return;

        outboundPrices = await fetchPrices(from, to);
        inboundPrices = await fetchPrices(to, from);
        currentPrices = outboundPrices;
        clickCounter = 0;

        const isRoundtrip = tripType === 'roundtrip';

        picker = new easepick.create({
            element: depInput,
            css: ['https://cdn.jsdelivr.net/npm/@easepick/bundle@1.2.1/dist/index.css'],
            zIndex: 10000,
            calendars: 1,
            readonly: true,
            plugins: isRoundtrip ? ['LockPlugin', 'RangePlugin'] : ['LockPlugin'],
            LockPlugin: { minDate: today },
            RangePlugin: { elementEnd: retInput },
            setup(pkr) {
                pkr.on('view', ({ detail: { view, date, target } }) => {
                    if (view !== 'CalendarDay') return;
                    const d = date.format('YYYY-MM-DD');
                    const price = currentPrices[d];
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

                if (isRoundtrip) {
                    pkr.on('click', (e) => {
                        const target = e.detail?.target || e.target;
                        if (!target) return;

                        const classList = target.classList;

                        // Ignore clicks on navigation or price tags
                        if (classList.contains('next-button') || classList.contains('price')) {
                            return;
                        }

                        // Process only clicks on valid day cells
                        if (classList.contains('day') || classList.contains('price-tag')) {
                            clickCounter++;

                            if (clickCounter === 1) {
                                currentPrices = inboundPrices;
                            } 
                            else if (clickCounter === 2) {
                                clickCounter = 0;
                                setTimeout(() => {
                                    const startDate = pkr.getStartDate();
                                    const endDate = pkr.getEndDate();

                                    if (startDate && endDate) {
                                        depInput.value = startDate.format('YYYY-MM-DD');
                                        retInput.value = endDate.format('YYYY-MM-DD');
                                    } else {
                                        depInput.value = '';
                                        retInput.value = '';
                                        console.warn('Still null, forcing reset.');
                                    }

                                    currentPrices = outboundPrices;
                                    pkr.hide();
                                }, 0);
                            }
                        }
                    });
                } else {
                    pkr.on('select', ({ detail: { date } }) => {
                        depInput.value = date.format('YYYY-MM-DD');
                        console.log(`- departureDate SET to: ${depInput.value}`);
                    });
                }
            }
        });

        if (isRoundtrip) {
            retWrapper.classList.add('show');
        } else {
            retWrapper.classList.remove('show');
            retInput.value = '';
        }

        if (show) {
            setTimeout(() => picker.show(), 0);
        }
    }

    [fromSel, toSel, tripSel].forEach(el =>
        el.addEventListener('change', () => {
            currentPrices = outboundPrices;
            clickCounter = 0;
            initPicker();
        })
    );

    document.addEventListener('click', (e) => {
        if (e.target === depInput || e.target === retInput) {
            if (clickCounter > 0) {
                clickCounter = 0;
                initPicker(true);
            }
            return;
        }
    });
});
