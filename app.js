// 🔧 Flexible Date Parser
function parseCustomDate(dateStr) {
    if (!dateStr) return null;
    dateStr = dateStr.trim().replace(/\uFEFF/g, ""); // remove BOM
    if (!dateStr) return null;

    // DD-MM-YYYY HH:mm
    let dmyMatch = dateStr.match(/^(\d{2})-(\d{2})-(\d{4})\s+(\d{2}):(\d{2})$/);
    if (dmyMatch) {
        let [, day, month, year, hour, minute] = dmyMatch;
        return new Date(`${year}-${month}-${day}T${hour}:${minute}:00`);
    }

    // fallback
    let d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d;
}

// 🔹 Extract customer from hostname
function extractCustomer(hostname) {
    let parts = hostname.split("-");
    return parts.length >= 3 ? parts[1] : "Unknown";
}

// 📋 DataTable and chart storage
let table;
let charts = {};

$(document).ready(function () {
    // Initialize table with column filters
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
                    let cleanRow = {};
                    Object.keys(row).forEach((k) => {
                        let key = k ? k.trim().replace(/\uFEFF/g, "") : "";
                        cleanRow[key] = row[k] ? row[k].trim() : "";
                    });
                    return cleanRow;
                })
                .filter((r) => r.Hostname); // ignore empty rows

            // add customer
            data.forEach(r => r.Customer = extractCustomer(r.Hostname));

            processData(data);
            populateTable(data);
        },
    });
});

// 📊 Data Processing
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

        // Size buckets
        if (size < 10_000_000) sizeBuckets["0-10MB"]++;
        else if (size < 100_000_000) sizeBuckets["10-100MB"]++;
        else if (size < 1_000_000_000) sizeBuckets["100MB-1GB"]++;
        else sizeBuckets["1GB+"]++;

        // Age buckets
        let d = parseCustomDate(r.LastModified);
        if (d) {
            let diff = (today - d) / (1000 * 60 * 60 * 24);
            if (diff < 30) ageBuckets["0-30d"]++;
            else if (diff < 90) ageBuckets["30-90d"]++;
            else if (diff < 365) ageBuckets["90-365d"]++;
            else ageBuckets["1y+"]++;
        }
    });

    // KPIs
    document.getElementById("totalServers").innerText = servers.size;
    document.getElementById("totalCustomers").innerText = customers.size;
    document.getElementById("totalFiles").innerText = totalFiles;
    document.getElementById("totalStorage").innerText = (totalStorage / 1073741824).toFixed(2) + " GB";
    document.getElementById("largestFile").innerText = (largest / 1073741824).toFixed(2) + " GB";

    // Convert storage metrics to GB
    let driveGB = {}, serverGB = {}, customerGB = {};
    for (let k in driveUsage) driveGB[k] = +(driveUsage[k] / 1073741824).toFixed(2);
    for (let k in serverUsage) serverGB[k] = +(serverUsage[k] / 1073741824).toFixed(2);
    for (let k in customerUsage) customerGB[k] = +(customerUsage[k] / 1073741824).toFixed(2);

    // Charts
    createChart("driveChart", "Storage by Drive (GB)", driveGB);
    createChart("serverChart", "Top Servers (GB)", serverGB);
    createChart("customerChart", "Storage by Customer (GB)", customerGB);
    createChart("sizeChart", "Backup Size Distribution", sizeBuckets);
    createChart("ageChart", "Backup Age Distribution", ageBuckets);
}

// 📈 Chart Builder
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

// 📋 Table population
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
