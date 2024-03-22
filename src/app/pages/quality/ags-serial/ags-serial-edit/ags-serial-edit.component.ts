import { Component, Input } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { AgsSerialFormComponent } from '../ags-serial-form/ags-serial-form.component';
import { NAVIGATION_ROUTE } from '../ags-serial-constant';
import { AgsSerialService } from '@app/core/api/quality/ags-serial.service';
import { SharedModule } from '@app/shared/shared.module';

@Component({
  standalone: true,
  imports: [SharedModule, AgsSerialFormComponent],
  selector: 'app-ags-serial-edit',
  templateUrl: './ags-serial-edit.component.html',
  styleUrls: ['./ags-serial-edit.component.scss']
})
export class AgsSerialEditComponent {
  constructor(
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private api: AgsSerialService,
    private toastrService: ToastrService,
  ) { }

  ngOnInit(): void {
    this.activatedRoute.queryParams.subscribe(params => {
      this.id = params['id'];
    });

    if (this.id) this.getData();
  }

  title = "Edit";

  form: FormGroup;

  id = null;

  isLoading = false;

  submitted = false;

  @Input() goBack: Function = () => {
    this.router.navigate([NAVIGATION_ROUTE.LIST], { queryParamsHandling: 'merge' });
  }

  data: any;

  async getData() {
    try {
      this.data = await this.api.getById(this.id);
      this.form.get('generated_SG_asset').disable()
      this.form.patchValue(this.data);
    } catch (err) { }
  }

  async onSubmit() {
    this.submitted = true;

    if (this.form.invalid) return;

    try {
      this.isLoading = true;
      await this.api.update(this.id, this.form.value);
      this.isLoading = false;
      this.toastrService.success('Successfully Updated');
      this.goBack();
    } catch (err) {
      this.isLoading = false;
    }
  }

  onCancel() {
    this.goBack()
  }

  onPrint() {
    let row = this.form.getRawValue();


    setTimeout(() => {
      let cmds = `
      ^XA^FO50,50^GFA,1620,1620,20,,::::::P0FFN01FEL01MF8,O07FFEM0IFCK07MF8,N01JF8K03JFK0NF8,N03JFC
      K07JF8I01NF8,N07JFEK0KFCI03NF8,N0LFJ01KFEI07NF8,M01LF8I03LFI0OF8,M03LFCI07LF800OF8,01EJ07L
      FEI0MFC00OF8,03F8I07MFI0MFC01OF8,07FCI0IF00IF001FFE01FFE01FF,07FFI0FFC003FF803FF8007FF01FE
      ,07FF800FF8001FF803FFI03FF01FE,07FFE007FJ0FFC07FEI01FF81FC,07IF001EJ07FC07FCJ0FF83FC,07IFC
      00EJ03FC07FCJ0FF81FC,07IFEM03FE0FF8J07FC1FE,07JF8L01FE0FF8J07FC1FE,07JFCL01FE0FFK03FC1FF,0
      7KFL01FE0FFK03FC1LFE,07KF8L0FE0FFK03FC0MFC,07KFEL0FE0FEK01FC0NF,07LFL0FF0FEK01FC0NF8,07LF8
      K0FF0FEK01FC07MFC,07LF8K0FF0FEK01FC03MFE,07LF8K0FF0FEK01FC01MFE,07LF8K0FF0FEK01FC00NF,07KF
      EL0FF0FFK03FC007MF,07KFCK01FF0FFK03FC001MF8,07KFL01FF0FFK03FCM01FF8,07JFEL01FF0FFK03FCN07F
      8,07JF8L03FF0FF8J07FCN07F8,07JFM03FF07F8J07FCN03F8,07IFC006J07FF07FCJ0FFCN03F8,07IF800FJ0I
      F07FEI01FFCN03F8,07FFE003F8I0IF03FFI03FFCN03F8,07FFC007FC003IF03FF8007FFCN07F8,07FFI0FFE00
      7IF01FFC00IFCN0FF8,07FEI0IFC1JF01IF87IFCM01FF8,07F8I07NF00NFC1OF8,03FJ03NF007MFC3OF,00CJ03
      NF007MFC3OF,M01NF003MFC3NFE,N0NF001MFC3NFE,N07JFEFFI0KFDFC3NFC,N01JFCFFI03JF1FC3NF8,O0JF0F
      FI01IFE1FC3NF1,O01FFC0FFJ03FF03FC3MFC,gJ03FC,:gJ07FC,gJ07F8,gJ0FF8,:gI01FF,gI03FF,gI07FF,g
      H01FFE,gG01IFC,:gG01IF8,gG01IF,gG01FFE,gG01FFC,gG01FF8,gG01FE,gG01F8,gG01C,,:::::^FS
      ^FX
      ^FWN
      ^CFA,25
      ^FS^FO50,135^FDPart Number^FS
      ^FS^FO50,170^FD${row.sgPartNumber}^FS
      ^FS^FO50,200^BY2,2.5^B3,N,42,N,N,N,A^FD${row.sgPartNumber}^FS
      ^FS^FO50,260^FDSerial Number^FS
      ^FS^FO50,295^FD${row.generated_SG_asset}^FS
      ^FS^FO50,330^BY2,2.5^B3,N,42,N,N,N,A^FD${row.generated_SG_asset}^FS
      ^CFA,15
      ^XZ
`
      var printwindow = window.open('', 'PRINT', 'height=500,width=600');
      printwindow.document.write(cmds);
      printwindow.document.close(); // necessary for IE >= 10
      printwindow.focus(); // necessary for IE >= 10
      printwindow.print();
      printwindow.close();
    }, 200);

  }

}
