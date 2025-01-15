import {
  Component,
  ElementRef,
  Input,
  OnInit,
  Pipe,
  PipeTransform,
  ViewChild,
} from "@angular/core";
import { WorkOrderService } from "@app/core/api/field-service/work-order.service";
import { NgbActiveModal } from "@ng-bootstrap/ng-bootstrap";
import { SignaturePad, SignaturePadModule } from "angular2-signaturepad";
import { Injectable } from "@angular/core";
import { NgbModal } from "@ng-bootstrap/ng-bootstrap";
import { SharedModule } from "@app/shared/shared.module";
import { DomSanitizer } from "@angular/platform-browser";

@Pipe({ name: "safe", standalone: true })
export class SafePipe implements PipeTransform {
  constructor(private sanitizer: DomSanitizer) {}
  transform(url) {
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }
}

@Injectable({
  providedIn: "root",
})
export class BillingService {
  constructor(public modalService: NgbModal) {}

  open(data: any) {
    const modalRef = this.modalService.open(BillingModalComponent, {
      size: "md",
      fullscreen: true,
      centered: false,
    });
    modalRef.componentInstance.data = data;
    return modalRef;
  }
}

@Component({
  standalone: true,
  imports: [SharedModule, SignaturePadModule, SafePipe],
  selector: "app-billing-modal",
  templateUrl: "./billing-modal.component.html",
})
export class BillingModalComponent implements OnInit {
  @Input() public data: any;

  constructor(
    private ngbActiveModal: NgbActiveModal,
    private api: WorkOrderService
  ) {
    // no-op
  }

  getURLFromWord(text) {
    const regex = /<iframe.*?src=['"](.*?)['"]/;

    return regex.exec(text)[1];
    // or alternatively
    // return text.replace(urlRegex, '<a href="$1">$1</a>')
  }

  close() {}

  dismiss() {
    this.ngbActiveModal.dismiss();
  }

  url: any;

  ngOnInit(): void {
    this.url = this.getURLFromWord(this.data);
  }
}
