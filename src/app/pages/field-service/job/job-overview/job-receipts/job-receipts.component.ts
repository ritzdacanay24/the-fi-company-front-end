import { Component, Input, OnInit, SimpleChanges } from "@angular/core";
import { UploadedReceiptComponent } from "@app/pages/field-service/ticket/ticket-overview/receipts/receipt-list/receipt-list.component";
import { SharedModule } from "@app/shared/shared.module";

@Component({
  standalone: true,
  imports: [SharedModule, UploadedReceiptComponent],
  selector: "app-job-receipts",
  templateUrl: "./job-receipts.component.html",
  styleUrls: [],
})
export class JobReceiptsComponent implements OnInit {
  constructor() {}

  ngOnInit(): void {}

  title = "Job Receipts";

  @Input() fsId = null;
  @Input() workOrderId = null;
  ngOnChanges(changes: SimpleChanges) {
    if (changes["id"]) {
      this.fsId = changes["id"].currentValue;
    }
    if (changes["workOrderId"]) {
      this.workOrderId = changes["workOrderId"].currentValue;
    }
  }
}
