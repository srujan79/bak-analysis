document.getElementById("csvFile").addEventListener("change", function(e) {
    const file = e.target.files[0];

    if (!file) return;

    Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: true,
        complete: function(results) {
            let data = results.data;

            if (data.length === 0) {
                alert("CSV loaded but no rows found. Check headers.");
                return;
            }

            buildDashboard(data);
        }
    });
});

function buildDashboard(data) {
    let totalBytes = 0;
    let vmMap = {};
    let driveMap = {};
    let largest = [];

    data.forEach(row => {
        let size = row.SizeBytes || 0;
        totalBytes += size;
        vmMap[row.Hostname] = (vmMap[row.Hostname] || 0) + size;
        driveMap[row.Drive] = (driveMap[row.Drive] || 0) + size;
        largest.push({ host: row.Hostname, file: row.FileName, size: size });
    });

    document.getElementById("totalSize").innerText = (totalBytes/1073741824).toFixed(2) + " GB";
    document.getElementById("totalVMs").innerText = Object.keys(vmMap).length;
    document.getElementById("totalFiles").innerText = data.length;

    largest.sort((a,b)=>b.size-a.size);
    document.getElementById("largestBackup").innerText = (largest[0].size/1073741824).toFixed(2) + " GB";

    buildVMChart(vmMap);
    buildDriveChart(driveMap);
    buildLargestTable(largest.slice(0,10));
}

let vmChartInstance, driveChartInstance;

function buildVMChart(vmMap) {
    const labels = Object.keys(vmMap);
    const values = Object.values(vmMap).map(v => v / 1073741824);

    if(vmChartInstance) vmChartInstance.destroy();

    vmChartInstance = new Chart(document.getElementById("vmChart"), {
        type: 'bar',
        data: { labels: labels, datasets: [{ label: "Storage (GB)", data: values, backgroundColor: "rgba(54,162,235,0.6)" }] },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

function buildDriveChart(driveMap) {
    const labels = Object.keys(driveMap);
    const values = Object.values(driveMap).map(v => v / 1073741824);

    if(driveChartInstance) driveChartInstance.destroy();

    driveChartInstance = new Chart(document.getElementById("driveChart"), {
        type: 'pie',
        data: { labels: labels, datasets: [{ data: values, backgroundColor: ["#3498db","#2ecc71","#f1c40f","#e74c3c"] }] },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

function buildLargestTable(files) {
    const tbody = document.querySelector("#largestTable tbody");
    tbody.innerHTML = "";
    files.forEach(f => {
        const row = document.createElement("tr");
        row.innerHTML = `<td>${f.host}</td><td>${f.file}</td><td>${(f.size/1073741824).toFixed(2)}</td>`;
        tbody.appendChild(row);
    });
}
