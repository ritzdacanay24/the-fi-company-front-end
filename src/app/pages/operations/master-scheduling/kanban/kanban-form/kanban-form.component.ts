import { Component, EventEmitter, Input, Output } from '@angular/core';
import { AbstractControl, FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { KanbanConfigApiService } from '@app/core/api/kanban-config';
import { states } from '@app/core/data/states';
import { QadWoSearchComponent } from '@app/shared/components/qad-wo-search/qad-wo-search.component';
import { SharedModule } from '@app/shared/shared.module';
import { NgSelectModule } from '@ng-select/ng-select';
import { ControlsOf } from 'src/assets/js/util/_formGroup';

@Component({
    standalone: true,
    imports: [
        SharedModule,
        ReactiveFormsModule,
        NgSelectModule,
        QadWoSearchComponent
    ],
    selector: 'app-kanban-form',
    templateUrl: './kanban-form.component.html',
})
export class KanbanFormComponent {

    constructor(
        private fb: FormBuilder,
        private kanbanConfigApiService: KanbanConfigApiService
    ) { }

    ngOnInit(): void {
        this.getKanbanConfig()
        this.setFormEmitter.emit(this.form);
    }

    @Output() setFormEmitter: EventEmitter<any> = new EventEmitter();

    @Input() submitted = false;

    get f() {
        return this.form.controls
    }

    notifyParent($event) {
        this.form.patchValue({
            wo_nbr: $event.wo_nbr,
            due_date: $event.wo_due_date,
            prod_line: $event.wo_line,
            qty: $event.wo_qty_ord
        })


    }

    states = states;

    form = new FormGroup<ControlsOf<any>>({
        kanban_ID: new FormControl(1),
        wo_nbr: new FormControl(null),
        qty: new FormControl(''),
        due_date: new FormControl(''),
        so_nbr: new FormControl(''),
        staging_bay: new FormControl(''),
        prod_line: new FormControl(''),
        seq: new FormControl(''),
    });

    setBooleanToNumber(key) {
        let e = this.form.value[key]
        this.form.get(key).patchValue(e ? 1 : 0)
    }

    formValidator(key: any) {
        if (this.form.get(key)?.validator === null) return '';
        const validator = this.form.get(key)?.validator({} as AbstractControl);
        if (validator && validator['required']) return 'required';
        return ''
    }

    queues
    async getKanbanConfig() {
        try {
            this.queues = await this.kanbanConfigApiService.getAll()
        } catch (err) {
        }
    }

}
