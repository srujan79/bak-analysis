// Flexible Date Parser
function parseCustomDate(dateStr) {
    if (!dateStr) return null;
    dateStr = dateStr.trim().replace(/\uFEFF/g,"");
    let dmy = dateStr.match(/^(\d{2})-(\d{2})-(\d{4})\s+(\d{2}):(\d{2})$/);
    if (dmy) return new Date(`${dmy[3]}-${dmy[2]}-${dmy[1]}T${dmy[4]}:${dmy[5]}:00`);
    return new Date(dateStr);
}

// Extract customer from hostname
function extractCustomer(hostname) {
    let parts = hostname.split("-");
    return parts.length >= 3 ? parts[1] : "Unknown";
}

// DataTables
let table;
$(document).ready(function() { table = $('#dataTable').DataTable(); });

// Charts store
let charts = {};

// Filters
let filters = { Customer: [], Drive: [], Age: [] };

// CSV Upload
document.getElementById("csvFile").addEventListener("change", function(e){
    let file = e.target.files[0];
    Papa.parse(file,{header:true,skipEmptyLines:true,complete:function(results){
        let data = results.data.map(r=>{
            let row={};
            Object.keys(r).forEach(k=>row[k.trim()]=r[k]?r[k].trim():"");
            row.Customer=extractCustomer(row.Hostname);
            return row;
        }).filter(r=>r.Hostname);

        window.rawData = data;
        updateFilters(data);
        renderDashboard(data);
    }});
});

// Update Filter Options
function updateFilters(data){
    let customers=[...new Set(data.map(r=>r.Customer))];
    let drives=[...new Set(data.map(r=>r.Drive))];
    $('#customerFilter').html(customers.map(c=>`<option value="${c}" selected>${c}</option>`));
    $('#driveFilter').html(drives.map(d=>`<option value="${d}" selected>${d}</option>`));
    $('#customerFilter,#driveFilter,#ageFilter').select2();
    $('#customerFilter,#driveFilter,#ageFilter').on('change',()=>renderDashboard(window.rawData));
}

// Filter data
function applyFilters(data){
    let c=$('#customerFilter').val()||[];
    let d=$('#driveFilter').val()||[];
    let a=$('#ageFilter').val()||[];
    let today=new Date();
    return data.filter(r=>{
        let pass=true;
        if(c.length && !c.includes(r.Customer)) pass=false;
        if(d.length && !d.includes(r.Drive)) pass=false;
        if(a.length && r.LastModified){
            let diff=(today-parseCustomDate(r.LastModified))/(1000*60*60*24);
            let ageBucket="";
            if(diff<30) ageBucket="0-30d";
            else if(diff<90) ageBucket="30-90d";
            else if(diff<365) ageBucket="90-365d";
            else ageBucket="1y+";
            if(a.length && !a.includes(ageBucket)) pass=false;
        }
        return pass;
    });
}

// Render Dashboard
function renderDashboard(data){
    let filtered = applyFilters(data);
    let servers = new Set(), customers=new Set();
    let totalFiles=filtered.length, totalStorage=0, largest=0;
    let driveUsage={}, serverUsage={}, customerUsage={}, sizeBuckets={"0-10MB":0,"10-100MB":0,"100MB-1GB":0,"1GB+":0}, ageBuckets={"0-30d":0,"30-90d":0,"90-365d":0,"1y+":0};
    let today=new Date();

    filtered.forEach(r=>{
        servers.add(r.Hostname); customers.add(r.Customer);
        let size=parseInt(r.SizeBytes)||0; totalStorage+=size; if(size>largest) largest=size;
        driveUsage[r.Drive]=(driveUsage[r.Drive]||0)+size;
        serverUsage[r.Hostname]=(serverUsage[r.Hostname]||0)+size;
        customerUsage[r.Customer]=(customerUsage[r.Customer]||0)+size;
        if(size<1e7) sizeBuckets["0-10MB"]++; else if(size<1e8) sizeBuckets["10-100MB"]++; else if(size<1e9) sizeBuckets["100MB-1GB"]++; else sizeBuckets["1GB+"]++;
        if(r.LastModified){
            let diff=(today-parseCustomDate(r.LastModified))/(1000*60*60*24);
            if(diff<30) ageBuckets["0-30d"]++; else if(diff<90) ageBuckets["30-90d"]++; else if(diff<365) ageBuckets["90-365d"]++; else ageBuckets["1y+"]++;
        }
    });

    // KPI
    $('#totalServers').text(servers.size);
    $('#totalCustomers').text(customers.size);
    $('#totalFiles').text(totalFiles);
    $('#totalStorage').text((totalStorage/1.074e9).toFixed(2)+" GB");
    $('#largestFile').text((largest/1.074e9).toFixed(2)+" GB");

    // Charts
    buildChart("driveChart","Storage by Drive",driveUsage);
    buildChart("serverChart","Top Servers",serverUsage);
    buildChart("sizeChart","Backup Size Distribution",sizeBuckets);
    buildChart("ageChart","Backup Age Distribution",ageBuckets);
    buildChart("customerChart","Storage by Customer",customerUsage);
    buildTreemap("customerTreemap","Customer Storage Treemap",customerUsage);

    populateTable(filtered);
}

// Chart builder
function buildChart(id,title,data){
    if(charts[id]) charts[id].destroy();
    charts[id]=new Chart(document.getElementById(id),{
        type:"bar",
        data:{labels:Object.keys(data),datasets:[{label:title,data:Object.values(data),backgroundColor:"#00bcf9"}]},
        options:{responsive:true,plugins:{legend:{display:false},title:{display:true,text:title}}}
    });
}

// Treemap chart
function buildTreemap(id,title,data){
    if(charts[id]) charts[id].destroy();
    charts[id]=new Chart(document.getElementById(id),{
        type:"treemap",
        data:{datasets:[{tree:Object.entries(data).map(([k,v])=>({value:v, name:k})), key:'value', groups:['name'], backgroundColor:'#00bcf9'}]},
        options:{plugins:{legend:{display:false},title:{display:true,text:title}}}
    });
}

// Table
function populateTable(data){
    table.clear();
    data.forEach(r=>table.row.add([r.Hostname,r.Customer,r.PrivateIP,r.Drive,r.FileName,r.FullPath,formatBytes(r.SizeBytes),r.LastModified]));
    table.draw();
}

function formatBytes(bytes){
    bytes=parseInt(bytes)||0;
    if(bytes===0) return "0 B";
    let k=1024,sizes=["B","KB","MB","GB","TB"],i=Math.floor(Math.log(bytes)/Math.log(k));
    return (bytes/Math.pow(k,i)).toFixed(2)+" "+sizes[i];
}
