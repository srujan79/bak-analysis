// 📥 Download Filtered CSV
document.getElementById("downloadCsv").addEventListener("click", function () {
    let filteredData = table.rows({ search: 'applied' }).data();

    if (filteredData.length === 0) {
        alert("No data to export!");
        return;
    }

    let headers = [
        "Hostname","Customer","PrivateIP","Drive",
        "FileName","FullPath","Size (GB)","LastModified"
    ];

    let csv = [];
    csv.push(headers.join(","));

    filteredData.each(function (row) {
        let escapedRow = row.map(value => `"${(value || "").toString().replace(/"/g, '""')}"`);
        csv.push(escapedRow.join(","));
    });

    let blob = new Blob([csv.join("\n")], { type: "text/csv" });
    let url = URL.createObjectURL(blob);

    let a = document.createElement("a");
    a.href = url;
    a.download = `filtered_backup_${new Date().toISOString()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
});
