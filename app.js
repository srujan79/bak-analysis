document.getElementById("csvFile").addEventListener("change",function(e){

let file=e.target.files[0];

Papa.parse(file,{

header:true,

complete:function(results){

let data=results.data.filter(r=>r.Hostname);

processData(data);
populateTable(data);

}

});

});

function processData(data){

let servers=new Set();
let totalFiles=data.length;
let totalStorage=0;
let largest=0;

let driveUsage={};
let serverUsage={};
let sizeBuckets={"0-10MB":0,"10-100MB":0,"100MB-1GB":0,"1GB+":0};
let ageBuckets={"0-30d":0,"30-90d":0,"90-365d":0,"1y+":0};

let today=new Date();

data.forEach(r=>{

servers.add(r.Hostname);

let size=parseInt(r.SizeBytes)||0;
totalStorage+=size;

if(size>largest) largest=size;

if(!driveUsage[r.Drive]) driveUsage[r.Drive]=0;
driveUsage[r.Drive]+=size;

if(!serverUsage[r.Hostname]) serverUsage[r.Hostname]=0;
serverUsage[r.Hostname]+=size;

if(size<10000000) sizeBuckets["0-10MB"]++;
else if(size<100000000) sizeBuckets["10-100MB"]++;
else if(size<1000000000) sizeBuckets["100MB-1GB"]++;
else sizeBuckets["1GB+"]++;

if(r.LastModified){

let d=new Date(r.LastModified);
let diff=(today-d)/(1000*60*60*24);

if(diff<30) ageBuckets["0-30d"]++;
else if(diff<90) ageBuckets["30-90d"]++;
else if(diff<365) ageBuckets["90-365d"]++;
else ageBuckets["1y+"]++;

}

});

document.getElementById("totalServers").innerText=servers.size;
document.getElementById("totalFiles").innerText=totalFiles;
document.getElementById("totalStorage").innerText=(totalStorage/1073741824).toFixed(2)+" GB";
document.getElementById("largestFile").innerText=(largest/1073741824).toFixed(2)+" GB";

createChart("driveChart","Storage by Drive",driveUsage);
createChart("serverChart","Top Servers",serverUsage);
createChart("sizeChart","Backup Size Distribution",sizeBuckets);
createChart("ageChart","Backup Age Distribution",ageBuckets);

}

function createChart(id,title,data){

new Chart(document.getElementById(id),{

type:"bar",

data:{
labels:Object.keys(data),
datasets:[{
label:title,
data:Object.values(data),
backgroundColor:"#0078D4"
}]
}

});

}

function populateTable(data){

let table=$("#dataTable").DataTable();
table.clear();

data.forEach(r=>{

table.row.add([
r.Hostname,
r.PrivateIP,
r.Drive,
r.FileName,
r.FullPath,
r.SizeBytes,
r.LastModified
]);

});

table.draw();

}

$(document).ready(function(){
$("#dataTable").DataTable();
});
