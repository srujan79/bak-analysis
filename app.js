// 🔧 Robust Date Parser
function parseCustomDate(dateStr){
    if(!dateStr) return null;
    dateStr = dateStr.trim();
    dateStr = dateStr.replace(/\uFEFF/g, ""); // remove BOM if any

    // Match DD-MM-YYYY HH:mm
    let match = dateStr.match(/(\d{2})-(\d{2})-(\d{4})\s+(\d{2}:\d{2})/);
    if(!match) return null;

    let day = match[1];
    let month = match[2];
    let year = match[3];
    let time = match[4];

    let formatted = `${year}-${month}-${day}T${time}:00`;

    let d = new Date(formatted);
    return isNaN(d) ? null : d;
}

// 📥 CSV Upload
document.getElementById("csvFile").addEventListener("change", function(e){
    let file = e.target.files[0];

    Papa.parse(file, {
        header: true,
        complete: function(results){

            // Trim headers (handle hidden spaces)
            let data = results.data.map(row => {
                let cleanRow = {};
                Object.keys(row).forEach(k => {
                    cleanRow[k.trim()] = row[k];
                });
                return cleanRow;
            }).filter(r => r.Hostname); // only rows with Hostname

            processData(data);
            populateTable(data);
        }
    });
});

// 📊 Data Processing
function processData(data){
    let servers = new Set();
    let totalFiles = data.length;
    let totalStorage = 0;
    let largest = 0;

    let driveUsage = {};
    let serverUsage = {};
    let sizeBuckets = {"0-10MB":0,"10-100MB":0,"100MB-1GB":0,"1GB+":0};
    let ageBuckets = {"0-30d":0,"30-90d":0,"90-365d":0,"1y+":0};

    let today = new Date();

    data.forEach(r=>{
        servers.add(r.Hostname);

        let size = parseInt(r.SizeBytes) || 0;
        totalStorage += size;
        if(size > largest) largest = size;

        // Drive usage
        if(!driveUsage[r.Drive]) driveUsage[r.Drive] = 0;
        driveUsage[r.Drive] += size;

        // Server usage
        if(!serverUsage[r.Hostname]) serverUsage[r.Hostname] = 0;
        serverUsage[r.Hostname] += size;

        // Size buckets
        if(size < 10000000) sizeBuckets["0-10MB"]++;
        else if(size < 100000000) sizeBuckets["10-100MB"]++;
        else if(size < 1000000000) sizeBuckets["100MB-1GB"]++;
        else sizeBuckets["1GB+"]++;

        // ✅ Age buckets
        let d = parseCustomDate(r.LastModified);
        if(d){
            let diff = (today - d) / (1000*60*60*24); // days
            if(diff < 30) ageBuckets["0-30d"]++;
            else if(diff < 90) ageBuckets["30-90d"]++;
            else if(diff < 365) ageBuckets["90-365d"]++;
            else ageBuckets["1y+"]++;
        }
    });

    // KPI update
    document.getElementById("totalServers").innerText = servers.size;
    document.getElementById("totalFiles").innerText = totalFiles;
    document.getElementById("totalStorage").innerText = (totalStorage/1073741824).toFixed(2)+" GB";
    document.getElementById("largestFile").innerText = (largest/1073741824).toFixed(2)+" GB";

    // Charts
    createChart("driveChart","Storage by Drive",driveUsage);
    createChart("serverChart","Top Servers",serverUsage);
    createChart("sizeChart","Backup Size Distribution",sizeBuckets);
    createChart("ageChart","Backup Age Distribution",ageBuckets);
}

// 📈 Chart Builder
function createChart(id,title,data){
    new Chart(document.getElementById(id),{
        type:"bar",
        data:{
            labels: Object.keys(data),
            datasets:[{
                label: title,
                data: Object.values(data),
                backgroundColor: "#0078D4"
            }]
        }
    });
}

// 📋 Table
function populateTable(data){
    let table = $("#dataTable").DataTable();
    table.clear();

    data.forEach(r=>{
        let dateVal = (r.LastModified || "").trim();
        if(!dateVal) dateVal = "N/A"; // fallback if missing

        table.row.add([
            r.Hostname,
            r.PrivateIP,
            r.Drive,
            r.FileName,
            r.FullPath,
            r.SizeBytes,
            dateVal
        ]);
    });

    table.draw();
}

$(document).ready(function(){
    $("#dataTable").DataTable();
});
