import { Component, Input, OnInit } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { NgbActiveModal } from "@ng-bootstrap/ng-bootstrap";
import { SharedModule } from "@app/shared/shared.module";
import { Injectable } from "@angular/core";
import { NgbModal } from "@ng-bootstrap/ng-bootstrap";
import { FormGroup } from "@angular/forms";

@Injectable({
  providedIn: "root",
})
export class AristrocratLabelModalService {
  constructor(public modalService: NgbModal) {}

  open(data) {
    let modalRef = this.modalService.open(AristrocratLabelModalComponent, {
      size: "md",
    });
    modalRef.componentInstance.data = data;
    return modalRef;
  }
}

@Component({
  standalone: true,
  imports: [SharedModule],
  selector: "app-aristrocrat-label-modal",
  templateUrl: "./aristrocrat-label-modal.component.html",
  styleUrls: [],
})
export class AristrocratLabelModalComponent implements OnInit {
  constructor(
    public route: ActivatedRoute,
    public router: Router,
    private ngbActiveModal: NgbActiveModal
  ) {}

  form = new FormGroup<any>({});

  @Input() data: any;

  ngOnInit(): void {}

  dismiss() {
    this.ngbActiveModal.dismiss();
  }

  close() {
    this.ngbActiveModal.close();
  }

  onPrint() {
    let cmds = `
            ^XA
            ^FO250,290^GFA,16588,16588,26,gK01IF,:::::::gK01IFY03E,gK01IFY01E,gK01IFg06,gK01IFY03,gK01IFY03E,gK01IFY02,:gK01IFY03E,gK01IFY02,gK01IF,::::::gK01gIFE,:::::::::::gK01IF,:::::::gK01IFY02,gK01IFV07IFE,gK01IFT01KFE,gK01IFS01LFE,gK01IFS0MFE,gK01IFR07MFE,gK01IFQ03NFE,gK01IFQ0OFE,gK01IFP03OFE,gK01IFP0PFE,gK01IFO07PFE,gK01IFN01QFE,gK01IFN07QFE,gK01IFM01PF,gK01IFM03NFC,gK01IFM0NF8,gU03MFC,gU0NFC,gT01NFC,gT07NFC,gT0OFC,gS03LF3FFC,gS07KFC7FFC,gS0LF07FFC,gR03KFC07FFC,gR07KF007FFC,gR0KFC007FFC,gQ01KF8007FFC,gQ03JFEI07FFC,gQ0KF8I07FFC,gP01KFJ07FFC,gP03JFCJ07FFC,gP07JF8J07FFC,gP0JFEK07FFC,gO01JFCK07FFC,gO03JFL07FFC,gO07IFEL07FFC,gO0JFCL07FFC,gN01JFM07FFC,gN01IFEM07FFC,gN03IFCM07FFC,gN07IF8M07FFC,gN0JFN07FFC,gM01IFEN07FFC,gM01IFCN07FFC,gM03IF8N07FFC,gM07gGFE,gM0gHFE,:gL01gHFE,gL03gHFE,:gL07gHFE,gL0gIFE,:gK01gIFE,:gK03gIFE,,:::::::hM0IF,::hL01FFE,gR0JFP01FFE,gQ0LFO03FFE,gP07LFEN03FFE,gO01NF8M07FFC,gO07NFEM07FFC,gO0PFM0IFC,gN01PFCL0IF8,gN03PFEK01IF8,gN07QFK03IF,gN0RF8J03IF,gM01RFCJ07IF,gM03RFEJ0IFE,gM07JF8007JFEI01IFE,gM07IFCJ07JFI03IFC,gM0JFK01JF8007IF8,gM0IFEL0JF801JF8,gL01IFCL03IFC03JF,gL01IF8L01IFE0JFE,gL03IFN0IFE3JFC,gL03FFEN0OF8,gL07FFCN07NF,gL07FFCN03MFC,gL07FF8N03MF8,gL0IF8N01LFE,gL0IFO01LFC,gL0IFP0LF,gL0IFP0KFC,gK01FFEP0KF,gK01FFEP0JFC,gK01FFEP07FFE,gK01FFEP07FFC,:gK01FFCP07FFC,gK03FFCP07FFC,gK03gIFE,:::::::::::,:::::::::M07F8O07FF8001IFCU07IF,L0JFCN07FF8001IF8U03IF,K07KF8M07FF8003IF8U03IF8,J01LFEM07FF8003IFV01IF8,J07MF8L07FF8003FFEW0IFC,I01NFEL07FF8007FFEW0IFC,I03OFL07FF8007FFCW07FFC,I0PFCK07FF800IFCW07FFE,001PFEK07FF800IFCW03FFE,003QFK07FF800IF8W03FFE,007QF8J07FF800IF8W03FFE,00RFCJ07FF801IFX01IF,01RFEJ07FF801IFX01IF,:03SFJ07FF801IFX01IF,07SF8I07FF801FFEY0IF8,:0TFCI07FF803FFEY0IF8,1TFEI07FF803FFEY0IF8,::3UFI07FF803FFEY0IF8,3UFI07FF803FFEY07FF8,7UF8007FF803FFEY07FF8,7UF8007FF803FFEY0IF8,::7UFC007FF803FFEY0IF8,VFC007FF803FFEY0IF8,:VFC007FF801FFEY0IF8,VFC007FF801IFY0IF,VFC007FF801IFX01IF,::VFC007FF801IF8W03IF,VFC007FF800IF8W03FFE,:VFC007FF800IFCW07FFE,7UFC007FF8007FFCW07FFE,7UF8007FF8007FFEW0IFC,:7UF8007FF8003IFV01IF8,3UFI07FF8003IFV01IF8,3UFI07FF8001IF8U03IF8,3UFI07FF8001IFCU07IF,1TFEI07FF8I0IFCU07IF,1TFEI07FF8I0IFEU0IFE,0TFCI07FF8I07IFT01IFC,0TFCI07FF8I07IF8S03IFC,07SF8I07FF8I03IFCS07IF8,07SF8I07FF8I03IFES0JF8,03SFJ07FF8I01JFR01JF,01RFEJ07FF8J0JF8Q03IFE,00RFCJ07FF8J07IFCQ07IFE,007QFCJ07FF8J07JFP01JFC,007QF8J07FF8J03JF8O03JF8,001QFK07FF8J01JFEO0KF,I0PFCK07FF8K0KF8M03JFE,I07OF8K07FF8K07JFEM0KFC,I03OFL07FF8K03KFCK07KF8,J0NFCL07FF8K01LFEI07LF,J03MF8L07FF8L0VFE,K0LFCM07FF8L07UFC,K03KFN07FF8L01UF,L03IF8N07FF8M0TFE,gP03SFC,gP01SF,gQ07QFC,gQ01QF,gR07OFC,gR01OF,gS03MF8,gT03KF8,gV0FFE,,:::gR03FF,gP03LF,gO03NF,gN01PF,gN0QFC,gM07RF8,gL01SFE,gL07TF8,gK01UFE,gK07VF8,gK0WFC,gJ03XF,gJ07XF8,gI01MFCJ0MFE,gI03LFCL07LF,gI07KFCN0LF8,gI0KFEO01KFC,gH01KF8P07KF,gH07JFEQ01KF8,gH0KF8R07JFC,gG01JFES01JFE,gG03JFCT0KF,gG03JFU03JF,gG07IFEU01JF8,gG0JFCV0JFC,g01JFW03IFE,g03IFEW01JF,g03IFCX0JF8,g07IF8X07IF8,g0JFY03IFC,Y01IFEY01IFE,Y01IFCg0IFE,Y03IFCg07IF,Y03IF8g07IF,Y07IFgG03IF8,Y07FFEgG01IFC,Y0IFEgG01IFC,Y0IFCgH0IFC,X01IF8gH07FFE,:X03IFgI03IF,:X07FFEgI01IF8,:X07FFCgJ0IF8,X0IFCgJ0IFC,X0IF8gJ07FFC,:W01IF8gJ03FFE,W01IFgK03FFE,::W03FFEgK01IF,W03FFEJ01IFW01IF,::W03FFCJ01IFX0IF,W03FFCJ01IFX0IF8,W07FFCJ01IFX0IF8,::::W07FFCJ01IFX07FF8,:W07FF8J01IFX07FF8,::W07FFCJ01IFX07FF8,W07FFCJ01IFX0IF8,:::::W03FFCJ01IFX0IF,W03FFEJ01IFX0IF,W03FFEJ01IFW01IF,::W01FFEJ01IFW01IF,W01IFJ01IFW03FFE,::W01IF8I01IFW07FFE,X0IF8I01IFW07FFC,:X0IFCI01IFW0IFC,X07FFCI01IFW0IF8,X07FFEI01IFV01IF8,X03FFEI01IFV01IF8,X03IFI01IFV03IF,:X01IF8001IFV07FFE,X01IFC001IFV07FFE,Y0IFC001IFV0IFC,Y0IFE001IFU01IFC,Y07IF001IFU03IF8,:Y03IF801IFU07IF,Y03IFC01IFU0JF,Y01IFE01IFT01IFE,g0JF01IFT03IFC,g0JF81IFT07IFC,g07IFC1IFT0JF8,g03IFE1IFS01JF,g01IFE1IFS03IFE,g01IFE1IFS07IFE,gG0IFE1IFS0JFC,gG07FFE1IFR01JF8,gG03FFE1IFR07JF,gG01FFE1IFR0JFE,gH0FFE1IFQ03JFC,gH07FE1IFQ0KF8,gH03FE1IFP03KF,gH01FE1IFP0KFE,gI0FE1IFO03KFC,gI07E1IFN03LF8,gI01E1IF0EK01MF,gJ0E1IF0FFC00NFC,gJ061IF0SF8,gK01IF0RFE,gK01IF0RFC,gK01IF0RF,gK01IF0QFC,gK01IF0QF,gK01IF0PFC,gK01IF0PF,gK01IF0OF8,gK01IF0NFC,gK01IF0MFC,gK01IF00KFC,gK01IF,::::::::::gK01gIFE,:::::::::::gK01IF,:::::::::::::::::::,:::gM0JF,gM0IFE,gL01IFC,gL01IF8R01IF8,gL03IFS0KF,gL03IFR03KFE,gL07FFER0MF8,gL07FFCQ01MFC,gL07FFCQ07MFE,gL0IF8Q0NFE,gL0IF8P01NFE,gL0IF8P07NFE,gL0IFQ0OFE,gL0IFP01OFE,gK01IFP03OFE,gK01IFP07JFC03FFE,gK01IFP0JFEI07FE,gK01IFO01JFCI01FE,gK01IFO03JFK07E,gK01IFO07IFEK01E,gL0IFO0JFCL0E,gL0IFN01JFM06,gL0IFN03IFE,gL0IF8M0JFC,gL0IF8L01JF8,gL07FFCL03JF,gL07FFEL0JFE,gL07IFK03JFC,gL03IF8J0KF8,gL03IFEI07KF,gL01JFE0LFE,gL01RFC,gM0RF8,gM0RF,gM07PFC,gM03PF8,gM01OFE,gN0OFC,gN03NF,gN01MF8,gO07KFE,gP0KF,gQ0FFC,,::::gK01gIFE,:::::::::::gK018gG08E,,::::::hM0IF,::hL01IF,gR07FFEP01FFE,gQ0KFEO01FFE,gP03LFCN03FFE,gP0NF8M03FFC,gO03NFCM07FFC,gO0PFM0IFC,gN01PF8L0IF8,gN03PFEK01IF8,gN07QFK01IF8,gN0RF8J03IF,gM01RFCJ07IF,gM03RFEJ0IFE,gM03JF8007JFEI01IFE,gM07IFCJ0KFI03IFC,gM0JFK03JF8007IFC,gM0IFEL0JF800JF8,gL01IFCL07IFC03JF,gL01IF8L03IFC07IFE,gL03IFM01IFE3JFC,gL03FFEN0IFEKF8,gL03FFEN07NF,gL07FFCN07MFE,gL07FF8N03MF8,gL0IF8N01MF,gL0IF8N01LFC,gL0IFO01LF,gL0IFP0KFC,gK01FFEP0KF,gK01FFEP0JFC,gK01FFEP07IF,gK01FFEP07FFC,:gK01FFCP07FFC,:gK03gIFE,:::::::::::,:::::::::::X07gPFE,:X03gPFE,:X01gPFE,Y0gPFE,:Y07gOFE,Y03gOFE,Y01gOFE,:g0gOFE,g07gNFE,g03IFCS0IF,g03IFES0IF,g01JFS0IF,gG0JF8R0IF,gG07IF8R0IF,gG07IFCR0IF,gG03IFER0IF,gG01JFR0IF,gH0JF8Q0IF,gH07IFCQ0IF,gH03IFEQ0IF,gH01JFQ0IF,gH01JF8P0IF,gI0JF8P0IF,gI07IFCP0IF,gI03IFEP0IF,gI01JFP0IF,gJ0JFCO0IF,gJ07IFEO0IF,gJ03JFO0IF,gJ01JF8N0IF,gK0JFCN0IF,gK07IFEN0IF,gK03JFN0IF,gK01JFCM0IF,gL0JFEM0IF,gL07JFM0IF,gL03JFCL0IF,gL01JFEL0IF,gM0KF8K0IF,gM03JFCK0IF,gM01KFK0IF,gN0KFCJ0IF,gN07JFEJ0IF,gN03KF8I0IF,gO0KFEI0IF,gO07KF800IF,gO03KFE00IF,gP0LFC0IF,gP07LF0IF,gP01LFEIF,gQ0PF,gQ03OF,gR0OF,gR07NF,gR01NFC,gS07NFC,gS01OFC,gT07OFC,gT01PFC,gU07PFE,gU01RF,gV03RF,gW0RFE,gW01QFE,gX07PFE,gY07OFE,gY01OFE,h03NFE,hG03MFE,hH07LFE,hI07KFE,hJ07JFE,hK07IFE,hL03FFE,hM03FE,hO0E,^FS
            ^PQ1^FS
            ^XZ
            EOL
        `;

    setTimeout(() => {
      var printwindow = window.open("", "PRINT", "height=500,width=600");
      printwindow.document.write(cmds.replace(/(.{80})/g, "$1<br>"));
      printwindow.document.close();
      printwindow.focus();
      printwindow.print();
      printwindow.close();
    }, 200);
  }
}
