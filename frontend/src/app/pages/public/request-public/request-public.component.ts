import {
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
  ViewEncapsulation,
} from "@angular/core";
import { FormGroup } from "@angular/forms";
import moment from "moment";
import { ActivatedRoute, Router } from "@angular/router";
import { Subscription } from "rxjs";
import { debounceTime } from "rxjs/operators";
import { RequestService } from "@app/core/api/field-service/request.service";
import { CommentsService } from "@app/core/api/field-service/comments.service";
import { AttachmentsService } from "@app/core/api/attachments/attachments.service";
import { FIELD_SERVICE } from "@app/pages/field-service/field-service-constant";
import { RequestFormComponent } from "@app/pages/field-service/request/request-form/request-form.component";
import { SharedModule } from "@app/shared/shared.module";
import { SweetAlert } from "@app/shared/sweet-alert/sweet-alert.service";
import { AutosizeModule } from "ngx-autosize";
import { getFormValidationErrors } from "src/assets/js/util/getFormValidationErrors";
import { RequestChangeModalService } from "@app/pages/field-service/request/request-change/request-change-modal.component";
import { ErrorReportDialogService } from "@app/core/services/error-report-dialog.service";
import { TicketPriority, TicketType } from "@app/shared/interfaces/ticket.interface";

@Component({
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [SharedModule, RequestFormComponent, AutosizeModule],
  selector: "app-request-public",
  templateUrl: "./request-public.component.html",
  styleUrls: ["./request-public.component.scss"],
})
export class RequestPublicComponent implements OnInit, OnDestroy {
  constructor(
    public activatedRoute: ActivatedRoute,
    private requestService: RequestService,
    private commentsService: CommentsService,
    private router: Router,
    private cdref: ChangeDetectorRef,
    private attachmentsService: AttachmentsService,
    private requestChangeModalService: RequestChangeModalService,
    private errorReportDialogService: ErrorReportDialogService
  ) { }

  // Form and request properties
  title = "Field Service Request Form";
  form: FormGroup;
  token = null;
  viewComment = false;
  isLoading = false;
  submitted = false;
  request_id = null;
  comments: any = [];
  jobInfo: any;
  myDatepickerOptions;
  disabled = false;
  attachments;
  data;
  inititalData: any;
  name = "";
  comment = "";
  request_change = false;
  file: File = null;
  myFiles: File[] = [];
  selectedFiles: File[] = [];
  UPLOAD_LINK = FIELD_SERVICE.UPLOAD_LINK;

  // Contact management properties - simplified to remove service requestor
  showContactCanvas = false;
  contactForm = {
    primaryContact: {
      first_name: '',
      last_name: '',
      email: '', // Maps to form field: email
      phone: '', // Maps to form field: onsite_customer_phone_number
      company: '' // For context only, not a direct form field
    },
    ccEmails: [] as string[] // Maps to form field: cc_email
  };

  recentContacts: any[] = [];
  tempEmail = '';

  // LocalStorage keys
  private readonly STORAGE_KEYS = {
    RECENT_EMAILS: 'eyefi_recent_emails',
    RECENT_CONTACTS: 'eyefi_recent_contacts',
    REQUEST_DRAFTS: 'eyefi_request_drafts_v1',
    ACTIVE_DRAFT: 'eyefi_request_active_draft_v1',
  };
  private readonly MAX_REQUEST_DRAFTS = 12;
  private readonly MAX_DRAFTS_PAYLOAD_BYTES = 750_000;

  drafts: any[] = [];
  activeDraftId: string | null = null;
  private draftAutosaveSub?: Subscription;

  ngOnInit(): void {
    this.activatedRoute.queryParams.subscribe((params) => {
      this.token = params["token"];
      this.viewComment = params["viewComment"];
    });

    this.loadRecentData();
    this.loadDrafts();

    if (this.token) this.getData();
  }

  ngOnDestroy(): void {
    this.draftAutosaveSub?.unsubscribe();
  }

  ngAfterContentChecked() {
    this.cdref.detectChanges();
  }

  async onRequestChanges() {
    this.requestChangeModalService
      .open({
        request_id: this.request_id,
        data: this.form.getRawValue(),
      })
      .result.then(
        async (result) => {
          await this.getComments();
        },
        (reason) => { }
      );
  }

  setFormEmitter($event) {
    this.form = $event;
    this.form.get("active").disable();

    if (!this.token) {
      this.initializeDraftEditingSession();
      this.setupDraftAutosave();
    }
  }

  async onSubmit() {
    this.submitted = true;

    this.form.patchValue(
      { created_date: moment().format("YYYY-MM-DD HH:mm:ss") },
      { emitEvent: false }
    );

    if (this.form.invalid) {
      getFormValidationErrors();
      return;
    }

    const activeDraft = this.ensureActiveDraft();
    this.updateDraftStatus(activeDraft.id, 'submitting');

    try {
      SweetAlert.loading("Saving. Please wait.");
      let data: any = await this.requestService.createFieldServiceRequest(
        this.form.value
      );
      this.submitted = false;
      this.form.disable();
      this.router.navigate([`request`], { queryParams: { token: data.token } });

      this.token = data.token;
      this.updateDraftAfterSubmission(activeDraft.id, {
        status: 'submitted',
        requestId: data.id,
        token: data.token,
        errorMessage: null,
      });

      if (this.myFiles) {
        const formData = new FormData();
        for (var i = 0; i < this.myFiles.length; i++) {
          formData.append("file", this.myFiles[i]);
          formData.append("field", FIELD_SERVICE.UPLOAD_FIELD_NAME);
          formData.append("uniqueData", `${data.id}`);
          formData.append("folderName", FIELD_SERVICE.UPLOAD_FOLDER_NAME);
          try {
            await this.attachmentsService.uploadfilePublic(formData);
          } catch (err) { }
        }
      }

      await this.getData();

      SweetAlert.close();

      SweetAlert.fire({
        text: `Request submitted successfully. Your request ID # is ${data.id}. `,
      });
    } catch (err) {
      this.updateDraftAfterSubmission(activeDraft.id, {
        status: 'failed',
        errorMessage: this.extractSubmissionErrorMessage(err),
      });
      SweetAlert.close(0);
    }
  }

  async getAttachments() {
    this.attachments = await this.attachmentsService.getAttachmentByRequestId(
      this.request_id,
      this.token,
    );
  }

  async getData() {
    try {
      this.isLoading = true;
      let data: any = (this.data = await this.requestService.getByToken(
        this.token
      ));
      this.request_id = data.id;
      this.jobInfo = {
        id: data?.id ?? null,
        status: String(data?.active) === '0' ? 'Cancelled' : 'Pending',
        request_date: data?.date_of_service ?? null,
        start_time: data?.start_time ?? null,
        published: data?.published ?? 0,
      };

      this.isLoading = false;

      if (data?.cc_email) {
        data.cc_email = data.cc_email.split(",");
      }

      this.form.patchValue(data);
      this.inititalData = this.form.getRawValue();
      this.form.disable();
      this.disabled = true;

      await this.getAttachments();
      await this.getComments();

      if (this.viewComment) {
        this.goToComments();
      }
    } catch (err) {
      this.isLoading = false;
    }
  }

  onDuplicate() {
    this.disabled = false;
    this.submitted = false;
    this.attachments = []
    this.comments = [];
    this.request_id = null;
    this.token = null;
    this.data = null;
    this.viewComment = false;

    if (this.inititalData) {
      delete this.inititalData.token;
      console.log(this.inititalData);
      this.form.reset(this.inititalData);
      this.form.enable();
      this.form.get("active")?.disable();
    }

    this.router.navigate([`request`], {
      queryParams: { token: null, duplicate: true, viewComment: false },
      replaceUrl: true,
    });
  }

  onCreateNew(navigate = true) {
    this.router.navigate([`request`]).then(() => {
      window.location.reload();
    });
  }

  private setupDraftAutosave() {
    this.draftAutosaveSub?.unsubscribe();

    if (!this.form) {
      return;
    }

    this.draftAutosaveSub = this.form.valueChanges
      .pipe(debounceTime(1000))
      .subscribe(() => {
        if (this.token || this.disabled) {
          return;
        }

        const draft = this.ensureActiveDraft();
        this.updateDraftAfterSubmission(draft.id, {
          formData: this.form.getRawValue(),
          status: draft.status === 'failed' ? 'failed' : 'draft',
          errorMessage: draft.status === 'failed' ? draft.errorMessage : null,
        });
      });
  }

  async openSupportTicketModal(): Promise<void> {
    await this.errorReportDialogService.open({
      type: TicketType.QUESTION,
      title: 'Public Request Portal Support',
      priority: TicketPriority.MEDIUM,
    });
  }

  private initializeDraftEditingSession() {
    if (!this.drafts.length) {
      this.activeDraftId = null;
      localStorage.removeItem(this.STORAGE_KEYS.ACTIVE_DRAFT);
      return;
    }

    const rememberedDraftId = localStorage.getItem(this.STORAGE_KEYS.ACTIVE_DRAFT);
    const rememberedDraft = this.drafts.find((draft) => draft.id === rememberedDraftId);

    if (rememberedDraft && rememberedDraft.status !== 'submitted') {
      this.resumeDraft(rememberedDraft.id);
      return;
    }

    const latestOpenDraft = [...this.drafts]
      .sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''))
      .find((draft) => draft.status !== 'submitted');

    if (latestOpenDraft) {
      this.resumeDraft(latestOpenDraft.id);
      return;
    }

    this.activeDraftId = null;
    localStorage.removeItem(this.STORAGE_KEYS.ACTIVE_DRAFT);
  }

  private loadDrafts() {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEYS.REQUEST_DRAFTS);
      this.drafts = raw ? JSON.parse(raw) : [];
    } catch (error) {
      this.drafts = [];
    }
  }

  private persistDrafts() {
    try {
      const boundedDrafts = this.buildBoundedDraftsSnapshot();
      localStorage.setItem(this.STORAGE_KEYS.REQUEST_DRAFTS, JSON.stringify(boundedDrafts));
      this.drafts = boundedDrafts;
    } catch (error) {
      console.error('Error persisting request drafts:', error);
    }
  }

  private buildBoundedDraftsSnapshot() {
    const sorted = [...this.drafts].sort((a, b) =>
      String(b?.updatedAt || '').localeCompare(String(a?.updatedAt || '')),
    );

    let bounded = sorted.slice(0, this.MAX_REQUEST_DRAFTS);
    if (this.activeDraftId && !bounded.some((draft) => draft.id === this.activeDraftId)) {
      const active = sorted.find((draft) => draft.id === this.activeDraftId);
      if (active) {
        bounded = [active, ...bounded.slice(0, this.MAX_REQUEST_DRAFTS - 1)];
      }
    }

    while (bounded.length > 1) {
      const bytes = this.estimateJsonBytes(bounded);
      if (bytes <= this.MAX_DRAFTS_PAYLOAD_BYTES) {
        break;
      }

      const removableIndex = bounded.findIndex((draft) => draft.id !== this.activeDraftId);
      if (removableIndex < 0) {
        break;
      }
      bounded.splice(removableIndex, 1);
    }

    return bounded;
  }

  private estimateJsonBytes(value: unknown): number {
    return new Blob([JSON.stringify(value)]).size;
  }

  private ensureActiveDraft() {
    const existing = this.drafts.find((draft) => draft.id === this.activeDraftId);
    if (existing) {
      return existing;
    }

    return this.createFreshDraft();
  }

  createFreshDraft(resetForm = false) {
    if (resetForm && this.form) {
      this.form.reset({}, { emitEvent: false });
      this.form.enable({ emitEvent: false });
      this.form.get('active')?.disable({ emitEvent: false });
      this.disabled = false;
      this.submitted = false;
      this.request_id = null;
      this.token = null;
      this.data = null;
      this.attachments = [];
      this.comments = [];
      this.selectedFiles = [];
      this.myFiles = [];
    }

    const now = new Date().toISOString();
    const draft = {
      id: `draft_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      title: this.buildDraftTitle(),
      status: 'draft',
      updatedAt: now,
      requestId: null,
      token: null,
      errorMessage: null,
      formData: this.form ? this.form.getRawValue() : {},
    };

    this.drafts.unshift(draft);
    this.activeDraftId = draft.id;
    localStorage.setItem(this.STORAGE_KEYS.ACTIVE_DRAFT, draft.id);
    this.persistDrafts();

    return draft;
  }

  startNewDraft() {
    this.createFreshDraft(true);
  }

  resumeDraft(draftId: string) {
    const draft = this.drafts.find((row) => row.id === draftId);
    if (!draft || !this.form) {
      return;
    }

    this.activeDraftId = draft.id;
    localStorage.setItem(this.STORAGE_KEYS.ACTIVE_DRAFT, draft.id);
    this.form.patchValue(draft.formData || {}, { emitEvent: false });
  }

  deleteDraft(draftId: string) {
    this.drafts = this.drafts.filter((draft) => draft.id !== draftId);

    if (this.activeDraftId === draftId) {
      this.activeDraftId = null;
      localStorage.removeItem(this.STORAGE_KEYS.ACTIVE_DRAFT);
      if (this.form) {
        this.form.reset();
      }
      this.createFreshDraft();
    }

    this.persistDrafts();
  }

  retryDraftSubmission(draftId: string) {
    this.resumeDraft(draftId);
    this.onSubmit();
  }

  private updateDraftStatus(draftId: string, status: 'draft' | 'submitting' | 'submitted' | 'failed') {
    const draft = this.drafts.find((row) => row.id === draftId);
    if (!draft) {
      return;
    }

    draft.status = status;
    draft.updatedAt = new Date().toISOString();
    draft.title = this.buildDraftTitle();
    draft.formData = this.form?.getRawValue() || draft.formData;
    this.persistDrafts();
  }

  private updateDraftAfterSubmission(
    draftId: string,
    payload: {
      status?: 'draft' | 'submitting' | 'submitted' | 'failed';
      requestId?: number | null;
      token?: string | null;
      errorMessage?: string | null;
      formData?: any;
    },
  ) {
    const draft = this.drafts.find((row) => row.id === draftId);
    if (!draft) {
      return;
    }

    draft.status = payload.status ?? draft.status;
    draft.requestId = payload.requestId ?? draft.requestId;
    draft.token = payload.token ?? draft.token;
    draft.errorMessage = payload.errorMessage ?? draft.errorMessage;
    draft.formData = payload.formData ?? this.form?.getRawValue() ?? draft.formData;
    draft.updatedAt = new Date().toISOString();
    draft.title = this.buildDraftTitle();
    this.persistDrafts();
  }

  getDraftStatusClass(status: string) {
    if (status === 'submitted') {
      return 'bg-success';
    }

    if (status === 'failed') {
      return 'bg-danger';
    }

    if (status === 'submitting') {
      return 'bg-warning text-dark';
    }

    return 'bg-secondary';
  }

  private buildDraftTitle() {
    const requestedBy = String(this.form?.get('requested_by')?.value || '').trim();
    const customer = String(this.form?.get('customer')?.value || '').trim();
    const nowText = moment().format('MMM DD, YYYY HH:mm');

    if (requestedBy && customer) {
      return `${customer} - ${requestedBy}`;
    }

    if (customer) {
      return `${customer} draft`;
    }

    if (requestedBy) {
      return `${requestedBy} draft`;
    }

    return `New draft ${nowText}`;
  }

  private extractSubmissionErrorMessage(error: any): string {
    return (
      error?.error?.message ||
      error?.message ||
      'Submission failed due to a backend or network error'
    );
  }

  async getComments() {
    if (this.token && this.request_id) {
      this.comments = await this.requestService.getPublicComments(this.request_id, this.token);
    } else {
      this.comments = await this.commentsService.getByRequestId(this.request_id);
    }
  }

  async onSubmitComment() {
    if (this.name == "" || this.comment == "") {
      alert("All comment fields required");
      return;
    }

    SweetAlert.loading("Saving. Please wait.");
    try {
      if (this.token && this.request_id) {
        await this.requestService.onRequestChanges({
          fs_request_id: this.request_id,
          token: this.token,
          name: this.name,
          comment: this.comment,
          request_change: this.request_change,
        });
      } else {
        await this.commentsService.createComment(
          this.form.value.token,
          this.form.value.email,
          {
            name: this.name,
            comment: this.comment,
            request_change: this.request_change,
            fs_request_id: this.request_id,
            created_date: moment().format("YYYY-MM-DD HH:mm:ss"),
          }
        );
      }
      this.comment = "";
      this.request_change = false;
      this.getComments();
      SweetAlert.close();
    } catch (err) {
      SweetAlert.close(0);
    }
  }

  goToComments() {
    setTimeout(() => {
      const element = document.getElementById("mydiv1");
      if (element) {
        element.scrollIntoView();
      }
    }, 0);
  }

  onFilechange(event: any) {
    const files = event.target.files;
    if (files && files.length > 0) {
      this.selectedFiles = Array.from(files);
      this.myFiles = this.selectedFiles;
    }
  }

  removeFile(index: number) {
    this.selectedFiles.splice(index, 1);
    this.myFiles = this.selectedFiles;
    if (this.selectedFiles.length === 0) {
      const fileInput = document.getElementById('file') as HTMLInputElement;
      if (fileInput) {
        fileInput.value = '';
      }
    }
  }

  async onUploadAttachments() {
    if (this.myFiles) {
      let totalAttachments = 0;
      this.isLoading = true;
      for (let i = 0; i < this.myFiles.length; i++) {
        try {
          if (this.token && this.request_id) {
            await this.attachmentsService.uploadRequestAttachmentPublic(
              this.request_id,
              this.token,
              this.myFiles[i],
            );
          } else {
            const formData = new FormData();
            formData.append("file", this.myFiles[i]);
            formData.append("field", FIELD_SERVICE.UPLOAD_FIELD_NAME);
            formData.append("uniqueData", `${this.request_id}`);
            formData.append("folderName", FIELD_SERVICE.UPLOAD_FOLDER_NAME);
            await this.attachmentsService.uploadfile(formData);
          }
          totalAttachments++;
        } catch (err) { }
      }
      this.isLoading = false;
      await this.getAttachments();
    }
  }

  // Contact Management Methods
  loadRecentData() {
    try {
      const savedContacts = localStorage.getItem(this.STORAGE_KEYS.RECENT_CONTACTS);
      if (savedContacts) {
        this.recentContacts = JSON.parse(savedContacts);
      }
    } catch (error) {
      console.error('Error loading recent data:', error);
    }
  }

  saveRecentContacts() {
    try {
      const boundedContacts = Array.isArray(this.recentContacts)
        ? this.recentContacts.slice(0, 25)
        : [];
      localStorage.setItem(this.STORAGE_KEYS.RECENT_CONTACTS, JSON.stringify(boundedContacts));
      this.recentContacts = boundedContacts;
    } catch (error) {
      console.error('Error saving recent contacts:', error);
    }
  }

  openContactCanvas() {
    this.loadContactFormFromMainForm();
    this.showContactCanvas = true;
  }

  closeContactCanvas() {
    this.showContactCanvas = false;
  }

  loadContactFormFromMainForm() {
    if (this.form) {
      // Load primary contact from main form fields only
      const emailValue = this.form.get('email')?.value || '';
      const phoneValue = this.form.get('onsite_customer_phone_number')?.value || '';
      const onsiteNameValue = this.form.get('onsite_customer_name')?.value || '';

      // Split onsite name if it contains space (assuming first/last name)
      const nameParts = onsiteNameValue.split(' ');

      this.contactForm.primaryContact = {
        first_name: nameParts[0] || '',
        last_name: nameParts.slice(1).join(' ') || '',
        email: emailValue,
        phone: phoneValue,
        company: '' // Not directly mapped to form
      };

      // Load CC emails from form
      this.contactForm.ccEmails = this.form.get('cc_email')?.value || [];
    }
  }

  applyContactsToMainForm() {
    if (this.form) {
      const fullName = `${this.contactForm.primaryContact.first_name} ${this.contactForm.primaryContact.last_name}`.trim();

      // Apply primary contact to form fields - including auto-filling service requestor
      this.form.patchValue({
        email: this.contactForm.primaryContact.email,
        requested_by: fullName, // Auto-fill service requestor with primary contact name
        onsite_customer_name: fullName,
        onsite_customer_phone_number: this.contactForm.primaryContact.phone
      });

      // Apply CC emails to form
      this.form.get('cc_email')?.setValue(this.contactForm.ccEmails);

      // Save to config - only primary contact data
      this.saveContactToRecent({
        first_name: this.contactForm.primaryContact.first_name,
        last_name: this.contactForm.primaryContact.last_name,
        email: this.contactForm.primaryContact.email,
        phone: this.contactForm.primaryContact.phone,
        company: this.contactForm.primaryContact.company
      }, 'Primary Contact');

      // Save CC emails to config
      this.contactForm.ccEmails.forEach(email => {
        this.saveContactToRecent({
          first_name: email.split('@')[0],
          last_name: '',
          email: email,
          phone: '',
          company: ''
        }, 'CC Recipient');
      });

      // Apply contact data to form component as well
      this.applyContactDataToForm();
    }

    this.closeContactCanvas();
  }

  refreshFormEmailList() {
    // Trigger refresh of email list in form component
    setTimeout(() => {
      const formComponent = document.querySelector('app-request-form');
      if (formComponent && (formComponent as any).refreshEmailList) {
        (formComponent as any).refreshEmailList();
      }
    }, 100);
  }

  // New method to apply contact data to form component
  applyContactDataToForm() {
    const contactData = {
      primaryContact: this.contactForm.primaryContact,
      ccEmails: this.contactForm.ccEmails
    };

    // Call the form component's apply method
    setTimeout(() => {
      const formComponent = document.querySelector('app-request-form');
      if (formComponent && (formComponent as any).applyContactData) {
        (formComponent as any).applyContactData(contactData);
      }
    }, 100);
  }

  saveContactToRecent(contact: any, type: string) {
    // Only save if there's meaningful data that corresponds to form fields
    if (!contact.email && !contact.first_name && !contact.last_name) {
      return;
    }

    try {
      const existingIndex = this.recentContacts.findIndex(c =>
        c.email && contact.email && c.email.toLowerCase() === contact.email.toLowerCase()
      );

      // Only save fields that are relevant to the form
      const contactData = {
        first_name: contact.first_name || '', // Used for requested_by, onsite_customer_name
        last_name: contact.last_name || '', // Used for requested_by, onsite_customer_name
        email: contact.email || '', // Used for email, cc_email
        phone: contact.phone || '', // Used for onsite_customer_phone_number
        company: contact.company || '', // Context only
        type: type,
        lastUsed: new Date().toISOString(),
        fullName: `${contact.first_name || ''} ${contact.last_name || ''}`.trim() || contact.email
      };

      if (existingIndex > -1) {
        this.recentContacts[existingIndex] = contactData;
      } else {
        this.recentContacts.unshift(contactData);
      }

      this.recentContacts = this.recentContacts.slice(0, 20);
      this.saveRecentContacts();
    } catch (error) {
      console.error('Error saving contact to recent:', error);
    }
  }


  customerOptions = [
    { name: "AGS", code: "test" },
    { name: "Ainsworth", code: "" },
    { name: "ATI", code: "ATI" },
    { name: "Bally", code: "" },
    { name: "Bellagio", code: "" },
    { name: "Casino", code: "" },
    { name: "EpicTech", code: "" },
    { name: "Everi", code: "EVIGAM" },
    { name: "IGT", code: "INTGAM" },
    { name: "Konami", code: "KONGAM" },
    { name: "L&W", code: "" },
    { name: "Synergy Blue", code: "" },
    { name: "Other", code: "" },
  ]

  currentCompanySelection = null;

  getCompanyChange() {
    let currentValue = this.form.value.customer;
    for (let i = 0; i < this.customerOptions.length; i++) {
      if (this.customerOptions[i].name == currentValue) {
        this.currentCompanySelection = this.customerOptions[i].code;
      }
    }
  }


  loadRecentContact(contact: any, targetType: 'primary') {
    this.contactForm.primaryContact = {
      first_name: contact.first_name,
      last_name: contact.last_name,
      email: contact.email,
      phone: contact.phone,
      company: contact.company
    };
  }

  addEmailToCC() {
    if (this.tempEmail && this.isValidEmail(this.tempEmail)) {
      if (!this.contactForm.ccEmails.includes(this.tempEmail)) {
        this.contactForm.ccEmails.push(this.tempEmail);
      }
      this.tempEmail = '';
    }
  }

  removeEmailFromCC(email: string) {
    this.contactForm.ccEmails = this.contactForm.ccEmails.filter(e => e !== email);
  }

  addContactEmailToCC(contact: any) {
    if (contact.email && !this.contactForm.ccEmails.includes(contact.email)) {
      this.contactForm.ccEmails.push(contact.email);
    }
  }

  clearContactForm(type: 'primary') {
    this.contactForm.primaryContact = {
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      company: ''
    };
  }

  removeRecentContact(index: number) {
    this.recentContacts.splice(index, 1);
    this.saveRecentContacts();
  }

  isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  isContactValid(contact: any): boolean {
    return contact.first_name && contact.email && this.isValidEmail(contact.email);
  }
}
