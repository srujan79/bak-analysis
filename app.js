// 🔧 Flexible Date Parser
function parseCustomDate(dateStr) {
    if (!dateStr) return null;
    dateStr = dateStr.trim().replace(/\uFEFF/g, ""); // remove BOM
    if (!dateStr) return null;

    // 1️⃣ Try DD-MM-YYYY HH:mm
    let dmyMatch = dateStr.match(/^(\d{2})-(\d{2})-(\d{4})\s+(\d{2}):(\d{2})$/);
    if (dmyMatch) {
        let [, day, month, year, hour, minute] = dmyMatch;
        return new Date(`${year}-${month}-${day}T${hour}:${minute}:00`);
    }

    // 2️⃣ Try MM/DD/YYYY hh:mm AM/PM
    let mdyMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (mdyMatch) {
        let [, month, day, year, hourRaw, minute, ampm] = mdyMatch;
        let hour = parseInt(hourRaw, 10);
        if (ampm.toUpperCase() === "PM" && hour < 12) hour += 12;
        if (ampm.toUpperCase() === "AM" && hour === 12) hour = 0;
        return new Date(`${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}T${hour.toString().padStart(2, "0")}:${minute}:00`);
    }

    // 3️⃣ Fallback to Date constructor
    let d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d;
}

// 📦 Initialize DataTable once
let table;
$(document).ready(function () {
    table = $("#dataTable").DataTable();
});

// 🔄 Charts storage
let charts = {};

// 📥 CSV Upload
document.getElementById("csvFile").addEventListener("change", function (e) {
    let file = e.target.files[0];

    Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: function (results) {
            // Clean headers and values
            let data = results.data
                .map((row) => {
                    let cleanRow = {};
                    Object.keys(row).forEach((k) => {
                        let key = k ? k.trim().replace(/\uFEFF/g, "") : "";
                        cleanRow[key] = row[k] ? row[k].trim() : "";
                    });
                    return cleanRow;
                })
                .filter((r) => r.Hostname); // only rows with Hostname

            processData(data);
            populateTable(data);
        },
    });
});

// 📊 Data Processing
function processData(data) {
    let servers = new Set();
    let totalFiles = data.length;
    let totalStorage = 0;
    let largest = 0;

    let driveUsage = {};
    let serverUsage = {};
    let sizeBuckets = { "0-10MB": 0, "10-100MB": 0, "100MB-1GB": 0, "1GB+": 0 };
    let ageBuckets = { "0-30d": 0, "30-90d": 0, "90-365d": 0, "1y+": 0 };

    let today = new Date();

    data.forEach((r) => {
        servers.add(r.Hostname);

        let size = parseInt(r.SizeBytes) || 0;
        totalStorage += size;
        if (size > largest) largest = size;

        // Drive usage
        if (!driveUsage[r.Drive]) driveUsage[r.Drive] = 0;
        driveUsage[r.Drive] += size;

        // Server usage
        if (!serverUsage[r.Hostname]) serverUsage[r.Hostname] = 0;
        serverUsage[r.Hostname] += size;

        // Size buckets
        if (size < 10_000_000) sizeBuckets["0-10MB"]++;
        else if (size < 100_000_000) sizeBuckets["10-100MB"]++;
        else if (size < 1_000_000_000) sizeBuckets["100MB-1GB"]++;
        else sizeBuckets["1GB+"]++;

        // Age buckets
        let d = parseCustomDate(r.LastModified ? r.LastModified.trim() : "");
        if (d) {
            let diff = (today - d) / (1000 * 60 * 60 * 24); // days
            if (diff < 30) ageBuckets["0-30d"]++;
            else if (diff < 90) ageBuckets["30-90d"]++;
            else if (diff < 365) ageBuckets["90-365d"]++;
            else ageBuckets["1y+"]++;
        }
    });

    // KPI update
    document.getElementById("totalServers").innerText = servers.size;
    document.getElementById("totalFiles").innerText = totalFiles;
    document.getElementById("totalStorage").innerText = (totalStorage / 1073741824).toFixed(2) + " GB";
    document.getElementById("largestFile").innerText = (largest / 1073741824).toFixed(2) + " GB";

    // Charts
    createChart("driveChart", "Storage by Drive", driveUsage);
    createChart("serverChart", "Top Servers", serverUsage);
    createChart("sizeChart", "Backup Size Distribution", sizeBuckets);
    createChart("ageChart", "Backup Age Distribution", ageBuckets);
}

// 📈 Chart Builder
function createChart(id, title, data) {
    // Destroy old chart if exists
    if (charts[id]) charts[id].destroy();

    charts[id] = new Chart(document.getElementById(id), {
        type: "bar",
        data: {
            labels: Object.keys(data),
            datasets: [
                {
                    label: title,
                    data: Object.values(data),
                    backgroundColor: "#0078D4",
                },
            ],
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: false },
                title: { display: true, text: title },
            },
        },
    });
}

// 📋 Table
function populateTable(data) {
    table.clear();

    data.forEach((r) => {
        let sizeFormatted = r.SizeBytes ? formatBytes(parseInt(r.SizeBytes)) : "0 B";
        let lastModified = r.LastModified ? r.LastModified.trim() : "N/A";

        table.row.add([
            r.Hostname,
            r.PrivateIP,
            r.Drive,
            r.FileName,
            r.FullPath,
            sizeFormatted,
            lastModified,
        ]);
    });

    table.draw();
}

// 🔢 Format bytes nicely
function formatBytes(bytes) {
    if (bytes === 0) return "0 B";
    let k = 1024;
    let sizes = ["B", "KB", "MB", "GB", "TB"];
    let i = Math.floor(Math.log(bytes) / Math.log(k));
    return (bytes / Math.pow(k, i)).toFixed(2) + " " + sizes[i];
}
