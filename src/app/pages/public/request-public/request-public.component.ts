import {
  ChangeDetectorRef,
  Component,
  OnInit,
  ViewEncapsulation,
} from "@angular/core";
import { FormGroup } from "@angular/forms";
import moment from "moment";
import { ActivatedRoute, Router } from "@angular/router";
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

@Component({
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [SharedModule, RequestFormComponent, AutosizeModule],
  selector: "app-request-public",
  templateUrl: "./request-public.component.html",
  styleUrls: ["./request-public.component.scss"],
})
export class RequestPublicComponent implements OnInit {
  constructor(
    public activatedRoute: ActivatedRoute,
    private requestService: RequestService,
    private commentsService: CommentsService,
    private router: Router,
    private cdref: ChangeDetectorRef,
    private attachmentsService: AttachmentsService,
    private requestChangeModalService: RequestChangeModalService
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
    RECENT_CONTACTS: 'eyefi_recent_contacts'
  };

  ngOnInit(): void {
    this.activatedRoute.queryParams.subscribe((params) => {
      this.token = params["token"];
      this.viewComment = params["viewComment"];
    });

    this.loadRecentData();

    if (this.token) this.getData();
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

    try {
      SweetAlert.loading("Saving. Please wait.");
      let data: any = await this.requestService.createFieldServiceRequest(
        this.form.value
      );
      this.submitted = false;
      this.form.disable();
      this.router.navigate([`request`], { queryParams: { token: data.token } });

      this.token = data.token;

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
      alert("Sorry. Something went wrong.");
      SweetAlert.close(0);
    }
  }

  async getAttachments() {
    this.attachments = await this.attachmentsService.getAttachmentByRequestId(
      this.request_id
    );
  }

  async getData() {
    try {
      this.isLoading = true;
      let data: any = (this.data = await this.requestService.getByToken(
        this.token
      ));
      this.request_id = data.id;
      this.comments = await this.commentsService.getByRequestId(
        this.request_id
      );
      this.jobInfo = await this.requestService.getjobByRequestId(
        this.request_id
      );

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

  async getComments() {
    this.comments = await this.commentsService.getByRequestId(this.request_id);
  }

  async onSubmitComment() {
    if (this.name == "" || this.comment == "") {
      alert("All comment fields required");
      return;
    }

    SweetAlert.loading("Saving. Please wait.");
    try {
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
      this.comment = "";
      this.request_change = false;
      this.getComments();
      SweetAlert.close();
    } catch (err) {
      alert(`Something went wrong. Please contact administrator`);
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
      const formData = new FormData();
      for (var i = 0; i < this.myFiles.length; i++) {
        formData.append("file", this.myFiles[i]);
        formData.append("field", FIELD_SERVICE.UPLOAD_FIELD_NAME);
        formData.append("uniqueData", `${this.request_id}`);
        formData.append("folderName", FIELD_SERVICE.UPLOAD_FOLDER_NAME);
        try {
          await this.attachmentsService.uploadfile(formData);
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
      localStorage.setItem(this.STORAGE_KEYS.RECENT_CONTACTS, JSON.stringify(this.recentContacts));
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
