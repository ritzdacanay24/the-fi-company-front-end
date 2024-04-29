import { ChangeDetectorRef, Component, OnInit, ViewEncapsulation } from '@angular/core';
import { FormGroup } from '@angular/forms';
import moment from 'moment';
import { ActivatedRoute, Router } from '@angular/router';
import { RequestService } from '@app/core/api/field-service/request.service';
import { CommentsService } from '@app/core/api/field-service/comments.service';
import { AttachmentsService } from '@app/core/api/attachments/attachments.service';
import { FIELD_SERVICE } from '@app/pages/field-service/field-service-constant';
import { RequestFormComponent } from '@app/pages/field-service/request/request-form/request-form.component';
import { SharedModule } from '@app/shared/shared.module';
import { SweetAlert } from '@app/shared/sweet-alert/sweet-alert.service';
import { AutosizeModule } from 'ngx-autosize';
import { getFormValidationErrors } from 'src/assets/js/util/getFormValidationErrors';
import { KanbanComponent } from '@app/pages/operations/master-scheduling/kanban/kanban.component';
import { WebsocketService } from '@app/core/services/websocket.service';

@Component({
    encapsulation: ViewEncapsulation.None,
    standalone: true,
    imports: [SharedModule, RequestFormComponent, AutosizeModule, KanbanComponent],
    selector: 'app-kanban-public',
    templateUrl: './kanban-public.component.html'
})
export class KanbanPublicComponent implements OnInit {

    constructor(
        public activatedRoute: ActivatedRoute,
        private requestService: RequestService,
        private commentsService: CommentsService,
        private router: Router,
        private cdref: ChangeDetectorRef,
        private attachmentsService: AttachmentsService,
        private websocketService: WebsocketService

    ) { }

    ngOnInit(): void {

        if (this.websocketService.getWebSocket() === undefined)
            this.websocketService.connect();

    }


}
