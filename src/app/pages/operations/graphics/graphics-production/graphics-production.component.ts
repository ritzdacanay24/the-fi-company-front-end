import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { GraphicsService } from '@app/core/api/operations/graphics/graphics.service';
import { SharedModule } from '@app/shared/shared.module';
import { QueueSelectionService } from './queue-selection/queue-selection.component';
import { GraphicsBomModalService } from './graphics-bom-modal/graphics-bom-modal.component';

@Component({
    standalone: true,
    imports: [SharedModule],
    selector: 'app-graphics-production',
    templateUrl: './graphics-production.component.html',
    styleUrls: ['./graphics-production.component.scss'],
})
export class GraphicsProductionComponent implements OnInit {

    constructor(
        public route: ActivatedRoute,
        public router: Router,
        public graphicsService: GraphicsService,
        private queueSelectionService: QueueSelectionService,
        private graphicsBomModalService: GraphicsBomModalService
    ) {
    }

    ngOnInit(): void {
        this.getData()
    }

    openComplete(item){}
    openComments(item){}
    
    data: any

    isLoading = false;
    async getData() {
        try {
            this.isLoading = true;
            this.data = await this.graphicsService.getGraphicsProduction();
            this.isLoading = false;
        } catch (err) {
            this.isLoading = false;
        }
    }

    async openQueueSelection(row: any) {
        if (parseInt(row.holdCount) > 0) {
            alert('Remove all hold before continuing.')
            return
        }
        const modalRef = this.queueSelectionService.open(row, this.data.queueNames);

        modalRef.result.then((result: any) => {
            this.getData();
        }, () => { });
    }

    async openGraphicsBom(row) {
        const modalRef = this.graphicsBomModalService.open(row.graphicsWorkOrder);
        modalRef.result.then((result: any) => {
            this.getData();
        }, () => { });
    }
}
