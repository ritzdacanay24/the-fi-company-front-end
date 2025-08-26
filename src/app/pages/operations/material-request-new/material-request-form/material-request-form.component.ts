import {
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  Output,
  ViewChild,
  OnChanges,
  SimpleChanges,
} from "@angular/core";
import {
  AbstractControl,
  FormArray,
  FormBuilder,
  FormControl,
  ReactiveFormsModule,
  Validators,
} from "@angular/forms";
import { SharedModule } from "@app/shared/shared.module";
import { NgSelectModule } from "@ng-select/ng-select";
import { QadPartSearchComponent } from "@app/shared/components/qad-part-search/qad-part-search.component";
import materialRequestFormJson from "./material-request-form.json";
import { RootReducerState } from "@app/store";
import { getLayoutMode } from "@app/store/layouts/layout-selector";
import { Store } from "@ngrx/store";

import { AceConfigInterface, AceModule } from "ngx-ace-wrapper";
import "brace";
import "brace/mode/plain_text";
import "brace/theme/merbivore_soft";
import "brace/theme/tomorrow";

import { SweetAlert } from "@app/shared/sweet-alert/sweet-alert.service";
import moment from "moment";
import { AuthenticationService } from "@app/core/services/auth.service";
import { MaterialRequestService } from "@app/core/api/operations/material-request/material-request.service";
import { MaterialRequestDetailService } from "@app/core/api/operations/material-request/material-request-detail.service";
import { Router } from "@angular/router";

@Component({
  standalone: true,
  imports: [
    SharedModule,
    ReactiveFormsModule,
    NgSelectModule,
    QadPartSearchComponent,
    AceModule,
  ],
  selector: "app-material-request-form",
  templateUrl: "./material-request-form.component.html",
  styleUrls: ["./material-request-form.component.scss"],
})
export class MaterialRequestFormComponent implements OnChanges {
  constructor(
    private fb: FormBuilder,
    private store: Store<RootReducerState>,
    private authenticationService: AuthenticationService,
    private materialRequestService: MaterialRequestService,
    private materialRequestDetailService: MaterialRequestDetailService,
    private cdRef: ChangeDetectorRef,
    private router: Router
  ) {
    this.store.select(getLayoutMode).subscribe((mode) => {
      this.aceTheme = mode == "dark" ? "merbivore_soft" : "tomorrow";
    });
  }

  aceTheme = "merbivore_soft";

  ngOnInit(): void {
    this.setFormEmitter.emit(this.form);
    
    // Set initial disabled state
    this.updateFormDisabledState();
    
    // Load data if ID is provided initially
    if (this.id) {
      setTimeout(() => this.loadMaterialRequest(this.id), 100);
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['id'] && changes['id'].currentValue && !changes['id'].firstChange) {
      this.loadMaterialRequest(changes['id'].currentValue);
    }
    
    // Handle disabled state changes
    if (changes['disabled'] || changes['enableEdit']) {
      this.updateFormDisabledState();
    }
  }

  private updateFormDisabledState(): void {
    const shouldDisable = this.isFormDisabled;
    
    if (shouldDisable) {
      this.form.disable();
    } else {
      this.form.enable();
    }
  }

  async loadMaterialRequest(id: number): Promise<void> {
    try {
      console.log('Loading material request with ID:', id);
      this.isLoading = true;
      
      // Load main material request data
      const materialRequest = await this.materialRequestService.getById(id);
      console.log('Main material request data:', materialRequest);
      
      // Load material request details
      const materialRequestDetails = await this.getMaterialRequestDetails(id);
      console.log('Material request details:', materialRequestDetails);
      
      if (materialRequest) {
        this.patchFormWithData(materialRequest, materialRequestDetails);
      }
    } catch (error) {
      console.error('Error loading material request:', error);
      SweetAlert.fire({
        title: 'Error',
        text: 'Failed to load material request data',
        icon: 'error'
      });
    } finally {
      this.isLoading = false;
      this.cdRef.detectChanges();
    }
  }

  private async getMaterialRequestDetails(id: number): Promise<any[]> {
    try {
      // Use the MaterialRequestDetailService to find details by mrf_id
      const details = await this.materialRequestDetailService.find({ mrf_id: id });
      return Array.isArray(details) ? details : [];
    } catch (error) {
      console.error('Error loading material request details:', error);
      return [];
    }
  }

  private patchFormWithData(mainData: any, detailsData: any[] = []): void {
    try {
      console.log('Patching form with main data:', mainData);
      console.log('Patching form with details data:', detailsData);
      
      // The main API response might be a single object or an array
      const requestData = Array.isArray(mainData) ? mainData[0] : mainData;
      console.log('Request data after array check:', requestData);
      
      if (!requestData) {
        console.error('No request data found');
        return;
      }

      // Patch the main form group - map API fields to form fields
      const mainFormData = {
        active: requestData.active || 1,
        assemblyNumber: requestData.assemblyNumber || requestData.assembly_number || '',
        createdBy: requestData.createdBy || requestData.created_by || null,
        createdDate: requestData.createdDate || requestData.created_date || null,
        deleteReason: requestData.deleteReason || requestData.delete_reason || '',
        deleteReasonBy: requestData.deleteReasonBy || requestData.delete_reason_by || null,
        deleteReasonDate: requestData.deleteReasonDate || requestData.delete_reason_date || null,
        dueDate: requestData.dueDate || requestData.due_date || null,
        info: requestData.info || '',
        isCableRequest: requestData.isCableRequest || requestData.is_cable_request || '',
        lineNumber: requestData.lineNumber || requestData.line_number || '',
        pickList: requestData.pickList || requestData.pick_list || '',
        pickedCompletedDate: requestData.pickedCompletedDate || requestData.picked_completed_date || null,
        priority: requestData.priority || 'Low',
        requestor: requestData.requestor || requestData.requester_name || '',
        specialInstructions: requestData.specialInstructions || requestData.special_instructions || '',
        validated: requestData.validated || null,
      };

      console.log('Main form data:', mainFormData);
      this.form.get('main')?.patchValue(mainFormData);

      // Handle details array from the separate API call
      console.log('Details data:', detailsData);

      if (detailsData && Array.isArray(detailsData) && detailsData.length > 0) {
        const detailsArray = this.form.get('details') as FormArray;
        
        // Clear existing details
        while (detailsArray.length > 0) {
          detailsArray.removeAt(0);
        }

        // Add new details
        detailsData.forEach((detail: any) => {
          const detailGroup = this.fb.group({
            partNumber: new FormControl(detail.partNumber || detail.part_number || null, Validators.required),
            reasonCode: new FormControl(detail.reasonCode || detail.reason_code || null, Validators.required),
            qty: new FormControl(detail.qty || detail.quantity || null, Validators.required),
            trType: new FormControl(detail.trType || detail.tr_type || null),
            ac_code: new FormControl(detail.ac_code || detail.account_code || null),
            notes: new FormControl(detail.notes || detail.note || ""),
            // Add additional fields from the API response
            isDuplicate: new FormControl(detail.isDuplicate || false),
            message: new FormControl(detail.message || ""),
            hasError: new FormControl(detail.hasError || false),
            availableQty: new FormControl(detail.availableQty || 0),
            description: new FormControl(detail.description || ""),
            createdBy: new FormControl(detail.createdBy || detail.created_by || null),
            createdDate: new FormControl(detail.createdDate || detail.created_date || null),
            cost: new FormControl(detail.cost || 0),
            validationStatus: new FormControl(detail.validationStatus || detail.validation_status || null),
            validationComment: new FormControl(detail.validationComment || detail.validation_comment || null),
            validatedBy: new FormControl(detail.validatedBy || detail.validated_by || null),
            validatedAt: new FormControl(detail.validatedAt || detail.validated_at || null),
          });
          detailsArray.push(detailGroup);
        });

        // Populate the ACE editor value with the existing line details
        this.populateAceEditorValue(detailsData);
      } else {
        // If no details exist, ensure at least one empty row
        console.log('No details found, adding empty row');
        this.addMoreItems();
      }

      this.cdRef.detectChanges();
      console.log('Form patched successfully');
      
      // Ensure disabled state is maintained after patching
      this.updateFormDisabledState();
    } catch (error) {
      console.error('Error patching form with data:', error);
    }
  }

  populateAceEditorValue(detailsData: any[]): void {
    if (detailsData && Array.isArray(detailsData) && detailsData.length > 0) {
      const aceEditorLines = detailsData.map(detail => {
        const partNumber = detail.partNumber || detail.part_number || '';
        const qty = detail.qty || detail.quantity || 0;
        return `${partNumber} ${qty}`;
      });
      
      this.value = aceEditorLines.join('\r\n');
      this.itemsInCart = this.value;
      
      console.log('ACE editor value populated:', this.value);
    } else {
      this.value = '';
      this.itemsInCart = '';
    }
  }

  ngAfterViewInit() {
    // this.editor.setOptions({
    //   placeholder: "Enter CSS Code",
    // })
  }

  viewShortageId(shortageId) {
    this.router.navigate(["/dashboard/operations/shortages/edit"], {
      queryParams: { id: shortageId, goBackUrl: this.router.url },
    });
  }

  @Output() setFormEmitter: EventEmitter<any> = new EventEmitter();

  @Input() submitted = false;
  disableValidation;
  @Input() onDeleteItem: Function;
  @Input() onActiveChange: Function;
  @Input() id: any;

  @Input() addMoreItems: Function = () => {
    this.details = this.form.get("details") as FormArray;

    let lastIndex = this.details.value[this.details?.value?.length - 1];
    this.details.push(
      this.fb.group({
        partNumber: new FormControl(null, Validators.required),
        reasonCode: new FormControl(
          lastIndex?.reasonCode || null,
          Validators.required
        ),
        qty: new FormControl(null, Validators.required),
        trType: new FormControl(null),
        ac_code: new FormControl(null),
        notes: new FormControl(""),
        // Add additional fields to match the structure used when loading data
        isDuplicate: new FormControl(false),
        message: new FormControl(""),
        hasError: new FormControl(false),
        availableQty: new FormControl(0),
        description: new FormControl(""),
        createdBy: new FormControl(null),
        createdDate: new FormControl(null),
        cost: new FormControl(0),
        validationStatus: new FormControl(null),
        validationComment: new FormControl(null),
        validatedBy: new FormControl(null),
        validatedAt: new FormControl(null),
      })
    );
  };

  get f() {
    return this.form.get("main")["controls"];
  }

  details: FormArray;

  get getDetails() {
    return this.form.get("details") as FormArray;
  }

  materialRequestForm = materialRequestFormJson;

  form = this.fb.group({
    main: this.fb.group({
      active: new FormControl(1),
      assemblyNumber: new FormControl("", Validators.required),
      createdBy: new FormControl(null),
      createdDate: new FormControl(null),
      deleteReason: new FormControl(""),
      deleteReasonBy: new FormControl(null),
      deleteReasonDate: new FormControl(null),
      dueDate: new FormControl(null, Validators.required),
      info: new FormControl(""),
      isCableRequest: new FormControl(""),
      lineNumber: new FormControl("", Validators.required),
      pickList: new FormControl("", Validators.required),
      pickedCompletedDate: new FormControl(null),
      priority: new FormControl("Low"),
      requestor: new FormControl("", Validators.required),
      specialInstructions: new FormControl(""),
      validated: new FormControl(null),
    }),
    details: this.fb.array([]),
  });

  setBooleanToNumber(key) {
    let e = this.form.value[key];
    this.form.get(key).patchValue(e ? 1 : 0);
  }

  formValidator(key: any) {
    if (this.form.get(key)?.validator === null) return "";
    const validator = this.form.get(key)?.validator({} as AbstractControl);
    if (validator && validator["required"]) return "required";
    return "";
  }

  notifyParent($event, index, row) {
    row.patchValue({ partNumber: $event.pt_part });
  }

  itemsInCart = "";
  reasonCode: string = null;

  onChange(code: any) {
    this.itemsInCart = code;
  }

  aceConfig: AceConfigInterface = {
    maxLines: 1000,
    minLines: 15,
    autoScrollEditorIntoView: true,
    showInvisibles: false,
    tabSize: 3,
    newLineMode: "windows",
    fontSize: 16,
    useSoftTabs: true,
  };

  @Input() value = "";
  @Input() enableEdit = true;
  @Input() disabled = false;

  get isFormDisabled() {
    return this.disabled || !this.enableEdit;
  }

  @ViewChild("editor") editor;
  listItems = [];

  checkDuplicate(partNumber) {
    let items: any = this.form.get("details").value;
    let isDup = false;
    for (let i = 0; i < items.length; i++) {
      if (items[i].partNumber == partNumber) {
        isDup = true;
        break;
      }
    }
    return isDup;
  }

  resetTags() {
    const arr = this.form.controls.details as FormArray;
    while (0 !== arr.length) {
      arr.removeAt(0);
    }
  }

  isLoading = false;
  isValidating = false;
  async onValidate() {
    this.listItems = [];

    this.resetTags();

    var lines = this.value.split(/\r\n/);

    let getCurrentDateTime = moment().format("YYYY-MM-DD HH:mm:ss");
    // Loop through all lines
    for (var j = 0; j < lines.length; j++) {
      let res = lines[j].replace(/\s+/g, " ").trim().split(" ");

      if (res[0])
        this.listItems.push({
          partNumber: res[0],
          qty: parseInt(res[1]) || 0,
          createdDate: getCurrentDateTime,
          createdBy: this.authenticationService.currentUserValue.id,
          isDuplicate: false,
          reasonCode: this.reasonCode || null,
        });
    }

    try {
      this.isLoading = true;
      this.isValidating = true;
      SweetAlert.loading("Please wait while we validate the items in QAD.");

      let data = await this.materialRequestService.searchByItem(this.listItems);

      this.details = this.form.get("details") as FormArray;
      for (let i = 0; i < data.length; i++) {
        let row = data[i];

        let isDup = this.checkDuplicate(data[i].partNumber);
        this.details.push(
          this.fb.group({
            partNumber: new FormControl(
              row.partNumber || null,
              Validators.required
            ),
            qty: new FormControl(row.qty, [
              Validators.required,
              Validators.min(1),
            ]),
            isDuplicate: new FormControl(isDup),
            reasonCode: new FormControl(
              row.reasonCode || null,
              Validators.required
            ),
            message: new FormControl(row.message || ""),
            hasError: new FormControl(row.hasError || false),
            availableQty: new FormControl(row.availableQty || 0),
            description: new FormControl(row.description || ""),
            createdBy: new FormControl(row.createdBy || null),
            createdDate: new FormControl(row.createdDate || null),
            cost: new FormControl(row.cost || 0),
            ac_code: new FormControl(null),
            notes: new FormControl(null),
            trType: new FormControl(null),
            validationStatus: new FormControl(null),
            validationComment: new FormControl(null),
            validatedBy: new FormControl(null),
            validatedAt: new FormControl(null),
          })
        );

        if (data[i]?.hasError || isDup) {
          this.details.controls[i]["controls"]["partNumber"].setErrors({
            invalid: true,
          });
        }
      }

      this.cdRef.detectChanges();

      SweetAlert.close();
      this.isLoading = false;
    } catch (err) {
      SweetAlert.close();
      this.isLoading = false;
      this.isValidating = false;
    }
  }

  // Helper method to get form control disabled state
  getFormControlDisabled(controlName: string): boolean {
    return this.isFormDisabled || this.form.get(controlName)?.disabled || false;
  }

  // Helper method to get details form control disabled state
  getDetailsFormControlDisabled(index: number, controlName: string): boolean {
    const detailsArray = this.form.get('details') as FormArray;
    return this.isFormDisabled || detailsArray.at(index)?.get(controlName)?.disabled || false;
  }

  // Helper method to calculate total quantity for view-only summary
  getTotalQuantity(): number {
    if (!this.getDetails || !this.getDetails.value) return 0;
    return this.getDetails.value.reduce((total, item) => total + (item.qty || 0), 0);
  }
}
