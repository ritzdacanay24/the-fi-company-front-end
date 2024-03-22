import { Component, Injectable, Input, OnInit, SimpleChanges } from '@angular/core';
import { MbscModule, setOptions } from '@mobiscroll/angular';
import { SharedModule } from '../shared.module';
import { RootReducerState } from '@app/store';
import { Store } from '@ngrx/store';

@Component({
    standalone: true,
    imports: [
        SharedModule,
        MbscModule,
    ],
    selector: 'app-date-picker',
    templateUrl: `./date-picker.component.html`,
})
export class DatePickerService implements OnInit {

    constructor(
        private store: Store<RootReducerState>
    ) {
        this.store.select('layout').subscribe((data) => {
            setOptions({
                theme: 'ios',
                themeVariant: data.LAYOUT_MODE
            });
        })
    }


    ngOnChanges(changes: SimpleChanges) {
        if (changes['value']) {
            this.value = changes['value'].currentValue
        }
        // changes.prop contains the old and the new value...
    }

    @Input() placeholder = "Please Select...+++++"
    @Input() mbscOptions = {
        controls: ['calendar'],
        dateFormat: "YYYY-MM-DD",
        placeholder: "Please Select...",
        display: "anchored",
        returnFormat: "moment",
        theme: "ios",
        stepMinute: 5
    }
    @Input() value = null
    @Input() ngClass = null


    ngOnInit(): void { }

}
