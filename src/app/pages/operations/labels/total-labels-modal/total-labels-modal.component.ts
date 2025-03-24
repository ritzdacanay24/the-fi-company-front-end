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
export class TotalLabelsModalService {
  constructor(public modalService: NgbModal) { }

  open(data) {
    let modalRef = this.modalService.open(TotalLabelsModalComponent, {
      size: "md",
    });
    modalRef.componentInstance.data = data;
    return modalRef;
  }
}

@Component({
  standalone: true,
  imports: [SharedModule],
  selector: "app-total-labels",
  templateUrl: "./total-labels-modal.component.html",
  styleUrls: [],
})
export class TotalLabelsModalComponent implements OnInit {
  constructor(
    public route: ActivatedRoute,
    public router: Router,
    private ngbActiveModal: NgbActiveModal,
    private labelService: LabelService,
    private toastrService: ToastrService
  ) { }

  form = new FormGroup<any>({
    start_number: new FormControl(""),
    total_labels: new FormControl(''),
    uom: new FormControl('Pallets'),
  });

  @Input() data: any;

  ngOnInit(): void { }

  dismiss() {
    this.ngbActiveModal.dismiss();
  }

  close() {
    this.ngbActiveModal.close();
  }

  onPrint() {
    let row = this.form.value;

    let cmds = '';
    for (let i = 0; i < row.total_labels; i++) {
      row.start_number = Number(row.start_number);

      cmds += `
        ^XA
        ^FWR
        ^FO340,180^A0,400, 170^FD ${row.start_number < 10 ? `0${row.start_number}` : row.start_number} ^FS
        ^FO340,470^A0,400, 180^FD of ^FS
        ^FO340,710^A0,400, 180^FD ${row.total_labels < 10 ? `0${row.total_labels}` : row.total_labels} ^FS
        ${row.uom == 'Pallets' ? '^FO0,300^A0,400, 180^FD Pallets ^FS' : '^FO0,320^A0,400, 180^FD Boxes ^FS'}
        ^XZ
    `;
      row.start_number++
    }

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
