import { Component, Input } from "@angular/core";
import { FormGroup } from "@angular/forms";
import { ActivatedRoute, Router } from "@angular/router";
import { ToastrService } from "ngx-toastr";
import { RmaFormComponent } from "../rma-form/rma-form.component";
import { RmaService } from "@app/core/api/quality/rma.service";
import { NAVIGATION_ROUTE } from "../rma-constant";
import { SharedModule } from "@app/shared/shared.module";

@Component({
  standalone: true,
  imports: [SharedModule, RmaFormComponent],
  selector: "app-rma-edit",
  templateUrl: "./rma-edit.component.html",
  styleUrls: ["./rma-edit.component.scss"],
})
export class RmaEditComponent {
  constructor(
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private api: RmaService,
    private toastrService: ToastrService
  ) { }

  ngOnInit(): void {
    this.activatedRoute.queryParams.subscribe((params) => {
      this.id = params["id"];
    });

    if (this.id) this.getData();
  }

  title = "Edit RMA";

  form: FormGroup;

  id = null;

  isLoading = false;

  submitted = false;

  authorizedBy = "Quality";

  @Input() goBack: Function = () => {
    this.router.navigate([NAVIGATION_ROUTE.LIST], {
      queryParamsHandling: "merge",
    });
  };

  get isRmaClosed(): boolean {
    // Check if RMA status is 'Closed' or similar
    return this.data?.status === 'Closed' || this.data?.status === 'Complete';
  }

  data: any;

  async getData() {
    try {
      this.data = await this.api.getById(this.id);
      this.form.patchValue(this.data);
      
      // Disable form if RMA is closed
      if (this.isRmaClosed) {
        this.form.disable();
      } else {
        this.form.enable();
      }
    } catch (err) { }
  }

  async onSubmit() {
    this.submitted = true;

    if (this.form.invalid) return;

    try {
      this.isLoading = true;
      await this.api.update(this.id, this.form.value);
      this.isLoading = false;
      this.toastrService.success("Successfully Updated");
      this.goBack();
    } catch (err) {
      this.isLoading = false;
    }
  }

  onCancel() {
    this.goBack();
  }

  onPrint() {
    let row = this.form.value;

    var cmds,
      printwindow = window.open("", "PRINT", "height=500,width=600");

    cmds = "^XA^XFR:Format1.ZPL^FS^XZ";

    cmds += "^XA \n";
    cmds += "^DFR:Filename.ZPL^FS \n";
    cmds += "^FT220,250^A0N,210, 185^FH^FN1^FS \n";
    cmds += "^CFA,30^FO50,350^GB700,1,3^FS \n";
    cmds += "^FT50,440^A0N,50, 50^FH^FN3^FS \n";
    cmds += "^FT50,510^A0N,50, 50^FH^FN4^FS \n";
    cmds += "^FT50,580^A0N,50,50^FH^FN5^FS \n";
    cmds += "^FT50,720^A0N,50,50^FH^FN12^FS \n";
    cmds += "^FT50,650^A0N,50, 50^FH^FN6^FS \n";
    cmds += "^CFA,30^FO50,750^GB700,1,2^FS \n";
    cmds += "^FT50,840^A0N,50, 50^FH^FN7^FS \n";
    cmds += "^FT50,910^A0N,50, 50^FH^FN8^FS \n";
    cmds += "^FT50,980^A0N,50, 50^FH^FN9^FS \n";
    cmds += "^FT50,1050^A0N,50, 50^FH^FN10^FS \n";
    cmds += "^FT50,1120^A0N,50, 50^FH^FN11^FS \n";
    cmds += "^FT50,1190^A0N,50, 50^FH^FN12^FS \n";
    cmds += "^FQ1,0,1,Y \n";
    cmds += "^XZ \n";

    cmds += "^XA \n";
    cmds += "^XFR:Filename.ZPL^FS \n";
    cmds += "^FN1^FDRMA^FS \n";
    cmds += "^FN3^FDOrder No: " + row.orderNumber + " ^FS \n";
    cmds += "^FN4^FDPart No: " + row.partNumber + " ^FS \n";
    cmds += "^FN5^FDDescription: " + row.partDescription + " ^FS \n";
    cmds += "^FN12^FDQty: " + row.qty + " ^FS \n";
    cmds += "^FN6^FDProduce By: " + row.type + " ^FS \n";
    cmds += "^FN7^FDAuthorized By: " + this.authorizedBy + " ^FS \n";
    cmds += "^FN8^FDDate Issued: " + row.dateIssued + " ^FS \n";
    cmds += "^FN9^FDQIR No: " + row.qirNumber + " ^FS \n";
    cmds += "^FN10^FDTag QN Number: " + row.tag_qn_number + " ^FS \n";
    cmds += "^FN11^FDRMA No: " + row.rmaNumber + "^FS \n";
    cmds += "^FN11^FDisposition: " + row.disposition + "^FS \n";
    cmds += "^PQ1 \n";
    cmds += "^XZ \n";

    printwindow.document.write(cmds);
    printwindow.document.close();
    printwindow.focus();
    printwindow.print();
    printwindow.close();
  }
}
