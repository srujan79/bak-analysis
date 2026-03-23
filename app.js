// 🔧 Date Parser
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

// 🔹 Customer extract
function extractCustomer(hostname) {
    let parts = hostname.split("-");
    return parts.length >= 3 ? parts[1] : "Unknown";
}

let table;
let charts = {};
let activeFilters = {};
let currentColumn = null;

// INIT TABLE
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

// CSV UPLOAD
document.getElementById("csvFile").addEventListener("change", function (e) {
    let file = e.target.files[0];

    Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: function (results) {
            let data = results.data
                .map(row => {
                    let clean = {};
                    Object.keys(row).forEach(k => {
                        let key = k.trim();
                        clean[key] = row[k]?.trim();
                    });
                    return clean;
                })
                .filter(r => r.Hostname);

            data.forEach(r => r.Customer = extractCustomer(r.Hostname));

            processData(data);
            populateTable(data);
        }
    });
});

// PROCESS DATA
function processData(data) {
    let servers = new Set();
    let customers = new Set();
    let totalFiles = data.length;
    let totalStorage = 0;
    let largest = 0;

    let driveUsage = {}, serverUsage = {}, customerUsage = {};
    let sizeBuckets = { "0-10MB": 0, "10-100MB": 0, "100MB-1GB": 0, "1GB+": 0 };
    let ageBuckets = { "0-30d": 0, "30-90d": 0, "90-365d": 0, "1y+": 0 };

    let today = new Date();

    data.forEach(r => {
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

    createChart("driveChart", "Storage by Drive (GB)", convertGB(driveUsage));
    createChart("serverChart", "Top Servers (GB)", convertGB(serverUsage));
    createChart("customerChart", "Storage by Customer (GB)", convertGB(customerUsage));
    createChart("sizeChart", "Backup Size Distribution", sizeBuckets);
    createChart("ageChart", "Backup Age Distribution", ageBuckets);
}

function convertGB(obj){
    let res = {};
    for (let k in obj) res[k] = +(obj[k]/1073741824).toFixed(2);
    return res;
}

// CHART
function createChart(id, title, data) {
    if (charts[id]) charts[id].destroy();

    charts[id] = new Chart(document.getElementById(id), {
        type: "bar",
        data: {
            labels: Object.keys(data),
            datasets: [{
                data: Object.values(data),
                backgroundColor: "#0078D4"
            }]
        },
        options: {
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

    data.forEach(r => {
        let sizeGB = (parseInt(r.SizeBytes)/1073741824).toFixed(2);

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

// FILTER UI
$(document).on("click", ".filter-btn", function (e) {
    currentColumn = $(this).data("col");

    let values = [...new Set(table.column(currentColumn).data().toArray())].sort();

    let html = values.map(v =>
        `<div><label><input type="checkbox" value="${v}"> ${v}</label></div>`
    ).join("");

    $("#filterValues").html(html);

    $("#filterPopup")
        .css({ top: e.pageY, left: e.pageX })
        .show();
});

$("#filterSearch").on("keyup", function () {
    let val = this.value.toLowerCase();
    $("#filterValues div").each(function () {
        $(this).toggle($(this).text().toLowerCase().includes(val));
    });
});

$("#selectAll").click(() => $("#filterValues input").prop("checked", true));
$("#clearAll").click(() => $("#filterValues input").prop("checked", false));

$("#applyFilter").click(function () {
    let selected = $("#filterValues input:checked").map(function(){ return this.value; }).get();
    let mode = $("input[name='mode']:checked").val();

    activeFilters[currentColumn] = { selected, mode };

    $("#filterPopup").hide();
    table.draw();
});

$.fn.dataTable.ext.search.push(function (settings, data) {
    for (let col in activeFilters) {
        let f = activeFilters[col];
        if (!f.selected.length) continue;

        if (f.mode === "include" && !f.selected.includes(data[col])) return false;
        if (f.mode === "exclude" && f.selected.includes(data[col])) return false;
    }
    return true;
});

// DOWNLOAD CSV
document.getElementById("downloadCsv").addEventListener("click", function () {
    let data = table.rows({ search: 'applied' }).data();
    let csv = [];

    csv.push(["Hostname","Customer","PrivateIP","Drive","FileName","FullPath","Size (GB)","LastModified"].join(","));

    data.each(row => {
        csv.push(row.map(v => `"${v}"`).join(","));
    });

    let blob = new Blob([csv.join("\n")], { type: "text/csv" });
    let a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "filtered.csv";
    a.click();
});
