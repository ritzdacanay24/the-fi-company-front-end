import { Component, Input, OnInit } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { NgbActiveModal } from "@ng-bootstrap/ng-bootstrap";
import { SharedModule } from "@app/shared/shared.module";
import { Injectable } from "@angular/core";
import { NgbModal } from "@ng-bootstrap/ng-bootstrap";
import { FormControl, FormGroup } from "@angular/forms";
import { LabelService } from "@app/core/api/labels/label.service";
import { ToastrService } from "ngx-toastr";

@Injectable({
  providedIn: "root",
})
export class PartAndSNModalService {
  constructor(public modalService: NgbModal) { }

  open(data) {
    let modalRef = this.modalService.open(PartAndSNModalComponent, {
      size: "md",
    });
    modalRef.componentInstance.data = data;
    return modalRef;
  }
}

@Component({
  standalone: true,
  imports: [SharedModule],
  selector: "app-part-and-sn-modal",
  templateUrl: "./part-and-sn-modal.component.html",
  styleUrls: [],
})
export class PartAndSNModalComponent implements OnInit {
  constructor(
    public route: ActivatedRoute,
    public router: Router,
    private ngbActiveModal: NgbActiveModal,
    private labelService: LabelService,
    private toastrService: ToastrService
  ) { }

  form = new FormGroup<any>({
    part_number: new FormControl(""),
    serial_number: new FormControl(""),
    totalLabels: new FormControl(1),
  });

  @Input() data: any;

  ngOnInit(): void { }

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
            ^XA^SZ2^MCY~TA0~JSN^MD0^LT0^MFN,C^JZY^PR4,4^PMN^JMA^LH0,0^LRN^XZ
            ^XA
            ^FO30,40^A0N,40,50^FD${row.part_number.toString().toUpperCase()}^FS
            ^FO120,90^A0N,35,40^FDSN: ${row.serial_number}^FS
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
      this.toastrService.success("Printed successfully")
    }, 200);
  }
}
