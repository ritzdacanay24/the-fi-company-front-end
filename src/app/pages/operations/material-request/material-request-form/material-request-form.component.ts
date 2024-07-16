import {
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  Output,
  ViewChild,
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

import { AceModule } from "ngx-ace-wrapper";
import "brace";
import "brace/mode/plain_text";
import "brace/theme/merbivore_soft";
import "brace/theme/tomorrow";

import { SweetAlert } from "@app/shared/sweet-alert/sweet-alert.service";
import moment from "moment";
import { AuthenticationService } from "@app/core/services/auth.service";
import { MaterialRequestService } from "@app/core/api/operations/material-request/material-request.service";
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
export class MaterialRequestFormComponent {
  constructor(
    private fb: FormBuilder,
    private store: Store<RootReducerState>,
    private authenticationService: AuthenticationService,
    private materialRequestService: MaterialRequestService,
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

  aceConfig: any = {
    maxLines: 1000,
    minLines: 15,
    printMargin: false,
    autoScrollEditorIntoView: true,
    showInvisibles: false,
    tabSize: 3,
    newLineMode: "windows",
    fontSize: 16,
    useSoftTabs: true,
  };

  @Input() value = "";
  @Input() enableEdit = true;

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
            qty: new FormControl(row.qty, Validators.required),
            isDuplicate: isDup,
            reasonCode: new FormControl(
              row.reasonCode || null,
              Validators.required
            ),
            message: row.message,
            hasError: row.hasError,
            availableQty: row.availableQty,
            description: row.description,
            createdBy: row.createdBy,
            createdDate: row.createdDate,
            cost: row.cost,
            ac_code: null,
            notes: null,
            trType: null,
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
}
