import { ICellRendererParams } from "ag-grid-community";
import moment from "moment";

export function StatusDateRenderer(params: ICellRendererParams) {
    if (params.data) {
      let dateToCheck = moment(params.value);
      let today = moment().startOf("day");
      let diffInDays = dateToCheck.diff(today, "days");
  
      if (diffInDays > 0)
        return `<span class="badge bg-success-subtle text-success mb-0">${params.value}</span>`;
      if (diffInDays < 0)
        return `<span class="badge bg-danger-subtle text-danger mb-0">${params.value}</span>`;
      if (diffInDays == 0)
        return `<span class="badge bg-warning-subtle text-warning mb-0">${params.value}</span>`;
      return params.value;
    }
    return null;
  }
