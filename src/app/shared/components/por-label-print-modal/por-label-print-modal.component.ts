import { Component, Input } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import moment from 'moment';
import { Injectable } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { AuthenticationService } from '@app/core/services/auth.service';
import { SharedModule } from '@app/shared/shared.module';

@Injectable({
  providedIn: 'root'
})
export class PorLabelPrintModalService {
  modalRef: any;

  constructor(
    public modalService: NgbModal
  ) { }

  open(customerPartNumber: string, poNumber: string, partNumber: string, desc: string, desc1: string) {
    this.modalRef = this.modalService.open(PorLabelPrintModalComponent, { size: 'md' });
    this.modalRef.componentInstance.customerPartNumber = customerPartNumber;
    this.modalRef.componentInstance.partNumber = partNumber;
    this.modalRef.componentInstance.poNumber = poNumber;
    this.modalRef.componentInstance.desc = desc;
    this.modalRef.componentInstance.desc1 = desc1;
    this.getInstance();
  }

  getInstance() {
    return this.modalRef;
  }

}

@Component({
  standalone: true,
  imports: [SharedModule],
  selector: 'app-por-label-print-modal',
  templateUrl: './por-label-print-modal.component.html',
})

export class PorLabelPrintModalComponent {
  monthYear: string;
  time: string;

  constructor(
    private ngbActiveModal: NgbActiveModal,
    private authenticationService: AuthenticationService
  ) { }

  @Input() public poNumber: string = '';
  @Input() public customerPartNumber: string = '';
  @Input() public partNumber: string = '';
  @Input() public desc: string = '';
  @Input() public desc1: string = '';

  data: any;
  isLoading = false;

  ngOnInit() {
    this.monthYear = moment().format('MM/DD/YYYY');
    this.time = moment().format('HH:mm');
  }

  dismiss() {
    this.ngbActiveModal.dismiss('dismiss');
  }

  close() {
    this.ngbActiveModal.close(this.data);
  }

  totalLabels = 1;
  qtyPerLabel = 1;

  print() {

    setTimeout(() => {

      var printwindow = window.open('', 'PRINT', 'height=500,width=600');
      var cmds;

      let rev = 'N/A';
      let po = 'N/A';
      let receiver = ': N/A';
      let um = 'EA';

      cmds =
        `
          ^XA^SZ2^MCY~TA0~JSN^MD0^LT0^MFN,C^JZY^PR4,4^PMN^JMA^LH0,0^LRN^XZ
          ^XA
          ^FO530,0^GB0,1218,2^FS
          ^FO251,0^GB0,1218,2^FS
          ^FO252,684^GB279,0,2^FS
          ^FT766,25^CI0^A0R,20,28^FDPart No.^FS
          ^FT560,38^A0R,262,105^FD${this.partNumber}^FS
          ^FO555,965^BXR,14,200,,,,,^FD${this.partNumber}^FS
          ^FT505,25^A0R,20,28^FDQty^FS
          ^FT275,38^A0R,262,105^FD${this.qtyPerLabel}^FS
          ^FO280,430^BXR,18,200,,,,,^FD${this.qtyPerLabel}^FS
          ^FT448,330^A0R,45,62^FD${um}^FS
          ^FT485,710^A0R,40,40^FDSupplier Rev:^FS
          ^FT485,950^A0R,40,40^FD${rev}^FS
          ^FT435,710^A0R,40,40^FDPO #:^FS
          ^FT435,850^A0R,40,40^FD${po}^FS
          ^FT385,710^A0R,40,40^FDReceiver ^FS
          ^FT385,850^A0R,40,40^FD${receiver}^FS
          ^FT335,710^A0R,40,40^FDReprinted By:^FS
          ^FT335,950^A0R,40,40^FD${this.authenticationService.currentUserValue.full_name}^FS
          ^FT285,710^A0R,40,40^FD${this.time}   ${this.monthYear}^FS
          ^FT130,50^A0R,113,93^FD${this.desc}^FS
          ^FT30,50^A0R,113,93^FD${this.desc1}^FS
          ^PQ${this.totalLabels}^FS
          ^XZ
          ^XA^XZ
          EOL
      `;

      cmds = cmds.replace(/(.{90})/g, '$1<br>');
      printwindow.document.write(cmds);

      printwindow.document.close(); // necessary for IE >= 10
      printwindow.focus(); // necessary for IE >= 10
      printwindow.print();
      printwindow.close();

    }, 500);
  }

}
