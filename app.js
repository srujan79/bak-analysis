document.getElementById('csvFile').addEventListener('change', function(event){

const file = event.target.files[0];

Papa.parse(file, {

header: true,
complete: function(results){

let data = results.data;

let driveCount = {};
let serverCount = {};

data.forEach(row => {

if(!row.Drive) return;

driveCount[row.Drive] = (driveCount[row.Drive] || 0) + 1;
serverCount[row.Hostname] = (serverCount[row.Hostname] || 0) + 1;

});

createDriveChart(driveCount);
createServerChart(serverCount);

}

});

});


function createDriveChart(data){

new Chart(document.getElementById('driveChart'), {

type:'bar',

data:{
labels:Object.keys(data),
datasets:[{
label:'BAK Files',
data:Object.values(data),
backgroundColor:'#0078D4'
}]
}

});

}


function createServerChart(data){

new Chart(document.getElementById('serverChart'), {

type:'bar',

data:{
labels:Object.keys(data),
datasets:[{
label:'BAK Files',
data:Object.values(data),
backgroundColor:'#107C10'
}]
}

});

}
