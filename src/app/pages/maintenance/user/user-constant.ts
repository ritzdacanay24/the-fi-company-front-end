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
  "Warehouse",
  "Sales",
].sort();

export const accessRight = [
  { name: "Regular", value: 0, bgColor: "#3AB6E3" },
  { name: "Lead", value: 1, bgColor: "#85144b" },
  { name: "Supervisor", value: 2, bgColor: "#orange" },
  { name: "Manager", value: 3, bgColor: "#662d91" },
  { name: "Director", value: 4, bgColor: "#17B169" },
  { name: "CEO", value: 5, bgColor: "black" },
];
