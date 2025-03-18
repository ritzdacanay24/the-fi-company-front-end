import { Component, Input, OnInit } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { NgbActiveModal } from "@ng-bootstrap/ng-bootstrap";
import { SharedModule } from "@app/shared/shared.module";
import { Injectable } from "@angular/core";
import { NgbModal } from "@ng-bootstrap/ng-bootstrap";
import { FormControl, FormGroup } from "@angular/forms";
import { LabelService } from "@app/core/api/labels/label.service";
import { ToastrService } from "ngx-toastr";
import { time_now } from "src/assets/js/util/time-now";
import moment from "moment";
import { AuthenticationService } from "@app/core/services/auth.service";

@Injectable({
  providedIn: "root",
})
export class ContinuityModalService {
  constructor(public modalService: NgbModal) { }

  open(data) {
    let modalRef = this.modalService.open(ContinuityModalComponent, {
      size: "md",
    });
    modalRef.componentInstance.data = data;
    return modalRef;
  }
}

@Component({
  standalone: true,
  imports: [SharedModule],
  selector: "app-continuity-test-modal",
  templateUrl: "./continuity-test-modal.component.html",
  styleUrls: [],
})
export class ContinuityModalComponent implements OnInit {
  constructor(
    public route: ActivatedRoute,
    public router: Router,
    private ngbActiveModal: NgbActiveModal,
    private labelService: LabelService,
    private toastrService: ToastrService,
    private authenticationService: AuthenticationService
  ) {
    console.log(this.authenticationService)
  }

  form = new FormGroup<any>({
    inspection: new FormControl("PASSED"),
    tester_name: new FormControl(this.authenticationService.currentUserValue.first_name),
    date: new FormControl(time_now('YYYY-MM-DD')),
    totalLabels: new FormControl(),
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
^XA
^FO20,20^A0N,30,28^FDGround Continuity Test - ${row.inspection}^FS
^FO20,65^A0N,33,28^FDTester: ${row.tester_name}^FS
^FO20,110^A0N,33,28^FDDate: ${moment(row.date).format('MM/DD/YYYY')}^FS
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
