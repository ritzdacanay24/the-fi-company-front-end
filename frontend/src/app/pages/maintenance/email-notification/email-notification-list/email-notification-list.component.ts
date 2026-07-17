import { GridApi, GridOptions } from "ag-grid-community";
import { Component, Input, OnInit } from "@angular/core";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";
import { NgSelectModule } from "@ng-select/ng-select";
import { AgGridModule } from "ag-grid-angular";

import { ActivatedRoute, Router } from "@angular/router";
import { highlightRowView, autoSizeColumns } from "src/assets/js/util";
import { NAVIGATION_ROUTE } from "../email-notification-constant";
import { SharedModule } from "@app/shared/shared.module";
import {
  _decompressFromEncodedURIComponent,
  _compressToEncodedURIComponent,
} from "src/assets/js/util/jslzString";
import { EmailNotificationService } from "@app/core/api/email-notification/email-notification.component";
import { LinkRendererV2Component } from "@app/shared/ag-grid/cell-renderers/link-renderer-v2/link-renderer-v2.component";
import { EmailGroupMembersPreviewRendererComponent } from "./email-group-members-preview-renderer.component";

@Component({
  standalone: true,
  imports: [
    SharedModule,
    ReactiveFormsModule,
    FormsModule,
    NgSelectModule,
    AgGridModule,
  ],
  selector: "app-email-notification-list",
  templateUrl: "./email-notification-list.component.html",
  styles: [
    `
      .notification-hero {
      }

      .hero-eyebrow {
        text-transform: uppercase;
        letter-spacing: 0.08em;
        font-size: 0.72rem;
        color: #5c6470;
        font-weight: 600;
        margin-bottom: 0.35rem;
      }

      .stat-card {
        border-left: 4px solid #3f8cff;
      }

      .stat-label {
        font-size: 0.8rem;
        color: #6c757d;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        margin-bottom: 0.35rem;
      }

      .stat-value {
        font-size: 1.6rem;
        line-height: 1;
        font-weight: 700;
      }

      .toolbar-card {
        border-radius: 0.75rem;
      }

      .toolbar-label {
        font-size: 0.75rem;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        color: #6c757d;
        margin-bottom: 0.35rem;
      }

      .search-input {
        border-radius: 0.55rem;
      }

      .health-badge {
        font-size: 0.72rem;
        font-weight: 600;
        border-radius: 999px;
        padding: 0.15rem 0.55rem;
      }

      .health-good {
        color: #167d3f;
      }

      .health-warn {
        background: #fff4e5;
        color: #9a5b00;
      }
    `,
  ],
})
export class EmailNotificationListComponent implements OnInit {
  constructor(
    public api: EmailNotificationService,
    public router: Router,
    private activatedRoute: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.activatedRoute.queryParams.subscribe((params) => {
      this.id = params["id"];
      this.selectedViewTypeUserList =
        params["selectedViewTypeUserList"] || this.selectedViewTypeUserList;
    });

    this.getData();
  }

  columnDefs: any = [
    {
      field: "action",
      headerName: "Action",
      filter: "agMultiColumnFilter",
      pinned: "left",
      cellRenderer: LinkRendererV2Component,
      cellRendererParams: {
        onClick: (e: any) => this.onEdit(e.rowData.id),
        value: "Edit",
      },
      maxWidth: 125,
      minWidth: 125,
    },
    {
      field: "location",
      headerName: "Notification Group",
      filter: "agMultiColumnFilter",
      flex: 2,
      minWidth: 230,
    },
    {
      field: "groupName",
      headerName: "Name / Description",
      filter: "agMultiColumnFilter",
      flex: 2,
      minWidth: 230,
    },
    {
      field: "recipientCount",
      headerName: "Recipients",
      filter: "agNumberColumnFilter",
      cellRenderer: EmailGroupMembersPreviewRendererComponent,
      maxWidth: 170,
      minWidth: 145,
    },
    {
      field: "manualCount",
      headerName: "Manual",
      filter: "agNumberColumnFilter",
      maxWidth: 130,
      minWidth: 110,
    },
    {
      field: "userLinkedCount",
      headerName: "User Linked",
      filter: "agNumberColumnFilter",
      maxWidth: 150,
      minWidth: 130,
    },
    {
      field: "healthLabel",
      headerName: "Health",
      filter: "agMultiColumnFilter",
      maxWidth: 150,
      minWidth: 130,
      cellRenderer: (params: any) => {
        const value = String(params.value || "");
        const css = value === "Needs Review" ? "health-badge health-warn" : "health-badge health-good";
        return `<span class="${css}">${value || "Healthy"}</span>`;
      },
    },
  ];

  @Input() selectedViewTypeUserList = "Active";

  selectedViewOptions = [
    {
      name: "Active",
      value: 1,
      selected: false,
    },
    {
      name: "Inactive",
      value: 0,
      selected: false,
    },
    {
      name: "All",
      selected: false,
    },
  ];

  title = "Email Notifications";

  gridApi: GridApi;

  data: any[];

  rawRows: any[] = [];

  optionsByValue = new Map<string, { name: string; category: string }>();

  totalRecipients = 0;

  totalGroups = 0;

  manualEmailRecipients = 0;

  searchTerm = "";

  id = null;

  gridOptions: GridOptions = {
    columnDefs: this.columnDefs,
    defaultColDef: {
      sortable: true,
      resizable: true,
      floatingFilter: true,
    },
    onGridReady: (params: any) => {
      this.gridApi = params.api;

      let data = this.activatedRoute.snapshot.queryParams["gridParams"];
      _decompressFromEncodedURIComponent(data, params);
    },
    onFirstDataRendered: (params) => {
      highlightRowView(params, "id", this.id);
      autoSizeColumns(params);
    },
    getRowId: (params) => String(params.data.location || params.data.id || ""),
    onFilterChanged: (params) => {
      let gridParams = _compressToEncodedURIComponent(this.gridApi);
      this.router.navigate([`.`], {
        relativeTo: this.activatedRoute,
        queryParamsHandling: "merge",
        queryParams: {
          gridParams,
        },
      });
    },
    onSortChanged: (params) => {
      let gridParams = _compressToEncodedURIComponent(this.gridApi);
      this.router.navigate([`.`], {
        relativeTo: this.activatedRoute,
        queryParamsHandling: "merge",
        queryParams: {
          gridParams,
        },
      });
    },
  };

  onEdit(id) {
    let gridParams = _compressToEncodedURIComponent(this.gridApi);
    this.router.navigate([NAVIGATION_ROUTE.EDIT], {
      queryParamsHandling: "merge",
      queryParams: {
        id: id,
        gridParams,
      },
    });
  }

  onCreate() {
    this.router.navigate([NAVIGATION_ROUTE.CREATE], {
      queryParams: {
        id: null,
      },
      queryParamsHandling: "merge",
    });
  }

  async getData() {
    try {
      this.data = [];
      this.gridApi?.showLoadingOverlay();

      this.rawRows = await this.api.getAll();
      const options = await this.api.getOptions();
      this.optionsByValue = new Map(
        (options || []).map((option: any) => [
          String(option?.value || "").trim(),
          {
            name: String(option?.name || "").trim(),
            category: String(option?.category || "").trim(),
          },
        ]),
      );

      this.data = this.toGroupRows(this.rawRows || []);
      this.updateStats(this.rawRows || []);

      this.gridApi?.hideOverlay();
    } catch (err) {
      this.gridApi?.hideOverlay();
    }
  }

  onSearchChange(value: string) {
    this.searchTerm = value || "";
    this.gridApi?.setGridOption("quickFilterText", this.searchTerm);
  }

  clearSearch() {
    this.onSearchChange("");
  }

  private toGroupRows(rows: any[]): any[] {
    const groups = new Map<string, any>();

    for (const row of rows) {
      const location = String(row?.location || "").trim();
      const key = location || "__EMPTY_LOCATION__";
      const group = groups.get(key) || {
        id: row?.id,
        location: location || "(Missing Notification Group)",
        groupName: "",
        recipientCount: 0,
        manualCount: 0,
        userLinkedCount: 0,
        hasInactiveUsers: false,
        members: [],
      };

      group.recipientCount += 1;
      if (row?.user_id) {
        group.userLinkedCount += 1;
      } else {
        group.manualCount += 1;
      }

      if (String(row?.user_status || "").toLowerCase() === "inactive") {
        group.hasInactiveUsers = true;
      }

      const email = String(row?.email || row?.notification_emails || "").trim();
      const displayName = this.resolveMemberDisplayName(row, email);
      if (displayName) {
        const status = String(row?.user_status || "").trim();
        const memberLabel = status ? `${displayName} (${status})` : displayName;
        if (!group.members.some((m: any) => m.label === memberLabel)) {
          group.members.push({ label: memberLabel });
        }
      }

      groups.set(key, group);
    }

    return [...groups.values()]
      .map((group) => ({
        ...group,
        groupName: this.getGroupName(group.location),
        healthLabel: group.hasInactiveUsers ? "Needs Review" : "Healthy",
      }))
      .sort((a, b) => String(a.location).localeCompare(String(b.location)));
  }

  private getGroupName(location: string): string {
    const option = this.optionsByValue.get(String(location || "").trim());
    if (!option) {
      return "(Unmapped option key)";
    }

    const name = option.name || "";
    const category = option.category || "";
    if (name && category) {
      return `${name} - ${category}`;
    }

    return name || category || "(Unnamed option)";
  }

  private resolveMemberDisplayName(row: any, email: string): string {
    const provided = String(row?.display_name || "").trim();
    if (provided) {
      return provided;
    }

    if (!email) {
      return "External Recipient";
    }

    const local = String(email).split("@")[0] || "";
    if (!local) {
      return "External Recipient";
    }

    return local
      .replace(/[._-]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }

  private updateStats(rows: any[]) {
    this.totalRecipients = rows.length;
    this.totalGroups = new Set(rows.map((row) => String(row.location || "").trim()).filter(Boolean)).size;
    this.manualEmailRecipients = rows.filter((row) => !row.user_id).length;
  }
}
