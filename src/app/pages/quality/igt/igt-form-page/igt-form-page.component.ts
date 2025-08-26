import { Component } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { FormGroup } from "@angular/forms";
import { ToastrService } from "ngx-toastr";
import moment from "moment";
import { IgtFormComponent } from "../igt-form/igt-form.component";
import { NAVIGATION_ROUTE } from "../igt-constant";
import { AuthenticationService } from "@app/core/services/auth.service";
import { SharedModule } from "@app/shared/shared.module";
import { SerialNumberService } from "@app/pages/quality/igt/services/serial-number.service";
import { IgtAssetService } from "@app/pages/quality/igt/services/igt-asset.service";
import { ViewChild } from "@angular/core";

@Component({
  standalone: true,
  imports: [SharedModule, IgtFormComponent],
  selector: "app-igt-form-page",
  templateUrl: "./igt-form-page.component.html",
  styleUrls: ["./igt-form-page.component.scss"],
})
export class IgtFormPageComponent {
  @ViewChild(IgtFormComponent) igtFormComponent!: IgtFormComponent;
  
  mode: "create" | "edit" = "create";
  id: number | null = null;
  form: FormGroup;
  isLoading = false;
  submitted = false;
  data: any;
  
  // Serial number statistics
  availableSerialCount = 0;
  totalSerialCount = 0;

  constructor(
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private toastrService: ToastrService,
    private authenticationService: AuthenticationService,
    private igtAssetService: IgtAssetService,
    private serialNumberService: SerialNumberService
  ) {}

  ngOnInit(): void {
    this.activatedRoute.queryParams.subscribe((params) => {
      this.id = params["id"] ? Number(params["id"]) : null;
      this.mode = this.id ? "edit" : "create";
      if (this.mode === "edit") {
        this.getData();
      }
    });
    
    // Load serial number statistics
    this.loadSerialNumberStatistics();
  }

  goBack = () => {
    this.router.navigate([NAVIGATION_ROUTE.LIST], {
      queryParamsHandling: "merge",
    });
  };

  setFormEmitter = ($event) => {
    this.form = $event;
    if (this.mode === "create") {
      this.form.patchValue(
        {
          inspector_name: this.authenticationService.currentUserValue.full_name,
          time_stamp: moment().format("YYYY-MM-DD HH:mm:ss"),
          created_by: this.authenticationService.currentUserValue.id,
          last_update: moment().format("YYYY-MM-DD HH:mm:ss"),
        },
        { emitEvent: false }
      );
    }
  };

  async getData() {
    try {
      this.isLoading = true;
      console.log('Loading IGT record with ID:', this.id); // Debug log
      this.data = await this.igtAssetService.getById(this.id);
      console.log('Loaded IGT record data:', this.data); // Debug log
      if (this.form) {
        this.form.patchValue(this.data);
      }
      this.isLoading = false;
    } catch (err) {
      this.isLoading = false;
      console.error('Error loading IGT record:', err);
      
      // Extract meaningful error message from backend response
      let errorMessage = "Failed to load IGT record.";
      
      if (err && typeof err === 'object') {
        if (err.error && typeof err.error === 'string') {
          errorMessage = err.error;
        } else if (err.error && err.error.error) {
          errorMessage = err.error.error;
        } else if (err.error && err.error.message) {
          errorMessage = err.error.message;
        } else if (err.message) {
          errorMessage = err.message;
        }
      }
      
      this.toastrService.error(errorMessage, "Error Loading Record");
    }
  }

  async onSubmit() {
    this.submitted = true;
    if (this.form.invalid) return;

    // Check for available serial numbers before attempting to create
    if (this.mode === "create" && this.availableSerialCount === 0) {
      this.toastrService.warning(
        "Cannot create IGT asset: No available serial numbers found. Please upload serial numbers first.",
        "Serial Numbers Required",
        { timeOut: 8000 }
      );
      return;
    }

    // Validate ID for edit mode
    if (this.mode === "edit" && (!this.id || isNaN(this.id))) {
      this.toastrService.error(
        "Invalid record ID. Cannot update the asset.",
        "Update Error"
      );
      return;
    }

    try {
      this.isLoading = true;
      if (this.mode === "create") {
        await this.igtAssetService.create(this.form.value);
        
        // Notify the form component that the asset was successfully created
        this.igtFormComponent.onAssetCreated();
        
        this.toastrService.success("Successfully Created IGT Record");
      } else {
        // ID is now passed in URL, send only form data in body
        await this.igtAssetService.update(this.id, this.form.value);
        this.toastrService.success("Successfully Updated IGT Record");
      }
      this.isLoading = false;
      this.goBack();
    } catch (err) {
      this.isLoading = false;
      console.error('Error saving IGT record:', err);
      
      // Extract meaningful error message from backend response
      let errorMessage = "Failed to save IGT record.";
      
      if (err && typeof err === 'object') {
        // Check for backend error message in common response structures
        if (err.error && typeof err.error === 'string') {
          errorMessage = err.error;
        } else if (err.error && err.error.error) {
          errorMessage = err.error.error;
        } else if (err.error && err.error.message) {
          errorMessage = err.error.message;
        } else if (err.message) {
          errorMessage = err.message;
        }
      }
      
      // Show specific error messages for common scenarios
      if (errorMessage.toLowerCase().includes('no available serial numbers')) {
        this.toastrService.error(
          "Cannot create IGT asset: No available serial numbers found. Please upload more serial numbers before creating assets.",
          "Serial Numbers Required",
          { timeOut: 8000 }
        );
      } else if (errorMessage.toLowerCase().includes('asset id is required')) {
        this.toastrService.error(
          "Update failed: Asset ID is missing or invalid. Please try refreshing the page and selecting the record again.",
          "Missing Asset ID",
          { timeOut: 8000 }
        );
      } else if (errorMessage.toLowerCase().includes('serial number')) {
        this.toastrService.error(
          `Serial Number Error: ${errorMessage}`,
          "Asset Creation Failed",
          { timeOut: 6000 }
        );
      } else {
        this.toastrService.error(errorMessage, "Error", { timeOut: 5000 });
      }
    }
  }

  onCancel() {
    this.goBack();
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
      ^FS^FO50,170^FD${row.igtPartNumber}^FS
      ^FS^FO50,200^BY2,2.5^B3,N,42,N,N,N,A^FD${row.igtPartNumber}^FS
      ^FS^FO50,260^FDIGT Asset Number^FS
      ^FS^FO50,295^FD${row.generated_IGT_asset}^FS
      ^FS^FO50,330^BY2,2.5^B3,N,42,N,N,N,A^FD${row.generated_IGT_asset}^FS
      ^CFA,15
      ^XZ
      `;
      var printwindow = window.open("", "PRINT", "height=500,width=600");
      printwindow.document.write(cmds);
      printwindow.document.close();
      printwindow.focus();
      printwindow.print();
      printwindow.close();
    }, 200);
  }

  // Serial Number Management Methods
  async loadSerialNumberStatistics(): Promise<void> {
    try {
      const data = await this.serialNumberService.getAll();
      // Ensure we always have an array
      let serialNumbers = [];
      if (Array.isArray(data)) {
        serialNumbers = data;
      } else if (data && typeof data === 'object' && Array.isArray((data as any).data)) {
        serialNumbers = (data as any).data;
      }
      
      this.totalSerialCount = serialNumbers.length;
      this.availableSerialCount = serialNumbers.filter(s => s.status === 'available').length;
    } catch (error) {
      console.error('Error loading serial number statistics:', error);
      this.totalSerialCount = 0;
      this.availableSerialCount = 0;
    }
  }

  getAvailableSerialCount(): number {
    return this.availableSerialCount;
  }

  getTotalSerialCount(): number {
    return this.totalSerialCount;
  }

  goToSerialManager(): void {
    this.router.navigate(['../serial-manager'], {relativeTo: this.activatedRoute});
  }
}
