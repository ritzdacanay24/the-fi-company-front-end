import { Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core';
import { WorkOrderService } from '@app/core/api/field-service/work-order.service';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { SignaturePad, SignaturePadModule } from 'angular2-signaturepad';
import { Injectable } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { SharedModule } from '@app/shared/shared.module';

@Injectable({
  providedIn: 'root'
})
export class SignatureService {

  constructor(
    public modalService: NgbModal
  ) { }

  open(data: any, title: string, key: string) {
    const modalRef = this.modalService.open(SignatureComponent, { size: 'md', fullscreen: false, centered: false });
    modalRef.componentInstance.data = data;
    modalRef.componentInstance.title = title;
    modalRef.componentInstance.key = key;
    return modalRef;
  }

}

@Component({
  standalone: true,
  imports: [
    SharedModule,
    SignaturePadModule
  ],
  selector: 'app-signature',
  templateUrl: './signature.component.html',
  styleUrls: ['./signature.component.scss']
})
export class SignatureComponent implements OnInit {
  @Input() public data: any;
  @Input() public title: string;
  @Input() public key: string;

  @ViewChild(SignaturePad) signaturePad: SignaturePad;

  @ViewChild('form') formElement: ElementRef;

  @ViewChild('focus') inputElement: ElementRef;

  private signaturePadOptions: Object = {
    'minWidth': 2,
    'canvasWidth': 320,
    'canvasHeight': 250,
    'backgroundColor': '#fff'
  };


  signatureTypeDefault = {
    fontFamily: `Cedarville Cursive`,
    fontSize: '2.8em'
  }

  constructor(
    private ngbActiveModal: NgbActiveModal,
    private api: WorkOrderService,

  ) {
    // no-op
  }

  close() {
    this.updateSignature();
  }

  dismiss() {
    this.ngbActiveModal.dismiss()
  }

  signed_name

  ngOnInit(): void {
  }

  async clear() {
    this.signed_name = "";

    this.data[this.key] = "";

    try {
      await this.api.updateById(this.data.id, this.data)
      this.ngbActiveModal.close(this.data)
    } catch (err) { }

  }

  exportImage() {
    if (this.signed_name == undefined) return '';

    var canvas = (document.getElementById("canvas") as HTMLCanvasElement);
    var context: any = canvas.getContext("2d");

    // scale all drawings back up to intended size

    context.font = "2.8em " + this.signatureTypeDefault.fontFamily;


    var fontsize = 40;

    // lower the font size until the text fits the canvas
    do {
      fontsize--;
      context.font = fontsize + "px " + this.signatureTypeDefault.fontFamily;
    } while (context.measureText(this.signed_name?.trim()).width > canvas.width)

    // draw the text

    context.fillText(this.signed_name?.trim(), 1, 90, 300);

    let image = canvas.toDataURL('image/png');
    return image
  }


  async updateSignature() {

    if (this.data.active == 1) {
      this.signaturePad?.clear();
      this.signed_name = this.exportImage();
      this.data[this.key] = this.signed_name
    }

    try {
      await this.api.updateById(this.data.id, this.data)
      this.ngbActiveModal.close(this.data)
    } catch (err) { }
  }

}
