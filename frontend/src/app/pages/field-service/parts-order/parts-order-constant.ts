export class NAVIGATION_ROUTE {
  public static readonly CREATE = '/operations/parts-order/create';
  public static readonly LIST = '/operations/parts-order/list';
  public static readonly EDIT = '/operations/parts-order/edit';
}

export const PARTS_ORDER_ATTACHMENT = {
  FIELD: 'FS Parts Order',
  SUB_FOLDER: 'partsRequest',
} as const;
