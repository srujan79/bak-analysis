document.getElementById("csvFile").addEventListener("change", function(e){

const file = e.target.files[0];

Papa.parse(file,{
header:true,
complete:function(results){

let data = results.data;

let totalBytes = 0;
let vmMap = {};
let driveMap = {};
let largest = [];

data.forEach(row => {

let size = parseInt(row.SizeBytes || 0);

totalBytes += size;

vmMap[row.Hostname] = (vmMap[row.Hostname] || 0) + size;
driveMap[row.Drive] = (driveMap[row.Drive] || 0) + size;

largest.push({
host: row.Hostname,
file: row.FileName,
size: size
});

});

let totalGB = totalBytes / (1024*1024*1024);

document.getElementById("totalSize").innerHTML =
"Total Backup Size: " + totalGB.toFixed(2) + " GB";

document.getElementById("totalVMs").innerHTML =
"Total VMs: " + Object.keys(vmMap).length;

document.getElementById("totalFiles").innerHTML =
"Total Files: " + data.length;

largest.sort((a,b)=>b.size-a.size);

document.getElementById("largestBackup").innerHTML =
"Largest Backup: " + (largest[0].size/1073741824).toFixed(2) + " GB";

buildVMChart(vmMap);
buildDriveChart(driveMap);
buildLargestTable(largest.slice(0,10));

}
});

});

function buildVMChart(vmMap){

let labels = Object.keys(vmMap);
let values = Object.values(vmMap).map(v=>v/1073741824);

new Chart(document.getElementById("vmChart"),{
type:'bar',
data:{
labels:labels,
datasets:[{
label:"Storage GB",
data:values,
backgroundColor:"rgba(54,162,235,0.6)"
}]
}
});

}

function buildDriveChart(driveMap){

let labels = Object.keys(driveMap);
let values = Object.values(driveMap).map(v=>v/1073741824);

new Chart(document.getElementById("driveChart"),{
type:'pie',
data:{
labels:labels,
datasets:[{
data:values
}]
}
});

}

function buildLargestTable(files){

let tbody = document.querySelector("#largestTable tbody");

files.forEach(f =>{

let row = document.createElement("tr");

row.innerHTML =
"<td>"+f.host+"</td>" +
"<td>"+f.file+"</td>" +
"<td>"+(f.size/1073741824).toFixed(2)+"</td>";

tbody.appendChild(row);

});

}
