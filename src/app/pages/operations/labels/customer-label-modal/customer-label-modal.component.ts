import { Component, Input, OnInit } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { NgbActiveModal } from "@ng-bootstrap/ng-bootstrap";
import { SharedModule } from "@app/shared/shared.module";
import { Injectable } from "@angular/core";
import { NgbModal } from "@ng-bootstrap/ng-bootstrap";
import { FormControl, FormGroup } from "@angular/forms";
import { LabelService } from "@app/core/api/labels/label.service";
import { QadPartSearchComponent } from "@app/shared/components/qad-part-search/qad-part-search.component";

@Injectable({
  providedIn: "root",
})
export class CustomerLabelModalService {
  constructor(public modalService: NgbModal) {}

  open(data) {
    let modalRef = this.modalService.open(CustomerLabelModalComponent, {
      size: "md",
    });
    modalRef.componentInstance.data = data;
    return modalRef;
  }
}

@Component({
  standalone: true,
  imports: [SharedModule, QadPartSearchComponent],
  selector: "app-customer-label-modal",
  templateUrl: "./customer-label-modal.component.html",
  styleUrls: [],
})
export class CustomerLabelModalComponent implements OnInit {
  constructor(
    public route: ActivatedRoute,
    public router: Router,
    private ngbActiveModal: NgbActiveModal,
    private labelService: LabelService
  ) {}

  form = new FormGroup<any>({
    partNumber: new FormControl(""),
    customerPartNumber: new FormControl(""),
    description: new FormControl(""),
    description2: new FormControl(""),
    serialNumber: new FormControl(""),
    totalLabels: new FormControl(""),
  });

  @Input() data;

  ngOnInit(): void {}

  dismiss() {
    this.ngbActiveModal.dismiss();
  }

  close() {
    this.ngbActiveModal.close();
  }

  async getData() {
    let data = await this.labelService.getCustomerInfo(
      this.form.value.partNumber
    );
    this.form.patchValue({
      partNumber: data.pt_part,
      customerPartNumber: data.cp_cust_part,
      description: data.pt_desc1,
      description2: data.pt_desc2,
    });
  }

  notifyParent($event) {
    this.form.value.partNumber = $event.pt_part;
    this.getData();
  }

  onPrint() {
    var cmds = `
        ^XA^SZ2^MCY~TA0~JSN^MD0^LT0^MFN,C^JZY^PR4,4^PMN^JMA^LH0,0^LRN^XZ
        ^XA
        ^FO30,30^A0N,120,55^FD${this.form.value.customerPartNumber.toString().toUpperCase()}^FS
        ^FO600,35^BXN,10,200,,,,,^FD${this.form.value.customerPartNumber.toString().toUpperCase()}^FS
        ^FO30,140^A0N,60,30^FD${this.form.value.description || ""}^FS
        ^FO30,210^A0N,60,30^FD${this.form.value.description2 || ""}^FS
        ^FO30,280^A0N,60,30^FDSerial number: ${this.form.value.serialNumber}^FS
        ^FS^FO220,340^BY2,2^B3,N,60,N,N,N,A^FD${this.form.value.serialNumber}^FS
        ^PQ${this.form.value.totalLabels}^FS
        ^XZ
        ^XA^XZ
        EOL
    `;

    setTimeout(() => {
      var printwindow = window.open("", "PRINT", "height=500,width=600");
      printwindow.document.write(cmds);
      printwindow.document.close();
      printwindow.focus();
      printwindow.print();
      printwindow.close();
    }, 200);
  }
}
