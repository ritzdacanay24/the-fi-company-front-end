import { Component, EventEmitter, Input, OnInit, Output, SimpleChanges } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { Observable, Subject, catchError, concat, debounceTime, distinctUntilChanged, of, switchMap, tap } from 'rxjs';
import { DropdownPosition, NgSelectModule } from '@ng-select/ng-select';
import { AddTagFn } from '@ng-select/ng-select/lib/ng-select.component';
import { SharedModule } from '@app/shared/shared.module';
import { UserService } from '@app/core/api/field-service/user.service';

@Component({
  standalone: true,
  imports: [
    SharedModule,
    ReactiveFormsModule,
    NgSelectModule
  ],
  selector: 'app-user-search',
  templateUrl: `./user-search.component.html`,
})
export class UserSearchComponent implements OnInit {

  @Input() form_label: string = 'Select user';
  @Input() client_id: string;
  @Input() value: string | number | any = null;
  @Input() minTermLength: number = 3;
  @Input() debounceTime: number = 500;
  @Input() virtualScroll: boolean = true;
  @Input() appendToBody = '';
  @Input() className = 'testing mb-3';
  @Input() hideSelected: boolean = true;
  @Input() closeOnSelect: boolean = true;
  @Input() clearSearchOnAdd: boolean = true;
  @Input() disabled: boolean = false;
  @Input() multiple: boolean = false;
  @Input() dropdownPosition: DropdownPosition = "bottom";
  @Input() required: boolean = false;
  @Input() placeholder: string = "Search by user name";
  @Input() openOnEnter: boolean = false;
  @Input() editableSearchTerm: boolean = true;
  @Input() ngClass: string | any;
  @Input() showLabel: boolean = true;

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

  async getLawFirmById(id) {
    let data = await this.api.getById(id)
    this.value = data.law_firm;
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['value']?.currentValue) {
      if (!changes['multiple']?.currentValue) {
        this.dataInput$.next(this.value)

        this.value = changes['value'].currentValue;
        //this.getLawFirmById(changes.value.currentValue);
      } else {
        this.value = changes['value']?.currentValue?.split(",");
      }
    }
  }



  @Input() clearInput: Function

  private getList() {
    this.data$ = concat(
      of([]), // default items
      this.dataInput$.pipe(
        debounceTime(this.debounceTime),
        distinctUntilChanged(),
        tap(() => {
          this.dataLoading = true
          this.notifyParentItsLoading.emit(this.dataLoading);
        }),
        switchMap(term => this.api.searchUser(term).pipe(
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
    private api: UserService
  ) { }

  ngOnInit() {
    this.getList()
  }


}
