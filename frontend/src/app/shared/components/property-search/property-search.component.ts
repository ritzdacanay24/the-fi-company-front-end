import {
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
  SimpleChanges,
} from "@angular/core";
import { ReactiveFormsModule } from "@angular/forms";
import {
  Observable,
  Subject,
  catchError,
  concat,
  debounceTime,
  distinctUntilChanged,
  filter,
  of,
  switchMap,
  tap,
} from "rxjs";
import { DropdownPosition, NgSelectModule } from "@ng-select/ng-select";
import { AddTagFn } from "@ng-select/ng-select/lib/ng-select.component";
import { SharedModule } from "@app/shared/shared.module";
import { PropertyService } from "@app/core/api/field-service/property.service";

@Component({
  standalone: true,
  imports: [SharedModule, ReactiveFormsModule, NgSelectModule],
  selector: "app-property-search",
  templateUrl: `./property-search.component.html`,
})
export class PropertySearchComponent implements OnInit {
  @Input() form_label: string = "Select property";
  @Input() client_id: string;
  @Input() value: string | number | any = null;
  @Input() minTermLength: number = 3;
  @Input() debounceTime: number = 500;
  @Input() virtualScroll: boolean = true;
  @Input() appendToBody = "";
  @Input() className = "";
  @Input() hideSelected: boolean = false;
  @Input() closeOnSelect: boolean = true;
  @Input() clearSearchOnAdd: boolean = false;
  @Input() disabled: boolean = false;
  @Input() multiple: boolean = false;
  @Input() dropdownPosition: DropdownPosition = "bottom";
  @Input() required: boolean = false;
  @Input() placeholder: string = "Search by property name";
  @Input() openOnEnter: boolean = false;
  @Input() editableSearchTerm: boolean = false;
  @Input() ngClass: string | any;

  data$: Observable<any[]>;
  dataLoading = false;
  dataInput$ = new Subject<string>();

  @Output() notifyParent: EventEmitter<any> = new EventEmitter();
  @Output() notifyParentItsLoading: EventEmitter<any> = new EventEmitter();

  getSelectedValue(data) {
    this.notifyParent.emit(data);
  }

  @Input() addTag: AddTagFn | boolean = false;

  onRemove(e) {
    this.notifyParent.emit(null);
  }

  trackByFn(item: any) {
    return item.id;
  }

  async getLawFirmById(id) {
    let data = await this.propertyService.getById(id);
    this.value = data.law_firm;
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes["value"]?.currentValue) {
      if (!this.multiple) {
        this.dataInput$.next(this.value);

        this.value = changes["value"].currentValue;
        //this.getLawFirmById(changes.value.currentValue);
      } else {
        this.value = changes["value"].currentValue?.split(",");
      }
    }
  }

  @Input() clearInput: Function;

  private getList() {
    this.data$ = concat(
      of([]), // default items
      this.dataInput$.pipe(
        filter((term) => term != null),
        debounceTime(this.debounceTime),
        distinctUntilChanged(),
        tap(() => {
          this.dataLoading = true;
          this.notifyParentItsLoading.emit(this.dataLoading);
        }),
        switchMap((term) =>
          this.propertyService.searchProperty(term).pipe(
            catchError(() => of([])), // empty list on error
            tap(() => {
              this.dataLoading = false;
              this.notifyParentItsLoading.emit(this.dataLoading);
            })
          )
        )
      )
    );
  }

  constructor(private propertyService: PropertyService) {}

  ngOnInit() {
    this.getList();
  }
}
