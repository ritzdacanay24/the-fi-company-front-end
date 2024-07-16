import { Injectable } from "@angular/core";
import { NgbActiveModal, NgbModal } from "@ng-bootstrap/ng-bootstrap";
import { Component, OnInit } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import moment from "moment";
import { TripExpenseTransactionsService } from "src/app/core/api/field-service/trip-expense-transactions";
import { SharedModule } from "src/app/shared/shared.module";
import { SweetAlert } from "src/app/shared/sweet-alert/sweet-alert.service";

@Injectable({
  providedIn: "root",
})
export class CreditCardModalService {
  constructor(public modalService: NgbModal) {}

  open() {
    let modalRef = this.modalService.open(CreditCardModalComponent, {
      size: "md",
      fullscreen: false,
    });
    return modalRef;
  }
}

@Component({
  standalone: true,
  imports: [SharedModule],
  selector: "app-credit-card-modal",
  templateUrl: `./credit-card-transaction-modal.component.html`,
  styleUrls: ["credit-card-transaction-modal.component.scss"],
})
export class CreditCardModalComponent implements OnInit {
  currentUrl: string;

  monthAndYear = moment().format("YYYY-MM");

  constructor(
    public route: ActivatedRoute,
    public router: Router,
    public activeModal: NgbActiveModal,
    public tripExpenseTransactionsService: TripExpenseTransactionsService
  ) {}

  onMonthAndYear() {}

  file;

  selectFile(event) {
    this.file = event.target.files;
  }

  async onSubmit() {
    if (!this.file || !this.monthAndYear) {
      alert("All fields are required");
      return;
    }
    try {
      SweetAlert.loading("Uploading..Please wait");
      await this.tripExpenseTransactionsService.uploadCreditCardTransactions(
        this.file[0],
        moment(this.monthAndYear).format("MMMM-YYYY")
      );
      SweetAlert.close();
      this.activeModal.close("Save click");
    } catch (err) {
      alert("Something went wrong.");
      SweetAlert.close(0);
    }
  }

  ngOnInit(): void {}
}
