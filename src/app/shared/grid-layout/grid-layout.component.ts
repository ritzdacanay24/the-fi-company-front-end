import { Component } from '@angular/core';
import { NgbNavModule } from '@ng-bootstrap/ng-bootstrap';

import { SharedModule } from '@app/shared/shared.module';
import { Router } from '@angular/router';


const sizes = [
    { name: "Large", value: 'large' },
    { name: "Normal", value: 'normal' },
    { name: "Compact", value: 'compact' }
]

export function setTheme(value) {
    const el = document.querySelector('[class*="ag-theme-quartz"]');
    if (el) {
        sizes.forEach((size) => el.classList.toggle(size.value, size.value === value));
    }
}

@Component({
    standalone: true,
    imports: [SharedModule, NgbNavModule],
    selector: 'app-grid-layout',
    templateUrl: `./grid-layout.component.html`,
    styleUrls: []
})

export class GridLayoutComponent {

    constructor(
        private router: Router,
    ) {
        let gridLayout = localStorage.getItem('THE_FI_COMPANY_GRID_LAYOUT')

        this.router.events.subscribe((event) => {
            if (localStorage.getItem('THE_FI_COMPANY_GRID_LAYOUT')) {
                setTheme(localStorage.getItem('THE_FI_COMPANY_GRID_LAYOUT'))
                this.gridLayout = localStorage.getItem('THE_FI_COMPANY_GRID_LAYOUT')
            }
        });

        
        if (!gridLayout) {
            localStorage.setItem('THE_FI_COMPANY_GRID_LAYOUT', 'large')
            setTheme('large')
            this.gridLayout = 'large'
        }
    }

    data: any;
    isLoading = true;

    sizes = sizes;

    ngOnInit() {
    }

    gridLayout = 'large'

    changeSize = (value) => {
        this.gridLayout = value;
        const el = document.querySelector('[class*="ag-theme-quartz"]');

        if (el) {
            localStorage.setItem('THE_FI_COMPANY_GRID_LAYOUT', value)
            sizes.forEach((size) => el.classList.toggle(size.value, size.value === value));
        }
    }

}
