import { Component, Input, OnInit } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { NgbActiveModal } from "@ng-bootstrap/ng-bootstrap";
import { SharedModule } from "@app/shared/shared.module";
import { Injectable } from "@angular/core";
import { NgbModal } from "@ng-bootstrap/ng-bootstrap";
import { FormControl, FormGroup } from "@angular/forms";
import { LabelService } from "@app/core/api/labels/label.service";
import { QadPartSearchComponent } from "@app/shared/components/qad-part-search/qad-part-search.component";

@Injectable({
  providedIn: "root",
})
export class LocationLabelModalService {
  constructor(public modalService: NgbModal) {}

  open(data) {
    let modalRef = this.modalService.open(LocationLabelModalComponent, {
      size: "md",
    });
    modalRef.componentInstance.data = data;
    return modalRef;
  }
}

@Component({
  standalone: true,
  imports: [SharedModule, QadPartSearchComponent],
  selector: "app-location-label-modal",
  templateUrl: "./location-label-modal.component.html",
  styleUrls: [],
})
export class LocationLabelModalComponent implements OnInit {
  constructor(
    public route: ActivatedRoute,
    public router: Router,
    private ngbActiveModal: NgbActiveModal,
    private labelService: LabelService
  ) {}

  form = new FormGroup<any>({
    start_location: new FormControl(""),
    end_location: new FormControl(""),
    arrowDirection: new FormControl(""),
  });

  @Input() data: any;

  ngOnInit(): void {}

  dismiss() {
    this.ngbActiveModal.dismiss();
  }

  close() {
    this.ngbActiveModal.close();
  }

  async onPrint() {
    let res = await this.labelService.getLocationByRange(
      this.form.value.start_location,
      this.form.value.end_location
    );

    let e = `
^XA
^FO5,20^GFA,15444,15444,36,,::::::::gT038,gT03C,gT07E,gT0FF,gS01FF8,gS03FFC,gS07FFE,gS0JF
,gR01JF8,gR03JFC,gR07JFE,gR0LF,gQ01LF8,gQ03LFC,gQ07LFE,gQ0NF,gP01NF8,gP03NFC,gP07NFE
,gP0PF,gO01PF8,gO03PFC,gO07PFE,gO0QFE,gN01RF,gN01RF8,gN03RFC,gN07RFE,gN0TF,gM01TF8
,gM03TFC,gM07TFE,gM0VF,gL01VF8,gL03VFC,gL07VFE,gL0XF,gK01XF8,gK03XFC,gK07XFE,gK0gF
,gJ01gF8,gJ03gFC,gJ07gFE,gJ0gHF,gI01gHF8,gI03gHF8,gI07gHFC,gI0gIFE,gH01gJF,gH01gJF8
,gH03gJFC,gH07gJFE,gH0gLF,gG01gLF8,gG03gLFC,gG07gLFE,gG0gNF,g01gNF8,g03gNFC,g07gNFE
,g0gPF,Y01gPF8,Y03gPFC,Y07gPFE,Y0gRF,X01gRF8,X03gRFC,X07gRFE,X0gSFE,W01gTF,W03gTF8
,W03gTFC,W07gTFE,W0gVF,V01gVF8,V03gVFC,V07gVFE,V0gXF,U01gXF8,U03gXFC,U07gXFE,U0hF
,T01hF8,T03hFC,T07hFE,T0hHF,S01hHF8,S03hHFC,S07hHFE,S0hJF,R01hJF8,R03hJF8,R03hJFC
,R07hJFE,R0hLF,Q01hLF8,Q03hLFC,Q07hLFE,Q0hNF,P01hNF8,P03hNFC,P07hNFE,P0hPF,O01hPF8
,O03hPFC,O07hPFE,O0hRF,N01hRF8,N03hRFC,N07hRFE,N0hTF,M01hTF8,M03XFE7TFE7XFC
,M07VFC007TFE003VFE,M0UF8J07TFEJ01UF,L01SF8L07TFEL01SF,L03QFCN07TFEN03QF8
,L03OF8P07TFEP01OFC,L07MFS07TFES0MFE,L0LFU07TFEU0LF,K01JFW07TFEW0JF8
,K03FFY07TFEY0FFC,K07gG07TFEgG0C,gM07TFE,::::::::::::::::::::::::::::::::::::::::::::::
::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
:::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::gM07TFC,,::::::::::
^FS
^FX
`;
    if (!res[1]) {
      e = `
^XA
^FO20,20^GFA,13696,13696,32,,:::::::::gH01VFE,:::::::::::::::::::::::::::
::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
::::::::::::::::::::::::::::::gH03WF,03hYF,:01hXFE,00hXFC,:007hWF8,:003hWF,
:001hVFE,I0hVFC,:I07hUF8,:I03hUF,I01hTFE,:J0hTFC,:J07hSF8,:J03hSF,J01hRFE,
:K0hRFC,:K07hQF8,K03hQF,:K01hPFE,:L0hPFC,:L07hOF8,L03hOF,:L01hNFE,:M0hNFC,
M07hMF8,:M03hMF,:M01hLFE,:N0hLFC,N07hKF8,:N03hKF,:N01hJFE,:O0hJFC,O07hIF8,
:O03hIF,:O01hHFE,P0hHFC,:P07hGF8,:P03hGF,:P01hFE,Q0hFC,:Q07gYF8,:Q03gYF,
Q01gXFE,:R0gXFC,:R07gWF8,:R03gWF,R01gVFE,:S0gVFC,:S07gUF8,S03gUF,:S01gTFE
,:T0gTFC,:T07gSF8,T03gSF,:T01gRFE,:U0gRFC,U07gQF8,:U03gQF,:U01gPFE,:V0gPFC
,V07gOF8,:V03gOF,:V01gNFE,W0gNFC,:W07gMF8,:W03gMF,W03gLFE,W01gLFE,X0gLFC
,:X07gKF8,:X03gKF,X01gJFE,:Y0gJFC,:Y07gIF8,:Y03gIF,Y01gHFE,:g0gHFC,:g07gGF8
,g03gGF,:g01gFE,:gG0gFC,:gG07YF8,gG03YF,:gG01XFE,:gH0XFC,:gH07WF8,gH03WF
,:gH01VFE,:gI0VFC,gI07UF8,:gI03UF,:gI01TFE,:gJ0TFC,gJ07SF8,:gJ03SF,:gJ01RFE
,gK0RFC,:gK07QF8,:gK03QF,gK01PFE,:gL0PFC,:gL07OF8,:gL03OF,gL01NFE,:gM0NFC
,:gM07MF8,gM03MF,:gM01LFE,:gN0LFC,:gN07KF8,gN03KF,:gN01JFE,:gO0JFC,gO07IF8
,:gO03IF,:gO01FFE,:gP0FFC,gP07F8,:gP03F,:gP01E,gQ0C,:,::::::^FS
^FX
`;
    }
    for (let i = 0; i < res?.length; i++) {
      let cmds = `
${e}
^FWN
^FO280,20^A0,280,140^FD${res[i].loc_loc.toUpperCase()}^FS
^FS^FO295,260^BY4,2^B3,N,180,N,N,N,A^FD${res[i].loc_loc.toUpperCase()}^FS
^XZ
`;

      var printwindow = window.open("", "PRINT", "height=500,width=600");
      printwindow.document.write(cmds);
      printwindow.document.close();
      printwindow.focus();
      printwindow.print();
      printwindow.close();
    }
  }
}
