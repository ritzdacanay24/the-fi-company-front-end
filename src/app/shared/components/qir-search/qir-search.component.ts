import { Component, EventEmitter, Input, OnInit, Output, SimpleChanges } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { Observable, Subject, catchError, concat, debounceTime, distinctUntilChanged, filter, of, switchMap, tap } from 'rxjs';
import { DropdownPosition, NgSelectModule } from '@ng-select/ng-select';
import { AddTagFn } from '@ng-select/ng-select/lib/ng-select.component';
import { SharedModule } from '@app/shared/shared.module';
import { QirService } from '@app/core/api/quality/qir.service';

@Component({
  standalone: true,
  imports: [
    SharedModule,
    ReactiveFormsModule,
    NgSelectModule
  ],
  selector: 'app-qir-search',
  templateUrl: `./qir-search.component.html`,
})
export class QirSearchComponent implements OnInit {

  @Input() showLabel: boolean = true;
  @Input() form_label: string = 'Select QIR';
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
  @Input() dropdownPosition: DropdownPosition = "bottom";
  @Input() required: boolean = false;
  @Input() placeholder: string = "Search by QIR Number";
  @Input() openOnEnter: boolean = false;
  @Input() editableSearchTerm: boolean = false;
  @Input() clearSearch: boolean = false;
  @Input() notFoundText: string = "QIR not found.";

  data$: Observable<any[]>;
  dataLoading = false;
  dataInput$ = new Subject<string>();

  @Output() notifyParent: EventEmitter<any> = new EventEmitter();
  @Output() notifyParentItsLoading: EventEmitter<any> = new EventEmitter();

  getSelectedValue(data) {
    this.notifyParent.emit(data);
    if (this.clearSearch)
      setTimeout(() => {
        this.value = null
      }, 0)

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
    } else {
      this.value = null
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
          this.notifyParentItsLoading.emit(this.dataLoading);
        }),
        switchMap(term => this.api.searchQir(term).pipe(
          catchError(() => of([])), // empty list on error
          tap(() => {
            this.dataLoading = false
            this.notifyParentItsLoading.emit(this.dataLoading);
          })
        ))
      )
    );
  }

  constructor(
    private api: QirService
  ) { }

  ngOnInit() {
    this.getList()
  }


}
