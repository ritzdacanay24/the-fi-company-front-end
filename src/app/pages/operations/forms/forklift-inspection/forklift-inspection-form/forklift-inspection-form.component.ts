import { Component, EventEmitter, Input, OnInit, Output, SimpleChanges } from '@angular/core';

import moment from 'moment';

import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { formValues } from './formData';
import { SharedModule } from '@app/shared/shared.module';


@Component({
    standalone: true,
    imports: [SharedModule],
    selector: 'app-forklift-inspection-form',
    templateUrl: './forklift-inspection-form.component.html',
    styles: [`
        .forklift-checklist .form-check .form-check-label input[type=checkbox]:checked+.input-frame:after {
            width: 16px !important;
            opacity: 1;
            line-height: 19px;
            filter: alpha(opacity=100);
            transform: scale(1);
        }
    `]
})

export class ForkliftInspectionFormComponent implements OnInit {

    @Input() formValues = formValues;
    form: FormGroup;

    @Input() submitted: boolean;
    @Output() setFormEmitter: EventEmitter<any> = new EventEmitter();
    @Output() setDetailsFormEmitter: EventEmitter<any> = new EventEmitter();

    // convenience getter for easy access to form fields
    get f() { return this.form.controls; }

    public clear() {
        this.form = this.fb.group(this.getFormValues());
        this.restValues();
        this.submitted = false;
    }

    changeValue(row, index) {

        row.status = !row.status

        for (let i = 0; i < row.details.length; i++) {
            if (i == index) {

                if (row.status) {
                    row.details[i].needMaint = !row.details[i].status;
                }
            }
        }
        this.setDetailsFormEmitter.emit(row);
    }

    clearSearch() {
        this.form = this.fb.group(this.getFormValues());
        this.router.navigate([], { queryParams: { tab: 1 } });
        this.restValues();
        this.submitted = false;
        this.form.enable();

    };

    get dateTimeNow() {
        return moment().format('YYYY-MM-DD');
    }

    private checkIfChecklistIsComplete() {
        var totalErrors = 0;
        for (var i = 0; i < this.formValues.checklist.length; i++) {
            for (var ii = 0; ii < this.formValues.checklist[i].details.length; ii++) {
                this.formValues.checklist[i].details[ii].error = false;
                if (
                    this.formValues.checklist[i].details[ii].status == undefined
                ) {
                    this.formValues.checklist[i].details[ii].error;
                    totalErrors++;
                }
            }
        }
        return totalErrors;
    }

    private restValues() {
        for (let i = 0; i < this.formValues.checklist.length; i++) {
            this.formValues.checklist[i].status = undefined;
            for (let ii = 0; ii < this.formValues.checklist[i].details.length; ii++) {
                this.formValues.checklist[i].details[ii].error = false;
                this.formValues.checklist[i].details[ii].status = undefined;
            }
        }
    }

    public groupSelect(main, row, name) {

        if (name == 'status') {
            if (main.status) {
                main.needMaint = false
            }
        }
        if (name == 'needMaint') {
            if (main.needMaint) {
                main.status = false
            }
        }

        for (var i = 0; i < row.length; i++) {

            if (name == 'status') {
                if (main.status) {
                    row[i].status = 1
                } else {
                    row[i].status = 0
                }
            }
            if (name == 'needMaint') {
                if (main.needMaint) {
                    row[i].status = 0
                    row[i].needMaint = 0
                } else {
                    row[i].needMaint = 1
                }

            }
        }
    }

    get ff() {
        return this.form.get('files')['controls'];
    }

    getFormValues() {
        return {
            department: ['', Validators.required],
            operator: ['', Validators.required],
            model_number: ['', Validators.required],
            shift: ['', Validators.required],
            details: this.fb.array([]),
            comments: [''],
            date_created: [''],
            create: [1],
            created_by: ['', Validators.required],
            created_by_name: ['', Validators.required],
            files: this.fb.group({
                name: ['', Validators.required],
                file: ['', Validators.required],
                uniqueId: [null],
            })
        }
    }

    myFiles: string[] | any = [];
    onFileChange(event: any) {
        for (var i = 0; i < event.target.files.length; i++) {
            this.myFiles.push(event.target.files[i]);
        }
    }

    constructor(
        private router: Router,
        private fb: FormBuilder,

    ) { };


    ngOnChanges(changes: SimpleChanges) {
        if (changes['formValues']) {
            this.formValues = changes['formValues'].currentValue;
        }
    }

    ngOnInit() {
        this.setDetailsFormEmitter.emit(this.formValues);
        this.form = this.fb.group(this.getFormValues());
        this.setFormEmitter.emit(this.form);
    };

    compare(a, b) {
        if (a.name > b.name) {
            return -1;
        }
        if (a.name < b.name) {
            return 1;
        }
        return 0;
    }

}
