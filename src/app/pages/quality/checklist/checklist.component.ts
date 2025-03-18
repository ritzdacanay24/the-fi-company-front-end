import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ContinuityModalService } from '@app/pages/operations/labels/continuity-test-modal/continuity-test-modal.component';
import { PlacardModalService } from '@app/shared/components/placard-modal/placard-modal.component';

@Component({
    selector: 'app-checklist',
    templateUrl: './checklist.component.html',
    styleUrls: []
})
export class ChecklistComponent implements OnInit {


    constructor(
        public route: ActivatedRoute,
        public router: Router,
        private continuityModalService: ContinuityModalService,
        private placardModalService: PlacardModalService,
    ) {
    }

    ngOnInit(): void {
    }

    printAsset() {

    }

    printPlacard(so: string = 'SO130674', line: string= '2', partNumber: string = 'KIT-03495-110') {
        let modalRef = this.placardModalService.open(so, line, partNumber);
        modalRef.result.then(
            (result: any) => { },
            () => { }
        );
    }

    printContinuity() {
        this.continuityModalService.open(null)
    }
}
