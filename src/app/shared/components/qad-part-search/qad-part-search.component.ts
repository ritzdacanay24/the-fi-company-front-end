import { Component, EventEmitter, Input, OnInit, Output, SimpleChanges, ViewChild } from '@angular/core';
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
import { AddTagFn, NgSelectComponent } from '@ng-select/ng-select/lib/ng-select.component';
import { SharedModule } from '@app/shared/shared.module';
import { QadService } from '@app/core/api/qad/sales-order-search.service';

@Component({
  standalone: true,
  imports: [
    SharedModule,
    ReactiveFormsModule,
    NgSelectModule
  ],
  selector: 'app-qad-part-search',
  templateUrl: `./qad-part-search.component.html`,
})
export class QadPartSearchComponent implements OnInit {

  @Input() showLabel: boolean = true;
  @Input() form_label: string = 'Select Part Number';
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
  @Input() placeholder: string = "Search by Part Number";
  @Input() openOnEnter: boolean = false;
  @Input() editableSearchTerm: boolean = false;
  @Input() clearSearch: boolean = false;
  @Input() ngClass: string | any;
  @Input() autoFocus: boolean = false;
  @Input() matchCase: boolean = false;


  @ViewChild('select') ngSelect: NgSelectComponent;
  ngAfterViewInit() {
    if (this.autoFocus) {
      setTimeout(() => {
        this.ngSelect.focus();
      });
    }
  }

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
    return item.pt_part + '-' + item.pt_status + '-' + item.description;
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
        switchMap(term => this.api.searchPartNumber(term, this.matchCase).pipe(
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
