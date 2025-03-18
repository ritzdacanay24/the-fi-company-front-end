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
export class SNULAssetModalService {
  constructor(public modalService: NgbModal) { }

  open(data) {
    let modalRef = this.modalService.open(SNULAssetModalComponent, {
      size: "md",
    });
    modalRef.componentInstance.data = data;
    return modalRef;
  }
}

@Component({
  standalone: true,
  imports: [SharedModule],
  selector: "app-sn-ul-asset-modal.component-modal",
  templateUrl: "./sn-ul-asset-modal.component.html",
  styleUrls: [],
})
export class SNULAssetModalComponent implements OnInit {
  constructor(
    public route: ActivatedRoute,
    public router: Router,
    private ngbActiveModal: NgbActiveModal,
    private labelService: LabelService,
    private toastrService: ToastrService
  ) { }

  form = new FormGroup<any>({
    serial_number: new FormControl(""),
    ul_number: new FormControl(""),
    asset_number: new FormControl(""),
    totalLabels: new FormControl(1),
  });

  @Input() data: any;

  ngOnInit(): void {
    if (this.data) {
      this.form.patchValue(this.data)
    }
  }

  dismiss() {
    this.ngbActiveModal.dismiss();
  }

  close() {
    this.ngbActiveModal.close();
  }

  notifyParent($event) {
    this.form.value.partNumber = $event.pt_part;
  }

  onPrint() {
    let row = this.form.value;
    var cmds = `
            ^XA^SZ2^MCY~TA0~JSN^MD0^LT0^MFN,C^JZY^PR4,4^PMN^JMA^LH0,0^LRN^XZ
            ^XA
            ^FO10,25^A0N,35,40^FDSN:${row.serial_number}^FS
            ^FO10,65^A0N,35,40^FDUL: ${row.ul_number}^FS
            ^FO10,105^A0N,35,40^FDASSET: ${row.asset_number}^FS
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
