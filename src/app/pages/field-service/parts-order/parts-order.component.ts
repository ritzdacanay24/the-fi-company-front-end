import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { SharedModule } from '@app/shared/shared.module';

@Component({
    standalone: true,
    imports: [SharedModule],
    selector: 'app-parts-order',
    templateUrl: './parts-order.component.html',
    styleUrls: []
})
export class PartsOrderComponent implements OnInit {

    currentUrl: string;

    constructor(
        public route: ActivatedRoute,
        public router: Router
    ) {
    }

    ngOnInit(): void {
    }
}
