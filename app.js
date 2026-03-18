function parseCustomDate(dateStr) {
    if (!dateStr) return null;
    dateStr = dateStr.trim().replace(/\uFEFF/g, "");
    if (!dateStr) return null;

    let dmyMatch = dateStr.match(/^(\d{2})-(\d{2})-(\d{4})\s+(\d{2}):(\d{2})$/);
    if (dmyMatch) {
        let [, day, month, year, hour, minute] = dmyMatch;
        return new Date(`${year}-${month}-${day}T${hour}:${minute}:00`);
    }

    let d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d;
}

function extractCustomer(hostname) {
    let parts = hostname.split("-");
    return parts.length >= 3 ? parts[1] : "Unknown";
}

let table;
let charts = {};

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
});

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
                .filter((r) => r.Hostname);

            data.forEach(r => r.Customer = extractCustomer(r.Hostname));

            processData(data);
            populateTable(data);
        },
    });
});

function processData(data) {
    let servers = new Set();
    let customers = new Set();
    let totalFiles = data.length;
    let totalStorage = 0;
    let largest = 0;

    let driveUsage = {};
    let serverUsage = {};
    let customerUsage = {};

    data.forEach((r) => {
        servers.add(r.Hostname);
        customers.add(r.Customer);

        let size = parseInt(r.SizeBytes) || 0;
        totalStorage += size;
        if (size > largest) largest = size;

        driveUsage[r.Drive] = (driveUsage[r.Drive] || 0) + size;
        serverUsage[r.Hostname] = (serverUsage[r.Hostname] || 0) + size;
        customerUsage[r.Customer] = (customerUsage[r.Customer] || 0) + size;
    });

    document.getElementById("totalServers").innerText = servers.size;
    document.getElementById("totalCustomers").innerText = customers.size;
    document.getElementById("totalFiles").innerText = totalFiles;
    document.getElementById("totalStorage").innerText = (totalStorage / 1073741824).toFixed(2) + " GB";
    document.getElementById("largestFile").innerText = (largest / 1073741824).toFixed(2) + " GB";

    convertAndChart("driveChart", "Storage by Drive (GB)", driveUsage);
    convertAndChart("serverChart", "Top Servers (GB)", serverUsage);
    convertAndChart("customerChart", "Storage by Customer (GB)", customerUsage);
}

function convertAndChart(id, title, data) {
    let converted = {};
    for (let k in data) {
        converted[k] = +(data[k] / 1073741824).toFixed(2);
    }
    createChart(id, title, converted);
}

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

function populateTable(data) {
    table.clear();

    data.forEach((r) => {
        let sizeGB = r.SizeBytes
            ? (parseInt(r.SizeBytes) / 1073741824).toFixed(2)
            : "0.00";

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
