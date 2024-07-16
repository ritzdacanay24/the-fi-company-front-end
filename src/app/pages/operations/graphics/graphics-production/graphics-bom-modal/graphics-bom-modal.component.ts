import { Component, Input, OnInit } from "@angular/core";
import { GraphicsService } from "@app/core/api/operations/graphics/graphics.service";
import { SharedModule } from "@app/shared/shared.module";
import { NgbActiveModal } from "@ng-bootstrap/ng-bootstrap";

import { Injectable } from "@angular/core";
import { NgbModal } from "@ng-bootstrap/ng-bootstrap";
import { NgxBarcode6Module } from "ngx-barcode6";
import moment from "moment";

@Injectable({
  providedIn: "root",
})
export class GraphicsBomModalService {
  modalRef: any;

  constructor(public modalService: NgbModal) {}

  open(graphicsWoNumber) {
    this.modalRef = this.modalService.open(GraphicsBomModalComponent, {
      size: "lg",
      centered: true,
      scrollable: true,
    });
    this.modalRef.componentInstance.graphicsWoNumber = graphicsWoNumber;
    return this.modalRef;
  }
}

export class QueueValueParams {
  queueStatus: any;
  status: any;
}

@Component({
  standalone: true,
  imports: [SharedModule, NgxBarcode6Module],
  selector: "app-graphics-bom-modal",
  templateUrl: "./graphics-bom-modal.component.html",
  styleUrls: ["./graphics-bom-modal.component.scss"],
})
export class GraphicsBomModalComponent implements OnInit {
  @Input() public graphicsWoNumber: number;
  data: any;
  printDate = "";

  constructor(
    private activeModal: NgbActiveModal,
    private api: GraphicsService
  ) {}

  ngOnInit(): void {
    this.getData();
  }

  dismiss() {
    this.activeModal.dismiss();
  }

  close() {
    this.activeModal.close(this.data);
  }

  isLoading = false;

  getData = async () => {
    try {
      this.isLoading = true;
      this.data = await this.api.getWorkOrderNumber(this.graphicsWoNumber);
      this.isLoading = false;
    } catch (err) {
      this.isLoading = false;
    }
  };

  print() {
    this.printDate = moment().format("YYYY-MM-DD HH:mm:ss");

    setTimeout(() => {
      var printContents = document.getElementById(
        "yellowFishWorkOrder"
      ).innerHTML;
      var popupWin = window.open("", "_blank", "width=1000,height=600");
      popupWin.document.open();
      popupWin.document.write(`
      <html>
        <head>
          <title>Graphics BOM Information</title>
          <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css">
          <style>          
            @page {
              size: portrait;
            }
            @media print { 
              .page-break { 
                display:block; 
                page-break-before:always; 
              } 
              .col-lg-1 {width:8%;}
              .col-lg-2 {width:16%}
              .col-lg-3 {width:25%}
              .col-lg-4 {width:33%}
              .col-lg-5 {width:42%}
              .col-lg-6 {width:50%;}
              .col-lg-7 {width:58%}
              .col-lg-8 {width:66%}
              .col-lg-9 {width:75%}
              .col-lg-10{width:83%}
              .col-lg-11{width:92%}
              .col-lg-12{width:100%}
              img{
                max-width:100px;
                max-height:100px;
                border:none !important
              }
              .hr-sect1 {
                border:none;
                border-top:2px dotted black;
                color:black;
                background-color:#fff;
                height:2px;
                width:100%;
                margin-bottom:20px
              }
              .hr-sect {
                display: flex !important;
                flex-basis: 100% !important;
                align-items: center !important;
                color:black !important;
                margin: 10px 0px !important;
                font-size:20px !important;
              }
              .hr-sect::before,
              .hr-sect::after {
                content: "";
                flex-grow: 1;
                background: rgba(0, 0, 0, 0.35);
                height: 1px;
                font-size: 20px;
                line-height: 0px;
                margin: 0px 8px;
                border:1px solid;
              }
              .col-8 {
                font-size:13px;
                margin-bottom: 0 !important;
              }
              .col-4 {
                font-weight:bolder;
                font-size:13px;
                margin-bottom: 0 !important;
              }
            }
          </style>
        </head>
        <body onload="window.print();window.close()">
          ${printContents}
        </body>
      </html>`);
      popupWin.document.close();

      popupWin.onfocus = function () {
        setTimeout(function () {
          popupWin.focus();
          popupWin.document.close();
        }, 300);
      };
    }, 200);
  }
}
