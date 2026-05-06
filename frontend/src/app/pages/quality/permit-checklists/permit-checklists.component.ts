import { CommonModule } from "@angular/common";
import { Component, OnDestroy, OnInit, TemplateRef } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { ActivatedRoute, Router } from "@angular/router";
import { DomSanitizer, SafeResourceUrl } from "@angular/platform-browser";
import { Subscription } from "rxjs";
import { AgGridModule } from "ag-grid-angular";
import { ColDef, GridOptions } from "ag-grid-community";
import { PermitTicketActionsRendererComponent } from "./permit-ticket-actions-renderer.component";
import { PermitChecklistSummaryComponent } from "./permit-checklist-summary.component";
import { AuthenticationService } from "@app/core/services/auth.service";
import { THE_FI_COMPANY_CURRENT_USER } from "@app/core/guards/admin.guard";
import { PermitChecklistsService } from "@app/core/api/quality/permit-checklists.service";
import { NgbDropdownModule, NgbModal, NgbModalModule, NgbModalRef } from "@ng-bootstrap/ng-bootstrap";
import * as mammoth from "mammoth";
import { TextFieldModule } from "@angular/cdk/text-field";

type PermitChecklistType = "seismic" | "dca";
type BillingSection = "customer" | "eyefi";

interface ChecklistField {
  key: string;
  label: string;
  placeholder?: string;
  type?: "text" | "date";
}

interface ChecklistTemplate {
  id: PermitChecklistType;
  title: string;
  subtitle: string;
  headerFields: ChecklistField[];
  processFields: ChecklistField[];
  footerNotes: string[];
  defaultCustomerBillingBreakdown?: PermitChecklistFeeLine[];
  defaultEyefiBillingBreakdown?: PermitChecklistFeeLine[];
}

interface PermitChecklistFeeLine {
  key: string;
  label: string;
  amount: number | null;
  isApprovedAmount?: boolean;
}

interface PermitChecklistFinancials {
  quoteAmount: number;
  invoiceAmount: number;
  approvedAmount: number;
  approvalDate: string;
  invoiceReference: string;
  customerBillingBreakdown: PermitChecklistFeeLine[];
  eyefiBillingBreakdown: PermitChecklistFeeLine[];
}

interface PermitChecklistTicket {
  ticketId: string;
  formType: PermitChecklistType;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  finalizedAt?: string;
  status: "draft" | "saved" | "submitted" | "finalized" | "archived";
  values: Record<string, string>;
  fieldUpdatedAt: Record<string, string>;
  processNoteRecords: PermitChecklistProcessNote[];
  financials: PermitChecklistFinancials;
  attachments: PermitChecklistAttachment[];
}

interface PermitChecklistProcessNote {
  id: string;
  fieldKey: string;
  fieldLabel: string;
  noteText: string;
  createdAt: string;
  createdBy: string;
  editedAt?: string;
  editedBy?: string;
}

interface PermitChecklistAttachment {
  id: string;
  fieldKey: string;
  fieldLabel: string;
  uploadedBy: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: string;
  dataUrl?: string;
  url?: string;
  link?: string;
  path?: string;
}

interface PermitChecklistTransaction {
  id: string;
  ticketId: string;
  type:
    | "create"
    | "field_update"
    | "save"
    | "submit"
    | "finalize"
    | "archive"
    | "clear"
    | "delete"
    | "attachment_upload"
    | "attachment_remove"
    | "note_add"
    | "note_edit";
  timestamp: string;
  actor?: string;
  details?: Record<string, string>;
}

interface PermitChecklistRecentChange {
  id: string;
  timestamp: string;
  actor: string;
  description: string;
}

interface PermitChecklistApprovedRow {
  ticketId: string;
  formType: string;
  customer: string;
  status: string;
  quoteAmount: number;
  invoiceAmount: number;
  approvedAmount: number;
  variance: number;
  approvalDate: string;
  updatedAt: string;
}

interface PermitChecklistChartRow {
  formType: PermitChecklistType;
  label: string;
  totalTickets: number;
  finalizedTickets: number;
  avgCompletionPercent: number;
  approvedAmount: number;
}

interface PermitChecklistAuditRow {
  id: string;
  ticketId: string;
  type: PermitChecklistTransaction["type"];
  timestamp: string;
  fieldKey: string;
  oldValue: string;
  newValue: string;
  source: string;
}

interface PermitChecklistCustomer {
  id: string;
  name: string;
}

interface PermitChecklistArchitect {
  id: string;
  name: string;
}

interface StoredChecklistData {
  tickets: PermitChecklistTicket[];
  draftFormType: PermitChecklistType;
  transactions: PermitChecklistTransaction[];
  customers?: PermitChecklistCustomer[];
  architects?: PermitChecklistArchitect[];
  customerBillingDefaultsByType?: Partial<Record<PermitChecklistType, PermitChecklistFeeLine[]>>;
}

@Component({
  standalone: true,
  selector: "app-permit-checklists",
  imports: [CommonModule, FormsModule, AgGridModule, NgbDropdownModule, NgbModalModule, PermitChecklistSummaryComponent, TextFieldModule],
  templateUrl: "./permit-checklists.component.html",
  styleUrls: ["./permit-checklists.component.scss"],
})
export class PermitChecklistsComponent implements OnInit {
  private readonly maxTransactions = 2000;
  private readonly ticketGridStateKey = "quality_permit_checklists_ticket_grid_state_v1";
  private readonly auditGridStateKey = "quality_permit_checklists_audit_grid_state_v1";
  private readonly approvedGridStateKey = "quality_permit_checklists_approved_grid_state_v1";
  private readonly legacyStorageCleanupFlag = "quality_permit_checklists_cleanup_done_v1";
  private readonly legacyChecklistStorageKeys = ["quality_permit_checklists_v2", "quality_permit_checklists_v1"];
  private readonly defaultCustomerNames: string[] = [
    "AGS",
    "Ainsworth",
    "ATI",
    "Bally",
    "EpicTech",
    "Everi",
    "IGT",
    "Konami",
    "SG",
    "Synergy Blue",
    "L&W",
    "Bluberi",
    "ITS Gaming",
    "MGM Corps",
    "Sonny",
    "Yaamava",
    "Zitro",
  ];
  private readonly defaultArchitectNames: string[] = ["R2 Architects", "WATG"];
  private routeSub?: Subscription;
  private ticketSyncTimer: ReturnType<typeof setTimeout> | null = null;
  private directorySyncDirty = false;
  private billingDefaultsSyncDirty = false;
  private dirtyTransactionTicketIds = new Set<string>();
  private isHydratingApi = false;
  private pendingRouteTicketId = "";
  private pendingRouteFormType = "";
  private pendingRouteView = "";

  viewMode: "home" | "form" | "summary" = "home";
  homeTab: "tickets" | "audit" | "approved-report" = "tickets";
  showOpenItemsOnly = localStorage.getItem('pc_showOpenItemsOnly') === 'true';
  condensedForm = localStorage.getItem('pc_condensedForm') === 'true';
  signPackageDraft = "";

  readonly templates: ChecklistTemplate[] = [
    {
      id: "seismic",
      title: "Seismic Checklist",
      subtitle: "Document workflow for seismic approval projects",
      headerFields: [
        { key: "dateInitiated", label: "Date Initiated" },
        { key: "customer", label: "Customer" },
        { key: "contactName", label: "Contact Name" },
        { key: "property", label: "Property" },
        { key: "signPackage", label: "Sign Package" },
        { key: "customerPoBillingReference", label: "Customer PO# / Billing Reference" },
        { key: "fiSalesOrderOnQad", label: "Fi Sales Order (SO) number on QAD" },
        { key: "soDueDateOnQad", label: "SO due Date on QAD" },
        { key: "paradigmPoNumber", label: "Paradigm PO Number" },
      ],
      processFields: [
        { key: "sentToAnkitToCreateFiles", label: "Sent to Ankit to create files", type: "date" },
        { key: "quoteSentToCustomer", label: "Quote sent to customer", type: "date" },
        { key: "poOrBillingReceived", label: "PO or Billing reference received from customer", type: "date" },
        { key: "poOrBillingSentToSales", label: "PO or Billing reference sent to Sales to Process", type: "date" },
        { key: "salesConfirmSoOnQad", label: "Sales Confirm SO on QAD", type: "date" },
        { key: "receivedFilesFromAnkit", label: "Received files from Ankit", type: "date" },
        { key: "poCreatedForParadigm", label: "PO created for Paradigm", type: "date" },
        { key: "filesAndPoSentToParadigm", label: "Files and PO sent to Paradigm", type: "date" },
        { key: "filesReceivedFromParadigm", label: "Files received from Paradigm", type: "date" },
        { key: "invoiceReceivedFromParadigm", label: "Invoice received from Paradigm", type: "date" },
        { key: "invoiceFromParadigmApproved", label: "Invoice from Paradigm approved and sent to AP", type: "date" },
        { key: "completedDocumentPackageSent", label: "Completed document package sent to customer", type: "date" },
      ],
      footerNotes: ["Seismic Approval @ $3,000"],
      defaultCustomerBillingBreakdown: [{ key: "seismicApproval", label: "Seismic Approval", amount: 3000 }],
    },
    {
      id: "dca",
      title: "DCA Checklist",
      subtitle: "Document workflow for DCA and architect coordination",
      headerFields: [
        { key: "dateInitiated", label: "Date Initiated" },
        { key: "customer", label: "Customer" },
        { key: "contactName", label: "Contact Name" },
        { key: "property", label: "Property" },
        { key: "signPackage", label: "Sign Package" },
        { key: "customerPoBillingReference", label: "Customer PO# / Billing Reference" },
        { key: "fiSalesOrderOnQad", label: "Fi Sales Order (SO) number on QAD" },
        { key: "soDueDateOnQad", label: "SO due Date on QAD" },
        { key: "leonFiPoNumber", label: "Leon S Fi PO Number" },
        { key: "assignedArchitect", label: "Assigned Architect" },
        { key: "architectsReference", label: "Architects Reference" },
        { key: "architectsFiPoNumber", label: "Architects Fi PO Number" },
      ],
      processFields: [
        { key: "sentToFranciscoToCreateFiles", label: "Sent to Francisco to create files", type: "date" },
        { key: "quoteSentToCustomer", label: "Quote sent to customer", type: "date" },
        { key: "poOrBillingReceived", label: "PO or Billing reference received from customer", type: "date" },
        { key: "poOrBillingSentToSales", label: "PO or Billing reference sent to Sales to Process", type: "date" },
        { key: "salesConfirmSoOnQad", label: "Sales Confirm SO on QAD", type: "date" },
        { key: "receivedFilesFromFrancisco", label: "Received files from Francisco", type: "date" },
        { key: "poCreatedForLeonSkvirsky", label: "PO created for Leon Skvirsky", type: "date" },
        { key: "filesAndPoSentToLeonS", label: "Files and PO sent to Leon S", type: "date" },
        { key: "filesReceivedFromLeonS", label: "Files received from Leon S", type: "date" },
        { key: "invoiceReceivedFromLeonS", label: "Invoice received from Leon S", type: "date" },
        { key: "invoiceFromLeonSApproved", label: "Invoice from Leon S approved and sent to AP", type: "date" },
        { key: "filesFromLeonSSentToArchitects", label: "Files from Leon S sent to Architects", type: "date" },
        { key: "architectsProposalReceived", label: "Architects Proposal Received and Signed", type: "date" },
        { key: "architectsPoCreated", label: "Architects PO created", type: "date" },
        { key: "architectsPoSent", label: "Architects PO sent", type: "date" },
        { key: "completedDocumentPackageReceived", label: "Completed document package received", type: "date" },
        { key: "completedDocumentPackageSent", label: "Completed document package sent to customer", type: "date" },
        { key: "architectsInvoiceApproved", label: "Architects invoice approved and sent to AP", type: "date" },
      ],
      footerNotes: [
        "Quote: $9,980 per sign per location",
        "Architect Fees @ $3,980",
        "MEP Fees @ $2,750",
        "Structural Fees @ $2,500",
      ],
      defaultCustomerBillingBreakdown: [
        { key: "architectFees", label: "Architect Fees", amount: 3980 },
        { key: "mepFees", label: "MEP Fees", amount: 2750 },
        { key: "structuralFees", label: "Structural Fees", amount: 2500 },
      ],
    },
  ];

  draftFormType: PermitChecklistType = "seismic";
  homeSearchQuery = "";
  showRecentChangesPanel = false;
  tickets: PermitChecklistTicket[] = [];
  recentTickets: PermitChecklistTicket[] = [];
  transactions: PermitChecklistTransaction[] = [];
  auditLogRows: PermitChecklistAuditRow[] = [];
  activeTicketId: string | null = null;
  selectedAttachmentFieldKey = "";
  isAttachmentPreviewOpen = false;
  previewAttachment: PermitChecklistAttachment | null = null;
  previewAttachmentUrl: string | null = null;
  previewAttachmentResourceUrl: SafeResourceUrl | null = null;
  previewAttachmentKind: "image" | "pdf" | "docx" | "other" | "none" = "none";
  previewDocxHtml = "";
  isAttachmentDragOver = false;
  isProcessNoteModalOpen = false;
  processNoteFieldKey = "";
  processNoteFieldLabel = "";
  processNoteDraft = "";
  processNoteEditingId: string | null = null;
  fieldEditStartValues: Record<string, string> = {};
  fieldDraftValues: Record<string, string> = {};
  fieldEditingState: Record<string, boolean> = {};
  fieldDraftSource: Record<string, "manual" | "now"> = {};
  newCustomerBillingLabelDraft = "";
  newCustomerBillingAmountDraft: number = 0;
  newEyefiBillingLabelDraft = "";
  newEyefiBillingAmountDraft: number = 0;
  customerBillingDefaultsFormType: PermitChecklistType = "seismic";
  newCustomerBillingDefaultLabelDraft = "";
  newCustomerBillingDefaultAmountDraft: number = 0;
  customers: PermitChecklistCustomer[] = [];
  architects: PermitChecklistArchitect[] = [];
  newCustomerNameDraft = "";
  newArchitectNameDraft = "";
  private customerDirectoryModalRef?: NgbModalRef;
  private customerBillingDefaultsModalRef?: NgbModalRef;
  private customerBillingDefaultsByType: Record<PermitChecklistType, PermitChecklistFeeLine[]> =
    this.buildInitialCustomerBillingDefaults();

  private readonly maxPersistedPreviewSizeBytes = 750 * 1024;
  private readonly objectUrlByAttachmentId = new Map<string, string>();

  statusMessage = "";

  ticketGridComponents = {
    permitTicketActionsRenderer: PermitTicketActionsRendererComponent,
  };

  headerInfoColumnDefs: ColDef[] = this.buildHeaderInfoColumnDefs();

  ticketColumnDefs: ColDef[] = [
    {
      headerName: "Ticket ID",
      field: "ticketId",
      minWidth: 190,
      pinned: "left",
      cellClass: "fw-semibold",
      cellRenderer: (params: any) => {
        const ticketId = String(params.value || "");
        if (!ticketId) {
          return "-";
        }
        return `<span class="text-primary text-decoration-underline" style="cursor:pointer;">${ticketId}</span>`;
      },
    },
    {
      headerName: "Form",
      field: "formType",
      minWidth: 130,
      valueFormatter: (params) => String(params.value || "").toUpperCase(),
    },
    {
      headerName: "Customer",
      field: "values.customer",
      minWidth: 180,
      valueGetter: (params) => params.data?.values?.customer || "-",
    },
    ...this.headerInfoColumnDefs,
    {
      headerName: "Status",
      field: "status",
      minWidth: 120,
      cellRenderer: (params: any) => {
        const status = String(params.value || "").toLowerCase();
        const isClosed = status === "finalized" || status === "archived";
        if (isClosed) {
          return `<span class="badge bg-secondary-subtle text-secondary">Closed</span>`;
        }
        return `<span class="badge bg-success-subtle text-success">Open</span>`;
      },
    },
    {
      headerName: "Completion",
      field: "completionPercent",
      minWidth: 240,
      valueGetter: (params) => this.getTicketCompletionMetrics(params.data).percent,
      cellRenderer: (params: any) => {
        const metrics = this.getTicketCompletionMetrics(params.data);
        const percent = Math.max(0, Math.min(100, metrics.percent));
        const tone = percent >= 100 ? "#198754" : percent >= 60 ? "#0d6efd" : "#f59e0b";
        return `
          <div class="completion-cell">
            <div class="completion-track">
              <div class="completion-fill" style="width:${percent}%;background:${tone};"></div>
            </div>
            <span class="completion-label">${percent}% (${metrics.completed}/${metrics.total})</span>
          </div>
        `;
      },
    },
    {
      headerName: "Approved",
      field: "approvedAmount",
      minWidth: 140,
      valueGetter: (params) => Number(params.data?.financials?.approvedAmount || 0),
      valueFormatter: (params) => this.formatCurrency(Number(params.value || 0)),
      cellClass: "fw-semibold",
    },
    {
      headerName: "Updated",
      field: "updatedAt",
      minWidth: 220,
      valueFormatter: (params) => {
        if (!params.value) {
          return "-";
        }
        return new Date(params.value).toLocaleString();
      },
    },
  ];

  ticketGridOptions: GridOptions = {
    columnDefs: this.ticketColumnDefs,
    defaultColDef: {
      sortable: true,
      filter: true,
      resizable: true,
      floatingFilter: true,
    },
    animateRows: true,
    suppressMenuHide: true,
    onCellClicked: (params: any) => {
      if (params?.colDef?.field !== "ticketId") {
        return;
      }

      const ticketId = String(params?.value || "").trim();
      if (!ticketId) {
        return;
      }

      this.openTicket(ticketId);
    },
    onGridReady: (params: any) => this.restoreGridState(this.ticketGridStateKey, params.api),
    onColumnMoved: (params: any) => this.saveGridState(this.ticketGridStateKey, params.api),
    onColumnPinned: (params: any) => this.saveGridState(this.ticketGridStateKey, params.api),
    onColumnVisible: (params: any) => this.saveGridState(this.ticketGridStateKey, params.api),
    onSortChanged: (params: any) => this.saveGridState(this.ticketGridStateKey, params.api),
    onFilterChanged: (params: any) => this.saveGridState(this.ticketGridStateKey, params.api),
    onColumnResized: (params: any) => {
      if (params?.finished) {
        this.saveGridState(this.ticketGridStateKey, params.api);
      }
    },
  };

  auditColumnDefs: ColDef[] = [
    {
      headerName: "Time",
      field: "timestamp",
      minWidth: 210,
      valueFormatter: (params) => {
        if (!params.value) {
          return "-";
        }
        return new Date(params.value).toLocaleString();
      },
      sort: "desc",
    },
    {
      headerName: "Ticket",
      field: "ticketId",
      minWidth: 190,
      pinned: "left",
      cellClass: "fw-semibold",
    },
    {
      headerName: "Action",
      field: "type",
      minWidth: 140,
      valueFormatter: (params) => String(params.value || "").replace("_", " ").toUpperCase(),
    },
    {
      headerName: "Field",
      field: "fieldKey",
      minWidth: 170,
      valueFormatter: (params) => params.value || "-",
    },
    {
      headerName: "Old Value",
      field: "oldValue",
      minWidth: 180,
      valueFormatter: (params) => params.value || "-",
    },
    {
      headerName: "New Value",
      field: "newValue",
      minWidth: 180,
      valueFormatter: (params) => params.value || "-",
    },
    {
      headerName: "Source",
      field: "source",
      minWidth: 120,
      valueFormatter: (params) => params.value || "-",
    },
  ];

  auditGridOptions: GridOptions = {
    columnDefs: this.auditColumnDefs,
    defaultColDef: {
      sortable: true,
      filter: true,
      resizable: true,
      floatingFilter: true,
    },
    rowHeight: 42,
    animateRows: true,
    suppressMenuHide: true,
    onGridReady: (params: any) => this.restoreGridState(this.auditGridStateKey, params.api),
    onColumnMoved: (params: any) => this.saveGridState(this.auditGridStateKey, params.api),
    onColumnPinned: (params: any) => this.saveGridState(this.auditGridStateKey, params.api),
    onColumnVisible: (params: any) => this.saveGridState(this.auditGridStateKey, params.api),
    onSortChanged: (params: any) => this.saveGridState(this.auditGridStateKey, params.api),
    onFilterChanged: (params: any) => this.saveGridState(this.auditGridStateKey, params.api),
    onColumnResized: (params: any) => {
      if (params?.finished) {
        this.saveGridState(this.auditGridStateKey, params.api);
      }
    },
  };

  approvedReportColumnDefs: ColDef[] = [
    { headerName: "Ticket", field: "ticketId", minWidth: 180, pinned: "left", cellClass: "fw-semibold" },
    { headerName: "Customer", field: "customer", minWidth: 170 },
    { headerName: "Form", field: "formType", minWidth: 110 },
    { headerName: "Status", field: "status", minWidth: 120 },
    {
      headerName: "Approved",
      field: "approvedAmount",
      minWidth: 130,
      valueFormatter: (params) => this.formatCurrency(params.value),
      cellClass: "fw-semibold",
    },
    {
      headerName: "Approval Date",
      field: "approvalDate",
      minWidth: 130,
      valueFormatter: (params) => (params.value ? new Date(params.value).toLocaleDateString() : "-"),
    },
  ];

  approvedReportGridOptions: GridOptions = {
    columnDefs: this.approvedReportColumnDefs,
    defaultColDef: {
      sortable: true,
      filter: true,
      resizable: true,
      floatingFilter: true,
    },
    rowHeight: 42,
    animateRows: true,
    suppressMenuHide: true,
    onGridReady: (params: any) => this.restoreGridState(this.approvedGridStateKey, params.api),
    onColumnMoved: (params: any) => this.saveGridState(this.approvedGridStateKey, params.api),
    onColumnPinned: (params: any) => this.saveGridState(this.approvedGridStateKey, params.api),
    onColumnVisible: (params: any) => this.saveGridState(this.approvedGridStateKey, params.api),
    onSortChanged: (params: any) => this.saveGridState(this.approvedGridStateKey, params.api),
    onFilterChanged: (params: any) => this.saveGridState(this.approvedGridStateKey, params.api),
    onColumnResized: (params: any) => {
      if (params?.finished) {
        this.saveGridState(this.approvedGridStateKey, params.api);
      }
    },
  };

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly authenticationService: AuthenticationService,
    private readonly sanitizer: DomSanitizer,
    private readonly modalService: NgbModal,
    private readonly permitChecklistsService: PermitChecklistsService
  ) {}

  ngOnInit(): void {
    this.clearLegacyPermitChecklistLocalCache();
    this.loadSavedData();
    this.routeSub = this.route.queryParamMap.subscribe((params) => {
      this.pendingRouteTicketId = (params.get("ticketId") || "").trim();
      this.pendingRouteFormType = (params.get("formType") || "").trim().toLowerCase();
      this.pendingRouteView = (params.get("view") || "").trim().toLowerCase();
      this.applyRouteQueryState();
    });
  }

  private applyRouteQueryState(): void {
    const ticketId = this.pendingRouteTicketId;
    const formType = this.pendingRouteFormType;
    const view = this.pendingRouteView;

    if (formType === "seismic" || formType === "dca") {
      this.draftFormType = formType;
    }

    if (ticketId) {
      const targetTicket = this.tickets.find((ticket) => ticket.ticketId === ticketId);
      if (targetTicket) {
        this.activeTicketId = ticketId;
        const isFinalized = targetTicket.status === "finalized";
        this.viewMode = view === "summary" || isFinalized ? "summary" : "form";
        this.statusMessage = "";
        return;
      }

      if (this.isHydratingApi) {
        return;
      }

      this.activeTicketId = null;
      this.viewMode = "home";
      this.statusMessage = `Ticket ${ticketId} not found.`;
      return;
    }

    this.activeTicketId = null;
    this.viewMode = "home";
  }

  ngOnDestroy(): void {
    this.routeSub?.unsubscribe();
    if (this.ticketSyncTimer) {
      clearTimeout(this.ticketSyncTimer);
      this.ticketSyncTimer = null;
    }
    this.customerDirectoryModalRef?.close();
    this.customerBillingDefaultsModalRef?.close();
    this.objectUrlByAttachmentId.forEach((url) => URL.revokeObjectURL(url));
    this.objectUrlByAttachmentId.clear();
  }

  get activeTicket(): PermitChecklistTicket | undefined {
    if (!this.activeTicketId) {
      return undefined;
    }
    return this.tickets.find((ticket) => ticket.ticketId === this.activeTicketId);
  }

  get activeFormType(): PermitChecklistType {
    return this.activeTicket?.formType ?? this.draftFormType;
  }

  get activeTemplate(): ChecklistTemplate {
    return this.templates.find((template) => template.id === this.activeFormType) ?? this.templates[0];
  }

  get activeValues(): Record<string, string> {
    return this.activeTicket?.values ?? {};
  }

  get activeFinancials(): PermitChecklistFinancials {
    return this.activeTicket?.financials ?? this.createEmptyFinancials(this.activeFormType);
  }

  get headerCompletedCount(): number {
    return this.getCompletedCount(this.activeTemplate.headerFields);
  }

  get processCompletedCount(): number {
    return this.getCompletedCount(this.activeTemplate.processFields);
  }

  get openFieldCount(): number {
    return this.totalFieldCount - this.totalCompletedCount;
  }

  get visibleHeaderFields(): ChecklistField[] {
    if (!this.showOpenItemsOnly) {
      return this.activeTemplate.headerFields;
    }
    return this.activeTemplate.headerFields.filter((field) => !this.isFieldPopulated(field.key));
  }

  get visibleProcessFields(): ChecklistField[] {
    if (!this.showOpenItemsOnly) {
      return this.activeTemplate.processFields;
    }
    return this.activeTemplate.processFields.filter((field) => !this.isFieldPopulated(field.key));
  }

  get totalFieldCount(): number {
    return this.activeTemplate.headerFields.length + this.activeTemplate.processFields.length;
  }

  get totalCompletedCount(): number {
    return this.headerCompletedCount + this.processCompletedCount;
  }

  get headerCompletionPercent(): number {
    const total = this.activeTemplate.headerFields.length;
    if (total === 0) {
      return 0;
    }
    return Math.round((this.headerCompletedCount / total) * 100);
  }

  get processCompletionPercent(): number {
    const total = this.activeTemplate.processFields.length;
    if (total === 0) {
      return 0;
    }
    return Math.round((this.processCompletedCount / total) * 100);
  }

  get completionPercent(): number {
    if (this.totalFieldCount === 0) {
      return 0;
    }
    return Math.round((this.totalCompletedCount / this.totalFieldCount) * 100);
  }

  get canSubmitActiveTicket(): boolean {
    return !!this.activeTicket && this.completionPercent === 100 && this.activeTicket.status !== "finalized";
  }

  get canFinalizeActiveTicket(): boolean {
    return !!this.activeTicket && this.activeTicket.status !== "finalized" && this.activeTicket.status !== "archived";
  }

  get canEditActiveTicket(): boolean {
    return !!this.activeTicket && this.activeTicket.status !== "finalized" && this.activeTicket.status !== "archived";
  }

  get activeTicketStatusLabel(): string {
    const status = this.activeTicket?.status;
    if (!status) {
      return "-";
    }
    return status === "finalized" || status === "archived" ? "Closed" : "Open";
  }

  get activeTicketStatusClass(): string {
    const status = this.activeTicket?.status;
    if (status === "finalized" || status === "archived") {
      return "status-pill status-closed";
    }
    return "status-pill status-open";
  }

  get activeTicketRecentTransaction(): PermitChecklistTransaction | undefined {
    const ticket = this.activeTicket;
    if (!ticket) {
      return undefined;
    }

    for (let i = this.transactions.length - 1; i >= 0; i -= 1) {
      if (this.transactions[i].ticketId === ticket.ticketId) {
        return this.transactions[i];
      }
    }
    return undefined;
  }

  get activeTicketRecentChangeLabel(): string {
    const tx = this.activeTicketRecentTransaction;
    if (!tx) {
      return "No changes yet";
    }

    const action = tx.type.replace("_", " ");
    return action.charAt(0).toUpperCase() + action.slice(1);
  }

  get activeTicketRecentChangeTime(): string {
    const tx = this.activeTicketRecentTransaction;
    return tx?.timestamp ? this.formatDateTime(tx.timestamp) : "-";
  }

  get approvedReportRows(): PermitChecklistApprovedRow[] {
    return this.tickets
      .map((ticket) => {
        const financials = ticket.financials || this.createEmptyFinancials(ticket.formType);
        return {
          ticketId: ticket.ticketId,
          formType: ticket.formType.toUpperCase(),
          customer: ticket.values?.["customer"] || "-",
          status: ticket.status,
          quoteAmount: Number(financials.quoteAmount || 0),
          invoiceAmount: Number(financials.invoiceAmount || 0),
          approvedAmount: Number(financials.approvedAmount || 0),
          variance: Number(financials.approvedAmount || 0) - Number(financials.invoiceAmount || 0),
          approvalDate: financials.approvalDate || "",
          updatedAt: ticket.updatedAt,
        };
      })
      .filter((row) => row.approvedAmount > 0)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  get filteredRecentTickets(): PermitChecklistTicket[] {
    const term = this.homeSearchQuery.trim().toLowerCase();
    if (!term) {
      return this.recentTickets;
    }

    return this.recentTickets.filter((ticket) => {
      const customer = ticket.values?.["customer"] || "";
      return [
        ticket.ticketId,
        ticket.formType,
        ticket.status,
        ticket.createdBy,
        customer,
        ticket.updatedAt,
      ]
        .join(" ")
        .toLowerCase()
        .includes(term);
    });
  }

  get filteredAuditLogRows(): PermitChecklistAuditRow[] {
    const term = this.homeSearchQuery.trim().toLowerCase();
    if (!term) {
      return this.auditLogRows;
    }

    return this.auditLogRows.filter((row) =>
      [row.ticketId, row.type, row.fieldKey, row.oldValue, row.newValue, row.source, row.timestamp]
        .join(" ")
        .toLowerCase()
        .includes(term)
    );
  }

  get filteredApprovedReportRows(): PermitChecklistApprovedRow[] {
    const term = this.homeSearchQuery.trim().toLowerCase();
    if (!term) {
      return this.approvedReportRows;
    }

    return this.approvedReportRows.filter((row) =>
      [row.ticketId, row.formType, row.customer, row.status, String(row.approvedAmount), row.approvalDate]
        .join(" ")
        .toLowerCase()
        .includes(term)
    );
  }

  get totalApprovedAmount(): number {
    return this.approvedReportRows.reduce((sum, row) => sum + Number(row.approvedAmount || 0), 0);
  }

  get checklistChartRows(): PermitChecklistChartRow[] {
    return ([
      { formType: "seismic" as const, label: "Seismic" },
      { formType: "dca" as const, label: "DCA" },
    ] as const).map((entry) => {
      const typedTickets = this.tickets.filter((ticket) => ticket.formType === entry.formType);
      const totalTickets = typedTickets.length;
      const finalizedTickets = typedTickets.filter((ticket) => ticket.status === "finalized").length;

      const completionSum = typedTickets.reduce((sum, ticket) => sum + this.getTicketCompletionMetrics(ticket).percent, 0);
      const avgCompletionPercent = totalTickets > 0 ? Math.round(completionSum / totalTickets) : 0;

      const approvedAmount = typedTickets.reduce(
        (sum, ticket) => sum + Number(ticket.financials?.approvedAmount || 0),
        0
      );

      return {
        formType: entry.formType,
        label: entry.label,
        totalTickets,
        finalizedTickets,
        avgCompletionPercent,
        approvedAmount: Number(approvedAmount.toFixed(2)),
      };
    });
  }

  get checklistChartMaxTickets(): number {
    const max = Math.max(...this.checklistChartRows.map((row) => row.totalTickets), 0);
    return max > 0 ? max : 1;
  }

  get checklistChartMaxApprovedAmount(): number {
    const max = Math.max(...this.checklistChartRows.map((row) => row.approvedAmount), 0);
    return max > 0 ? max : 1;
  }

  getChecklistTicketBarWidth(row: PermitChecklistChartRow): number {
    return Math.round((row.totalTickets / this.checklistChartMaxTickets) * 100);
  }

  getChecklistApprovedBarWidth(row: PermitChecklistChartRow): number {
    return Math.round((row.approvedAmount / this.checklistChartMaxApprovedAmount) * 100);
  }

  getChecklistFinalizedRate(row: PermitChecklistChartRow): number {
    if (!row.totalTickets) {
      return 0;
    }
    return Math.round((row.finalizedTickets / row.totalTickets) * 100);
  }

  get recentTicketChanges(): PermitChecklistRecentChange[] {
    const ticket = this.activeTicket;
    if (!ticket) {
      return [];
    }

    return this.transactions
      .filter((tx) => tx.ticketId === ticket.ticketId)
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
      .slice(0, 5)
      .map((tx) => ({
        id: tx.id,
        timestamp: tx.timestamp,
        actor: this.resolveTransactionActor(tx),
        description: this.describeTransaction(tx),
      }));
  }

  get activeProcessNoteCount(): number {
    const ticket = this.activeTicket;
    if (!ticket?.processNoteRecords?.length) {
      return 0;
    }

    return ticket.processNoteRecords.length;
  }

  get attachmentFieldOptions(): ChecklistField[] {
    return [...this.activeTemplate.headerFields, ...this.activeTemplate.processFields];
  }

  get headerAttachmentFieldOptions(): ChecklistField[] {
    return [...this.activeTemplate.headerFields];
  }

  get processAttachmentFieldOptions(): ChecklistField[] {
    return [...this.activeTemplate.processFields];
  }

  get activeTicketAttachments(): PermitChecklistAttachment[] {
    if (!this.activeTicket?.attachments?.length) {
      return [];
    }

    return [...this.activeTicket.attachments].sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
  }

  get referenceNotesDisplay(): string[] {
    return [
      ...this.getReferenceNotesFromFees(this.activeFinancials.customerBillingBreakdown, "Customer Billing"),
      ...this.getReferenceNotesFromFees(this.activeFinancials.eyefiBillingBreakdown, "Eyefi Billing"),
    ];
  }

  get customerBillingBreakdown(): PermitChecklistFeeLine[] {
    return this.activeFinancials.customerBillingBreakdown || [];
  }

  get eyefiBillingBreakdown(): PermitChecklistFeeLine[] {
    return this.activeFinancials.eyefiBillingBreakdown || [];
  }

  get customerBillingDefaultRows(): PermitChecklistFeeLine[] {
    return this.customerBillingDefaultsByType[this.customerBillingDefaultsFormType] || [];
  }

  get customerOptions(): string[] {
    const options = this.customers
      .map((customer) => String(customer.name || "").trim())
      .filter((name) => name.length > 0);

    const activeValue = String(this.activeValues["customer"] || "").trim();
    if (activeValue) {
      options.push(activeValue);
    }

    return [...new Set(options)].sort((a, b) => a.localeCompare(b));
  }

  get architectOptionsForSelection(): string[] {
    const options = this.architects
      .map((architect) => String(architect.name || "").trim())
      .filter((name) => name.length > 0);
    const activeValue = String(this.activeValues["assignedArchitect"] || "").trim();
    if (activeValue) {
      options.push(activeValue);
    }

    return [...new Set(options)].sort((a, b) => a.localeCompare(b));
  }

  isCustomerField(fieldKey: string): boolean {
    return fieldKey === "customer";
  }

  isAssignedArchitectField(fieldKey: string): boolean {
    return fieldKey === "assignedArchitect";
  }

  isSignPackageField(fieldKey: string): boolean {
    return fieldKey === "signPackage";
  }

  getSignPackageChips(): string[] {
    const raw = String(this.activeValues["signPackage"] || "").trim();
    if (!raw) return [];
    return raw.split("|").map(s => s.trim()).filter(s => s.length > 0);
  }

  addSignPackageChip(): void {
    const val = this.signPackageDraft.trim();
    if (!val) return;
    const chips = this.getSignPackageChips();
    if (!chips.includes(val)) {
      chips.push(val);
    }
    this.signPackageDraft = "";
    this.onFieldInputChange("signPackage", chips.join("|"));
  }

  removeSignPackageChip(chip: string): void {
    const chips = this.getSignPackageChips().filter(c => c !== chip);
    this.onFieldInputChange("signPackage", chips.join("|"));
  }

  onSignPackageDraftKeydown(event: KeyboardEvent): void {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      this.addSignPackageChip();
    }
  }

  isFieldPopulated(fieldKey: string): boolean {
    return String(this.activeValues[fieldKey] || "").trim().length > 0;
  }

  openCustomerDirectoryModal(content: TemplateRef<unknown>): void {
    this.customerDirectoryModalRef = this.modalService.open(content, {
      size: "xl",
      centered: true,
      scrollable: true,
      backdrop: "static",
      windowClass: "customer-directory-modal-window",
    });

    this.customerDirectoryModalRef.result.finally(() => {
      this.customerDirectoryModalRef = undefined;
      this.resetCustomerDirectoryDrafts();
    });
  }

  openCustomerBillingDefaultsModal(content: TemplateRef<unknown>): void {
    this.customerBillingDefaultsFormType = this.activeTicket?.formType ?? this.draftFormType;
    this.customerBillingDefaultsModalRef = this.modalService.open(content, {
      size: "lg",
      centered: true,
      scrollable: true,
      backdrop: "static",
      windowClass: "customer-directory-modal-window",
    });

    this.customerBillingDefaultsModalRef.result.finally(() => {
      this.customerBillingDefaultsModalRef = undefined;
      this.newCustomerBillingDefaultLabelDraft = "";
      this.newCustomerBillingDefaultAmountDraft = 0;
    });
  }

  closeCustomerBillingDefaultsModal(): void {
    this.customerBillingDefaultsModalRef?.close();
  }

  addCustomerBillingDefaultLineFromDraft(): void {
    const label = String(this.newCustomerBillingDefaultLabelDraft || "").trim();
    if (!label) {
      this.statusMessage = "Enter a billing label before adding default.";
      return;
    }

    const amount = this.normalizeCurrencyAmount(this.newCustomerBillingDefaultAmountDraft || 0);
    const next: PermitChecklistFeeLine = {
      key: this.generateFeeKey(),
      label,
      amount,
      isApprovedAmount: false,
    };

    this.customerBillingDefaultsByType[this.customerBillingDefaultsFormType] = [
      ...this.customerBillingDefaultRows,
      next,
    ];
    this.newCustomerBillingDefaultLabelDraft = "";
    this.newCustomerBillingDefaultAmountDraft = 0;
    this.billingDefaultsSyncDirty = true;
    this.persistLocalData();
  }

  updateCustomerBillingDefaultLabel(feeKey: string, label: string): void {
    const rows = this.customerBillingDefaultRows;
    const idx = rows.findIndex((item) => item.key === feeKey);
    if (idx === -1) {
      return;
    }

    rows[idx].label = String(label || "").trim();
    this.customerBillingDefaultsByType[this.customerBillingDefaultsFormType] = [...rows];
    this.billingDefaultsSyncDirty = true;
    this.persistLocalData();
  }

  updateCustomerBillingDefaultAmount(feeKey: string, value: string | number): void {
    const rows = this.customerBillingDefaultRows;
    const idx = rows.findIndex((item) => item.key === feeKey);
    if (idx === -1) {
      return;
    }

    rows[idx].amount = this.normalizeCurrencyAmount(value);
    this.customerBillingDefaultsByType[this.customerBillingDefaultsFormType] = [...rows];
    this.billingDefaultsSyncDirty = true;
    this.persistLocalData();
  }

  onCustomerBillingDefaultAmountBlur(feeKey: string): void {
    const target = this.customerBillingDefaultRows.find((item) => item.key === feeKey);
    if (!target) {
      return;
    }

    target.amount = this.normalizeCurrencyAmount(target.amount || 0);
    this.customerBillingDefaultsByType[this.customerBillingDefaultsFormType] = [...this.customerBillingDefaultRows];
    this.billingDefaultsSyncDirty = true;
    this.persistLocalData();
  }

  onCustomerBillingDefaultDraftBlur(): void {
    this.newCustomerBillingDefaultAmountDraft = this.normalizeCurrencyAmount(this.newCustomerBillingDefaultAmountDraft || 0);
  }

  removeCustomerBillingDefaultLine(feeKey: string): void {
    this.customerBillingDefaultsByType[this.customerBillingDefaultsFormType] = this.customerBillingDefaultRows.filter(
      (item) => item.key !== feeKey
    );
    this.billingDefaultsSyncDirty = true;
    this.persistLocalData();
  }

  closeCustomerDirectoryModal(): void {
    this.customerDirectoryModalRef?.close();
  }

  private resetCustomerDirectoryDrafts(): void {
    this.newCustomerNameDraft = "";
    this.newArchitectNameDraft = "";
  }

  async addArchitect(): Promise<void> {
    const name = String(this.newArchitectNameDraft || "").trim();
    if (!name) {
      this.statusMessage = "Enter an architect name before adding.";
      return;
    }

    const exists = this.architects.some((architect) => architect.name.toLowerCase() === name.toLowerCase());
    if (exists) {
      this.statusMessage = "Architect already exists.";
      return;
    }

    const newList = [
      ...this.architects,
      {
        id: this.generateDirectoryId("arch"),
        name,
      },
    ].sort((a, b) => a.name.localeCompare(b.name));

    try {
      await this.permitChecklistsService.syncDirectories(this.customers, newList);
    } catch {
      this.statusMessage = "Failed to add architect. You may not have permission.";
      return;
    }

    this.architects = newList;
    this.newArchitectNameDraft = "";
    this.directorySyncDirty = false;
    this.statusMessage = "Architect added.";
  }

  async removeArchitect(architectId: string): Promise<void> {
    const target = this.architects.find((architect) => architect.id === architectId);
    if (!target) {
      return;
    }

    const newList = this.architects.filter((architect) => architect.id !== architectId);

    try {
      await this.permitChecklistsService.syncDirectories(this.customers, newList);
    } catch {
      this.statusMessage = "Failed to remove architect. You may not have permission.";
      return;
    }

    this.architects = newList;
    this.directorySyncDirty = false;
    this.statusMessage = `Architect ${target.name} removed.`;
  }

  async addCustomer(): Promise<void> {
    const name = String(this.newCustomerNameDraft || "").trim();
    if (!name) {
      this.statusMessage = "Enter a customer name before adding.";
      return;
    }

    const exists = this.customers.some((customer) => customer.name.toLowerCase() === name.toLowerCase());
    if (exists) {
      this.statusMessage = "Customer already exists.";
      return;
    }

    const newList = [
      ...this.customers,
      {
        id: this.generateDirectoryId("cust"),
        name,
      },
    ].sort((a, b) => a.name.localeCompare(b.name));

    try {
      await this.permitChecklistsService.syncDirectories(newList, this.architects);
    } catch {
      this.statusMessage = "Failed to add customer. You may not have permission.";
      return;
    }

    this.customers = newList;
    this.newCustomerNameDraft = "";
    this.directorySyncDirty = false;
    this.statusMessage = "Customer added.";
  }

  async removeCustomer(customerId: string): Promise<void> {
    const target = this.customers.find((customer) => customer.id === customerId);
    if (!target) {
      return;
    }

    const newList = this.customers.filter((customer) => customer.id !== customerId);

    try {
      await this.permitChecklistsService.syncDirectories(newList, this.architects);
    } catch {
      this.statusMessage = "Failed to remove customer. You may not have permission.";
      return;
    }

    this.customers = newList;
    this.directorySyncDirty = false;
    this.statusMessage = `Customer ${target.name} removed.`;
  }

  onCustomerFieldChange(nextValue: string): void {
    this.onFieldInputChange("customer", nextValue);
  }

  isFieldEditing(fieldKey: string): boolean {
    return !!this.fieldEditingState[fieldKey];
  }

  getFieldEditValue(fieldKey: string): string {
    if (this.isFieldEditing(fieldKey)) {
      return String(this.fieldDraftValues[fieldKey] ?? "");
    }
    return String(this.activeValues[fieldKey] || "");
  }

  isHeaderSectionEditing(): boolean {
    return this.activeTemplate.headerFields.some((field) => this.isFieldEditing(field.key));
  }

  isProcessSectionEditing(): boolean {
    return this.activeTemplate.processFields.some((field) => this.isFieldEditing(field.key));
  }

  beginSectionEdit(section: "header" | "process"): void {
    if (!this.canEditActiveTicket) {
      return;
    }

    const fields = section === "header" ? this.activeTemplate.headerFields : this.activeTemplate.processFields;
    fields.forEach((field) => this.beginFieldEdit(field.key, false));

    if (fields.length > 0) {
      setTimeout(() => this.focusFieldEditor(fields[0].key), 0);
    }
  }

  saveSectionEdits(section: "header" | "process"): void {
    const fields = section === "header" ? this.activeTemplate.headerFields : this.activeTemplate.processFields;
    fields.forEach((field) => {
      if (this.isFieldEditing(field.key)) {
        this.saveFieldEdit(field.key);
      }
    });
  }

  cancelSectionEdits(section: "header" | "process"): void {
    const fields = section === "header" ? this.activeTemplate.headerFields : this.activeTemplate.processFields;
    fields.forEach((field) => {
      if (this.isFieldEditing(field.key)) {
        this.cancelFieldEdit(field.key);
      }
    });
  }

  beginFieldEdit(fieldKey: string, shouldFocus = true): void {
    const ticket = this.activeTicket;
    if (!ticket || !this.canEditActiveTicket) {
      return;
    }

    this.fieldEditingState[fieldKey] = true;
    this.fieldDraftValues[fieldKey] = String(ticket.values[fieldKey] || "");
    this.fieldDraftSource[fieldKey] = "manual";

    if (shouldFocus) {
      setTimeout(() => this.focusFieldEditor(fieldKey), 0);
    }
  }

  onFieldEditorDoubleClick(fieldKey: string): void {
    if (!this.canEditActiveTicket) {
      return;
    }

    if (!this.isFieldEditing(fieldKey)) {
      this.beginFieldEdit(fieldKey);
    }
  }

  onFieldEditorBlur(fieldKey: string): void {
    if (this.isFieldEditing(fieldKey)) {
      this.saveFieldEdit(fieldKey);
    }
  }

  updateFieldDraft(fieldKey: string, nextValue: string): void {
    if (!this.isFieldEditing(fieldKey)) {
      return;
    }

    this.fieldDraftValues[fieldKey] = String(nextValue || "");
  }

  cancelFieldEdit(fieldKey: string): void {
    delete this.fieldEditingState[fieldKey];
    delete this.fieldDraftValues[fieldKey];
    delete this.fieldDraftSource[fieldKey];
  }

  saveFieldEdit(fieldKey: string): void {
    const ticket = this.activeTicket;
    if (!ticket || !this.canEditActiveTicket) {
      return;
    }

    const oldValue = String(ticket.values[fieldKey] || "");
    const normalizedNext = String(this.fieldDraftValues[fieldKey] || "");
    const source = this.fieldDraftSource[fieldKey] || "manual";

    this.cancelFieldEdit(fieldKey);

    if (oldValue === normalizedNext) {
      return;
    }

    ticket.values[fieldKey] = normalizedNext;
    this.commitFieldValueChange(ticket, fieldKey, oldValue, normalizedNext, source);
  }

  setDraftFieldNow(fieldKey: string): void {
    if (!this.isFieldEditing(fieldKey)) {
      return;
    }

    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    this.fieldDraftValues[fieldKey] = `${year}-${month}-${day}`;
    this.fieldDraftSource[fieldKey] = "now";
  }

  getFieldEditorId(fieldKey: string): string {
    return `pc-field-editor-${fieldKey}`;
  }

  onFieldTab(event: any, fieldKey: string): void {
    if (!this.canEditActiveTicket) {
      return;
    }

    if (!(event instanceof KeyboardEvent)) {
      return;
    }

    const fieldKeys = this.getChecklistFieldKeys();
    const currentIndex = fieldKeys.indexOf(fieldKey);
    if (currentIndex === -1) {
      return;
    }

    const nextIndex = currentIndex + (event.shiftKey ? -1 : 1);
    if (nextIndex < 0 || nextIndex >= fieldKeys.length) {
      return;
    }

    const nextFieldKey = fieldKeys[nextIndex];
    event.preventDefault();

    if (this.isFieldEditing(fieldKey)) {
      this.saveFieldEdit(fieldKey);
    }

    if (!this.isFieldEditing(nextFieldKey)) {
      this.beginFieldEdit(nextFieldKey, false);
    }

    setTimeout(() => this.focusFieldEditor(nextFieldKey), 0);
  }

  private getChecklistFieldKeys(): string[] {
    return [
      ...this.activeTemplate.headerFields.map((field) => field.key),
      ...this.activeTemplate.processFields.map((field) => field.key),
    ];
  }

  private focusFieldEditor(fieldKey: string): void {
    const elementId = this.getFieldEditorId(fieldKey);
    const input = document.getElementById(elementId) as HTMLInputElement | HTMLSelectElement | null;
    if (!input) {
      return;
    }

    input.focus();
    if (input instanceof HTMLInputElement && input.type !== "date") {
      input.select();
    }
  }

  getAttachmentsForField(fieldKey: string): PermitChecklistAttachment[] {
    const ticket = this.activeTicket;
    if (!ticket?.attachments?.length) {
      return [];
    }

    return ticket.attachments
      .filter((attachment) => attachment.fieldKey === fieldKey)
      .sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
  }

  getFieldLoggedAt(fieldKey: string): string {
    const timestamp = this.activeTicket?.fieldUpdatedAt?.[fieldKey];
    return timestamp ? this.formatDateTime(timestamp) : "";
  }

  hasProcessNote(fieldKey: string): boolean {
    return this.getProcessNotesForField(fieldKey).length > 0;
  }

  getProcessNotesForField(fieldKey: string): PermitChecklistProcessNote[] {
    const ticket = this.activeTicket;
    if (!ticket?.processNoteRecords?.length) {
      return [];
    }

    return ticket.processNoteRecords
      .filter((record) => record.fieldKey === fieldKey)
      .sort((a, b) => {
        const left = a.editedAt || a.createdAt;
        const right = b.editedAt || b.createdAt;
        return right.localeCompare(left);
      });
  }

  get selectedProcessFieldNotes(): PermitChecklistProcessNote[] {
    if (!this.processNoteFieldKey) {
      return [];
    }
    return this.getProcessNotesForField(this.processNoteFieldKey);
  }

  openProcessNoteModal(field: ChecklistField): void {
    const ticket = this.activeTicket;
    if (!ticket) {
      return;
    }

    this.processNoteFieldKey = field.key;
    this.processNoteFieldLabel = field.label;
    this.processNoteDraft = "";
    this.processNoteEditingId = null;
    this.isProcessNoteModalOpen = true;
  }

  beginEditProcessNote(note: PermitChecklistProcessNote): void {
    this.processNoteEditingId = note.id;
    this.processNoteDraft = note.noteText;
  }

  cancelEditProcessNote(): void {
    this.processNoteEditingId = null;
    this.processNoteDraft = "";
  }

  closeProcessNoteModal(): void {
    this.isProcessNoteModalOpen = false;
    this.processNoteFieldKey = "";
    this.processNoteFieldLabel = "";
    this.processNoteDraft = "";
    this.processNoteEditingId = null;
  }

  saveProcessNote(): void {
    const ticket = this.activeTicket;
    if (!ticket || !this.processNoteFieldKey) {
      return;
    }
    if (!this.canEditActiveTicket) {
      this.statusMessage = "Finalized tickets cannot be modified.";
      return;
    }

    const nextValue = String(this.processNoteDraft || "").trim();
    if (!nextValue) {
      this.statusMessage = "Note cannot be empty.";
      return;
    }

    ticket.processNoteRecords = ticket.processNoteRecords || [];

    if (this.processNoteEditingId) {
      const idx = ticket.processNoteRecords.findIndex((record) => record.id === this.processNoteEditingId);
      if (idx === -1) {
        this.statusMessage = "Selected note was not found.";
        return;
      }

      const oldValue = ticket.processNoteRecords[idx].noteText;
      if (oldValue === nextValue) {
        this.cancelEditProcessNote();
        return;
      }

      ticket.processNoteRecords[idx] = {
        ...ticket.processNoteRecords[idx],
        noteText: nextValue,
        editedAt: new Date().toISOString(),
        editedBy: this.getCurrentUserDisplay(),
      };

      this.appendTransaction(ticket.ticketId, "note_edit", {
        fieldKey: this.processNoteFieldKey,
        oldValue,
        newValue: nextValue,
        source: "process_note",
      });
      this.statusMessage = `Note edited for ${this.processNoteFieldLabel}.`;
      this.cancelEditProcessNote();
    } else {
      const createdAt = new Date().toISOString();
      const newRecord: PermitChecklistProcessNote = {
        id: this.generateProcessNoteId(),
        fieldKey: this.processNoteFieldKey,
        fieldLabel: this.processNoteFieldLabel,
        noteText: nextValue,
        createdAt,
        createdBy: this.getCurrentUserDisplay(),
      };

      ticket.processNoteRecords = [...ticket.processNoteRecords, newRecord];

      this.appendTransaction(ticket.ticketId, "note_add", {
        fieldKey: this.processNoteFieldKey,
        newValue: nextValue,
        source: "process_note",
      });
      this.statusMessage = `Note added for ${this.processNoteFieldLabel}.`;
      this.processNoteDraft = "";
    }

    ticket.updatedAt = new Date().toISOString();
    if (ticket.status === "submitted") {
      ticket.status = "draft";
    }

    this.refreshRecentTickets();
    this.persistLocalData();
  }

  resolveFieldType(field: ChecklistField): "text" | "date" {
    if (field.type === "date" || field.type === "text") {
      return field.type;
    }

    const label = (field.label || "").toLowerCase();
    if (label.includes("date")) {
      return "date";
    }

    return "text";
  }

  updateFinancialValue(
    field: keyof Omit<PermitChecklistFinancials, "customerBillingBreakdown" | "eyefiBillingBreakdown">,
    value: string
  ): void {
    const ticket = this.activeTicket;
    if (!ticket || !this.canEditActiveTicket) {
      return;
    }

    if (!ticket.financials) {
      ticket.financials = this.createEmptyFinancials(ticket.formType);
    }

    const oldValue = String((ticket.financials as any)[field] ?? "");
    const nextValue = field === "approvalDate" || field === "invoiceReference" ? String(value || "") : String(Number(value || 0));
    if (oldValue === nextValue) {
      return;
    }

    (ticket.financials as any)[field] =
      field === "approvalDate" || field === "invoiceReference" ? String(value || "") : Number(value || 0);

    ticket.updatedAt = new Date().toISOString();
    if (ticket.status === "submitted") {
      ticket.status = "draft";
    }

    this.appendTransaction(ticket.ticketId, "field_update", {
      fieldKey: `financial.${String(field)}`,
      oldValue,
      newValue: nextValue,
      source: "financial",
    });

    this.refreshRecentTickets();
    this.persistLocalData();
  }

  updateBillingAmount(section: BillingSection, feeKey: string, value: string | number): void {
    const ticket = this.activeTicket;
    if (!ticket || !this.canEditActiveTicket) {
      return;
    }

    if (!ticket.financials) {
      ticket.financials = this.createEmptyFinancials(ticket.formType);
    }

    const nextAmount = this.normalizeCurrencyAmount(value);
    const breakdown = this.getBreakdownForSection(ticket.financials, section);
    const idx = breakdown.findIndex((fee) => fee.key === feeKey);
    if (idx === -1) {
      return;
    }

    const oldRawAmount = breakdown[idx].amount;
    const oldAmount = oldRawAmount === null || oldRawAmount === undefined ? null : this.normalizeCurrencyAmount(oldRawAmount);
    if (oldAmount === nextAmount) {
      return;
    }

    breakdown[idx].amount = nextAmount;
    this.syncApprovedAmountFromFeeLines(ticket);

    ticket.updatedAt = new Date().toISOString();
    if (ticket.status === "submitted") {
      ticket.status = "draft";
    }

    this.appendTransaction(ticket.ticketId, "field_update", {
      fieldKey: `financial.${section}.amount.${feeKey}`,
      oldValue: oldAmount === null ? "" : String(oldAmount),
      newValue: String(nextAmount),
      source: "financial",
    });

    this.refreshRecentTickets();
    this.persistLocalData();
  }

  onBillingAmountBlur(section: BillingSection, feeKey: string): void {
    const ticket = this.activeTicket;
    if (!ticket || !this.canEditActiveTicket || !ticket.financials) {
      return;
    }

    const breakdown = this.getBreakdownForSection(ticket.financials, section);
    const fee = breakdown.find((item) => item.key === feeKey);
    if (!fee) {
      return;
    }

    if (fee.amount === null || fee.amount === undefined) {
      return;
    }

    const normalized = this.normalizeCurrencyAmount(fee.amount);
    this.updateBillingAmount(section, feeKey, normalized);
  }

  onBillingDraftBlur(section: BillingSection): void {
    if (section === "customer") {
      this.newCustomerBillingAmountDraft = this.normalizeCurrencyAmount(this.newCustomerBillingAmountDraft);
      return;
    }
    this.newEyefiBillingAmountDraft = this.normalizeCurrencyAmount(this.newEyefiBillingAmountDraft);
  }

  selectAmountInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input || typeof input.select !== "function") {
      return;
    }

    setTimeout(() => input.select(), 0);
  }

  setBillingApproved(section: BillingSection, feeKey: string, isApproved: boolean): void {
    const ticket = this.activeTicket;
    if (!ticket || !this.canEditActiveTicket) {
      return;
    }

    if (!ticket.financials) {
      ticket.financials = this.createEmptyFinancials(ticket.formType);
    }

    const breakdown = this.getBreakdownForSection(ticket.financials, section);
    const idx = breakdown.findIndex((fee) => fee.key === feeKey);
    if (idx === -1) {
      return;
    }

    const oldValue = !!breakdown[idx].isApprovedAmount;
    if (oldValue === !!isApproved) {
      return;
    }

    breakdown[idx].isApprovedAmount = !!isApproved;
    this.syncApprovedAmountFromFeeLines(ticket);

    ticket.updatedAt = new Date().toISOString();
    if (ticket.status === "submitted") {
      ticket.status = "draft";
    }

    this.appendTransaction(ticket.ticketId, "field_update", {
      fieldKey: `financial.${section}.approved.${feeKey}`,
      oldValue: String(oldValue),
      newValue: String(!!isApproved),
      source: "financial",
    });

    this.refreshRecentTickets();
    this.persistLocalData();
  }

  updateBillingLabel(section: BillingSection, feeKey: string, label: string): void {
    const ticket = this.activeTicket;
    if (!ticket || !this.canEditActiveTicket) {
      return;
    }

    if (!ticket.financials) {
      ticket.financials = this.createEmptyFinancials(ticket.formType);
    }

    const breakdown = this.getBreakdownForSection(ticket.financials, section);
    const idx = breakdown.findIndex((fee) => fee.key === feeKey);
    if (idx === -1) {
      return;
    }

    const oldLabel = String(breakdown[idx].label || "");
    const nextLabel = String(label || "").trim();
    if (oldLabel === nextLabel) {
      return;
    }

    breakdown[idx].label = nextLabel;

    ticket.updatedAt = new Date().toISOString();
    if (ticket.status === "submitted") {
      ticket.status = "draft";
    }

    this.appendTransaction(ticket.ticketId, "field_update", {
      fieldKey: `financial.${section}.label.${feeKey}`,
      oldValue: oldLabel,
      newValue: nextLabel,
      source: "financial",
    });

    this.refreshRecentTickets();
    this.persistLocalData();
  }

  addBillingLine(section: BillingSection): void {
    const ticket = this.activeTicket;
    if (!ticket || !this.canEditActiveTicket) {
      return;
    }

    if (!ticket.financials) {
      ticket.financials = this.createEmptyFinancials(ticket.formType);
    }

    const newFee: PermitChecklistFeeLine = {
      key: this.generateFeeKey(),
      label: "",
      amount: null,
      isApprovedAmount: false,
    };

    const breakdown = this.getBreakdownForSection(ticket.financials, section);
    this.setBreakdownForSection(ticket.financials, section, [...breakdown, newFee]);
    ticket.updatedAt = new Date().toISOString();
    if (ticket.status === "submitted") {
      ticket.status = "draft";
    }

    this.appendTransaction(ticket.ticketId, "field_update", {
      fieldKey: `financial.${section}.add`,
      newValue: newFee.key,
      source: "financial",
    });

    this.refreshRecentTickets();
    this.persistLocalData();
  }

  addBillingLineFromDraft(section: BillingSection): void {
    const ticket = this.activeTicket;
    if (!ticket || !this.canEditActiveTicket) {
      return;
    }

    const label = String(section === "customer" ? this.newCustomerBillingLabelDraft : this.newEyefiBillingLabelDraft).trim();
    if (!label) {
      this.statusMessage = "Enter a fee label before adding.";
      return;
    }

    if (!ticket.financials) {
      ticket.financials = this.createEmptyFinancials(ticket.formType);
    }

    const amount = this.normalizeCurrencyAmount(
      section === "customer" ? this.newCustomerBillingAmountDraft || 0 : this.newEyefiBillingAmountDraft || 0
    );
    const newFee: PermitChecklistFeeLine = {
      key: this.generateFeeKey(),
      label,
      amount,
      isApprovedAmount: false,
    };

    const breakdown = this.getBreakdownForSection(ticket.financials, section);
    this.setBreakdownForSection(ticket.financials, section, [...breakdown, newFee]);
    ticket.updatedAt = new Date().toISOString();
    if (ticket.status === "submitted") {
      ticket.status = "draft";
    }

    this.appendTransaction(ticket.ticketId, "field_update", {
      fieldKey: `financial.${section}.add`,
      newValue: `${label}:${amount}`,
      source: "financial",
    });

    if (section === "customer") {
      this.newCustomerBillingLabelDraft = "";
      this.newCustomerBillingAmountDraft = 0;
    } else {
      this.newEyefiBillingLabelDraft = "";
      this.newEyefiBillingAmountDraft = 0;
    }
    this.refreshRecentTickets();
    this.persistLocalData();
  }

  removeBillingLine(section: BillingSection, feeKey: string): void {
    const ticket = this.activeTicket;
    if (!ticket || !this.canEditActiveTicket) {
      return;
    }

    if (!ticket.financials) {
      ticket.financials = this.createEmptyFinancials(ticket.formType);
    }

    const breakdown = this.getBreakdownForSection(ticket.financials, section);
    const target = breakdown.find((fee) => fee.key === feeKey);
    if (!target) {
      return;
    }

    this.setBreakdownForSection(
      ticket.financials,
      section,
      breakdown.filter((fee) => fee.key !== feeKey)
    );
    this.syncApprovedAmountFromFeeLines(ticket);
    ticket.updatedAt = new Date().toISOString();
    if (ticket.status === "submitted") {
      ticket.status = "draft";
    }

    this.appendTransaction(ticket.ticketId, "field_update", {
      fieldKey: `financial.${section}.remove.${feeKey}`,
      oldValue: `${target.label}:${target.amount}`,
      source: "financial",
    });

    this.refreshRecentTickets();
    this.persistLocalData();
  }

  private syncApprovedAmountFromFeeLines(ticket: PermitChecklistTicket): void {
    const allFees = [
      ...(ticket.financials?.customerBillingBreakdown || []),
      ...(ticket.financials?.eyefiBillingBreakdown || []),
    ];
    const nextApproved = allFees.filter((fee) => !!fee.isApprovedAmount).reduce((sum, fee) => sum + Number(fee.amount || 0), 0);

    ticket.financials.approvedAmount = Number(nextApproved.toFixed(2));
  }

  private getBreakdownForSection(financials: PermitChecklistFinancials, section: BillingSection): PermitChecklistFeeLine[] {
    return section === "customer" ? financials.customerBillingBreakdown : financials.eyefiBillingBreakdown;
  }

  private setBreakdownForSection(
    financials: PermitChecklistFinancials,
    section: BillingSection,
    value: PermitChecklistFeeLine[]
  ): void {
    if (section === "customer") {
      financials.customerBillingBreakdown = value;
    } else {
      financials.eyefiBillingBreakdown = value;
    }
  }

  private normalizeCurrencyAmount(value: string | number): number {
    const raw = Number(value || 0);
    if (!Number.isFinite(raw) || raw < 0) {
      return 0;
    }
    return Number(raw.toFixed(2));
  }

  trackByFeeKey(_index: number, fee: PermitChecklistFeeLine): string {
    return fee.key;
  }

  setFieldNow(fieldKey: string): void {
    if (!this.canEditActiveTicket) {
      return;
    }
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    this.onFieldFocus(fieldKey);
    this.onFieldInputChange(fieldKey, `${year}-${month}-${day}`);
    this.onFieldBlur(fieldKey, "now");
  }

  onFieldFocus(fieldKey: string): void {
    const ticket = this.activeTicket;
    if (!ticket) {
      return;
    }

    this.fieldEditStartValues[fieldKey] = String(ticket.values[fieldKey] || "");
  }

  onFieldInputChange(fieldKey: string, nextValue: string): void {
    const ticket = this.activeTicket;
    if (!ticket) {
      return;
    }
    if (ticket.status === "finalized") {
      this.statusMessage = "This ticket is finalized and read-only.";
      return;
    }

    const normalizedNext = String(nextValue || "");

    ticket.values[fieldKey] = normalizedNext;
    ticket.updatedAt = new Date().toISOString();
    if (ticket.status === "submitted") {
      ticket.status = "draft";
    }

    this.refreshRecentTickets();
    this.persistLocalData();
  }

  onFieldBlur(fieldKey: string, source: "manual" | "now" = "manual"): void {
    const ticket = this.activeTicket;
    if (!ticket) {
      return;
    }

    const oldValue = String(this.fieldEditStartValues[fieldKey] ?? "");
    const normalizedNext = String(ticket.values[fieldKey] || "");
    delete this.fieldEditStartValues[fieldKey];

    if (oldValue === normalizedNext) {
      return;
    }

    this.commitFieldValueChange(ticket, fieldKey, oldValue, normalizedNext, source);
  }

  private commitFieldValueChange(
    ticket: PermitChecklistTicket,
    fieldKey: string,
    oldValue: string,
    newValue: string,
    source: "manual" | "now"
  ): void {
    const changeTimestamp = new Date().toISOString();
    ticket.updatedAt = changeTimestamp;
    ticket.fieldUpdatedAt = ticket.fieldUpdatedAt || {};
    ticket.fieldUpdatedAt[fieldKey] = changeTimestamp;
    if (ticket.status === "submitted") {
      ticket.status = "draft";
    }

    this.appendTransaction(ticket.ticketId, "field_update", {
      fieldKey,
      oldValue,
      newValue,
      source,
      loggedAt: changeTimestamp,
    });

    this.refreshRecentTickets();
    this.persistLocalData();
  }

  async createTicket(): Promise<void> {
    const now = new Date().toISOString();
    const ticket: PermitChecklistTicket = {
      ticketId: this.generateTicketId(this.draftFormType),
      formType: this.draftFormType,
      createdBy: this.getCurrentUserDisplay(),
      createdAt: now,
      updatedAt: now,
      status: "draft",
      values: this.createEmptyValues(this.draftFormType),
      fieldUpdatedAt: {},
      processNoteRecords: [],
      financials: this.createEmptyFinancials(this.draftFormType),
      attachments: [],
    };

    try {
      await this.permitChecklistsService.upsertTicket(ticket);
    } catch {
      // Global interceptor handles 403 permission modal. Keep local state unchanged.
      this.statusMessage = "Ticket was not created due to access restrictions.";
      return;
    }

    this.tickets = [ticket, ...this.tickets];
    this.refreshRecentTickets();
    this.activeTicketId = ticket.ticketId;
    this.viewMode = "form";
    this.appendTransaction(ticket.ticketId, "create", {
      formType: ticket.formType,
      ticketId: ticket.ticketId,
    });
    this.persistLocalData();
    this.syncUrlState();
    this.statusMessage = `Ticket ${ticket.ticketId} created.`;
  }

  async uploadAttachment(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files || []);
    await this.uploadAttachmentFiles(files);
    input.value = "";
  }

  onAttachmentDragOver(event: DragEvent): void {
    event.preventDefault();
    if (!this.canEditActiveTicket) {
      return;
    }
    this.isAttachmentDragOver = true;
  }

  onAttachmentDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.isAttachmentDragOver = false;
  }

  async onAttachmentDrop(event: DragEvent): Promise<void> {
    event.preventDefault();
    this.isAttachmentDragOver = false;
    const files = Array.from(event.dataTransfer?.files || []);
    await this.uploadAttachmentFiles(files);
  }

  private async uploadAttachmentFiles(files: File[]): Promise<void> {
    const ticket = this.activeTicket;
    if (!ticket || !this.canEditActiveTicket) {
      return;
    }

    if (!files.length) {
      return;
    }

    const newAttachments: PermitChecklistAttachment[] = [];
    for (const file of files) {
      const attachmentId = this.generateAttachmentId();
      const objectUrl = URL.createObjectURL(file);
      this.objectUrlByAttachmentId.set(attachmentId, objectUrl);

      let dataUrl: string | undefined;
      if (file.size <= this.maxPersistedPreviewSizeBytes) {
        dataUrl = await this.readFileAsDataUrl(file);
      }

      newAttachments.push({
        id: attachmentId,
        fieldKey: "general",
        fieldLabel: "General Attachment",
        uploadedBy: this.getCurrentUserDisplay(),
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type || "application/octet-stream",
        uploadedAt: new Date().toISOString(),
        dataUrl,
      });

      this.appendTransaction(ticket.ticketId, "attachment_upload", {
        fieldKey: "general",
        newValue: file.name,
        source: "attachment",
      });
    }

    ticket.attachments = [...(ticket.attachments || []), ...newAttachments];
    ticket.updatedAt = new Date().toISOString();
    if (ticket.status === "submitted") {
      ticket.status = "draft";
    }

    this.refreshRecentTickets();
    this.persistLocalData();
    this.statusMessage = `${newAttachments.length} attachment(s) uploaded.`;
  }

  async removeAttachment(attachmentId: string): Promise<void> {
    const ticket = this.activeTicket;
    if (!ticket || !this.canEditActiveTicket) {
      return;
    }

    const target = (ticket.attachments || []).find((item) => item.id === attachmentId);
    if (!target) {
      return;
    }

    const confirmed = window.confirm(`Remove attachment "${target.fileName}"? This cannot be undone.`);
    if (!confirmed) {
      return;
    }

    try {
      await this.permitChecklistsService.removeAttachment(ticket.ticketId, attachmentId);
    } catch (err: any) {
      const status = err?.status ?? err?.error?.statusCode;
      if (status === 403) {
        this.statusMessage = "You do not have permission to delete attachments.";
      } else {
        this.statusMessage = "Failed to remove attachment. Please try again.";
      }
      return;
    }

    ticket.attachments = (ticket.attachments || []).filter((item) => item.id !== attachmentId);
    const objectUrl = this.objectUrlByAttachmentId.get(attachmentId);
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
      this.objectUrlByAttachmentId.delete(attachmentId);
    }

    if (this.previewAttachment?.id === attachmentId) {
      this.closeAttachmentPreview();
    }

    ticket.updatedAt = new Date().toISOString();
    if (ticket.status === "submitted") {
      ticket.status = "draft";
    }

    this.appendTransaction(ticket.ticketId, "attachment_remove", {
      fieldKey: "general",
      oldValue: target.fileName,
      source: "attachment",
    });

    this.refreshRecentTickets();
    this.persistLocalData();
    this.statusMessage = "Attachment removed.";
  }

  async openAttachmentPreview(attachment: PermitChecklistAttachment): Promise<void> {
    this.previewAttachment = attachment;
    this.previewAttachmentUrl = this.resolveAttachmentUrl(attachment) ?? null;
    this.previewAttachmentResourceUrl = null;
    this.previewDocxHtml = "";
    this.previewAttachmentKind = "none";

    if (!this.previewAttachmentUrl) {
      this.isAttachmentPreviewOpen = true;
      return;
    }

    const mime = (attachment.mimeType || "").toLowerCase();
    if (mime.startsWith("image/")) {
      this.previewAttachmentKind = "image";
    } else if (this.isDocxAttachment(attachment)) {
      this.previewAttachmentKind = "docx";
      await this.loadDocxPreview();
    } else if (mime === "application/pdf") {
      this.previewAttachmentKind = "pdf";
      this.previewAttachmentResourceUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.previewAttachmentUrl);
    } else {
      this.previewAttachmentKind = "other";
    }

    this.isAttachmentPreviewOpen = true;
  }

  closeAttachmentPreview(): void {
    this.isAttachmentPreviewOpen = false;
    this.previewAttachment = null;
    this.previewAttachmentUrl = null;
    this.previewAttachmentResourceUrl = null;
    this.previewDocxHtml = "";
    this.previewAttachmentKind = "none";
  }

  get canDownloadPreviewAttachment(): boolean {
    return !!this.getAttachmentDownloadUrl(this.previewAttachment);
  }

  downloadPreviewAttachment(): void {
    const attachment = this.previewAttachment;
    const url = this.getAttachmentDownloadUrl(attachment);
    if (!attachment || !url) {
      return;
    }

    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.target = "_blank";
    anchor.rel = "noopener";

    if (url.startsWith("blob:") || url.startsWith("data:")) {
      anchor.download = attachment.fileName || "attachment";
    }

    anchor.click();
  }

  openTicket(ticketId: string): void {
    this.activeTicketId = ticketId;
    const ticket = this.tickets.find((item) => item.ticketId === ticketId);
    this.viewMode = ticket?.status === "finalized" ? "summary" : "form";
    this.syncUrlState();
    this.statusMessage = "Ticket opened.";
  }

  archiveCurrentTicket(): void {
    const ticket = this.activeTicket;
    if (!ticket) {
      return;
    }

    if (ticket.status === "archived") {
      this.statusMessage = "This ticket is already archived.";
      return;
    }

    const confirmed = window.confirm(`Archive checklist ${ticket.ticketId}? You can still open it in read-only mode.`);
    if (!confirmed) {
      return;
    }

    ticket.status = "archived";
    ticket.updatedAt = new Date().toISOString();

    this.appendTransaction(ticket.ticketId, "archive", {
      source: "ticket",
    });

    this.refreshRecentTickets();
    this.persistLocalData();
    this.statusMessage = `Ticket ${ticket.ticketId} archived.`;
  }

  deleteCurrentTicket(): void {
    const ticket = this.activeTicket;
    if (!ticket) {
      return;
    }

    const confirmed = window.confirm(`Delete checklist ${ticket.ticketId}? This will be soft-deleted and kept as archived.`);
    if (!confirmed) {
      return;
    }

    this.deleteTicket(ticket.ticketId, true);
  }

  async hardDeleteCurrentTicket(): Promise<void> {
    const ticket = this.activeTicket;
    if (!ticket) {
      return;
    }

    if (!this.isCurrentUserAdmin()) {
      window.alert("Only admin users can permanently delete checklist tickets.");
      return;
    }

    const confirmed = window.confirm(
      `Permanently delete checklist ${ticket.ticketId}? This cannot be undone and will remove it from the database.`
    );
    if (!confirmed) {
      return;
    }

    const currentUserId = this.getCurrentUserId();
    if (!currentUserId) {
      this.statusMessage = "Unable to resolve current user. Permanent delete is blocked.";
      return;
    }

    try {
      await this.permitChecklistsService.hardDeleteTicket(ticket.ticketId, currentUserId);
    } catch {
      this.statusMessage = "Permanent delete failed. Please try again.";
      return;
    }

    this.tickets = this.tickets.filter((item) => item.ticketId !== ticket.ticketId);
    this.transactions = this.transactions.filter((tx) => tx.ticketId !== ticket.ticketId);
    this.refreshAuditLogRows();
    this.refreshRecentTickets();
    if (this.activeTicketId === ticket.ticketId) {
      this.activeTicketId = null;
      this.viewMode = "home";
    }
    this.syncUrlState();
    this.statusMessage = `Ticket ${ticket.ticketId} permanently deleted.`;
  }

  goToFormView(): void {
    if (!this.activeTicketId) {
      return;
    }

    this.viewMode = "form";
    this.syncUrlState();
  }

  openSummaryView(): void {
    if (!this.activeTicket || this.completionPercent < 100) {
      this.statusMessage = "Complete all required fields before opening summary.";
      return;
    }

    this.viewMode = "summary";
    this.syncUrlState();
  }

  goHome(): void {
    this.viewMode = "home";
    this.activeTicketId = null;
    this.syncUrlState();
    this.statusMessage = "";
  }

  goToAuditLog(): void {
    this.homeTab = "audit";
    this.viewMode = "home";
    this.activeTicketId = null;
    this.syncUrlState();
    this.statusMessage = "Showing transaction history.";
  }

  onDraftFormTypeChanged(): void {
    if (this.viewMode === "home") {
      this.syncUrlState();
    }
  }

  refreshHomeGridData(): void {
    this.refreshRecentTickets();
    this.refreshAuditLogRows();
    this.statusMessage = "Home data refreshed.";
  }

  saveCurrent(): void {
    const ticket = this.activeTicket;
    if (!ticket) {
      return;
    }
    if (ticket.status === "finalized") {
      this.statusMessage = "Finalized tickets cannot be modified.";
      return;
    }

    ticket.updatedAt = new Date().toISOString();
    ticket.status = "saved";
    this.appendTransaction(ticket.ticketId, "save", {
      completionPercent: String(this.completionPercent),
    });
    this.refreshRecentTickets();
    this.persistLocalData();
    void this.persistTicketToApi(ticket);
    this.statusMessage = `Ticket ${ticket.ticketId} saved.`;
  }

  submitAndPrint(): void {
    const ticket = this.activeTicket;
    if (!ticket) {
      return;
    }

    if (this.completionPercent < 100) {
      this.statusMessage = "Complete all checklist fields before submitting.";
      return;
    }

    ticket.status = "submitted";
    ticket.updatedAt = new Date().toISOString();
    this.appendTransaction(ticket.ticketId, "submit", {
      completionPercent: String(this.completionPercent),
    });
    this.refreshRecentTickets();
    this.persistLocalData();
    void this.flushTransactionsToApi(ticket.ticketId);

    this.viewMode = "summary";
    this.syncUrlState();
    this.statusMessage = `Ticket ${ticket.ticketId} submitted. Review summary and print PDF.`;
  }

  finalizeTicket(): void {
    const ticket = this.activeTicket;
    if (!ticket) {
      return;
    }

    if (ticket.status === "finalized") {
      this.statusMessage = "This ticket is already finalized.";
      return;
    }

    if (this.completionPercent < 100) {
      const shouldProceed = window.confirm(
        `This form is ${this.completionPercent}% complete and still has missing fields. Are you sure you want to proceed with final submit?`
      );
      if (!shouldProceed) {
        this.statusMessage = "Final submit canceled. Form is incomplete.";
        return;
      }
    }

    const nowIso = new Date().toISOString();
    ticket.status = "finalized";
    ticket.finalizedAt = nowIso;
    ticket.updatedAt = nowIso;

    this.appendTransaction(ticket.ticketId, "finalize", {
      completionPercent: String(this.completionPercent),
      finalizedAt: nowIso,
    });

    this.refreshRecentTickets();
    this.persistLocalData();
    void this.flushTransactionsToApi(ticket.ticketId);

    this.viewMode = "summary";
    this.syncUrlState();
    this.statusMessage = `Ticket ${ticket.ticketId} finalized. Review summary and print.`;
  }

  deleteTicket(ticketId: string, skipConfirm = false): void {
    if (!skipConfirm) {
      const confirmed = window.confirm(`Delete checklist ${ticketId}? This will be soft-deleted and kept as archived.`);
      if (!confirmed) {
        return;
      }
    }

    const ticket = this.tickets.find((item) => item.ticketId === ticketId);
    if (!ticket) {
      this.statusMessage = `Ticket ${ticketId} not found.`;
      return;
    }

    if (ticket.status === "archived") {
      this.statusMessage = `Ticket ${ticketId} is already archived.`;
      return;
    }

    ticket.status = "archived";
    ticket.updatedAt = new Date().toISOString();

    this.appendTransaction(ticketId, "delete");
    this.refreshRecentTickets();
    this.persistLocalData();
    void this.deleteTicketFromApi(ticketId);
    this.syncUrlState();
    this.statusMessage = `Ticket ${ticketId} soft-deleted (archived).`;
  }

  clearCurrent(): void {
    const ticket = this.activeTicket;
    if (!ticket) {
      return;
    }
    if (ticket.status === "finalized") {
      this.statusMessage = "Finalized tickets cannot be modified.";
      return;
    }

    const fields = [...this.activeTemplate.headerFields, ...this.activeTemplate.processFields];
    fields.forEach((field) => {
      this.activeValues[field.key] = "";
    });
    this.activeValues["additionalNotes"] = "";
    ticket.fieldUpdatedAt = {};
    ticket.updatedAt = new Date().toISOString();
    ticket.status = "draft";
    this.appendTransaction(ticket.ticketId, "clear");
    this.refreshRecentTickets();
    this.persistLocalData();
    this.statusMessage = "Current form cleared.";
  }

  private getCompletedCount(fields: ChecklistField[]): number {
    return fields.filter((field) => {
      const value = this.activeValues[field.key];
      return typeof value === "string" ? value.trim().length > 0 : !!value;
    }).length;
  }

  private buildHeaderInfoColumnDefs(): ColDef[] {
    const headerFieldLookup = new Map<string, string>();
    this.templates.forEach((template) => {
      template.headerFields.forEach((field) => {
        if (!headerFieldLookup.has(field.key)) {
          headerFieldLookup.set(field.key, field.label);
        }
      });
    });

    return Array.from(headerFieldLookup.entries())
      .filter(([fieldKey]) => fieldKey !== "customer")
      .map(([fieldKey, fieldLabel]) => ({
        headerName: fieldLabel,
        field: `values.${fieldKey}`,
        minWidth: 170,
        valueGetter: (params: any) => params.data?.values?.[fieldKey] || "-",
      }));
  }

  private getTicketCompletionMetrics(ticket: PermitChecklistTicket | undefined): {
    completed: number;
    total: number;
    percent: number;
  } {
    if (!ticket) {
      return { completed: 0, total: 0, percent: 0 };
    }

    const template = this.templates.find((item) => item.id === ticket.formType);
    if (!template) {
      return { completed: 0, total: 0, percent: 0 };
    }

    const allFields = [...template.headerFields, ...template.processFields];
    const completed = allFields.filter((field) => {
      const value = ticket.values?.[field.key];
      return typeof value === "string" ? value.trim().length > 0 : !!value;
    }).length;
    const total = allFields.length;
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { completed, total, percent };
  }

  private createEmptyValues(formType: PermitChecklistType): Record<string, string> {
    const template = this.templates.find((item) => item.id === formType);
    if (!template) {
      return { additionalNotes: "" };
    }

    const values: Record<string, string> = {};
    [...template.headerFields, ...template.processFields].forEach((field) => {
      values[field.key] = "";
    });
    if (Object.prototype.hasOwnProperty.call(values, "assignedArchitect")) {
      values["assignedArchitect"] = "R2 Architects";
    }
    values["additionalNotes"] = "";
    return values;
  }

  private createEmptyFinancials(formType: PermitChecklistType): PermitChecklistFinancials {
    const customerDefaults = this.customerBillingDefaultsByType[formType] || [];
    const template = this.templates.find((item) => item.id === formType);
    return {
      quoteAmount: 0,
      invoiceAmount: 0,
      approvedAmount: 0,
      approvalDate: "",
      invoiceReference: "",
      customerBillingBreakdown: customerDefaults.map((fee) => ({
        ...fee,
        amount: Number(fee.amount || 0),
        isApprovedAmount: false,
      })),
      eyefiBillingBreakdown: (template?.defaultEyefiBillingBreakdown || []).map((fee) => ({
        ...fee,
        amount: null,
        isApprovedAmount: false,
      })),
    };
  }

  private normalizeFinancials(ticket: any): PermitChecklistFinancials {
    const base = this.createEmptyFinancials(ticket.formType as PermitChecklistType);
    const incoming = ticket?.financials || {};

    const normalizeList = (list: any[]): PermitChecklistFeeLine[] =>
      (Array.isArray(list) ? list : [])
        .filter((fee: any) => fee && fee.key)
        .map((fee: any) => ({
          key: String(fee.key),
          label: String(fee.label || ""),
          amount: fee.amount === null || fee.amount === undefined || fee.amount === "" ? null : Number(fee.amount),
          isApprovedAmount: !!fee.isApprovedAmount,
        }));

    const mergeWithDefaults = (defaults: PermitChecklistFeeLine[], incomingList: PermitChecklistFeeLine[]): PermitChecklistFeeLine[] => {
      const incomingByKey = new Map(incomingList.map((fee) => [fee.key, fee]));
      const mergedDefaults = defaults.map((fee) => {
        const incomingFee = incomingByKey.get(fee.key);
        if (!incomingFee) {
          return { ...fee };
        }

        return {
          ...fee,
          label: incomingFee.label || fee.label,
          amount: incomingFee.amount === null || incomingFee.amount === undefined ? null : Number(incomingFee.amount),
          isApprovedAmount: !!incomingFee.isApprovedAmount,
        };
      });

      const defaultKeys = new Set(mergedDefaults.map((fee) => fee.key));
      const customIncoming = incomingList.filter((fee) => !defaultKeys.has(fee.key));
      return [...mergedDefaults, ...customIncoming];
    };

    const legacyFeeBreakdown = normalizeList(incoming.feeBreakdown);
    const incomingCustomer = normalizeList(incoming.customerBillingBreakdown);
    const incomingEyefi = normalizeList(incoming.eyefiBillingBreakdown);

    const normalizedCustomer = mergeWithDefaults(
      base.customerBillingBreakdown,
      incomingCustomer.length ? incomingCustomer : legacyFeeBreakdown
    );
    const normalizedEyefi = mergeWithDefaults(base.eyefiBillingBreakdown, incomingEyefi);

    const allFees = [...normalizedCustomer, ...normalizedEyefi];
    const hasCheckedApproved = allFees.some((fee) => !!fee.isApprovedAmount);
    const computedApproved = allFees.filter((fee) => !!fee.isApprovedAmount).reduce((sum, fee) => sum + Number(fee.amount || 0), 0);

    return {
      quoteAmount: Number(incoming.quoteAmount || 0),
      invoiceAmount: Number(incoming.invoiceAmount || 0),
      approvedAmount: hasCheckedApproved ? Number(computedApproved.toFixed(2)) : Number(incoming.approvedAmount || 0),
      approvalDate: String(incoming.approvalDate || ""),
      invoiceReference: String(incoming.invoiceReference || ""),
      customerBillingBreakdown: normalizedCustomer,
      eyefiBillingBreakdown: normalizedEyefi,
    };
  }

  private generateTicketId(formType: PermitChecklistType): string {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    const prefix = formType === "seismic" ? "SEI" : "DCA";
    const sameDayCount = this.tickets.filter((ticket) => {
      return ticket.ticketId.startsWith(`${prefix}-${y}${m}${d}`);
    }).length;
    const sequence = String(sameDayCount + 1).padStart(3, "0");
    return `${prefix}-${y}${m}${d}-${sequence}`;
  }

  private persistLocalData(shouldSyncApi = true): void {
    if (shouldSyncApi) {
      this.scheduleApiSync();
    }
  }

  private syncUrlState(): void {
    const activeTicket = this.activeTicket;
    const queryParams = {
      ticketId: activeTicket?.ticketId ?? null,
      formType: activeTicket?.formType ?? this.draftFormType,
      view: activeTicket ? (this.viewMode === "summary" ? "summary" : "form") : null,
    };

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      queryParamsHandling: "merge",
      replaceUrl: true,
    });
  }

  private scheduleApiSync(): void {
    if (this.ticketSyncTimer) {
      clearTimeout(this.ticketSyncTimer);
    }

    this.ticketSyncTimer = setTimeout(() => {
      void this.runScheduledApiSync();
    }, 900);
  }

  private async runScheduledApiSync(): Promise<void> {
    const ticket = this.activeTicket;
    if (ticket) {
      // Persist ticket first so transaction FK inserts can succeed.
      await this.persistTicketToApi(ticket);
      if (this.dirtyTransactionTicketIds.has(ticket.ticketId)) {
        await this.flushTransactionsToApi(ticket.ticketId);
      }
    }

    if (this.dirtyTransactionTicketIds.size > 0) {
      for (const ticketId of Array.from(this.dirtyTransactionTicketIds)) {
        await this.flushTransactionsToApi(ticketId);
      }
    }

    if (this.directorySyncDirty || this.billingDefaultsSyncDirty) {
      await this.syncReferenceDataToApi();
    }
  }

  private async persistTicketToApi(ticket: PermitChecklistTicket): Promise<void> {
    try {
      await this.permitChecklistsService.upsertTicket(ticket);
    } catch {
      this.statusMessage = "Unable to sync ticket to API. Data remains cached locally.";
    }
  }

  private async deleteTicketFromApi(ticketId: string): Promise<void> {
    try {
      await this.permitChecklistsService.deleteTicket(ticketId);
    } catch {
      this.statusMessage = "Ticket deleted locally, but API delete failed.";
    }
  }

  private async syncReferenceDataToApi(): Promise<void> {
    try {
      if (this.directorySyncDirty) {
        await this.permitChecklistsService.syncDirectories(this.customers, this.architects);
        this.directorySyncDirty = false;
      }

      if (this.billingDefaultsSyncDirty) {
        await this.permitChecklistsService.syncBillingDefaults(this.customerBillingDefaultsByType);
        this.billingDefaultsSyncDirty = false;
      }
    } catch {
      this.statusMessage = "Unable to sync reference settings to API. Changes remain cached locally.";
    }
  }

  private async flushTransactionsToApi(ticketId: string): Promise<void> {
    const transactions = this.transactions.filter((tx) => tx.ticketId === ticketId);
    if (!transactions.length) {
      this.dirtyTransactionTicketIds.delete(ticketId);
      return;
    }

    try {
      await this.permitChecklistsService.syncTransactions(transactions);
      this.dirtyTransactionTicketIds.delete(ticketId);
    } catch {
      this.statusMessage = "Unable to sync transaction log to API. Entries remain cached locally.";
    }
  }

  private loadSavedData(): void {
    this.ensureDefaultDirectoryValues();
    this.directorySyncDirty = true;
    void this.hydrateFromApi();
  }

  onShowOpenItemsOnlyChange(value: boolean): void {
    this.showOpenItemsOnly = value;
    localStorage.setItem('pc_showOpenItemsOnly', String(value));
  }

  onCondensedFormChange(value: boolean): void {
    this.condensedForm = value;
    localStorage.setItem('pc_condensedForm', String(value));
  }

  private clearLegacyPermitChecklistLocalCache(): void {
    try {
      if (localStorage.getItem(this.legacyStorageCleanupFlag) === "1") {
        return;
      }

      for (const key of this.legacyChecklistStorageKeys) {
        localStorage.removeItem(key);
      }

      localStorage.setItem(this.legacyStorageCleanupFlag, "1");
    } catch {
      // Ignore storage access errors and continue with API bootstrap.
    }
  }

  private async hydrateFromApi(): Promise<void> {
    this.isHydratingApi = true;
    try {
      const response = await this.permitChecklistsService.bootstrap();

      if (!response?.success || !response.data) {
        return;
      }

      const apiData = response.data;
      const hasApiState =
        (Array.isArray(apiData.tickets) && apiData.tickets.length > 0) ||
        (Array.isArray(apiData.transactions) && apiData.transactions.length > 0) ||
        (Array.isArray(apiData.customers) && apiData.customers.length > 0) ||
        (Array.isArray(apiData.architects) && apiData.architects.length > 0);

      if (!hasApiState) {
        if (this.directorySyncDirty || this.billingDefaultsSyncDirty) {
          void this.syncReferenceDataToApi();
        }
        return;
      }

      this.tickets = (apiData.tickets || []).map((ticket) => ({
        ...ticket,
        createdBy: ticket.createdBy || this.getCurrentUserDisplay(),
        fieldUpdatedAt: ticket.fieldUpdatedAt && typeof ticket.fieldUpdatedAt === "object" ? ticket.fieldUpdatedAt : {},
        processNoteRecords: this.normalizeProcessNoteRecords(ticket as any),
        financials: this.normalizeFinancials(ticket as any),
        attachments: Array.isArray(ticket.attachments)
          ? ticket.attachments.map((attachment: any) => ({
              ...attachment,
              uploadedBy: String(attachment?.uploadedBy || ticket.createdBy || this.getCurrentUserDisplay()),
            }))
          : [],
        values: {
          ...this.createEmptyValues(ticket.formType),
          ...(ticket.values || {}),
        },
      }));

      this.transactions = (apiData.transactions || []).map((tx) => ({
        ...tx,
        actor: tx.actor || this.resolveTransactionActor(tx),
      }));

      this.customers = this.normalizeCustomers(apiData.customers);
      this.architects = this.normalizeArchitects(apiData.architects);
      this.customerBillingDefaultsByType = this.normalizeCustomerBillingDefaultsByType(apiData.customerBillingDefaultsByType);
      this.bootstrapDirectoryFromTicketValues();
      this.ensureDefaultDirectoryValues();
      this.directorySyncDirty = false;
      this.billingDefaultsSyncDirty = false;
      this.dirtyTransactionTicketIds.clear();
      this.refreshRecentTickets();
      this.refreshAuditLogRows();
    } catch {
      this.statusMessage = "Unable to load permit checklist data from API.";
    } finally {
      this.isHydratingApi = false;
      this.applyRouteQueryState();
    }
  }

  private ensureDefaultDirectoryValues(): void {
    const existingCustomerNames = new Set(this.customers.map((item) => item.name.trim().toLowerCase()));
    for (const name of this.defaultCustomerNames) {
      const normalized = name.trim().toLowerCase();
      if (!normalized || existingCustomerNames.has(normalized)) {
        continue;
      }

      this.customers.push({
        id: this.generateDirectoryId("cust"),
        name,
      });
      existingCustomerNames.add(normalized);
    }

    const existingArchitectNames = new Set(this.architects.map((item) => item.name.trim().toLowerCase()));
    for (const name of this.defaultArchitectNames) {
      const normalized = name.trim().toLowerCase();
      if (!normalized || existingArchitectNames.has(normalized)) {
        continue;
      }

      this.architects.push({
        id: this.generateDirectoryId("arch"),
        name,
      });
      existingArchitectNames.add(normalized);
    }

    this.customers.sort((a, b) => a.name.localeCompare(b.name));
    this.architects.sort((a, b) => a.name.localeCompare(b.name));
  }

  private buildInitialCustomerBillingDefaults(): Record<PermitChecklistType, PermitChecklistFeeLine[]> {
    const buildForType = (formType: PermitChecklistType): PermitChecklistFeeLine[] => {
      const template = this.templates.find((item) => item.id === formType);
      return (template?.defaultCustomerBillingBreakdown || []).map((fee) => ({
        key: String(fee.key),
        label: String(fee.label || ""),
        amount: this.normalizeCurrencyAmount(Number(fee.amount || 0)),
        isApprovedAmount: false,
      }));
    };

    return {
      seismic: buildForType("seismic"),
      dca: buildForType("dca"),
    };
  }

  private normalizeCustomerBillingDefaultsByType(
    input?: Partial<Record<PermitChecklistType, PermitChecklistFeeLine[]>>
  ): Record<PermitChecklistType, PermitChecklistFeeLine[]> {
    const base = this.buildInitialCustomerBillingDefaults();
    const normalizeList = (list: any[]): PermitChecklistFeeLine[] =>
      (Array.isArray(list) ? list : [])
        .filter((fee: any) => fee && fee.key)
        .map((fee: any) => ({
          key: String(fee.key),
          label: String(fee.label || "").trim(),
          amount: this.normalizeCurrencyAmount(Number(fee.amount || 0)),
          isApprovedAmount: false,
        }));

    return {
      seismic: normalizeList((input as any)?.seismic).length ? normalizeList((input as any)?.seismic) : base.seismic,
      dca: normalizeList((input as any)?.dca).length ? normalizeList((input as any)?.dca) : base.dca,
    };
  }

  private refreshRecentTickets(): void {
    this.recentTickets = [...this.tickets].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  private appendTransaction(
    ticketId: string,
    type: PermitChecklistTransaction["type"],
    details?: Record<string, string>
  ): void {
    const tx: PermitChecklistTransaction = {
      id: this.generateTransactionId(),
      ticketId,
      type,
      timestamp: new Date().toISOString(),
      actor: this.getCurrentUserDisplay(),
      details,
    };

    this.transactions = [...this.transactions, tx];
    if (this.transactions.length > this.maxTransactions) {
      this.transactions = this.transactions.slice(this.transactions.length - this.maxTransactions);
    }
    this.dirtyTransactionTicketIds.add(ticketId);
    this.refreshAuditLogRows();
  }

  private refreshAuditLogRows(): void {
    this.auditLogRows = [...this.transactions]
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
      .map((tx) => ({
        id: tx.id,
        ticketId: tx.ticketId,
        type: tx.type,
        timestamp: tx.timestamp,
        fieldKey: tx.details?.["fieldKey"] || "",
        oldValue: tx.details?.["oldValue"] || "",
        newValue: tx.details?.["newValue"] || "",
        source: tx.details?.["source"] || "",
      }));
  }

  private generateTransactionId(): string {
    return `tx_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }

  private describeTransaction(tx: PermitChecklistTransaction): string {
    const fieldKey = tx.details?.["fieldKey"] || "";
    const fieldLabel = this.getFieldLabelFromKey(fieldKey);

    if (tx.type === "create") {
      return "Created ticket";
    }
    if (tx.type === "submit") {
      return "Submitted ticket for PDF";
    }
    if (tx.type === "finalize") {
      return "Finalized ticket";
    }
    if (tx.type === "archive") {
      return "Archived ticket";
    }
    if (tx.type === "delete") {
      return "Deleted ticket";
    }
    if (tx.type === "clear") {
      return "Cleared form fields";
    }
    if (tx.type === "attachment_upload") {
      return `Uploaded attachment ${tx.details?.["newValue"] || "file"} to ${fieldLabel}`;
    }
    if (tx.type === "attachment_remove") {
      return `Removed attachment ${tx.details?.["oldValue"] || "file"} from ${fieldLabel}`;
    }
    if (tx.type === "note_add") {
      return `Added note on ${fieldLabel}`;
    }
    if (tx.type === "note_edit") {
      return `Edited note on ${fieldLabel}`;
    }
    if (tx.type === "save") {
      return "Saved ticket";
    }

    if (tx.type === "field_update") {
      return `Updated ${fieldLabel}`;
    }

    return String(tx.type).replace("_", " ");
  }

  private getFieldLabelFromKey(fieldKey: string): string {
    const normalized = (fieldKey || "").replace("__note", "");
    if (!normalized) {
      return "item";
    }

    const allFields = this.templates.flatMap((template) => [...template.headerFields, ...template.processFields]);
    const match = allFields.find((field) => field.key === normalized);
    return match?.label || normalized;
  }

  private getReferenceNotesFromFees(feeBreakdown: PermitChecklistFeeLine[], sectionLabel: string): string[] {
    return (feeBreakdown || [])
      .filter((fee) => String(fee.label || "").trim().length > 0 && Number(fee.amount || 0) > 0)
      .map((fee) => `${sectionLabel}: ${fee.label} @ ${this.formatCurrency(fee.amount || 0)}`);
  }

  private normalizeCustomers(input: any): PermitChecklistCustomer[] {
    if (!Array.isArray(input)) {
      return [];
    }

    return input
      .map((row) => ({
        id: String(row?.id || this.generateDirectoryId("cust")),
        name: String(row?.name || "").trim(),
      }))
      .filter((row) => row.name.length > 0)
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  private normalizeArchitects(input: any): PermitChecklistArchitect[] {
    if (!Array.isArray(input)) {
      return [];
    }

    return input
      .map((row) => ({
        id: String(row?.id || this.generateDirectoryId("arch")),
        name: String(row?.name || "").trim(),
      }))
      .filter((row) => row.name.length > 0)
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  private bootstrapDirectoryFromTicketValues(): void {
    const customerNames = new Set(this.customers.map((customer) => customer.name.trim().toLowerCase()));
    const architectNames = new Set(this.architects.map((architect) => architect.name.trim().toLowerCase()));

    for (const ticket of this.tickets) {
      const customer = String(ticket.values?.["customer"] || "").trim();
      if (customer && !customerNames.has(customer.toLowerCase())) {
        this.customers.push({
          id: this.generateDirectoryId("cust"),
          name: customer,
        });
        customerNames.add(customer.toLowerCase());
      }

      const architect = String(ticket.values?.["assignedArchitect"] || "").trim();
      if (architect && !architectNames.has(architect.toLowerCase())) {
        this.architects.push({
          id: this.generateDirectoryId("arch"),
          name: architect,
        });
        architectNames.add(architect.toLowerCase());
      }
    }

    this.customers.sort((a, b) => a.name.localeCompare(b.name));
    this.architects.sort((a, b) => a.name.localeCompare(b.name));
  }

  private generateAttachmentId(): string {
    return `att_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }

  private generateFeeKey(): string {
    return `fee_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  }

  private generateProcessNoteId(): string {
    return `note_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }

  private generateDirectoryId(prefix: "cust" | "arch"): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }

  private normalizeProcessNoteRecords(ticket: any): PermitChecklistProcessNote[] {
    if (Array.isArray(ticket?.processNoteRecords)) {
      return ticket.processNoteRecords.filter((record: any) => {
        return !!record && !!record.id && !!record.fieldKey && typeof record.noteText === "string";
      });
    }

    const legacy = ticket?.processNotes;
    if (legacy && typeof legacy === "object") {
      const nowIso = new Date().toISOString();
      const fieldLookup = new Map(this.attachmentFieldOptions.map((field) => [field.key, field.label]));
      return Object.keys(legacy)
        .map((fieldKey) => {
          const noteText = String(legacy[fieldKey] || "").trim();
          if (!noteText) {
            return null;
          }

          return {
            id: this.generateProcessNoteId(),
            fieldKey,
            fieldLabel: fieldLookup.get(fieldKey) || fieldKey,
            noteText,
            createdAt: ticket.updatedAt || nowIso,
            createdBy: ticket.createdBy || this.getCurrentUserDisplay(),
          } as PermitChecklistProcessNote;
        })
        .filter((record): record is PermitChecklistProcessNote => !!record);
    }

    return [];
  }

  private async readFileAsDataUrl(file: File): Promise<string | undefined> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : undefined);
      reader.onerror = () => resolve(undefined);
      reader.readAsDataURL(file);
    });
  }

  private resolveAttachmentUrl(attachment: PermitChecklistAttachment): string | undefined {
    if (attachment.dataUrl) {
      return attachment.dataUrl;
    }

    const backendUrl = this.normalizeAttachmentLink(attachment.url || attachment.link || attachment.path);
    if (backendUrl) {
      return backendUrl;
    }

    return this.objectUrlByAttachmentId.get(attachment.id);
  }

  private getAttachmentDownloadUrl(attachment: PermitChecklistAttachment | null): string | null {
    if (!attachment) {
      return null;
    }

    return this.resolveAttachmentUrl(attachment) ?? null;
  }

  private normalizeAttachmentLink(rawValue?: string): string | undefined {
    const value = String(rawValue || "").trim();
    if (!value) {
      return undefined;
    }

    if (value.startsWith("http://") || value.startsWith("https://") || value.startsWith("blob:") || value.startsWith("data:")) {
      return value;
    }

    return value.startsWith("/") ? value : `/${value}`;
  }

  private isDocxAttachment(attachment: PermitChecklistAttachment): boolean {
    const mime = (attachment.mimeType || "").toLowerCase();
    if (mime.includes("wordprocessingml.document")) {
      return true;
    }

    return attachment.fileName.toLowerCase().endsWith(".docx");
  }

  private async loadDocxPreview(): Promise<void> {
    if (!this.previewAttachmentUrl) {
      this.previewAttachmentKind = "other";
      return;
    }

    try {
      const response = await fetch(this.previewAttachmentUrl);
      const arrayBuffer = await response.arrayBuffer();
      const result = await mammoth.convertToHtml({ arrayBuffer });
      this.previewDocxHtml = result.value || "<p>No preview content available.</p>";
    } catch {
      this.previewAttachmentKind = "other";
      this.previewDocxHtml = "";
    }
  }

  formatFileSize(bytes: number): string {
    if (!bytes) {
      return "0 B";
    }

    if (bytes < 1024) {
      return `${bytes} B`;
    }

    const kb = bytes / 1024;
    if (kb < 1024) {
      return `${kb.toFixed(1)} KB`;
    }

    return `${(kb / 1024).toFixed(1)} MB`;
  }

  private getCurrentUserDisplay(): string {
    const currentUser = this.authenticationService.currentUserValue;
    if (currentUser) {
      if (currentUser.full_name) {
        return String(currentUser.full_name);
      }
      if (currentUser.first_name && currentUser.last_name) {
        return `${currentUser.first_name} ${currentUser.last_name}`;
      }
      if (currentUser.firstName && currentUser.lastName) {
        return `${currentUser.firstName} ${currentUser.lastName}`;
      }
      if (currentUser.username) {
        return String(currentUser.username);
      }
      if (currentUser.email) {
        return String(currentUser.email);
      }
      if (currentUser.id !== undefined && currentUser.id !== null) {
        return `User #${currentUser.id}`;
      }
    }

    try {
      const rawUser = localStorage.getItem(THE_FI_COMPANY_CURRENT_USER);
      if (rawUser) {
        const parsed = JSON.parse(rawUser);
        if (parsed?.full_name) {
          return String(parsed.full_name);
        }
        if (parsed?.first_name && parsed?.last_name) {
          return `${parsed.first_name} ${parsed.last_name}`;
        }
        if (parsed?.firstName && parsed?.lastName) {
          return `${parsed.firstName} ${parsed.lastName}`;
        }
        if (parsed?.username) {
          return String(parsed.username);
        }
        if (parsed?.email) {
          return String(parsed.email);
        }
      }
    } catch {
      // Ignore storage parsing errors and fall through to default value.
    }

    return "Unknown User";
  }

  private getCurrentUserId(): string {
    const currentUser: any = this.authenticationService.currentUserValue;
    if (currentUser?.id !== undefined && currentUser?.id !== null) {
      return String(currentUser.id);
    }

    try {
      const rawUser = localStorage.getItem(THE_FI_COMPANY_CURRENT_USER);
      if (!rawUser) {
        return "";
      }

      const parsed: any = JSON.parse(rawUser);
      return parsed?.id !== undefined && parsed?.id !== null ? String(parsed.id) : "";
    } catch {
      return "";
    }
  }

  private isCurrentUserAdmin(): boolean {
    const currentUser: any = this.authenticationService.currentUserValue;
    if (currentUser) {
      if (currentUser.isAdmin === true || currentUser.isAdmin === 1 || currentUser.isAdmin === "1") {
        return true;
      }
    }

    try {
      const rawUser = localStorage.getItem(THE_FI_COMPANY_CURRENT_USER);
      if (!rawUser) {
        return false;
      }

      const parsed: any = JSON.parse(rawUser);
      return parsed?.isAdmin === true || parsed?.isAdmin === 1 || parsed?.isAdmin === "1";
    } catch {
      return false;
    }
  }

  private resolveTransactionActor(tx: PermitChecklistTransaction): string {
    if (tx.actor && tx.actor !== "Unknown User") {
      return tx.actor;
    }

    const ticketCreator = this.tickets.find((ticket) => ticket.ticketId === tx.ticketId)?.createdBy;
    if (ticketCreator && ticketCreator !== "Unknown User") {
      return ticketCreator;
    }

    return this.getCurrentUserDisplay();
  }

  formatDateTime(value?: string): string {
    if (!value) {
      return "-";
    }
    return new Date(value).toLocaleString();
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 2,
    }).format(Number(value || 0));
  }

  private saveGridState(storageKey: string, gridApi: any): void {
    if (!gridApi) {
      return;
    }

    try {
      const columnState = gridApi.getColumnState ? gridApi.getColumnState() : [];
      const sortModel = gridApi.getSortModel ? gridApi.getSortModel() : [];
      const filterModel = gridApi.getFilterModel ? gridApi.getFilterModel() : {};
      localStorage.setItem(storageKey, JSON.stringify({ columnState, sortModel, filterModel }));
    } catch {
      // Ignore storage errors to avoid breaking grid UX.
    }
  }

  private restoreGridState(storageKey: string, gridApi: any): void {
    if (!gridApi) {
      return;
    }

    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) {
        return;
      }

      const parsed = JSON.parse(raw || "{}");
      if (parsed?.columnState?.length && gridApi.applyColumnState) {
        gridApi.applyColumnState({ state: parsed.columnState, applyOrder: true });
      }
      if (parsed?.sortModel && gridApi.setSortModel) {
        gridApi.setSortModel(parsed.sortModel);
      }
      if (parsed?.filterModel && gridApi.setFilterModel) {
        gridApi.setFilterModel(parsed.filterModel);
      }
    } catch {
      // Ignore malformed state and proceed with defaults.
    }
  }

  private buildPrintableHtml(ticket: PermitChecklistTicket): string {
    const template = this.templates.find((item) => item.id === ticket.formType) ?? this.templates[0];
    const valueOf = (key: string) => this.escapeHtml(ticket.values[key] || "");
    const fieldRow = (label: string, key: string) => `<tr><th>${this.escapeHtml(label)}</th><td>${valueOf(key)}</td></tr>`;

    const headerRows = template.headerFields.map((field) => fieldRow(field.label, field.key)).join("");
    const processRows = template.processFields.map((field) => fieldRow(field.label, field.key)).join("");
    const notes = this.escapeHtml(ticket.values["additionalNotes"] || "");
    const footerNotes = [
      ...this.getReferenceNotesFromFees(ticket.financials?.customerBillingBreakdown || [], "Customer Billing"),
      ...this.getReferenceNotesFromFees(ticket.financials?.eyefiBillingBreakdown || [], "Eyefi Billing"),
    ];
    const footer = footerNotes.map((note) => `<li>${this.escapeHtml(note)}</li>`).join("");

    return `
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${this.escapeHtml(ticket.ticketId)} - ${this.escapeHtml(template.title)}</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 24px; color: #1f2937; }
      .top { display: flex; justify-content: space-between; margin-bottom: 16px; }
      h1 { margin: 0 0 4px; font-size: 20px; }
      h2 { margin: 18px 0 10px; font-size: 14px; text-transform: uppercase; letter-spacing: .04em; }
      .meta { font-size: 12px; color: #475569; }
      table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
      th, td { border: 1px solid #cbd5e1; padding: 8px; font-size: 12px; vertical-align: top; }
      th { width: 48%; text-align: left; background: #f8fafc; }
      .notes { border: 1px solid #cbd5e1; padding: 10px; min-height: 60px; font-size: 12px; }
      ul { margin: 8px 0 0 18px; padding: 0; }
      @media print { body { margin: 10mm; } }
    </style>
  </head>
  <body>
    <div class="top">
      <div>
        <h1>${this.escapeHtml(template.title)}</h1>
        <div class="meta">Ticket: ${this.escapeHtml(ticket.ticketId)} | Form: ${this.escapeHtml(ticket.formType.toUpperCase())}</div>
      </div>
      <div class="meta">Submitted: ${this.escapeHtml(new Date(ticket.updatedAt).toLocaleString())}</div>
    </div>

    <h2>Header Information</h2>
    <table><tbody>${headerRows}</tbody></table>

    <h2>Process Timeline</h2>
    <table><tbody>${processRows}</tbody></table>

    <h2>Additional Notes</h2>
    <div class="notes">${notes || "-"}</div>

    <h2>Reference Notes</h2>
    <ul>${footer}</ul>
  </body>
</html>`;
  }

  private escapeHtml(value: string): string {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }
}
