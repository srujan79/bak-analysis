// script.js
document.getElementById("csvFile").addEventListener("change", function(e) {
    const file = e.target.files[0];
    if (!file) return;

    Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: true,
        complete: function(results) {
            let data = results.data;

            // Check for tab-delimited vs comma
            if (Object.keys(data[0] || {}).length === 1) {
                // Possibly tab-separated
                Papa.parse(file, {
                    header: true,
                    skipEmptyLines: true,
                    delimiter: "\t",
                    dynamicTyping: true,
                    complete: function(results2) {
                        let parsedData = results2.data;
                        if (!parsedData.length) {
                            alert("CSV parsed but no rows found. Check headers.");
                            return;
                        }
                        buildDashboard(parsedData);
                    }
                });
            } else {
                buildDashboard(data);
            }
        },
        error: function(err) {
            console.error("Error parsing CSV:", err);
            alert("Error parsing CSV. Check the file format.");
        }
    });
});

// Globals for Chart.js instances
let vmChartInstance = null;
let driveChartInstance = null;

function buildDashboard(data) {
    let totalBytes = 0;
    let vmMap = {};
    let driveMap = {};
    let largestFiles = [];

    data.forEach(row => {
        const size = row.SizeBytes || 0;
        totalBytes += size;

        vmMap[row.Hostname] = (vmMap[row.Hostname] || 0) + size;
        driveMap[row.Drive] = (driveMap[row.Drive] || 0) + size;

        largestFiles.push({
            host: row.Hostname,
            file: row.FileName,
            size: size
        });
    });

    // Update metrics
    document.getElementById("totalSize").innerText = (totalBytes / 1073741824).toFixed(2) + " GB";
    document.getElementById("totalVMs").innerText = Object.keys(vmMap).length;
    document.getElementById("totalFiles").innerText = data.length;

    largestFiles.sort((a, b) => b.size - a.size);
    document.getElementById("largestBackup").innerText = (largestFiles[0].size / 1073741824).toFixed(2) + " GB";

    // Render charts
    buildVMChart(vmMap);
    buildDriveChart(driveMap);
    buildLargestTable(largestFiles.slice(0, 10));
}

function buildVMChart(vmMap) {
    const ctx = document.getElementById("vmChart").getContext("2d");
    const labels = Object.keys(vmMap);
    const values = Object.values(vmMap).map(v => (v / 1073741824).toFixed(2));

    if (vmChartInstance) vmChartInstance.destroy();

    vmChartInstance = new Chart(ctx, {
        type: "bar",
        data: {
            labels: labels,
            datasets: [{
                label: "Storage (GB)",
                data: values,
                backgroundColor: "rgba(54, 162, 235, 0.6)"
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, title: { display: true, text: "GB" } }
            }
        }
    });
}

function buildDriveChart(driveMap) {
    const ctx = document.getElementById("driveChart").getContext("2d");
    const labels = Object.keys(driveMap);
    const values = Object.values(driveMap).map(v => (v / 1073741824).toFixed(2));

    if (driveChartInstance) driveChartInstance.destroy();

    driveChartInstance = new Chart(ctx, {
        type: "pie",
        data: {
            labels: labels,
            datasets: [{
                data: values,
                backgroundColor: ["#3498db","#2ecc71","#f1c40f","#e74c3c","#9b59b6","#34495e"]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false
        }
    });
}

function buildLargestTable(files) {
    const tbody = document.querySelector("#largestTable tbody");
    tbody.innerHTML = "";
    files.forEach(f => {
        const tr = document.createElement("tr");
        tr.innerHTML = `<td>${f.host}</td><td>${f.file}</td><td>${(f.size / 1073741824).toFixed(2)}</td>`;
        tbody.appendChild(tr);
    });
}
