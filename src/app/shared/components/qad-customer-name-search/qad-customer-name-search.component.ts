import { Component, EventEmitter, Input, OnInit, Output, SimpleChanges } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
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
} from 'rxjs';
import { DropdownPosition, NgSelectModule } from '@ng-select/ng-select';
import { AddTagFn } from '@ng-select/ng-select/lib/ng-select.component';
import { SharedModule } from '@app/shared/shared.module';
import { QadService } from '@app/core/api/qad/sales-order-search.service';

@Component({
  standalone: true,
  imports: [
    SharedModule,
    ReactiveFormsModule,
    NgSelectModule
  ],
  selector: 'app-qad-customer-name-search',
  templateUrl: `./qad-customer-name-search.component.html`,
})
export class QadCustomerNameSearchComponent implements OnInit {

  @Input() showLabel: boolean = true;
  @Input() form_label: string = 'Select Customer Name';
  @Input() client_id: string;
  @Input() value: string | number | any = null;
  @Input() minTermLength: number = 3;
  @Input() debounceTime: number = 500;
  @Input() virtualScroll: boolean = true;
  @Input() appendToBody = '';
  @Input() className = '';
  @Input() hideSelected: boolean = true;
  @Input() closeOnSelect: boolean = true;
  @Input() clearSearchOnAdd: boolean = true;
  @Input() disabled: boolean = false;
  @Input() multiple: boolean = false;
  @Input() dropdownPosition: DropdownPosition = "auto";
  @Input() required: boolean = false;
  @Input() placeholder: string = "Search by Customer Name";
  @Input() openOnEnter: boolean = false;
  @Input() editableSearchTerm: boolean = false;
  @Input() clearSearch: boolean = false;
  @Input() ngClass: string | any;
  @Input() notFoundText: string = 'Customer name not found.';
  
  data$: Observable<any[]>;
  dataLoading = false;
  dataInput$ = new Subject<string>();

  @Output() notifyParent: EventEmitter<any> = new EventEmitter();
  @Output() notifyParentItsLoading: EventEmitter<any> = new EventEmitter();

  getSelectedValue(data) {
    this.notifyParent.emit(data);
  }

  @Input() addTag: AddTagFn | boolean = false

  onRemove(e) {
    this.notifyParent.emit(null);
  }

  trackByFn(item: any) {
    return item.id;
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['value']?.currentValue) {
      this.value = changes['value'].currentValue || null;
    }
  }

  @Input() clearInput: Function

  private getList() {
    this.data$ = concat(
      of([]), // default items
      this.dataInput$.pipe(
        filter(term => term != null),
        debounceTime(this.debounceTime),
        distinctUntilChanged(),
        tap(() => {
          this.dataLoading = true
        }),
        switchMap(term => this.api.searchCustomerName(term).pipe(
          catchError(() => of([])), // empty list on error
          tap(() => {
            this.dataLoading = false
          })
        ))
      )
    );
  }

  constructor(
    private api: QadService
  ) { }

  ngOnInit() {
    this.getList()
  }


}
