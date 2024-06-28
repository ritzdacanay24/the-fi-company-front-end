import { Component, Input, OnInit, SimpleChanges } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { SharedModule } from '@app/shared/shared.module';
import { NgbNavModule } from '@ng-bootstrap/ng-bootstrap';
import { FormGroup } from '@angular/forms';
import { NcrService } from '@app/core/api/quality/ncr-service';
import { NcrCorrectiveActionFormComponent } from '../../ncr-corrective-action-form/ncr-corrective-action-form.component';
import { ToastrService } from 'ngx-toastr';
import { AgGridModule } from 'ag-grid-angular';
import { LinkRendererComponent } from '@app/shared/ag-grid/cell-renderers';
import { agGridOptions } from '@app/shared/config/ag-grid.config';
import { autoSizeColumns } from 'src/assets/js/util';
import { AttachmentsService } from '@app/core/api/attachments/attachments.service';
import { Lightbox } from 'ngx-lightbox';
import { IconRendererComponent } from '@app/shared/ag-grid/icon-renderer/icon-renderer.component';
import { AuthenticationService } from '@app/core/services/auth.service';

@Component({
    standalone: true,
    imports: [
        SharedModule,
        NgbNavModule,
        NcrCorrectiveActionFormComponent,
        AgGridModule
    ],
    selector: 'app-ncr-attachments-list',
    templateUrl: './ncr-attachments-list.component.html',
    styleUrls: []
})
export class NcrAttachmentsListComponent implements OnInit {

    constructor(
        public activatedRoute: ActivatedRoute,
        public router: Router,
        public ncrService: NcrService,
        public attachmentsService: AttachmentsService,
        private toastrService: ToastrService,
        private lightbox: Lightbox,
        private authenticationService: AuthenticationService
    ) {
    }

    ngOnInit(): void {
    }

    ngOnChanges(changes: SimpleChanges) {
        if (changes['id']) {
            this.id = changes['id'].currentValue
            this.getData()
        }
    }

    images = []
    open(index: number): void {
        // open lightbox
        this.lightbox.open(this.images, index, {});
    }

    close(): void {
        // close lightbox programmatically
        this.lightbox.close();
    }


    @Input() id = null

    isLoading = false;

    title = "Corrective Action";

    form: FormGroup;

    submitted = false;

    async onSubmit() {
        try {
            this.isLoading = true;
            await this.ncrService.update(this.id, this.form.value);
            this.isLoading = false;
            this.toastrService.success('Successfully Updated');
        } catch (err) {
            this.isLoading = false;
        }
    }

    data

    async getData() {
        this.images = []
        this.data = await this.attachmentsService.find({ field: 'NCR', uniqueId: this.id, active: 1 })

        for (let i = 0; i < this.data.length; i++) {
            let row = this.data[i]
            const src = `https://dashboard.eye-fi.com/attachments/ncr/${row.fileName}`;
            const caption = 'Image ' + i + '- ' + row.createdDate;
            const thumb = src;
            const item = {
                src: src,
                caption: caption,
                thumb: thumb
            };
            this.images.push(item);
        }
    }

    async onDelete(data) {
        if (this.authenticationService.currentUserValue.id != data.createdBy) {
            alert('Access denied. ')
            return;
        }

        if (!confirm('Are you sure you want to delete this attachment?')) return;

        try {
            await this.attachmentsService.delete(data.id)
            this.getData()
        } catch (err) {

        }

    }

    onEdit(e) {
        //this.lightbox.open(this.images, e.index, {});
        window.open(`https://dashboard.eye-fi.com/attachments/ncr/${e}`, 'Image', 'width=largeImage.stylewidth,height=largeImage.style.height,resizable=1');
    }

    columnDefs: any = [
        {
            field: "View", headerName: "View", filter: "agMultiColumnFilter",
            pinned: "left",
            cellRenderer: LinkRendererComponent,
            cellRendererParams: {
                onClick: (e: any) => this.onEdit(e.rowData?.fileName),
                value: 'SELECT'
            },
            maxWidth: 115,
            minWidth: 115
        },
        { field: 'id', headerName: 'ID', filter: 'agMultiColumnFilter' },
        { field: "createdDate", headerName: "Created Date", filter: "agTextColumnFilter" },
        { field: "createdBy", headerName: "Created By", filter: "agTextColumnFilter" },
        { field: "fileName", headerName: "File name", filter: "agTextColumnFilter", cellDataType: 'text' },
        { field: "ext", headerName: "Ext", filter: "agTextColumnFilter", cellDataType: 'text' },
        {
            field: "Delete", headerName: "Delete", filter: "agMultiColumnFilter",
            cellRenderer: IconRendererComponent,
            cellRendererParams: {
                onClick: e => { this.onDelete(e.rowData) },
                iconName: 'mdi mdi-delete text-danger'
            }
        },
    ]

    gridApi
    
    gridOptions = {
        ...agGridOptions,
        columnDefs: this.columnDefs,
        onGridReady: (params: any) => {
            this.gridApi = params.api;
        },
        onFirstDataRendered: (params) => {
            autoSizeColumns(params)
        },
    };


    file: File = null;

    myFiles: string[] = [];

    onFilechange(event: any) {
        this.myFiles = [];
        for (var i = 0; i < event.target.files.length; i++) {
            this.myFiles.push(event.target.files[i]);
        }
    }

    async onUploadAttachments() {
        if (this.myFiles) {
            let totalAttachments = 0;
            this.isLoading = true;
            const formData = new FormData();
            for (var i = 0; i < this.myFiles.length; i++) {
                formData.append("file", this.myFiles[i]);
                formData.append("field", 'NCR');
                formData.append("uniqueData", `${this.id}`);
                formData.append("folderName", 'ncr');
                try {
                    await this.attachmentsService.uploadfile(formData);
                    totalAttachments++
                } catch (err) {
                }
            }
            this.isLoading = false;
            await this.getData()
        }
    }

}
