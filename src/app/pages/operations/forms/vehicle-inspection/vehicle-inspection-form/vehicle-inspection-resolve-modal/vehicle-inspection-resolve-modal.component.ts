import { Injectable, Input } from "@angular/core";
import { NgbActiveModal, NgbModal } from "@ng-bootstrap/ng-bootstrap";
import { Component, OnInit } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import moment from "moment";
import { TripExpenseTransactionsService } from "@app/core/api/field-service/trip-expense-transactions";
import { SharedModule } from "@app/shared/shared.module";
import { SweetAlert } from "@app/shared/sweet-alert/sweet-alert.service";
import { VehicleInspectionService } from "@app/core/api/operations/vehicle-inspection/vehicle-inspection.service";

@Injectable({
  providedIn: "root",
})
export class VehicleInspectionResolveModalService {
  constructor(public modalService: NgbModal) {}

  open(data) {
    let modalRef = this.modalService.open(
      VehicleInspectionResolveModalComponent,
      { size: "lg", fullscreen: false }
    );
    modalRef.componentInstance.data = data;
    return modalRef;
  }
}

@Component({
  standalone: true,
  imports: [SharedModule],
  selector: "app-credit-card-modal",
  templateUrl: `./vehicle-inspection-resolve-modal.component.html`,
})
export class VehicleInspectionResolveModalComponent implements OnInit {
  @Input() data: any;

  monthAndYear = moment().format("YYYY-MM");

  formData = {
    resolved_by: "",
    resolved_by_date: "",
    resolved_by_notes: "",
    resolved_confirmed_by: "",
    resolved_confirmed_date: "",
    resolved_confirmed_notes: "",
  };

  constructor(
    public route: ActivatedRoute,
    public router: Router,
    public activeModal: NgbActiveModal,
    public tripExpenseTransactionsService: TripExpenseTransactionsService,
    public vehicleInspectionService: VehicleInspectionService
  ) {
  }

  onMonthAndYear() {}

  file;

  selectFile(event) {
    this.file = event.target.files;
  }

  async onSubmit() {
    try {
      SweetAlert.loading("Uploading..Please wait");
      await this.vehicleInspectionService.saveDetailById(
        this.data.id,
        this.formData
      );
      SweetAlert.close();
      this.activeModal.close("Save click");
    } catch (err) {
      alert("Something went wrong.");
      SweetAlert.close(0);
    }
  }

  async getDetaliById() {
    try {
      this.formData = await this.vehicleInspectionService.getDetaliById(
        this.data.id
      );
    } catch (err) {}
  }

  ngOnInit(): void {
    console.log(this.data)
    if (this.data?.id) {
      this.getDetaliById();
    }}
}
