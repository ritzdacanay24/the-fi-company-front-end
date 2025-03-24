import { Component, EventEmitter, Input, Output, ViewChild } from "@angular/core";
import { FormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";
import { states } from "@app/core/data/states";
import { NgbTypeahead } from "@ng-bootstrap/ng-bootstrap";
import { AutosizeModule } from "ngx-autosize";
import { ColorPickerModule } from "ngx-color-picker";
import { Subject, OperatorFunction, Observable, debounceTime, distinctUntilChanged, filter, merge, map } from "rxjs";
import { SharedModule } from "src/app/shared/shared.module";

@Component({
  standalone: true,
  imports: [SharedModule, ReactiveFormsModule, AutosizeModule, ColorPickerModule],
  selector: "app-calendar-form",
  templateUrl: "./calendar-form.component.html",
  styleUrls: [],
})
export class CalendarFormComponent {


  model: any;

  @ViewChild('instance', { static: true }) instance: NgbTypeahead;

  focus$ = new Subject<string>();
  click$ = new Subject<string>();

  search: OperatorFunction<string, readonly string[]> = (text$: Observable<string>) => {
    const debouncedText$ = text$.pipe(debounceTime(200), distinctUntilChanged());
    const clicksWithClosedPopup$ = this.click$.pipe(filter(() => !this.instance.isPopupOpen()));
    const inputFocus$ = this.focus$;

    return merge(debouncedText$, inputFocus$, clicksWithClosedPopup$).pipe(
      map((term) =>
        (term === '' ? this.option_types.map(s => s.name) : this.option_types.filter((v: any) => v.name.toLowerCase().indexOf(term.toLowerCase()) > -1).map(s => s.name)).slice(0, 10),
      ),
    );
  };

  constructor(private fb: FormBuilder) { }

  ngOnInit(): void {
    this.setFormEmitter.emit(this.form);
  }

  cpPresetColorsText = ["#fff", '#000'
  ]
  cpPresetColors = [
    "#4B6F44",
    "#FF8C00",
    "#6CB4EE",
    "#AA0000",
    "#ee6cc5",
    "#cad911",
    "#00ffbd",]

  public setValue(column, value) {
    this.form.get(column).patchValue(value, { emitEvent: false })
  }

  option_types_copy = ['Inbound', 'Outbound', 'Pick Up', 'PTO', 'Drop Off', 'Service', 'Field Service']
  option_types = [
    {
      name: "Inbound", background_color: "#4B6F44", text_color: "#fff"
    },
    {
      name: "Outbound", background_color: "#FF8C00", text_color: "#fff"
    },
    {
      name: "Pick up", background_color: "#6CB4EE", text_color: "#fff"
    },
    {
      name: "PTO", background_color: "#AA0000", text_color: "#fff"
    },
    {
      name: "Drop Off", background_color: "#ee6cc5", text_color: "#fff"
    },
    {
      name: "Service", background_color: "#cad911", text_color: "#000"
    },
    {
      name: "Field Service", background_color: "#00ffbd", text_color: "#000"
    }
  ]

  setColor(value?: any) {
    let isFound = false
    for (let i = 0; i < this.option_types.length; i++) {
      if (this.option_types[i].name == this.form.value.inbound_or_pickup) {
        isFound = true
        this.form.patchValue({
          background_color: this.option_types[i].background_color,
          text_color: this.option_types[i].text_color
        })
        break;
      }
    }

    if (!isFound) {
      this.form.patchValue({
        background_color: null,
        text_color: '#000'
      })
    }
  }

  @Output() setFormEmitter: EventEmitter<any> = new EventEmitter();

  @Input() submitted = false;

  get f() {
    return this.form.controls;
  }

  form = this.fb.group({
    inbound_or_pickup: [null, [Validators.required]],
    start_date: ["", [Validators.required]],
    start_time: ["", [Validators.required]],
    end_date: ["", [Validators.required]],
    po_number: [""],
    comments: [""],
    created_by: ["", [Validators.required]],
    created_date: [],
    title: ["", [Validators.required]],
    status: ["Open"],
    background_color: ["", [Validators.required]],
    text_color: ["", [Validators.required]],
  });

  setBooleanToNumber(key) {
    let e = this.form.value[key];
    this.form.get(key).patchValue(e ? 1 : 0);
  }
}
