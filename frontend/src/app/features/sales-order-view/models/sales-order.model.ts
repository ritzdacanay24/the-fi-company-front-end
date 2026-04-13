export interface SalesOrder {
  SOD_NBR: string;
  SOD_DUE_DATE: string;
  LEADTIME: number;
  SOD_PART: string;
  SOD_QTY_ORD: number;
  SOD_QTY_SHIP: number;
  SOD_PRICE: number;
  SOD_CONTR_ID: string;
  SOD_DOMAIN: string;
  SOD_COMPL_STAT: string;
  OPENBALANCE: number;
  QTYOPEN: number;
  SOD_QTY_ALL: number;
  FULLDESC: string;
  SO_CUST: string;
  SOD_LINE: number;
  SO_ORD_DATE: string;
  SO_SHIP: string;
  STATUS: string;
  STATUSCLASS: string;
  SOD_ORDER_CATEGORY: string;
  CP_CUST_PART: number;
  LD_QTY_OH: number;
  SO_BOL: string;
  SO_CMTINDX: number;
  PT_ROUTING: string;
  AGE: number;
  SOD_LIST_PR: number;
  CMT_CMMT: string;
  WORK_ORDER_ROUTING: string;
  sod_acct: number;
  SO_SHIPVIA: string;
  SALES_ORDER_LINE_NUMBER: string;
  PT_DESC1: string;
  PT_DESC2: string;
  sod_per_date: string;
  sod_type: string;
  OID_SO_ORDER_DATE: number;
  OID_SO_ORDER_TIME: number;
  OID_SO_MSTR: number;
  sod_req_date: string;
  REQ_DUE_DIFF: number;
  WO_NBR: number;
  PT_REV: string;
  id: string;
  sales_order_line_number: string;
  recent_notes: any;
  misc: SalesOrderMisc;
  recent_owner_changes?: {
    so: string;
    hits: number;
  };
  all_mention_comments?: {
    all_comments: string;
    orderNum: string;
  };
  recent_comments?: {
    orderNum: string;
    comments_html: string;
    comments: string;
    createdDate: string;
    byDate: string;
    color_class_name: string;
    bg_class_name: string;
    comment_title: string;
    created_by_name: string;
  };
}

export interface SalesOrderMisc {
  id: number;
  userName: string;
  so: string;
  fs_install: any;
  createdDate: string;
  createdBy: number;
  lastModDate: string;
  lastModUser: number;
  fs_install_date: any;
  arrivalDate: any;
  shipViaAccount: any;
  source_inspection_required: any;
  source_inspection_completed: any;
  source_inspection_waived: any;
  pallet_count: any;
  container: any;
  container_due_date: any;
  last_mod_info: any;
  tj_po_number: number;
  tj_due_date: string;
  g2e_comments: any;
  shortages_review: any;
  recoveryDate: any;
  lateReasonCode: any;
  lateReasonCodePerfDate: any;
  recoveryDateComment: any;
  supplyReview: any;
  shipping_db_status: any;
  clear_to_build_status: any;
  hot_order: any;
  lateReasonCodeComment: any;
}

export interface ShippingEligibility {
  canShip: boolean;
  issues: ShippingIssue[];
  warnings: ShippingWarning[];
  readyToShip: boolean;
  blockers: string[];
  recommendations: string[];
}

export interface ShippingIssue {
  type: 'critical' | 'warning' | 'info';
  field: string;
  message: string;
  description?: string;
  resolution?: string;
}

export interface ShippingWarning {
  type: 'inventory' | 'pricing' | 'routing' | 'date' | 'quality';
  message: string;
  impact: 'high' | 'medium' | 'low';
}

export interface ShippingValidationResult {
  salesOrder: SalesOrder;
  eligibility: ShippingEligibility;
  lastValidated: Date;
}
