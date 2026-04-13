//https://netbasal.com/typed-reactive-forms-in-angular-no-longer-a-type-dream-bf6982b0af28
export interface IShortagesForm {
  jobNumber: string;
  woNumber: string;
  lineNumber: string;
  dueDate: string;
  reasonPartNeeded: string;
  priority: string;
  partNumber: string;
  qty: string;
  createdBy: string;
  createdDate: string;
  active: number;
  status: string;
  deleted_main_date: string;
  deleted_main_user: string;
  active_line: number;
  comments: string;
  partDesc: string;
  buyer: string;
  assemblyNumber: string;
  supplyCompleted: string;
  receivingCompleted: string;
  deliveredCompleted: string;
  supplyCompletedBy: string;
  receivingCompletedBy: string;
  deliveredCompletedBy: string;
  productionIssuedDate: string;
  productionIssuedBy: string;
  graphicsShortage: boolean;
  poNumber: string;
  supplier: string;
  mrfId: string;
  mrf_line: string;
}
