export class NAVIGATION_ROUTE {
  public static readonly CREATE = "/dashboard/maintenance/user/create";
  public static readonly LIST = "/dashboard/maintenance/user/list";
  public static readonly EDIT = "/dashboard/maintenance/user/edit";
}

export const departments = [
  "Logsitics",
  "Production",
  "Quality",
  "NPI",
  "Accounting",
  "Engineering",
  "IT",
  "Field Service",
];

export const accessRight = [
  { name: "Regular", value: 0 },
  { name: "Lead", value: 1 },
  { name: "Supervisor", value: 2 },
  { name: "Manager", value: 3 },
  { name: "Director", value: 4 },
];
