import moment from "moment";
import { GridReadyEvent } from 'ag-grid-community'

export let agGridDateFilterdateFilter = {
  comparator: function (filterLocalDateAtMidnight, cellValue) {
    var dateAsString = cellValue;
    var dateCheck = moment(filterLocalDateAtMidnight).format('YYYY-MM-DD');

    if (dateAsString === dateCheck) {
      return 0;
    }
    if (dateAsString < dateCheck) {
      return -1;
    }

    if (dateAsString > dateCheck) {
      return 1;
    }

    return null;
  },
  clearButton: true,
  applyButton: false,
  debounceMs: 200
}

export const autoSizeColumns = params => {
  const colIds = params.columnApi
    .getAllDisplayedColumns()
    .map(col => col.getColId())

  setTimeout(() => {
    params.columnApi.autoSizeColumns(colIds)
  }, 200)
}

export const onFirstDataRendered = params => {
  setTimeout(() => {
    params.api.sizeColumnsToFit()
  }, 200)
}

export const momentCalendar = ({ value }) => {
  if (!value) return null

  let isToday =
    moment(value).format('YYYY-MM-DD') == moment().format('YYYY-MM-DD')

  if (isToday) {
    return moment(value).calendar({
      sameDay: '[Today] @ LT'
    })
  }
  return moment(value).format('lll')
}

export const addMoment = (params: any) =>
  moment(params.data?.last_date_of_service)
    .add(params.data?.Days_Supply, 'days')
    .format('YYYY-MM-DD')

export const highlightRowView = (params: GridReadyEvent, key: string, preview_id_view: number | string) => {

  params.api.forEachNode((node) => {
    if (node.data) {
      let e = parseInt(node.data[key]) == preview_id_view;
      node.setSelected(e)
      if (e) {
        params.api.ensureIndexVisible(node.rowIndex, 'middle');
      }
    }
  });
}
