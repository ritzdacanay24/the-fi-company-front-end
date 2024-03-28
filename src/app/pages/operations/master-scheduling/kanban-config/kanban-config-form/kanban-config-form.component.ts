import { Component, EventEmitter, Input, Output } from '@angular/core';
import { AbstractControl, FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { KanbanConfigApiService } from '@app/core/api/kanban-config';
import { states } from '@app/core/data/states';
import { QadWoSearchComponent } from '@app/shared/components/qad-wo-search/qad-wo-search.component';
import { SharedModule } from '@app/shared/shared.module';
import { NgSelectModule } from '@ng-select/ng-select';
import moment from 'moment';
import { AutosizeModule } from 'ngx-autosize';
import { ControlsOf } from 'src/assets/js/util/_formGroup';

@Component({
    standalone: true,
    imports: [
        SharedModule,
        ReactiveFormsModule,
        NgSelectModule,
        QadWoSearchComponent,
        AutosizeModule
    ],
    selector: 'app-kanban-config-form',
    templateUrl: './kanban-config-form.component.html',
})
export class KanbanConfigFormComponent {

    constructor(
        private fb: FormBuilder,
        private kanbanConfigApiService: KanbanConfigApiService
    ) { }

    ngOnInit(): void {
        this.getKanbanConfig()

        this.form.get('name').valueChanges.subscribe(val => {
            if (val) {
                this.form.get('value').setValue(val.replace(/ /g,"_")?.toLowerCase())
            } else {
                this.form.get('value').setValue(null)
            }
        });
        this.setFormEmitter.emit(this.form);
    }

    @Output() setFormEmitter: EventEmitter<any> = new EventEmitter();

    @Input() submitted = false;

    get f() {
        return this.form.controls
    }

    states = states;

    form = new FormGroup<ControlsOf<any>>({
        name: new FormControl(''),
        queue: new FormControl(null),
        task_content: new FormControl(null),
        value: new FormControl(null),
        disable: new FormControl(null),
        enable_validation: new FormControl(null),
        show_column: new FormControl(null),
        show_data: new FormControl(null),
        seq: new FormControl(null),
        description: new FormControl(null),
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
