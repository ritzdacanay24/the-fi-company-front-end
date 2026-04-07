import { CommonModule } from "@angular/common";
import { Component, OnDestroy, OnInit } from "@angular/core";
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
import { NgbDropdownModule } from "@ng-bootstrap/ng-bootstrap";
import * as mammoth from "mammoth";

type PermitChecklistType = "seismic" | "dca";

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
  defaultFeeBreakdown?: PermitChecklistFeeLine[];
}

interface PermitChecklistFeeLine {
  key: string;
  label: string;
  amount: number;
  isApprovedAmount?: boolean;
}

interface PermitChecklistFinancials {
  quoteAmount: number;
  invoiceAmount: number;
  approvedAmount: number;
  approvalDate: string;
  invoiceReference: string;
  feeBreakdown: PermitChecklistFeeLine[];
}

interface PermitChecklistTicket {
  ticketId: string;
  formType: PermitChecklistType;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  finalizedAt?: string;
  status: "draft" | "saved" | "submitted" | "finalized";
  values: Record<string, string>;
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

interface StoredChecklistData {
  tickets: PermitChecklistTicket[];
  draftFormType: PermitChecklistType;
  transactions: PermitChecklistTransaction[];
}

@Component({
  standalone: true,
  selector: "app-permit-checklists",
  imports: [CommonModule, FormsModule, AgGridModule, NgbDropdownModule, PermitChecklistSummaryComponent],
  templateUrl: "./permit-checklists.component.html",
  styleUrls: ["./permit-checklists.component.scss"],
})
export class PermitChecklistsComponent implements OnInit {
  private readonly storageKey = "quality_permit_checklists_v2";
  private readonly maxTransactions = 2000;
  private routeSub?: Subscription;

  viewMode: "home" | "form" | "summary" = "home";
  homeTab: "tickets" | "audit" | "approved-report" = "tickets";

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
      defaultFeeBreakdown: [{ key: "seismicApproval", label: "Seismic Approval", amount: 3000 }],
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
      defaultFeeBreakdown: [
        { key: "architectFees", label: "Architect Fees", amount: 3980 },
        { key: "mepFees", label: "MEP Fees", amount: 2750 },
        { key: "structuralFees", label: "Structural Fees", amount: 2500 },
      ],
    },
  ];

  draftFormType: PermitChecklistType = "seismic";
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
  isProcessNoteModalOpen = false;
  processNoteFieldKey = "";
  processNoteFieldLabel = "";
  processNoteDraft = "";
  processNoteEditingId: string | null = null;
  fieldEditStartValues: Record<string, string> = {};
  newFeeLabelDraft = "";
  newFeeAmountDraft: number | null = null;

  private readonly maxPersistedPreviewSizeBytes = 750 * 1024;
  private readonly objectUrlByAttachmentId = new Map<string, string>();

  statusMessage = "";

  ticketGridComponents = {
    permitTicketActionsRenderer: PermitTicketActionsRendererComponent,
  };

  ticketColumnDefs: ColDef[] = [
    {
      headerName: "Ticket ID",
      field: "ticketId",
      minWidth: 190,
      pinned: "left",
      cellClass: "fw-semibold",
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
    {
      headerName: "Status",
      field: "status",
      minWidth: 120,
      cellRenderer: (params: any) => {
        if (params.value === "finalized") {
          return `<span class="badge bg-dark-subtle text-dark">Finalized</span>`;
        }
        if (params.value === "submitted") {
          return `<span class="badge bg-primary-subtle text-primary">Submitted</span>`;
        }
        if (params.value === "saved") {
          return `<span class="badge bg-success-subtle text-success">Saved</span>`;
        }
        return `<span class="badge bg-warning-subtle text-warning">Draft</span>`;
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
          <div style="display:flex;align-items:center;gap:8px;min-width:190px;">
            <div style="flex:1;height:8px;background:#e9ecef;border-radius:999px;overflow:hidden;">
              <div style="width:${percent}%;height:100%;background:${tone};"></div>
            </div>
            <span style="font-size:12px;font-weight:600;white-space:nowrap;">${percent}% (${metrics.completed}/${metrics.total})</span>
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
    {
      headerName: "Actions",
      field: "actions",
      sortable: false,
      filter: false,
      minWidth: 190,
      pinned: "right",
      cellRenderer: "permitTicketActionsRenderer",
      cellRendererParams: {
        onOpen: (ticketId: string) => {
          this.openTicket(ticketId);
        },
        onDelete: (ticketId: string) => {
          this.deleteTicket(ticketId);
        },
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
    rowHeight: 44,
    animateRows: true,
    suppressMenuHide: true,
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
  };

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly authenticationService: AuthenticationService,
    private readonly sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    this.loadSavedData();
    this.routeSub = this.route.queryParamMap.subscribe((params) => {
      const ticketId = (params.get("ticketId") || "").trim();
      const formType = (params.get("formType") || "").trim().toLowerCase();
      const view = (params.get("view") || "").trim().toLowerCase();

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

        this.activeTicketId = null;
        this.viewMode = "home";
        this.statusMessage = `Ticket ${ticketId} not found.`;
        return;
      }

      this.activeTicketId = null;
      this.viewMode = "home";
    });
  }

  ngOnDestroy(): void {
    this.routeSub?.unsubscribe();
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

  get totalFieldCount(): number {
    return this.activeTemplate.headerFields.length + this.activeTemplate.processFields.length;
  }

  get totalCompletedCount(): number {
    return this.headerCompletedCount + this.processCompletedCount;
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
    return !!this.activeTicket && this.activeTicket.status !== "finalized";
  }

  get canEditActiveTicket(): boolean {
    return !!this.activeTicket && this.activeTicket.status !== "finalized";
  }

  get activeTicketStatusLabel(): string {
    const status = this.activeTicket?.status;
    if (!status) {
      return "-";
    }
    return status.charAt(0).toUpperCase() + status.slice(1);
  }

  get activeTicketStatusClass(): string {
    const status = this.activeTicket?.status;
    if (status === "finalized") {
      return "status-pill status-finalized";
    }
    if (status === "submitted") {
      return "status-pill status-submitted";
    }
    if (status === "saved") {
      return "status-pill status-saved";
    }
    return "status-pill status-draft";
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

  get activeTicketAttachments(): PermitChecklistAttachment[] {
    if (!this.activeTicket?.attachments?.length) {
      return [];
    }

    return [...this.activeTicket.attachments].sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
  }

  get referenceNotesDisplay(): string[] {
    return this.getReferenceNotesFromFees(this.activeFinancials.feeBreakdown);
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

  updateFinancialValue(field: keyof Omit<PermitChecklistFinancials, "feeBreakdown">, value: string): void {
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

  updateFeeAmount(feeKey: string, value: string): void {
    const ticket = this.activeTicket;
    if (!ticket || !this.canEditActiveTicket) {
      return;
    }

    if (!ticket.financials) {
      ticket.financials = this.createEmptyFinancials(ticket.formType);
    }

    const nextAmount = Number(value || 0);
    const idx = ticket.financials.feeBreakdown.findIndex((fee) => fee.key === feeKey);
    if (idx === -1) {
      return;
    }

    const oldAmount = Number(ticket.financials.feeBreakdown[idx].amount || 0);
    if (oldAmount === nextAmount) {
      return;
    }

    ticket.financials.feeBreakdown[idx].amount = nextAmount;
    this.syncApprovedAmountFromFeeLines(ticket);

    ticket.updatedAt = new Date().toISOString();
    if (ticket.status === "submitted") {
      ticket.status = "draft";
    }

    this.appendTransaction(ticket.ticketId, "field_update", {
      fieldKey: `financial.fee.${feeKey}`,
      oldValue: String(oldAmount),
      newValue: String(nextAmount),
      source: "financial",
    });

    this.refreshRecentTickets();
    this.persistLocalData();
  }

  setFeeApproved(feeKey: string, isApproved: boolean): void {
    const ticket = this.activeTicket;
    if (!ticket || !this.canEditActiveTicket) {
      return;
    }

    if (!ticket.financials) {
      ticket.financials = this.createEmptyFinancials(ticket.formType);
    }

    const idx = ticket.financials.feeBreakdown.findIndex((fee) => fee.key === feeKey);
    if (idx === -1) {
      return;
    }

    const oldValue = !!ticket.financials.feeBreakdown[idx].isApprovedAmount;
    if (oldValue === !!isApproved) {
      return;
    }

    ticket.financials.feeBreakdown[idx].isApprovedAmount = !!isApproved;
    this.syncApprovedAmountFromFeeLines(ticket);

    ticket.updatedAt = new Date().toISOString();
    if (ticket.status === "submitted") {
      ticket.status = "draft";
    }

    this.appendTransaction(ticket.ticketId, "field_update", {
      fieldKey: `financial.feeApproved.${feeKey}`,
      oldValue: String(oldValue),
      newValue: String(!!isApproved),
      source: "financial",
    });

    this.refreshRecentTickets();
    this.persistLocalData();
  }

  updateFeeLabel(feeKey: string, label: string): void {
    const ticket = this.activeTicket;
    if (!ticket || !this.canEditActiveTicket) {
      return;
    }

    if (!ticket.financials) {
      ticket.financials = this.createEmptyFinancials(ticket.formType);
    }

    const idx = ticket.financials.feeBreakdown.findIndex((fee) => fee.key === feeKey);
    if (idx === -1) {
      return;
    }

    const oldLabel = String(ticket.financials.feeBreakdown[idx].label || "");
    const nextLabel = String(label || "").trim();
    if (oldLabel === nextLabel) {
      return;
    }

    ticket.financials.feeBreakdown[idx].label = nextLabel;

    ticket.updatedAt = new Date().toISOString();
    if (ticket.status === "submitted") {
      ticket.status = "draft";
    }

    this.appendTransaction(ticket.ticketId, "field_update", {
      fieldKey: `financial.feeLabel.${feeKey}`,
      oldValue: oldLabel,
      newValue: nextLabel,
      source: "financial",
    });

    this.refreshRecentTickets();
    this.persistLocalData();
  }

  addFeeLine(): void {
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
      amount: 0,
      isApprovedAmount: false,
    };

    ticket.financials.feeBreakdown = [...ticket.financials.feeBreakdown, newFee];
    ticket.updatedAt = new Date().toISOString();
    if (ticket.status === "submitted") {
      ticket.status = "draft";
    }

    this.appendTransaction(ticket.ticketId, "field_update", {
      fieldKey: `financial.fee.add`,
      newValue: newFee.key,
      source: "financial",
    });

    this.refreshRecentTickets();
    this.persistLocalData();
  }

  addFeeLineFromDraft(): void {
    const ticket = this.activeTicket;
    if (!ticket || !this.canEditActiveTicket) {
      return;
    }

    const label = String(this.newFeeLabelDraft || "").trim();
    if (!label) {
      this.statusMessage = "Enter a fee label before adding.";
      return;
    }

    if (!ticket.financials) {
      ticket.financials = this.createEmptyFinancials(ticket.formType);
    }

    const amount = Number(this.newFeeAmountDraft || 0);
    const newFee: PermitChecklistFeeLine = {
      key: this.generateFeeKey(),
      label,
      amount,
      isApprovedAmount: false,
    };

    ticket.financials.feeBreakdown = [...ticket.financials.feeBreakdown, newFee];
    ticket.updatedAt = new Date().toISOString();
    if (ticket.status === "submitted") {
      ticket.status = "draft";
    }

    this.appendTransaction(ticket.ticketId, "field_update", {
      fieldKey: "financial.fee.add",
      newValue: `${label}:${amount}`,
      source: "financial",
    });

    this.newFeeLabelDraft = "";
    this.newFeeAmountDraft = null;
    this.refreshRecentTickets();
    this.persistLocalData();
  }

  removeFeeLine(feeKey: string): void {
    const ticket = this.activeTicket;
    if (!ticket || !this.canEditActiveTicket) {
      return;
    }

    if (!ticket.financials) {
      ticket.financials = this.createEmptyFinancials(ticket.formType);
    }

    const target = ticket.financials.feeBreakdown.find((fee) => fee.key === feeKey);
    if (!target) {
      return;
    }

    ticket.financials.feeBreakdown = ticket.financials.feeBreakdown.filter((fee) => fee.key !== feeKey);
    this.syncApprovedAmountFromFeeLines(ticket);
    ticket.updatedAt = new Date().toISOString();
    if (ticket.status === "submitted") {
      ticket.status = "draft";
    }

    this.appendTransaction(ticket.ticketId, "field_update", {
      fieldKey: `financial.fee.remove.${feeKey}`,
      oldValue: `${target.label}:${target.amount}`,
      source: "financial",
    });

    this.refreshRecentTickets();
    this.persistLocalData();
  }

  private syncApprovedAmountFromFeeLines(ticket: PermitChecklistTicket): void {
    const nextApproved = (ticket.financials?.feeBreakdown || [])
      .filter((fee) => !!fee.isApprovedAmount)
      .reduce((sum, fee) => sum + Number(fee.amount || 0), 0);

    ticket.financials.approvedAmount = Number(nextApproved.toFixed(2));
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

    ticket.updatedAt = new Date().toISOString();
    if (ticket.status === "submitted") {
      ticket.status = "draft";
    }

    this.appendTransaction(ticket.ticketId, "field_update", {
      fieldKey,
      oldValue,
      newValue: normalizedNext,
      source,
    });

    this.refreshRecentTickets();
    this.persistLocalData();

    if (this.completionPercent === 100 && this.viewMode === "form") {
      this.viewMode = "summary";
      this.syncUrlState();
      this.statusMessage = "Checklist complete. Review summary and print.";
    }
  }

  createTicket(): void {
    const now = new Date().toISOString();
    const ticket: PermitChecklistTicket = {
      ticketId: this.generateTicketId(this.draftFormType),
      formType: this.draftFormType,
      createdBy: this.getCurrentUserDisplay(),
      createdAt: now,
      updatedAt: now,
      status: "draft",
      values: this.createEmptyValues(this.draftFormType),
      processNoteRecords: [],
      financials: this.createEmptyFinancials(this.draftFormType),
      attachments: [],
    };

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
    const ticket = this.activeTicket;
    if (!ticket || !this.canEditActiveTicket) {
      return;
    }

    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }

    const field = this.attachmentFieldOptions.find((item) => item.key === this.selectedAttachmentFieldKey);
    if (!field) {
      this.statusMessage = "Select an item first, then upload attachment.";
      input.value = "";
      return;
    }

    const attachmentId = this.generateAttachmentId();
    const objectUrl = URL.createObjectURL(file);
    this.objectUrlByAttachmentId.set(attachmentId, objectUrl);

    let dataUrl: string | undefined;
    if (file.size <= this.maxPersistedPreviewSizeBytes) {
      dataUrl = await this.readFileAsDataUrl(file);
    }

    const attachment: PermitChecklistAttachment = {
      id: attachmentId,
      fieldKey: field.key,
      fieldLabel: field.label,
      uploadedBy: this.getCurrentUserDisplay(),
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type || "application/octet-stream",
      uploadedAt: new Date().toISOString(),
      dataUrl,
    };

    ticket.attachments = [...(ticket.attachments || []), attachment];
    ticket.updatedAt = new Date().toISOString();
    if (ticket.status === "submitted") {
      ticket.status = "draft";
    }

    this.appendTransaction(ticket.ticketId, "attachment_upload", {
      fieldKey: field.key,
      newValue: file.name,
      source: "attachment",
    });

    this.refreshRecentTickets();
    this.persistLocalData();
    this.statusMessage = `Attachment added for ${field.label}.`;
    input.value = "";
  }

  removeAttachment(attachmentId: string): void {
    const ticket = this.activeTicket;
    if (!ticket || !this.canEditActiveTicket) {
      return;
    }

    const target = (ticket.attachments || []).find((item) => item.id === attachmentId);
    if (!target) {
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
      fieldKey: target.fieldKey,
      oldValue: target.fileName,
      source: "attachment",
    });

    this.refreshRecentTickets();
    this.persistLocalData();
    this.statusMessage = `Attachment removed from ${target.fieldLabel}.`;
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

  openTicket(ticketId: string): void {
    this.activeTicketId = ticketId;
    const ticket = this.tickets.find((item) => item.ticketId === ticketId);
    this.viewMode = ticket?.status === "finalized" ? "summary" : "form";
    this.syncUrlState();
    this.statusMessage = "Ticket opened.";
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
    this.statusMessage = `Ticket ${ticket.ticketId} saved locally.`;
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

  deleteTicket(ticketId: string): void {
    this.appendTransaction(ticketId, "delete");
    this.tickets = this.tickets.filter((ticket) => ticket.ticketId !== ticketId);
    this.refreshRecentTickets();
    if (this.activeTicketId === ticketId) {
      this.activeTicketId = null;
      this.viewMode = "home";
    }
    this.persistLocalData();
    this.syncUrlState();
    this.statusMessage = "Ticket removed.";
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
    values["additionalNotes"] = "";
    return values;
  }

  private createEmptyFinancials(formType: PermitChecklistType): PermitChecklistFinancials {
    const template = this.templates.find((item) => item.id === formType);
    return {
      quoteAmount: 0,
      invoiceAmount: 0,
      approvedAmount: 0,
      approvalDate: "",
      invoiceReference: "",
      feeBreakdown: (template?.defaultFeeBreakdown || []).map((fee) => ({ ...fee, isApprovedAmount: false })),
    };
  }

  private normalizeFinancials(ticket: any): PermitChecklistFinancials {
    const base = this.createEmptyFinancials(ticket.formType as PermitChecklistType);
    const incoming = ticket?.financials || {};

    const incomingFees: PermitChecklistFeeLine[] = Array.isArray(incoming.feeBreakdown)
      ? incoming.feeBreakdown
          .filter((fee: any) => fee && fee.key)
          .map((fee: any) => ({
            key: String(fee.key),
            label: String(fee.label || ""),
            amount: Number(fee.amount || 0),
            isApprovedAmount: !!fee.isApprovedAmount,
          }))
      : [];

    const incomingByKey = new Map(incomingFees.map((fee) => [fee.key, fee]));
    const mergedDefaults = base.feeBreakdown.map((fee) => {
      const incomingFee = incomingByKey.get(fee.key);
      if (!incomingFee) {
        return { ...fee };
      }

      return {
        ...fee,
        label: incomingFee.label || fee.label,
        amount: Number(incomingFee.amount || 0),
        isApprovedAmount: !!incomingFee.isApprovedAmount,
      };
    });

    const defaultKeys = new Set(mergedDefaults.map((fee) => fee.key));
    const customIncoming = incomingFees.filter((fee) => !defaultKeys.has(fee.key));

    const normalizedFeeBreakdown = [...mergedDefaults, ...customIncoming];
    const hasCheckedApproved = normalizedFeeBreakdown.some((fee) => !!fee.isApprovedAmount);
    const computedApproved = normalizedFeeBreakdown
      .filter((fee) => !!fee.isApprovedAmount)
      .reduce((sum, fee) => sum + Number(fee.amount || 0), 0);

    return {
      quoteAmount: Number(incoming.quoteAmount || 0),
      invoiceAmount: Number(incoming.invoiceAmount || 0),
      approvedAmount: hasCheckedApproved ? Number(computedApproved.toFixed(2)) : Number(incoming.approvedAmount || 0),
      approvalDate: String(incoming.approvalDate || ""),
      invoiceReference: String(incoming.invoiceReference || ""),
      feeBreakdown: normalizedFeeBreakdown,
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

  private persistLocalData(): void {
    const payload: StoredChecklistData = {
      tickets: this.tickets,
      draftFormType: this.draftFormType,
      transactions: this.transactions,
    };
    localStorage.setItem(this.storageKey, JSON.stringify(payload));
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

  private async persistTicketToApi(_ticket: PermitChecklistTicket): Promise<void> {
    // API wiring placeholder:
    // Next step is POSTing ticket payload to backend endpoint when available.
    return Promise.resolve();
  }

  private async flushTransactionsToApi(_ticketId: string): Promise<void> {
    // API wiring placeholder:
    // Next step is POST /transactions with pending entries for this ticket.
    return Promise.resolve();
  }

  private loadSavedData(): void {
    const raw = localStorage.getItem(this.storageKey);
    if (!raw) {
      return;
    }

    try {
      const saved = JSON.parse(raw) as Partial<StoredChecklistData>;
      this.draftFormType = saved.draftFormType === "dca" ? "dca" : "seismic";
      this.tickets = (saved.tickets || []).map((ticket) => ({
        ...ticket,
        createdBy: ticket.createdBy || this.getCurrentUserDisplay(),
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
      this.transactions = (saved.transactions || []).map((tx) => ({
        ...tx,
        actor: tx.actor || this.resolveTransactionActor(tx),
      }));
      this.refreshRecentTickets();
      this.refreshAuditLogRows();
    } catch {
      this.statusMessage = "Saved checklist data could not be loaded.";
    }
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

  private getReferenceNotesFromFees(feeBreakdown: PermitChecklistFeeLine[]): string[] {
    return (feeBreakdown || [])
      .filter((fee) => String(fee.label || "").trim().length > 0)
      .map((fee) => `${fee.label} @ ${this.formatCurrency(fee.amount)}`);
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

    return this.objectUrlByAttachmentId.get(attachment.id);
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

  private buildPrintableHtml(ticket: PermitChecklistTicket): string {
    const template = this.templates.find((item) => item.id === ticket.formType) ?? this.templates[0];
    const valueOf = (key: string) => this.escapeHtml(ticket.values[key] || "");
    const fieldRow = (label: string, key: string) => `<tr><th>${this.escapeHtml(label)}</th><td>${valueOf(key)}</td></tr>`;

    const headerRows = template.headerFields.map((field) => fieldRow(field.label, field.key)).join("");
    const processRows = template.processFields.map((field) => fieldRow(field.label, field.key)).join("");
    const notes = this.escapeHtml(ticket.values["additionalNotes"] || "");
    const footerNotes = this.getReferenceNotesFromFees(ticket.financials?.feeBreakdown || []);
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
