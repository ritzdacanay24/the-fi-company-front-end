import { Component, Input, OnInit } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { NgbActiveModal } from "@ng-bootstrap/ng-bootstrap";
import { SharedModule } from "@app/shared/shared.module";
import { Injectable } from "@angular/core";
import { NgbModal } from "@ng-bootstrap/ng-bootstrap";
import { FormControl, FormGroup } from "@angular/forms";
import { LabelService } from "@app/core/api/labels/label.service";
import { QadPartSearchComponent } from "@app/shared/components/qad-part-search/qad-part-search.component";
import moment from "moment";

@Injectable({
  providedIn: "root",
})
export class PartInformationLabelLgModalService {
  constructor(public modalService: NgbModal) {}

  open(data) {
    let modalRef = this.modalService.open(
      PartInformationLabelLgModalComponent,
      { size: "md" }
    );
    modalRef.componentInstance.data = data;
    return modalRef;
  }
}

@Component({
  standalone: true,
  imports: [SharedModule, QadPartSearchComponent],
  selector: "app-part-information-label-lg-modal",
  templateUrl: "./part-information-label-lg-modal.component.html",
  styleUrls: [],
})
export class PartInformationLabelLgModalComponent implements OnInit {
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
    qty: new FormControl(""),
    totalLabels: new FormControl(""),
  });

  @Input() data: any;

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
    let row = this.form.value;

    var cmds = `
            ^XA
            ^FWR
            ^BY5,2,270
            ^FO580,990^BXN,8,200,,,,,^FD${String(row.partNumber)?.toUpperCase()}^FS
            ^FO605,50^A0,80,80^FD${String(row.partNumber)?.toUpperCase()}^FS
            ^FO505,50^A0,70,70^FD${row.description || ""}^FS
            ^FO405,50^A0,70,70^FD${row.description2 || ""}^FS
            ^FO305,50^A0,70,70^FDQty: ${row.qty}^FS
            ^FO205,50^A0,70,70^FDDate: ${moment().format("MM/DD/YYYY")}^FS
            ^PQ${row.totalLabels}^FS
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
