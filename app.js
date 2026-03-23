// 🔧 Flexible Date Parser
function parseCustomDate(dateStr) {
    if (!dateStr) return null;
    dateStr = dateStr.trim().replace(/\uFEFF/g, "");

    let dmyMatch = dateStr.match(/^(\d{2})-(\d{2})-(\d{4})\s+(\d{2}):(\d{2})$/);
    if (dmyMatch) {
        let [, day, month, year, hour, minute] = dmyMatch;
        return new Date(`${year}-${month}-${day}T${hour}:${minute}:00`);
    }

    let d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d;
}

// 🔹 Extract customer
function extractCustomer(hostname) {
    let parts = hostname.split("-");
    return parts.length >= 3 ? parts[1] : "Unknown";
}

let table;
let charts = {};
let activeFilters = {};
let currentColumn = null;

$(document).ready(function () {
    table = $("#dataTable").DataTable({
        orderCellsTop: true,
        initComplete: function () {
            let api = this.api();
            api.columns().every(function (colIdx) {
                let cell = $('.display thead tr:eq(1) th').eq(colIdx);
                $('input', cell).on('keyup change', function () {
                    api.column(colIdx).search(this.value).draw();
                });
            });
        }
    });

    // header click filter
    $("#dataTable thead tr:eq(0) th").on("click", function (e) {
        currentColumn = $(this).index();

        let values = [...new Set(table.column(currentColumn).data().toArray())].sort();
        let f = activeFilters[currentColumn] || { selected: [], mode: "include" };

        $("#filterValues").html(values.map(v =>
            `<div><label><input type="checkbox" value="${v}" ${f.selected.includes(v) ? "checked":""}> ${v}</label></div>`
        ).join(""));

        renderChips(f.selected);

        $("#dateFilter").toggle(currentColumn == 7);
        $("#sizeFilter").toggle(currentColumn == 6);

        $("#filterPopup").css({ top: e.pageY, left: e.pageX }).show();
    });
});

// 📥 CSV Upload
document.getElementById("csvFile").addEventListener("change", function (e) {
    let file = e.target.files[0];

    Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: function (results) {
            let data = results.data
                .map((row) => {
                    let clean = {};
                    Object.keys(row).forEach((k) => {
                        clean[k.trim()] = (row[k] || "").trim();
                    });
                    return clean;
                })
                .filter((r) => r.Hostname);

            data.forEach(r => r.Customer = extractCustomer(r.Hostname));

            processData(data);   // ✅ now exists
            populateTable(data);
        }
    });
});

// 📊 DATA PROCESSING (RESTORED)
function processData(data) {
    let servers = new Set();
    let customers = new Set();
    let totalFiles = data.length;
    let totalStorage = 0;
    let largest = 0;

    let driveUsage = {};
    let serverUsage = {};
    let customerUsage = {};
    let sizeBuckets = { "0-10MB": 0, "10-100MB": 0, "100MB-1GB": 0, "1GB+": 0 };
    let ageBuckets = { "0-30d": 0, "30-90d": 0, "90-365d": 0, "1y+": 0 };

    let today = new Date();

    data.forEach((r) => {
        servers.add(r.Hostname);
        customers.add(r.Customer);

        let size = parseInt(r.SizeBytes) || 0;
        totalStorage += size;
        if (size > largest) largest = size;

        driveUsage[r.Drive] = (driveUsage[r.Drive] || 0) + size;
        serverUsage[r.Hostname] = (serverUsage[r.Hostname] || 0) + size;
        customerUsage[r.Customer] = (customerUsage[r.Customer] || 0) + size;

        if (size < 10_000_000) sizeBuckets["0-10MB"]++;
        else if (size < 100_000_000) sizeBuckets["10-100MB"]++;
        else if (size < 1_000_000_000) sizeBuckets["100MB-1GB"]++;
        else sizeBuckets["1GB+"]++;

        let d = parseCustomDate(r.LastModified);
        if (d) {
            let diff = (today - d) / (1000 * 60 * 60 * 24);
            if (diff < 30) ageBuckets["0-30d"]++;
            else if (diff < 90) ageBuckets["30-90d"]++;
            else if (diff < 365) ageBuckets["90-365d"]++;
            else ageBuckets["1y+"]++;
        }
    });

    document.getElementById("totalServers").innerText = servers.size;
    document.getElementById("totalCustomers").innerText = customers.size;
    document.getElementById("totalFiles").innerText = totalFiles;
    document.getElementById("totalStorage").innerText = (totalStorage / 1073741824).toFixed(2) + " GB";
    document.getElementById("largestFile").innerText = (largest / 1073741824).toFixed(2) + " GB";

    let driveGB = {}, serverGB = {}, customerGB = {};
    for (let k in driveUsage) driveGB[k] = +(driveUsage[k] / 1073741824).toFixed(2);
    for (let k in serverUsage) serverGB[k] = +(serverUsage[k] / 1073741824).toFixed(2);
    for (let k in customerUsage) customerGB[k] = +(customerUsage[k] / 1073741824).toFixed(2);

    createChart("driveChart", "Storage by Drive (GB)", driveGB);
    createChart("serverChart", "Top Servers (GB)", serverGB);
    createChart("customerChart", "Storage by Customer (GB)", customerGB);
    createChart("sizeChart", "Backup Size Distribution", sizeBuckets);
    createChart("ageChart", "Backup Age Distribution", ageBuckets);
}

// 📈 Chart Builder (RESTORED)
function createChart(id, title, data) {
    if (charts[id]) charts[id].destroy();

    charts[id] = new Chart(document.getElementById(id), {
        type: "bar",
        data: {
            labels: Object.keys(data),
            datasets: [{
                label: title,
                data: Object.values(data),
                backgroundColor: "#0078D4"
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: false },
                title: { display: true, text: title }
            }
        }
    });
}

// TABLE
function populateTable(data) {
    table.clear();

    data.forEach((r) => {
        let sizeGB = r.SizeBytes ? (parseInt(r.SizeBytes)/1073741824).toFixed(2) : "0.00";

        table.row.add([
            r.Hostname,
            r.Customer,
            r.PrivateIP,
            r.Drive,
            r.FileName,
            r.FullPath,
            sizeGB,
            r.LastModified || "N/A"
        ]);
    });

    table.draw();
}

// FILTER LOGIC
$.fn.dataTable.ext.search.push(function(settings,data){
    for(let col in activeFilters){
        let f = activeFilters[col];
        let val = data[col];

        if(f.selected.length){
            if(f.mode==="include" && !f.selected.includes(val)) return false;
            if(f.mode==="exclude" && f.selected.includes(val)) return false;
        }

        if(col==7){
            let d=parseCustomDate(val);
            if(f.dateFrom && d < new Date(f.dateFrom)) return false;
            if(f.dateTo && d > new Date(f.dateTo)) return false;
        }

        if(col==6){
            let num=parseFloat(val)||0;
            if(f.sizeMin && num < f.sizeMin) return false;
            if(f.sizeMax && num > f.sizeMax) return false;
        }
    }
    return true;
});

// APPLY FILTER
$("#applyFilter").click(function(){
    let selected=$("#filterValues input:checked").map(function(){return this.value}).get();

    activeFilters[currentColumn]={
        selected,
        mode:$("input[name='mode']:checked").val(),
        dateFrom:$("#dateFrom").val(),
        dateTo:$("#dateTo").val(),
        sizeMin:parseFloat($("#sizeMin").val()),
        sizeMax:parseFloat($("#sizeMax").val())
    };

    $("#filterPopup").hide();
    table.draw();
});

// CHIPS
function renderChips(list){
    $("#selectedValues").html(list.map(v =>
        `<div class="selected-chip">${v}<span>✖</span></div>`
    ).join(""));
}

// DOWNLOAD
document.getElementById("downloadCsv").addEventListener("click", function () {
    let rows=table.rows({search:'applied'}).data();
    let csv=[];
    rows.each(r=>csv.push(r.join(",")));
    let blob=new Blob([csv.join("\n")]);
    let a=document.createElement("a");
    a.href=URL.createObjectURL(blob);
    a.download="filtered.csv";
    a.click();
});
