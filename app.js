// 🔧 Flexible Date Parser
function parseCustomDate(dateStr) {
    if (!dateStr) return null;
    dateStr = dateStr.trim().replace(/\uFEFF/g, "");

    let dmyMatch = dateStr.match(/^(\d{2})-(\d{2})-(\d{4})\s+(\d{2}):(\d{2})$/);
    if (dmyMatch) {
        let [, day, month, year, hour, minute] = dmyMatch;
        return new Date(`${year}-${month}-${day}T${hour}:${minute}:00`);
    }

    let d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d;
}

// extract customer
function extractCustomer(hostname) {
    let parts = hostname.split("-");
    return parts.length >= 3 ? parts[1] : "Unknown";
}

let table;
let charts = {};
let activeFilters = {};
let currentColumn = null;

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

    // HEADER CLICK FILTER
    $("#dataTable thead tr:eq(0) th").on("click", function (e) {
        currentColumn = $(this).index();

        let values = [...new Set(table.column(currentColumn).data().toArray())].sort();
        let f = activeFilters[currentColumn] || { selected: [], mode: "include" };

        $("#filterValues").html(values.map(v =>
            `<div><label><input type="checkbox" value="${v}" ${f.selected.includes(v) ? "checked":""}> ${v}</label></div>`
        ).join(""));

        renderChips(f.selected);

        $("#dateFilter").toggle(currentColumn == 7);
        $("#sizeFilter").toggle(currentColumn == 6);

        $("#filterPopup").css({ top: e.pageY, left: e.pageX }).show();
    });
});

// CSV upload
document.getElementById("csvFile").addEventListener("change", function (e) {
    let file = e.target.files[0];

    Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: function (results) {
            let data = results.data.map(r => {
                let clean = {};
                Object.keys(r).forEach(k => clean[k.trim()] = (r[k] || "").trim());
                return clean;
            }).filter(r => r.Hostname);

            data.forEach(r => r.Customer = extractCustomer(r.Hostname));

            processData(data);
            populateTable(data);
        }
    });
});

// TABLE
function populateTable(data) {
    table.clear();
    data.forEach(r => {
        let sizeGB = r.SizeBytes ? (parseInt(r.SizeBytes)/1073741824).toFixed(2) : "0.00";
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

// FILTER LOGIC
$.fn.dataTable.ext.search.push(function(settings,data){
    for(let col in activeFilters){
        let f = activeFilters[col];
        let val = data[col];

        if(f.selected.length){
            if(f.mode==="include" && !f.selected.includes(val)) return false;
            if(f.mode==="exclude" && f.selected.includes(val)) return false;
        }

        if(col==7){
            let d=parseCustomDate(val);
            if(f.dateFrom && d < new Date(f.dateFrom)) return false;
            if(f.dateTo && d > new Date(f.dateTo)) return false;
        }

        if(col==6){
            let num=parseFloat(val)||0;
            if(f.sizeMin && num < f.sizeMin) return false;
            if(f.sizeMax && num > f.sizeMax) return false;
        }
    }
    return true;
});

// APPLY FILTER
$("#applyFilter").click(function(){
    let selected=$("#filterValues input:checked").map(function(){return this.value}).get();

    activeFilters[currentColumn]={
        selected,
        mode:$("input[name='mode']:checked").val(),
        dateFrom:$("#dateFrom").val(),
        dateTo:$("#dateTo").val(),
        sizeMin:parseFloat($("#sizeMin").val()),
        sizeMax:parseFloat($("#sizeMax").val())
    };

    updateHeader();
    $("#filterPopup").hide();
    table.draw();
});

// CHIPS
function renderChips(list){
    $("#selectedValues").html(list.map(v =>
        `<div class="selected-chip">${v}<span data-v="${v}">✖</span></div>`
    ).join(""));
}

// DOWNLOAD
document.getElementById("downloadCsv").addEventListener("click", function () {
    let rows=table.rows({search:'applied'}).data();
    let csv=[];
    rows.each(r=>csv.push(r.join(",")));
    let blob=new Blob([csv.join("\n")]);
    let a=document.createElement("a");
    a.href=URL.createObjectURL(blob);
    a.download="filtered.csv";
    a.click();
});
