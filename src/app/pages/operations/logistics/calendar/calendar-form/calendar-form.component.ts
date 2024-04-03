import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AutosizeModule } from 'ngx-autosize';
import { SharedModule } from 'src/app/shared/shared.module';

@Component({
    standalone: true,
    imports: [
        SharedModule,
        ReactiveFormsModule,
        AutosizeModule
    ],
    selector: 'app-calendar-form',
    templateUrl: './calendar-form.component.html',
    styleUrls: []
})
export class CalendarFormComponent {

    constructor(
        private fb: FormBuilder,
    ) { }

    ngOnInit(): void {
        this.setFormEmitter.emit(this.form)
    }

    @Output() setFormEmitter: EventEmitter<any> = new EventEmitter();

    @Input() submitted = false;

    get f() {
        return this.form.controls
    }

    form = this.fb.group({
        inbound_or_pickup: ['Inbound', [Validators.required]],
        start_date: ['', [Validators.required]],
        start_time: ['', [Validators.required]],
        end_date: ['', [Validators.required]],
        po_number: [''],
        comments: [''],
        created_by: ['', [Validators.required]],
        created_date: [],
        title: ['', [Validators.required]],
        status: ['Open']
    })

    setBooleanToNumber(key) {
        let e = this.form.value[key]
        this.form.get(key).patchValue(e ? 1 : 0)
    }

}
