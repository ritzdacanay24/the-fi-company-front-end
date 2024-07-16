import { Injectable } from "@angular/core";
import { NgbModal } from "@ng-bootstrap/ng-bootstrap";

@Injectable({
  providedIn: "root",
})
export class LateReasonCodeModalService {
  constructor(public modalService: NgbModal) {}

  open(key: any, miscData: any, soLineNumber: any, department = "") {
    let modalRef = this.modalService.open(LateReasonCodeModalComponent, {
      size: "md",
      fullscreen: false,
      backdrop: "static",
      scrollable: true,
      centered: true,
      keyboard: false,
    });
    modalRef.componentInstance.key = key;
    modalRef.componentInstance.miscData = miscData;
    modalRef.componentInstance.soLineNumber = soLineNumber;
    modalRef.componentInstance.department = department;
    return modalRef;
  }
}

import { ChangeDetectorRef, Component, Input, OnInit } from "@angular/core";
import { NgbActiveModal } from "@ng-bootstrap/ng-bootstrap";
import { first } from "rxjs/operators";
import { SharedModule } from "@app/shared/shared.module";
import { ShippingService } from "@app/core/api/operations/shipping/shipping.service";
import { LateReasonCodesService } from "@app/core/api/operations/late-reason-codes/late-reason-codes.service";
import { AuthenticationService } from "@app/core/services/auth.service";

@Component({
  standalone: true,
  imports: [SharedModule],
  selector: "app-late-reason-code-modal",
  templateUrl: "./late-reason-code-modal.component.html",
  styleUrls: [],
})
export class LateReasonCodeModalComponent implements OnInit {
  @Input() public miscData: any;
  @Input() public soLineNumber: any;
  @Input() public key: string;
  @Input() public department: string = "";

  selectedDate: any;
  selectedDateView: any;
  recoveryDate: any;
  isLoading: boolean = false;
  newItem: any;
  currentUserInfo: any;
  lateReasonCode: any;

  ngAfterViewChecked() {
    this.cdRef.detectChanges();
  }

  constructor(
    private ngbActiveModal: NgbActiveModal,
    private cdRef: ChangeDetectorRef,
    private api: LateReasonCodesService,
    private shippingService: ShippingService,
    private authenticationService: AuthenticationService
  ) {
    this.currentUserInfo = authenticationService.currentUserValue;
  }

  isAuthorized() {
    return true;
    //return this.authenticationService?.currentUserValue?.workArea.includes(Access.EditLastReasonCode);
  }

  ngOnInit(): void {
    this.getData();
  }

  dismiss() {
    this.ngbActiveModal.dismiss();
  }

  addNew() {
    this.isLoading = true;
    this.api
      .save({ newItem: this.newItem, department: this.department })
      .pipe(first())
      .subscribe(
        (res) => {
          this.data.unshift({
            id: res,
            active: 1,
            name: this.newItem,
          });
          this.isLoading = false;
        },
        () => (this.isLoading = false)
      );
  }

  remove(id: any) {
    if (!confirm("Are you sure?")) {
      return;
    }
    this.isLoading = true;
    this.api
      .remove({ id })
      .pipe(first())
      .subscribe(
        (res) => {
          this.data = this.data.filter((el: { id: any }) => el.id != id);

          this.isLoading = false;
        },
        () => (this.isLoading = false)
      );
  }

  clear() {
    this.miscData[this.key] = "";
    this.update();
  }

  close() {}

  data: any;
  getData() {
    this.miscData.shippingMisc = true;
    this.isLoading = true;
    this.api
      .getData(this.department)
      .pipe(first())
      .subscribe(
        (data) => {
          this.data = data;
          this.lateReasonCode = this.miscData[this.key];
          this.isLoading = false;
        },
        () => (this.isLoading = false)
      );
  }

  save() {
    this.miscData[this.key] = this.lateReasonCode;
    this.miscData.so = this.miscData.so ? this.miscData.so : this.soLineNumber;
    this.update();
  }

  update() {
    this.miscData.shippingMisc = true;
    this.isLoading = true;
    this.shippingService
      .saveMisc({ ...this.miscData, department: this.department })
      .pipe(first())
      .subscribe(
        (res) => {
          this.ngbActiveModal.close(this.miscData);
        },
        () => (this.isLoading = false)
      );
  }
}
