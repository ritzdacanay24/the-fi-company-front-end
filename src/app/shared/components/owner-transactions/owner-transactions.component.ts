import { Component, EventEmitter, Input, OnInit, Output } from "@angular/core";
import { first } from "rxjs/operators";
import { Injectable } from "@angular/core";
import { NgbModal } from "@ng-bootstrap/ng-bootstrap";
import { ShippingService } from "@app/core/api/operations/shipping/shipping.service";
import { SharedModule } from "@app/shared/shared.module";

@Injectable({
  providedIn: "root",
})
export class OwnerTransactionsService {
  modalRef: any;

  constructor(public modalService: NgbModal) {}

  open(soNumberAndLineNumber) {
    this.modalRef = this.modalService.open(OwnerTransactionsComponent, {
      size: "lg",
    });
    this.modalRef.componentInstance.soNumberAndLineNumber =
      soNumberAndLineNumber;
    this.modalRef.componentInstance.passEntry.subscribe((receivedEntry: any) =>
      this.modalRef.close()
    );
  }
}

@Component({
  standalone: true,
  imports: [SharedModule],
  selector: "app-owner-transactions",
  templateUrl: "./owner-transactions.component.html",
  styleUrls: [],
})
export class OwnerTransactionsComponent implements OnInit {
  data: any;
  isLoading: boolean = false;
  @Input() public soNumberAndLineNumber: string = "";
  @Output() passEntry: EventEmitter<any> = new EventEmitter();

  constructor(private api: ShippingService) {}

  ngOnInit(): void {
    if (this.soNumberAndLineNumber) this.getData(this.soNumberAndLineNumber);
  }

  getData(soNumberAndLineNumber) {
    this.isLoading = true;
    this.api
      .getMisc(soNumberAndLineNumber)
      .pipe(first())
      .subscribe(
        (data) => {
          this.isLoading = false;
          this.data = data;
        },
        () => (this.isLoading = false)
      );
  }

  close() {
    this.passEntry.emit("close");
  }
}
