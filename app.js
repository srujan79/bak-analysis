let table;
let activeFilters = {};
let currentColumn = null;

$(document).ready(function () {
    table = $("#dataTable").DataTable({
        orderCellsTop: true
    });

    // column search
    $('#dataTable thead tr:eq(1) th').each(function (i) {
        $('input', this).on('keyup change', function () {
            table.column(i).search(this.value).draw();
        });
    });
});

// CSV LOAD
document.getElementById("csvFile").addEventListener("change", function (e) {
    let file = e.target.files[0];

    Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: function (results) {
            let data = results.data;
            table.clear();

            data.forEach(r => {
                table.row.add([
                    r.Hostname,
                    r.Customer,
                    r.PrivateIP,
                    r.Drive,
                    r.FileName,
                    r.FullPath,
                    (r.SizeBytes/1073741824).toFixed(2),
                    r.LastModified
                ]);
            });

            table.draw();
        }
    });
});

// OPEN FILTER
$(document).on("click", ".filter-btn", function (e) {
    currentColumn = $(this).data("col");

    let values = [...new Set(table.column(currentColumn).data().toArray())].sort();
    let existing = activeFilters[currentColumn] || { selected: [], mode: "include" };

    $(`input[name="mode"][value="${existing.mode}"]`).prop("checked", true);

    $("#filterValues").html(values.map(v =>
        `<div><label><input type="checkbox" value="${v}" ${existing.selected.includes(v) ? "checked":""}> ${v}</label></div>`
    ).join(""));

    renderChips(existing.selected);

    $("#filterPopup").css({ top:e.pageY, left:e.pageX }).show();
});

// CHIPS
function renderChips(list){
    $("#selectedValues").html(list.map(v =>
        `<div class="selected-chip">${v}<span data-v="${v}">✖</span></div>`
    ).join(""));
}

// REMOVE CHIP
$(document).on("click",".selected-chip span",function(){
    let v=$(this).data("v");
    $(`#filterValues input[value="${v}"]`).prop("checked",false);
    $(this).parent().remove();
});

// SEARCH
$("#filterSearch").on("keyup", function () {
    let val=this.value.toLowerCase();
    $("#filterValues div").each(function(){
        $(this).toggle($(this).text().toLowerCase().includes(val));
    });
});

// SELECT / CLEAR
$("#selectAll").click(()=>$("#filterValues input:visible").prop("checked",true));
$("#clearAll").click(()=>{ $("#filterValues input").prop("checked",false); $("#selectedValues").empty(); });

// APPLY
$("#applyFilter").click(function(){
    let selected=$("#filterValues input:checked").map(function(){return this.value}).get();
    let mode=$("input[name='mode']:checked").val();

    activeFilters[currentColumn]={selected,mode};
    $("#filterPopup").hide();
    table.draw();
});

// FILTER LOGIC
$.fn.dataTable.ext.search.push(function (settings, data) {
    for (let col in activeFilters) {
        let f = activeFilters[col];
        if (!f.selected.length) continue;

        if (f.mode==="include" && !f.selected.includes(data[col])) return false;
        if (f.mode==="exclude" && f.selected.includes(data[col])) return false;
    }
    return true;
});

// DOWNLOAD
document.getElementById("downloadCsv").onclick=function(){
    let rows=table.rows({search:'applied'}).data();
    let csv=[];

    rows.each(r=>csv.push(r.join(",")));

    let blob=new Blob([csv.join("\n")]);
    let a=document.createElement("a");
    a.href=URL.createObjectURL(blob);
    a.download="filtered.csv";
    a.click();
};
