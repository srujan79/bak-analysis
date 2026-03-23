// Existing code unchanged above...

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
});

// FILTER BUTTON CLICK
$(document).on("click", ".filter-btn", function (e) {
    currentColumn = $(this).data("col");

    let columnData = table.column(currentColumn).data().toArray();
    let uniqueValues = [...new Set(columnData)].sort();

    let html = "";
    uniqueValues.forEach(val => {
        html += `
            <div>
                <label>
                    <input type="checkbox" value="${val}">
                    ${val}
                </label>
            </div>
        `;
    });

    $("#filterValues").html(html);

    $("#filterPopup")
        .css({ top: e.pageY + "px", left: e.pageX + "px" })
        .show();
});

// SEARCH INSIDE FILTER
$("#filterSearch").on("keyup", function () {
    let val = $(this).val().toLowerCase();
    $("#filterValues div").filter(function () {
        $(this).toggle($(this).text().toLowerCase().indexOf(val) > -1);
    });
});

// SELECT ALL
$("#selectAll").on("click", function () {
    $("#filterValues input").prop("checked", true);
});

// CLEAR ALL
$("#clearAll").on("click", function () {
    $("#filterValues input").prop("checked", false);
});

// APPLY FILTER
$("#applyFilter").on("click", function () {
    let selected = [];
    $("#filterValues input:checked").each(function () {
        selected.push($(this).val());
    });

    let mode = $("input[name='mode']:checked").val();

    activeFilters[currentColumn] = { selected, mode };

    $("#filterPopup").hide();
    table.draw();
});

// CUSTOM FILTER LOGIC
$.fn.dataTable.ext.search.push(function (settings, data) {
    for (let col in activeFilters) {
        let filter = activeFilters[col];
        let cellValue = data[col];

        if (!filter.selected.length) continue;

        if (filter.mode === "include") {
            if (!filter.selected.includes(cellValue)) return false;
        } else {
            if (filter.selected.includes(cellValue)) return false;
        }
    }
    return true;
});
