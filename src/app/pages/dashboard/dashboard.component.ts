import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { SharedModule } from '@app/shared/shared.module';

@Component({
    standalone: true,
    imports: [SharedModule],
    selector: 'app-dashboard',
    templateUrl: './dashboard.component.html',
    styleUrls: []
})
export class DashboardComponent implements OnInit {


    constructor(
        public route: ActivatedRoute,
        public router: Router
    ) {
    }

    ngOnInit(): void {
    }

    data = [
        {
            name: "Las Vegas",
            children: [
                { name: 'Field Service Dashboard', link: '/field-service' },
                { name: 'FS App', link: 'https://dashboard.eye-fi.com/dist/fsm-mobile/assignments' },
                { name: 'Quality Dashboard', link: '/quality' },
                { name: 'Operations Dashboard', link: 'https://dashboard.eye-fi.com/dist/v1/dashboard' },
                { name: 'Operations Dashboard V1', link: '/operations' },
                { name: 'Field Service Request Form', link: '/request' },
                { name: 'Quality Incident Request Form', link: '/quality-incident-request' }
            ]
        },
        {
            name: "TJ",
            children: [
                { name: 'SouthFi', link: 'https://portal.southfi-apps.com/' },
                { name: 'MRO', link: 'https://mro.swstms.com/users/sign_in' },
            ]
        }
    ]

    isLink(row) {
        if (row.link?.includes('https')) {
            window.open(row.link, '_blank');
        } else {
            this.router.navigate([row.link])
        }
    }
}
