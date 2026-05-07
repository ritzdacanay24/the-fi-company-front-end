export class ReassignAssignmentDto {
  new_wo_number!: string;
  reason!: string;
  performed_by!: string;
  // WO detail fields from QAD - updated on the record when reassigning
  wo_description?: string;
  wo_part?: string;
  wo_qty_ord?: number;
  wo_due_date?: string;
  wo_routing?: string;
  wo_line?: string;
  cp_cust_part?: string;
  cp_cust?: string;
}