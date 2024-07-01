import { Component, Input, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { SharedModule } from '@app/shared/shared.module';
import { Injectable } from "@angular/core";
import { NgbModal } from "@ng-bootstrap/ng-bootstrap";
import { FormControl, FormGroup } from '@angular/forms';
import { QadPartSearchComponent } from '@app/shared/components/qad-part-search/qad-part-search.component';

@Injectable({
    providedIn: 'root'
})
export class AgsLabelModalService {

    constructor(
        public modalService: NgbModal
    ) { }

    open(data) {
        let modalRef = this.modalService.open(AgsLabelModalComponent, { size: 'md' });
        modalRef.componentInstance.data = data;
        return modalRef;
    }
}

@Component({
    standalone: true,
    imports: [SharedModule, QadPartSearchComponent],
    selector: 'app-ags-label-modal',
    templateUrl: './ags-label-modal.component.html',
    styleUrls: []
})

export class AgsLabelModalComponent implements OnInit {

    constructor(
        public route: ActivatedRoute,
        public router: Router,
        private ngbActiveModal: NgbActiveModal,
    ) {
    }

    form = new FormGroup<any>({
        partNumber: new FormControl(''),
        serialNumber: new FormControl(''),
        totalLabels: new FormControl(''),
    })

    @Input() data: any

    ngOnInit(): void { }

    dismiss() {
        this.ngbActiveModal.dismiss()
    }

    close() {
        this.ngbActiveModal.close()
    }

    notifyParent($event) {
        this.form.patchValue({ partNumber: $event.pt_part });
    }

    onPrint() {
        let row = this.form.value;
        let cmds = `^XA
        ^FO50,50^GFA,1620,1620,20,,::::::P0FFN01FEL01MF8,O07FFEM0IFCK07MF8,N01JF8K03JFK0NF8,N03JFCK07JF8I01NF8,N07JFEK0KFCI03NF8,N0LFJ01KFEI07NF8,M01LF8I03LFI0OF8,M03LFCI07LF800OF8,01EJ07LFEI0MFC00OF8,03F8I07MFI0MFC01OF8,07FCI0IF00IF001FFE01FFE01FF,07FFI0FFC003FF803FF8007FF01FE,07FF800FF8001FF803FFI03FF01FE,07FFE007FJ0FFC07FEI01FF81FC,07IF001EJ07FC07FCJ0FF83FC,07IFC00EJ03FC07FCJ0FF81FC,07IFEM03FE0FF8J07FC1FE,07JF8L01FE0FF8J07FC1FE,07JFCL01FE0FFK03FC1FF,07KFL01FE0FFK03FC1LFE,07KF8L0FE0FFK03FC0MFC,07KFEL0FE0FEK01FC0NF,07LFL0FF0FEK01FC0NF8,07LF8K0FF0FEK01FC07MFC,07LF8K0FF0FEK01FC03MFE,07LF8K0FF0FEK01FC01MFE,07LF8K0FF0FEK01FC00NF,07KFEL0FF0FFK03FC007MF,07KFCK01FF0FFK03FC001MF8,07KFL01FF0FFK03FCM01FF8,07JFEL01FF0FFK03FCN07F8,07JF8L03FF0FF8J07FCN07F8,07JFM03FF07F8J07FCN03F8,07IFC006J07FF07FCJ0FFCN03F8,07IF800FJ0IF07FEI01FFCN03F8,07FFE003F8I0IF03FFI03FFCN03F8,07FFC007FC003IF03FF8007FFCN07F8,07FFI0FFE007IF01FFC00IFCN0FF8,07FEI0IFC1JF01IF87IFCM01FF8,07F8I07NF00NFC1OF8,03FJ03NF007MFC3OF,00CJ03NF007MFC3OF,M01NF003MFC3NFE,N0NF001MFC3NFE,N07JFEFFI0KFDFC3NFC,N01JFCFFI03JF1FC3NF8,O0JF0FFI01IFE1FC3NF1,O01FFC0FFJ03FF03FC3MFC,gJ03FC,:gJ07FC,gJ07F8,gJ0FF8,:gI01FF,gI03FF,gI07FF,gH01FFE,gG01IFC,:gG01IF8,gG01IF,gG01FFE,gG01FFC,gG01FF8,gG01FE,gG01F8,gG01C,,:::::^FS
        ^FX`.replace(/(.{80})/g, "$1<br>");
        cmds += `
^CFA,30
^FO50,150^FDPart Number^FS
^FO50,200^FD${row.partNumber}^FS
^FO50,250^BY2,2.5^B3,N,82,N,N,N,A^FD${row.partNumber}^FS
^FO50,380^FDSerial Number^FS
^FO50,430^FD${row.serialNumber}^FS
^FO50,480^BY2,2.5^B3,N,82,N,N,N,A^FD${row.serialNumber}^FS
^CFA,15
^XZ`

        setTimeout(() => {
            var printwindow = window.open('', 'PRINT', 'height=500,width=600');
            printwindow.document.write(cmds);
            printwindow.document.close();
            printwindow.focus();
            printwindow.print();
            printwindow.close();
        }, 200);
    }

}
