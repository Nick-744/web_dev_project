/* ─── open / close helpers ───────────────────────────── */
function toggleDateGrid(){
    const overlay = document.getElementById('dateGridContainer');
    if(overlay.style.display==='block'){ overlay.style.display='none'; return; }
    overlay.style.display='block';
    loadDateGrid();
}

function closeDateGrid(){ document.getElementById('dateGridContainer').style.display='none'; }

/* ─── fetch + render ─────────────────────────────────── */
function getCellClass(total, cheapest) {
    /*if (total === cheapest) return 'cell-green';
    if (total > cheapest * 1.9) return 'cell-red';*/
    if (total < 150) return 'cell-green';
    if (total > 300) return 'cell-red';
    return '';
}

function addDays(dateStr, n) {
    const d = new Date(dateStr);
    d.setDate(d.getDate() + n);
    return d.toISOString().split('T')[0];
}

function loadDateGrid() {
    const p = new URLSearchParams(location.search);

    const fromInput = p.get('fromInput');
    const toInput = p.get('toInput');
    const outStart = p.get('departureDate');
    const outEnd = addDays(outStart, 6);
    const retStart = outStart;
    const retEnd = addDays(retStart, 6);

    if (!fromInput || !toInput || !outStart) {
        alert('Please select valid From, To locations and a Departure Date before viewing the grid.');
        return;
    }

    const qs = new URLSearchParams({
        fromInput,
        toInput,
        outStart,
        outEnd,
        retStart,
        retEnd
    });

    fetch('/api/date-grid?' + qs.toString())
        .then(r => r.json())
        .then(d => drawGrid(d.outboundPrices, d.returnPrices))
        .catch(e => console.error('grid error', e));
}


/* ─── core renderer ──────────────────────────────────── */
function drawGrid(outB, retB) {
    const overlay = document.getElementById('dateGridContainer');

    /* ---------------- cheapest highlighting ---------------- */
    const totals = [];
    outB.forEach(o=>{
        retB.forEach(r=>{
        if(new Date(r.retDate) >= new Date(o.outDate))
            totals.push(o.min_out_price + r.min_ret_price);
        });
    });
    const cheapest = Math.min(...totals);

    /* ---------------- build table -------------------------- */
    let html = `<div class="date-grid">
        <button class="close-btn" onclick="closeDateGrid()" style="color: #FFFFFF;">✖</button>`;

    /* === HEADER === */
    html += `<div class="departure-label">Departure Dates</div>`;
    html += `<table><thead><tr>
                <th class="axis-lbl">Return&nbsp;↓</th>`;
    outB.forEach(o => html += `<th>${o.outDate}</th>`);
    /*html += `<th class="axis-lbl"></th></tr></thead><tbody>`;*/
    html += `</tr></thead><tbody>`; // No extra 'Departure' header column

    /* === BODY ===   (for every RETURN row) */
    retB.forEach((r, retIdx) => {
        html += `<tr>`;
        /* cells for each departure */
        /*first column empty*/
        html += `<td class="axis-lbl">${r.retDate}</td>`;
        outB.forEach((o, outIdx) => {
        const valid = retIdx >= outIdx;
        let cell="–";
        if(valid){
            const total = o.min_out_price + r.min_ret_price;
            const cls   =  getCellClass(total, cheapest);
            cell = `<span class="${cls}">€${total}</span>`;
        }
        html += `<td>${cell}</td>`;
        });
        /* right-hand RETURN date label */
        /*html += `<td class="axis-lbl ret-date">${r.retDate}</td></tr>`; rendundant*/
    });

    html += `</tbody></table>
            <div class="grid-footer">
        <!-- vertical navigation -->
        <button class="move-down" onclick="moveReturnDatesDown()">▼ Later Return</button>
        <button class="move-up" onclick="moveReturnDatesUp()"> ▲ Earlier Return</button>
        <button class="move-left" onclick="moveDepartureDatesLeft()">◄ Earlier Departure</button>
        <button class="move-right" onclick="moveDepartureDatesRight()">► Later Departure</button>
        

    </div>
    </div>`;
    sessionStorage.setItem('outB', JSON.stringify(outB));
    sessionStorage.setItem('retB', JSON.stringify(retB));

    overlay.innerHTML = html;
    console.log("final html:", html);
}

let returnDateOffset = 0;
function moveReturnDatesDown() {
    returnDateOffset += 1;

    const table = document.querySelector('.date-grid table tbody');
    //const firstRow = table.querySelector('tr');
   // if (firstRow) firstRow.remove(); // Remove the topmost row to keep the grid size fixed

    const currentReturnDates = [...table.querySelectorAll('tr > td.axis-lbl')]
        .map(td => td.textContent.trim())
        .filter(text => /^\d{4}-\d{2}-\d{2}$/.test(text));

    if (currentReturnDates.length === 0) {
        console.warn("No return dates found in the table!");
        return;
    }

    const lastDateStr = currentReturnDates[currentReturnDates.length - 1];
    const lastDate = new Date(lastDateStr);

    if (isNaN(lastDate)) {
        console.error("Invalid last return date:", lastDateStr);
        return;
    }

    lastDate.setDate(lastDate.getDate() + 1);
    const nextRetDate = lastDate.toISOString().split('T')[0];
    console.log("Moving return dates down to:", nextRetDate);

    const p = new URLSearchParams(location.search);
    const qs = new URLSearchParams({
        dir: 'ret',
        date: nextRetDate,
        fromInput: p.get('fromInput'),
        toInput: p.get('toInput')
    });

    fetch('/api/date-grid/day?' + qs.toString())
        .then(r => r.json())
        .then(d => {
            if (d.length > 0) {
                //appendNewReturnRow(d[0]); // Corrected to expect a raw array response
                table.querySelector('tr').remove();
                appendNewReturnRow(d[0]);
            } else {
                console.log("No new return prices found for date:", nextRetDate);
            }
        })
        .catch(e => console.error('grid error', e));
}

function appendNewReturnRow(returnPriceData) {
    if (!returnPriceData) return;

    const table = document.querySelector('.date-grid table tbody');
    const outB = JSON.parse(sessionStorage.getItem('outB'));
    if (!outB) {
        console.error("Outbound flight data missing in sessionStorage.");
        return;
    }

    const totals = [];
    outB.forEach(o => {
        if (new Date(returnPriceData.retDate) >= new Date(o.outDate)) {
            totals.push(o.min_out_price + returnPriceData.min_ret_price);
        }
    });
    const cheapest = Math.min(...totals);

    let html = `<tr>`;
    html += `<td class="axis-lbl">${returnPriceData.retDate}</td>`;
    outB.forEach(o => {
        const valid = new Date(returnPriceData.retDate) >= new Date(o.outDate);
        let cell = "–";
        if (valid) {
            const total = o.min_out_price + returnPriceData.min_ret_price;
            const cls = getCellClass(total, cheapest);
            cell = `<span class="${cls}">€${total}</span>`;
        }
        html += `<td>${cell}</td>`;
    });
    html += `</tr>`;

    table.insertAdjacentHTML('beforeend', html);
    // Update retB in sessionStorage
    const retB = JSON.parse(sessionStorage.getItem('retB')) || [];
    retB.push(returnPriceData);
    sessionStorage.setItem('retB', JSON.stringify(retB));
}

function moveReturnDatesUp() {
    //if (returnDateOffset <= 0) return; // Prevent negative offsets or over-scrolling

    returnDateOffset -= 1;

    const table = document.querySelector('.date-grid table tbody');
    //const lastRow = table.querySelector('tr:last-child');
    //if (lastRow) lastRow.remove();

    const currentReturnDates = [...table.querySelectorAll('tr > td.axis-lbl')]
        .map(td => td.textContent.trim())
        .filter(text => /^\d{4}-\d{2}-\d{2}$/.test(text));

    if (currentReturnDates.length === 0) {
        console.warn("No return dates found in the table!");
        return;
    }

    const firstDateStr = currentReturnDates[0];
    const firstDate = new Date(firstDateStr);

    if (isNaN(firstDate)) {
        console.error("Invalid first return date:", firstDateStr);
        return;
    }

    firstDate.setDate(firstDate.getDate() - 1);
    const prevRetDate = firstDate.toISOString().split('T')[0];
    console.log("Moving return dates up to:", prevRetDate);

    const p = new URLSearchParams(location.search);
    const qs = new URLSearchParams({
      dir: 'ret',  
      date: prevRetDate,
      fromInput: p.get('fromInput'),
      toInput: p.get('toInput')
    });

    fetch('/api/date-grid/day?' + qs.toString())
    .then(r => r.json())
    .then(d => {
        if (d.length > 0) {
            const lastRow = table.querySelector('tr:last-child');
            if (lastRow) lastRow.remove();
            prependReturnRow(d[0]); // or appendNewReturnRow depending on Up/Down
        } else {
            console.log("No previous return prices found for date:", prevRetDate);
        }
    })
    .catch(e => console.error('grid error', e));
}

function prependReturnRow(returnPriceData) {
    if (!returnPriceData) return;

    const table = document.querySelector('.date-grid table tbody');
    const outB = JSON.parse(sessionStorage.getItem('outB'));
    if (!outB) {
        console.error("Outbound flight data missing in sessionStorage.");
        return;
    }

    const totals = [];
    outB.forEach(o => {
        if (new Date(returnPriceData.retDate) >= new Date(o.outDate)) {
            totals.push(o.min_out_price + returnPriceData.min_ret_price);
        }
    });
    const cheapest = Math.min(...totals);

    let html = `<tr>`;
    html += `<td class="axis-lbl">${returnPriceData.retDate}</td>`;
    outB.forEach(o => {
        const valid = new Date(returnPriceData.retDate) >= new Date(o.outDate);
        let cell = "–";
        if (valid) {
            const total = o.min_out_price + returnPriceData.min_ret_price;
            const cls = getCellClass(total, cheapest);
            cell = `<span class="${cls}">€${total}</span>`;
        }
        html += `<td>${cell}</td>`;
    });
    html += `</tr>`;

    table.insertAdjacentHTML('afterbegin', html);
        // Update retB in sessionStorage (add at the start)
    const retB = JSON.parse(sessionStorage.getItem('retB')) || [];
    retB.unshift(returnPriceData);
    sessionStorage.setItem('retB', JSON.stringify(retB));
}

function moveDepartureDatesRight() {
    const tableHeadRow = document.querySelector('.date-grid table thead tr');
    const currentDepartureDates = [...tableHeadRow.querySelectorAll('th')]
        .map(th => th.textContent.trim())
        .filter(text => /^\d{4}-\d{2}-\d{2}$/.test(text));

    const lastDateStr = currentDepartureDates[currentDepartureDates.length - 1];
    const lastDate = new Date(lastDateStr);
    lastDate.setDate(lastDate.getDate() + 1);
    const nextDepDate = lastDate.toISOString().split('T')[0];

    const p = new URLSearchParams(location.search);
    const qs = new URLSearchParams({
        fromInput: p.get('fromInput'),
        toInput: p.get('toInput'),
        depDate: nextDepDate
    });

    fetch('/api/date-grid/column?' + qs.toString())
        .then(r => r.json())
        .then(data => {
            if (data && data.prices) {
                appendNewDepartureColumn(data.outDate, data.outboundPrice, data.prices);
            } else {
                console.log("No new column data found for", nextDepDate);
            }
        })
        .catch(e => console.error('grid error', e));
}

function appendNewDepartureColumn(outDate, outboundPrice, priceData) {
    if (!outDate || !priceData) return;

    const tableHeadRow = document.querySelector('.date-grid table thead tr');
    const tableBodyRows = document.querySelectorAll('.date-grid table tbody tr');

    // Remove first column to maintain grid size
    const firstDepartureHeader = tableHeadRow.querySelector('th:nth-child(2)');
    if (firstDepartureHeader) firstDepartureHeader.remove();

    tableBodyRows.forEach(row => {
        const firstCell = row.querySelector('td:nth-child(2)');
        if (firstCell) firstCell.remove();
    });

    // Add new departure date in header
    tableHeadRow.insertAdjacentHTML('beforeend', `<th>${outDate}</th>`);

    // Update outB in sessionStorage
    const outB = JSON.parse(sessionStorage.getItem('outB')) || [];
    outB.shift();
    outB.push({ outDate, min_out_price: outboundPrice });
    sessionStorage.setItem('outB', JSON.stringify(outB));

    // Calculate 'cheapest' across new prices for correct cell coloring
    const validTotals = priceData
        .filter(p => new Date(p.retDate) >= new Date(outDate))
        .map(p => p.totalPrice);
    const cheapest = validTotals.length ? Math.min(...validTotals) : Infinity;

    // Add cells for each return date
    tableBodyRows.forEach((row) => {
        const retDate = row.querySelector('td.axis-lbl').textContent.trim();
        const normalizedRetDate = new Date(retDate).toISOString().split('T')[0];
        const priceEntry = priceData.find(p => p.retDate === normalizedRetDate);

        let cell = "–";

        if (priceEntry && typeof priceEntry.totalPrice === 'number' && new Date(retDate) >= new Date(outDate)) {
            const total = priceEntry.totalPrice;
            const cls = getCellClass(total, cheapest);
            cell = `<span class="${cls}">€${total}</span>`;
        }

        row.insertAdjacentHTML('beforeend', `<td>${cell}</td>`);
    });
}

function moveDepartureDatesLeft() {
    const tableHeadRow = document.querySelector('.date-grid table thead tr');
    const currentDepartureDates = [...tableHeadRow.querySelectorAll('th')]
        .map(th => th.textContent.trim())
        .filter(text => /^\d{4}-\d{2}-\d{2}$/.test(text));

    const firstDateStr = currentDepartureDates[0];
    const firstDate = new Date(firstDateStr);

    //  Prevent scrolling left before the initial departure date
    const initialDepDate = new Date(new URLSearchParams(location.search).get('departureDate'));
    if (firstDate <= initialDepDate) {
        console.log("Already at the earliest departure date.");
        alert("Already at the earliest departure date.");
        return;
    }

    firstDate.setDate(firstDate.getDate() - 1);
    const prevDepDate = firstDate.toISOString().split('T')[0];

    const p = new URLSearchParams(location.search);
    const qs = new URLSearchParams({
        fromInput: p.get('fromInput'),
        toInput: p.get('toInput'),
        depDate: prevDepDate
    });

    fetch('/api/date-grid/column?' + qs.toString())
        .then(r => r.json())
        .then(data => {
            if (data && data.prices.length > 0) {
                prependNewDepartureColumn(data.outDate, data.outboundPrice, data.prices);
            } else {
                console.log(`No departure data found for ${prevDepDate}`);
            }
        })
        .catch(e => console.error('grid error', e));
}

function prependNewDepartureColumn(outDate, outboundPrice, priceData) {
    if (!outDate || !priceData) return;

    const tableHeadRow = document.querySelector('.date-grid table thead tr');
    const tableBodyRows = document.querySelectorAll('.date-grid table tbody tr');

    // Remove last column to keep 7 columns max
    const lastDepartureHeader = tableHeadRow.querySelector('th:last-child');
    if (lastDepartureHeader) lastDepartureHeader.remove();

    tableBodyRows.forEach(row => {
        const lastCell = row.querySelector('td:last-child');
        if (lastCell) lastCell.remove();
    });

    // Insert new Departure Date header after 'Return ↓'
    const referenceHeader = tableHeadRow.querySelector('th:nth-child(1)');
    referenceHeader.insertAdjacentHTML('afterend', `<th>${outDate}</th>`);

    const outB = JSON.parse(sessionStorage.getItem('outB')) || [];
    outB.pop(); // Remove last to keep grid size fixed
    outB.unshift({ outDate, min_out_price: outboundPrice });
    sessionStorage.setItem('outB', JSON.stringify(outB));

    // Compute cheapest value correctly
    const validTotals = priceData
        .filter(p => new Date(p.retDate) >= new Date(outDate))
        .map(p => p.totalPrice);
    const cheapest = validTotals.length ? Math.min(...validTotals) : Infinity;

    // Add cells for each return date row
    tableBodyRows.forEach((row) => {
        const retDate = row.querySelector('td.axis-lbl').textContent.trim();
        const normalizedRetDate = new Date(retDate).toISOString().split('T')[0];
        const priceEntry = priceData.find(p => p.retDate === normalizedRetDate);

        let cell = "–";

        if (priceEntry && typeof priceEntry.totalPrice === 'number' && new Date(retDate) >= new Date(outDate)) {
            const total = priceEntry.totalPrice;
            const cls = getCellClass(total, cheapest);
            cell = `<span class="${cls}">€${total}</span>`;
        }

        const referenceCell = row.querySelector('td:nth-child(1)');
        referenceCell.insertAdjacentHTML('afterend', `<td>${cell}</td>`);
    });
}
