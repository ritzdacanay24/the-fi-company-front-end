import { Component, Input } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { SgAssetFormComponent } from '../sg-asset-form/sg-asset-form.component';
import { NAVIGATION_ROUTE } from '../sg-asset-constant';
import { SgAssetService } from '@app/core/api/quality/sg-asset.service';
import { SharedModule } from '@app/shared/shared.module';

@Component({
  standalone: true,
  imports: [SharedModule, SgAssetFormComponent],
  selector: 'app-sg-asset-edit',
  templateUrl: './sg-asset-edit.component.html',
  styleUrls: ['./sg-asset-edit.component.scss']
})
export class SgAssetEditComponent {
  constructor(
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private api: SgAssetService,
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
^XA

^FO40,100^GFA,1896,1896,24,,::::K0FCI0F8001FC001F001F1KFI03E,K0FCI0FC00IF801F001F9KFI0FFC,K0FCI0FC03IFE01F001F9KF001FFE,
K0FCI0FC07JF01F001F9KF003FFE,K0FCI0FC0KF81F001F9KF003E3F,K0FCI0FC1FE07F81F001F801FJ03C1F,K0FCI0FC1FC01FC1F001F801FJ03C0F,
K0FCI0FC3F800FC1F001F801FJ03C1F,K0FCI0FC3FI0FC1F001F801FJ03E1F,K0FCI0FC3EI07C1F001F801FJ03E3F,K0FCI0FC7EK01F001F801FJ01FFE,
K0FCI0FC7EK01KF801FJ01FFC,K0FCI0FC7EK01KF801FJ01FF8,K0FCI0FC7C01FF81KF801FJ03FF00C,K0FCI0FC7E01FFC1KF801FJ07FE01C,
K0FCI0FC7E01FFC1KF801FJ0IF03C,K0FCI0FC7E01FFC1F001F801FJ0FCF87C,K0FCI0FC3EI07C1F001F801FI01F8FCFC,
K0FCI0FC3FI07C1F001F801FI01F07FF8,K0FCI0FC3FI07C1F001F801FI01F03FF,K0FCI0FC1F800FC1F001F801FI01F01FE,
K0FCI0FC1FC01FC1F001F801FI01F80FC,K0JFCFC0FF07FC1F001F801FJ0FC3FE,K0JFCFC07JFC1F001F801FJ0KF,K0JFCFC03IF7C1F001F801FJ07JF,
K0JFCFC01IF7C1F001F801FJ03FFCF8,K0JFCFC007FC7C1F001F801FJ01FF87C,,::::::::03E003E003E00FFC003F001F07FFC001JF87FFE,
03E003E007C03IF003F801F07IF001JF87IF8,01F003E007C07IF803F801F07IFC01JF87IFC,01F007E007C0JFC03FC01F07IFE01JF87IFE,
01F007F00781FE1FE03FE01F07E1FF01JF87IFE,01F007F00F83F007F03FE01F07C03F81FJ07E07F,00F807F00F87E001F03FF01F07C01FC1FJ07E01F,
00F80FF00F87C001F83FF01F07C00FC1FJ07E00F8,00F80FF80F0F8I0F83FF81F07C007E1FJ07E00F8,00F80FF81F0F8I07C3EFC1F07C007E1FJ07E00F8,
007C0F781F0F8I07C3E7C1F07C003E1F8I07E00F8,007C1F7C1F0FJ07C3E3E1F07C003E1FFC007E00F8,007C1E7C3E0FJ07C3E3F1F07C003E1IFC07E00F8,
007C1E3C3E0FJ07C3E1F1F07C003E1IFC07E01F,003C1E3C3E0FJ07C3E0F9F07C003E1IFC07FC3F,003E3E3E3C0F8I07C3E0F9F07C003E1IFC07IFE,
003E3C3E7C0F8I07C3E07DF07C003E1F80407IFC,003E3C1E7C0FCI0F83E07FF07C007E1F8I07IFC,001E3C1E7C07C001F83E03FF07C00FC1F8I07IFE,
001F7C1F7807E003F03E01FF07C01FC1F8I07E7FE,001F781FF803F807F03E01FF07C03F81F8I07E03F,001FF80FF801FE3FE03E00FF07E1FF81F8I07E01F,
I0FF80FF800JFC03E007F07JF01F8I07E01F,I0FF80FFI07IF803E007F07IFE01FF8007E00F8,I0FF007FI03FFE003E003F07IF801JF87E00F8,
I0FF007FJ07F8P0FFC001JF83E00F8,I07F007EgH01JF83E00F8,I07F007EgI01IF83E00F8,I07E003EgK01F83E00F8,I07EgR03E00F8,I07EgS0400F81A4,
I03gW0F8024,hG07803C,hJ028,,:::^FS

^FX Top section with logo, name and address.
^CF0,25
^FS^FO35,190^FDLight & Wonder Inc.^FS
^FS^FO28,220^FDGlobal Service Center^FS
^FO50,250^FD(877) 748-3387^FS

^CF0,20^FS
^FS^FO260,25^FDPart Number :^FS
^CF0,50^FS
^FO260,60^FD${row.sgPartNumber}^FS
^FS^FO260,120^BY2,1.5^B3A,N,80,N,N,N,A^FD${row.sgPartNumber}^FS^
^CF0,20^FS
^FO260,220^FDAsset Number: ^FS
^FS^FO260,250^B3A,N,80,N,N,N,A^FD${row.generated_SG_asset}^FS^
^CF0,50^FS
^FO260,350^FD${row.generated_SG_asset}^FS
^FO50,420^GB700,3,3^FS
^FX
^BY5,2,270
^XZ
EOL
`
      var printwindow = window.open('', 'PRINT', 'height=500,width=600');
      printwindow.document.write(cmds.replace(/(.{80})/g, "$1<br>"));
      printwindow.document.close(); // necessary for IE >= 10
      printwindow.focus(); // necessary for IE >= 10
      printwindow.print();
      printwindow.close();
    }, 200);

  }

}
