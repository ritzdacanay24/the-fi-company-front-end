import { Injectable } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';

import { Component, Input } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import moment from 'moment';
import { AuthenticationService } from '@app/core/services/auth.service';
import { SharedModule } from '@app/shared/shared.module';
import { PlacardService } from '@app/core/api/operations/placard/placard.service';
import { SweetAlert } from '@app/shared/sweet-alert/sweet-alert.service';

@Injectable({
    providedIn: 'root'
})
export class FgLabelPrintModalService {
    modalRef: any;

    constructor(
        public modalService: NgbModal
    ) { }

    open(customerPartNumber: string, poNumber: string, partNumber: string, description?: string, description1?: string, row?: any) {
        this.modalRef = this.modalService.open(FgLabelPrintModalComponent, { size: 'lg', fullscreen: false, backdrop: 'static', scrollable: true, centered: true, keyboard: false });
        this.modalRef.componentInstance.customerPartNumber = customerPartNumber;
        this.modalRef.componentInstance.poNumber = poNumber;
        this.modalRef.componentInstance.partNumber = partNumber;
        this.modalRef.componentInstance.description = description;
        this.modalRef.componentInstance.description1 = description1;
        this.modalRef.componentInstance.row = row;
        this.getInstance();
    }

    getInstance() {
        return this.modalRef;
    }

}

@Component({
    standalone: true,
    imports: [SharedModule],
    selector: 'app-fg-label-print-modal',
    templateUrl: './fg-label-print-modal.component.html',
    styleUrls: []
})

export class FgLabelPrintModalComponent {
    monthYear: string;
    eyefiSerialTag: any;
    customerCo: any;
    customerAssetTagNumber: any;
    woNumber: any;
    palletCount: any;

    constructor(
        private ngbActiveModal: NgbActiveModal,
        private authenticationService: AuthenticationService,
        private placardService: PlacardService
    ) { }

    @Input() public poNumber: string = '';
    @Input() public customerPartNumber: string = '';
    @Input() public partNumber: string = '';
    @Input() public description: string = '';
    @Input() public description1: string = '';
    @Input() public row: any;

    isLoading = false;
    totalLabels = 1;
    qtyPerLabel = 1;

    ngOnInit() {
        this.monthYear = moment().format('MM/DD/YYYY');
        this.totalLabels = 1;
        this.qtyPerLabel = 1;

        this.getData();
    }

    async getData() {
        try {
            this.isLoading = true;
            let data: any = await this.placardService.getPlacardBySoSearch(this.row.SOD_NBR, this.row.SOD_PART, this.row.SOD_LINE);
            this.customerCo = data.MISC;
            this.isLoading = false;
        } catch (err) {
            this.isLoading = false;
        }
    }

    serialNumber: string;
    async getSerialNumberInfo() {
        try {
            SweetAlert.loading('Searching... Please wait')
            let data: any = await this.placardService.searchSerialNumber(this.customerAssetTagNumber);
            this.eyefiSerialTag = data?.serialNumber || null

            if (!data) {
                alert('Unable to find serial tag.')
            }

            SweetAlert.close()
        } catch (err) {
            SweetAlert.close()
        }
    }


    dismiss() {
        this.ngbActiveModal.dismiss('dismiss');
    }

    close() {
        this.ngbActiveModal.close();
    }


    print() {

        setTimeout(() => {

            var printwindow = window.open('', 'PRINT', 'height=500,width=600');
            var cmds;

            let lcmds = '^FO40,20^GFA,5586,5586,42,,::::::::::gO01FC,gO07FE,gN07FFE,gM01IFE,gM07IFE,gM0JFE,gL03JFE,gL07JFE,gL0KFE,gK01KFE,gK03KFE,gK07KFE,gK0LFE,:gJ01LFE,gJ03LFE,gJ03LF8,gJ07KFC,gJ0KFCI03F8,gJ0KF8I0FFE,gJ0KFI01IF,gI01JFEI03IF8,gI01JFCI07IF8,gI03JF8I0JFC,gI03JFJ0JFC,:gI03IFEJ0JFC,::gI07IFEJ0JFC,gI07IFCJ0JFC,gI07IFCJ07IFC,gI07IFCJ03IF8,gI07IFCJ03IF,gI07IFCK0FFE,gI07IFCK07FC,gI07IFC,:::gH01JFEU0CJ03,003FF801C07801FF8J0UFEK07F8001FEI03803800FF8I0EI01C07003C07,003FF801C07801FF8J0UFEJ01FFC003FF8003C07800FFC001FI01E07001E0E,I07C001C03801EL0UFEJ03E1C00787C003C0F800E3E001FI01F07001E1E,I038001C03801EL0UFEJ038J0F01C003E1F800E0E001F8001F07I0E1C,I038001C03801CL0UFEJ07K0E00E003F1F800E0E003F8001F87I07B8,I038001E07801EL0UFEJ07J01C00E003FBF800E0E003B8001FC7I07F8,I038001IF800FF8J0UFEJ0FJ01C00E003BFF800E0E0071C001FE7I03F,I038001IF800FFK0UFEJ07J01C00E0031F3800FFC0071C001CEFI01F,I038001F0F801FL0UFEJ07J01C00E0030E3800FFC0071E001C7FI01E,I038001E07801EL0UFEJ07K0E00E0030C3800FFI0FBE001C7FI01E,I038001C03801CL0UFEJ038J0F01C003003800EJ0FFE001C3FI01E,I038001C03801EL0UFEJ03C0800783C003003800EI01IF001C1FI01E,I038001C03800FF8J0UFEJ01FFC007FF8003003800EI01E0F001C0FI01E,I018I0C03800FF8J0UFEK0FF8001FFI03003I0CI01C03001807J0C,N0803I0FFK079KFBFFE7IFEK03EJ07CT01001P04,gI0JFCJ03IFE,gI07IFCJ03IFE,:::::::::::::::::::::::gI07IFCJ03IFC,::::gI07IFCJ03IF8,gI07IFCJ03IF,gI07IFCJ03FFE,gI07IFCJ03FFC,:gI07IFCJ03FF,gI07IFCJ03FE,gI07IFCJ03F8,gI07IFCJ018,gI07IFC,::::::::::::gI07IF8,,::::::::::::^FS'
            lcmds = lcmds.replace(/(.{40})/g, '$1<br>');

            cmds =
                `
        ^XA
        ${lcmds}
        ^FX
        ^FWN
        ^CF0,35
        ^FO550,60^FD ${this.monthYear}^FS
        ^FO50,180^FDCust Part #: ${this.row.CP_CUST_PART}^FS
        ^FO50,220^FDCust Asset Tag #: ${this.customerAssetTagNumber}^FS
        ^FO50,260^FDWO #: ${this.woNumber}^FS
        ^FO50,300^FDPallet Count: ${this.palletCount}^FS
        ^FO50,340^FDEyeFi Serial Tag #: ${this.eyefiSerialTag}^FS
        ^FO50,380^FDCustomer CO#/POR#/SO#:${this.customerCo}^FS

        ^CF0,40
        ^FO50,430^FDPO #:${this.poNumber}^FS
        ^FO50,480 ^BY2,10,80 ^BC,80,N,N,N,N
        ^FD${this.poNumber}^FS

        ^FO50,580^FDPN:^FS
        ^FO50,620^FD${this.customerPartNumber || this.partNumber}^FS
        ^FO50,670^FD${this.description}^FS
        ^FO50,720^FD${this.description1}^FS
        ^FO50,770 ^BY2,10,80 ^BC,80,N,N,N,N
        ^FD${this.customerPartNumber || this.partNumber}^FS
        ^FO50,890^FDQty:^FS
        ^FO50,940^FD${this.qtyPerLabel}^FS
        ^FO50,9600 ^BY2,10,80 ^BC,80,N,N,N,N
        ^FD${this.qtyPerLabel}^FS
        ^CF0,90
        ^CF0,30
        ^FO50,1170^FD${this.authenticationService.currentUserValue.full_name} ^FS
        ^PQ${this.totalLabels}^FS
        ^XZ
      `;

            printwindow.document.write(cmds);
            printwindow.document.close(); // necessary for IE >= 10
            printwindow.focus(); // necessary for IE >= 10
            printwindow.print();
            printwindow.close();

        }, 500);
    }

}
