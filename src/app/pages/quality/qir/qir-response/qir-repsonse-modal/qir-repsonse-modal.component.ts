import { Component, Input, OnInit } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { FormGroup } from "@angular/forms";
import { NgbActiveModal } from "@ng-bootstrap/ng-bootstrap";
import { SharedModule } from "@app/shared/shared.module";

import { Injectable } from "@angular/core";
import { NgbModal } from "@ng-bootstrap/ng-bootstrap";
import { QirResponseFormComponent } from "../qir-response-form/qir-response-form.component";
import { QirResponseService } from "@app/core/api/quality/qir-response.service";
import { AuthenticationService } from "@app/core/services/auth.service";
import moment from "moment";

@Injectable({
  providedIn: "root",
})
export class QirResponseModalService {
  constructor(public modalService: NgbModal) {}

  open(id) {
    let modalRef = this.modalService.open(QirResponseModalComponent, {
      size: "lg",
    });
    modalRef.componentInstance.id = id;
    return modalRef;
  }
}

@Component({
  standalone: true,
  imports: [SharedModule, QirResponseFormComponent],
  selector: "app-qir-response-modal",
  templateUrl: "./qir-repsonse-modal.component.html",
  styleUrls: [],
})
export class QirResponseModalComponent implements OnInit {
  constructor(
    public route: ActivatedRoute,
    public router: Router,
    private ngbActiveModal: NgbActiveModal,
    private api: QirResponseService,
    private authenticationService: AuthenticationService
  ) {}

  ngOnInit(): void {}

  setFormElements = ($event) => {
    this.form = $event;
    this.form.patchValue({ qir_number: this.id });
    if (this.id) {
      this.getData();
    }
  };

  @Input() id = null;

  title = "Job Modal";

  icon = "mdi-calendar-text";

  form: FormGroup;

  dismiss() {
    this.ngbActiveModal.dismiss();
  }

  close() {
    this.ngbActiveModal.close();
  }

  submitted = false;

  qir_response_id;

  async getData() {
    try {
      let data: any = await this.api.findOne({ qir_number: this.id });
      this.qir_response_id = data.id;
      if (!data) {
        this.form.patchValue({
          created_date: moment().format("YYYY-MM-DD HH:mm:ss"),
        });
      } else {
        this.form.patchValue(data);
      }
    } catch (err) {}
  }

  async onSubmit() {
    if (this.qir_response_id) {
      this.update();
    } else {
      this.create();
    }
  }

  async update() {
    try {
      await this.api.update(this.qir_response_id, this.form.value);
      this.close();
    } catch (err) {}
  }
  async create() {
    try {
      await this.api.create(this.form.value);
      this.close();
    } catch (err) {}
  }

  onPrint() {
    const formData = this.form.value;
    const printWindow = window.open("", "_blank");

    const printContent = `
      <html>
        <head>
          <title>QIR Response Form - ${formData.qir_number}</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              margin: 20px; 
              line-height: 1.6;
            }
            .header { 
              text-align: center; 
              border-bottom: 2px solid #333; 
              padding-bottom: 10px; 
              margin-bottom: 20px; 
            }
            .field-group { 
              margin-bottom: 15px; 
              page-break-inside: avoid;
            }
            .field-label { 
              font-weight: bold; 
              color: #333; 
              margin-bottom: 5px;
            }
            .field-value { 
              border: 1px solid #ccc; 
              padding: 8px; 
              min-height: 20px; 
              background-color: #f9f9f9;
              white-space: pre-wrap;
            }
            .two-column {
              display: flex;
              gap: 20px;
            }
            .two-column .field-group {
              flex: 1;
            }
            .large-field .field-value {
              min-height: 80px;
            }
            @media print {
              body { margin: 0; }
              .header { page-break-after: avoid; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>The Fi Company QIR Response Form</h2>
            <h4>(Internal and External Containment)</h4>
          </div>
          
          <div class="two-column">
            <div class="field-group">
              <div class="field-label">QIR Number:</div>
              <div class="field-value">${formData.qir_number || ""}</div>
            </div>
            <div class="field-group">
              <div class="field-label">Customer QIR Number:</div>
              <div class="field-value">${formData.customer_qir_number || ""}</div>
            </div>
          </div>
          
          <div class="field-group large-field">
            <div class="field-label">Findings:</div>
            <div class="field-value">${formData.findings || ""}</div>
          </div>
          
          <div class="field-group large-field">
            <div class="field-label">Document Control Response:</div>
            <div class="field-value">${formData.document_control_response || ""}</div>
          </div>
          
          <div class="field-group large-field">
            <div class="field-label">FS Engineering Response:</div>
            <div class="field-value">${formData.fs_engineering_reponse || ""}</div>
          </div>
          
          <div class="two-column">
            <div class="field-group">
              <div class="field-label">Preliminary Investigation Date:</div>
              <div class="field-value">${formData.preliminary_investigation || ""}</div>
            </div>
            <div class="field-group">
              <div class="field-label">Quality Team:</div>
              <div class="field-value">${formData.quality_team || ""}</div>
            </div>
          </div>
          
          <div class="two-column">
            <div class="field-group">
              <div class="field-label">Closure Date:</div>
              <div class="field-value">${formData.closure_date || ""}</div>
            </div>
            <div class="field-group">
              <div class="field-label">Closure By:</div>
              <div class="field-value">${formData.closure_by || ""}</div>
            </div>
          </div>
          
          <div class="field-group">
            <div class="field-label">Created Date:</div>
            <div class="field-value">${formData.created_date || ""}</div>
          </div>
          
          <script>
            window.onload = function() {
              window.print();
              window.onafterprint = function() {
                window.close();
              }
              // Fallback for browsers that don't support onafterprint
              setTimeout(function() {
                window.close();
              }, 1000);
            }
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
  }
}
