import {
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
  SimpleChanges,
  ViewChild,
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
import {
  AddTagFn,
  NgSelectComponent,
} from "@ng-select/ng-select/lib/ng-select.component";
import { SharedModule } from "@app/shared/shared.module";
import { JobService } from "@app/core/api/field-service/job.service";

@Component({
  standalone: true,
  imports: [SharedModule, ReactiveFormsModule, NgSelectModule],
  selector: "app-job-search",
  templateUrl: `./job-search.component.html`,
})
export class JobSearchComponent implements OnInit {
  @Input() showLabel: boolean = true;
  @Input() form_label: string = "Select job";
  @Input() client_id: string;
  @Input() value: string | number | any = null;
  @Input() minTermLength: number = 3;
  @Input() debounceTime: number = 500;
  @Input() virtualScroll: boolean = true;
  @Input() appendTo = "";
  @Input() className = "";
  @Input() hideSelected: boolean = true;
  @Input() closeOnSelect: boolean = true;
  @Input() clearSearchOnAdd: boolean = true;
  @Input() disabled: boolean = false;
  @Input() multiple: boolean = false;
  @Input() dropdownPosition: DropdownPosition = "bottom";
  @Input() required: boolean = false;
  @Input() placeholder: string = "Search by fsid number or property name";
  @Input() openOnEnter: boolean = false;
  @Input() editableSearchTerm: boolean = false;
  @Input() clearSearch: boolean = false;
  @Input() autoFocus: boolean = false;
  @Input() blur: boolean = true;

  data$: Observable<any[]>;
  dataLoading = false;
  dataInput$ = new Subject<string>();

  @Output() notifyParent: EventEmitter<any> = new EventEmitter();
  @Output() notifyParentItsLoading: EventEmitter<any> = new EventEmitter();

  getSelectedValue(data) {
    if (this.blur) {
      this.ngSelect.blur();
    }
    this.notifyParent.emit(data);

    if (this.clearSearch)
      setTimeout(() => {
        this.value = null;
      }, 0);
  }

  @ViewChild("select") ngSelect: NgSelectComponent;
  ngAfterViewInit() {
    if (this.autoFocus) {
      setTimeout(() => {
        this.ngSelect.focus();
      });
    }
  }

  @Input() addTag: AddTagFn | boolean = false;

  onRemove(e) {
    this.notifyParent.emit(null);
  }

  trackByFn(item: any) {
    return item.id;
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes["value"]?.currentValue) {
      this.value = changes["value"].currentValue || null;
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
          this.api.searchByJob(term).pipe(
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

  constructor(private api: JobService) {}

  ngOnInit() {
    this.getList();
  }
}
