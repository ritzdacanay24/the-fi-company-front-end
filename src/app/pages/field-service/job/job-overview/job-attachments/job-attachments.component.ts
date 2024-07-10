import { Component, Input, OnInit, SimpleChanges } from '@angular/core';
import { AgGridModule } from 'ag-grid-angular';
import { ActivatedRoute, Router } from '@angular/router';
import { NgSelectModule } from '@ng-select/ng-select';
import { AttachmentService } from '@app/core/api/field-service/attachment.service';
import { AttachmentsService as PublicAttachment } from '@app/core/api/attachments/attachments.service';
import { LinkRendererComponent } from '@app/shared/ag-grid/cell-renderers';
import { agGridOptions } from '@app/shared/config/ag-grid.config';
import { SharedModule } from '@app/shared/shared.module';
import { highlightRowView, autoSizeColumns } from 'src/assets/js/util';
import { _compressToEncodedURIComponent, _decompressFromEncodedURIComponent } from 'src/assets/js/util/jslzString';
import { GridApi } from 'ag-grid-community';

@Component({
    standalone: true,
    imports: [
        SharedModule,
        AgGridModule,
        NgSelectModule
    ],
    selector: 'app-job-attachments',
    templateUrl: `./job-attachments.component.html`
})
export class JobAttachmentsComponent implements OnInit {

    constructor(
        public router: Router,
        private activatedRoute: ActivatedRoute,
        private api: AttachmentService,
        private publicAttachment: PublicAttachment,
    ) {
    }

    ngOnChanges(changes: SimpleChanges) {
        if (changes['id'].currentValue) {
            this.getData()
        }
    }

    ngOnInit(): void {
    }

    openImage(url) {
        window.open(url, '_blank');
    }

    columnDefs: any = [
        {
            field: 'View', headerName: 'View', filter: 'agMultiColumnFilter',
            cellRenderer: LinkRendererComponent,
            cellRendererParams: {
                onClick: e => { this.openImage(e.rowData.link) },
                value: "SELECT"
            },
        },
        { field: 'fileName', headerName: 'File Name', filter: 'agMultiColumnFilter' },
        { field: 'description', headerName: 'Description', filter: 'agMultiColumnFilter' },
        { field: 'ext', headerName: 'Ext', filter: 'agMultiColumnFilter' },
        { field: 'field', headerName: 'Field', filter: 'agMultiColumnFilter' },
        { field: 'fileSize', headerName: 'File Size', filter: 'agMultiColumnFilter' },
        { field: 'fileSizeConv', headerName: 'File Size Conv', filter: 'agMultiColumnFilter' },
        { field: 'link', headerName: 'Link', filter: 'agMultiColumnFilter' },
        { field: 'uniqueId', headerName: 'Unique Id', filter: 'agMultiColumnFilter' },
        { field: 'active', headerName: 'Aactive', filter: 'agMultiColumnFilter' },
        { field: 'title', headerName: 'Title', filter: 'agMultiColumnFilter' },
        { field: 'createdBy', headerName: 'Created By', filter: 'agMultiColumnFilter' },
        { field: 'createdDate', headerName: 'Created Date', filter: 'agMultiColumnFilter' },

    ]

    gridOptions = {
        ...agGridOptions,
        columnDefs: this.columnDefs,
        onGridReady: (params: any) => {
            this.gridApi = params.api;
            let data = this.activatedRoute.snapshot.queryParams['gridParams']
            _decompressFromEncodedURIComponent(data, params);
        },
        onFirstDataRendered: (params) => {
            highlightRowView(params, 'id', this.id);
            autoSizeColumns(params)
        },
        getRowId: params => params.data.id?.toString(),
        onFilterChanged: params => {
            let gridParams = _compressToEncodedURIComponent(this.gridApi);
            this.router.navigate([`.`], {
                relativeTo: this.activatedRoute,
                queryParamsHandling: 'merge',
                queryParams: {
                    gridParams
                }
            });

        },
        onSortChanged: params => {
            let gridParams = _compressToEncodedURIComponent(this.gridApi);
            this.router.navigate([`.`], {
                relativeTo: this.activatedRoute,
                queryParamsHandling: 'merge',
                queryParams: {
                    gridParams
                }
            });
        }
    };

    selectedViewType = 'Open';

    selectedViewOptions = [
        {
            name: "Open",
            value: 1,
            selected: false
        },
        {
            name: "Closed",
            value: 0,
            selected: false
        },
        {
            name: "All",
            selected: false
        }
    ]

    data: any;

    @Input() id: any;

    gridApi: GridApi;

    title = "Attachments";

    async getData() {
        try {
            this.gridApi?.showLoadingOverlay()

            let params: any = {};
            if (this.selectedViewType != 'All') {
                let status = this.selectedViewOptions.find(person => person.name == this.selectedViewType)
                params = { active: status.value };
            }

            this.data = await this.api.getAllRelatedAttachments(this.id)


            this.router.navigate(['.'], {
                queryParams: {
                    selectedViewType: this.selectedViewType
                },
                relativeTo: this.activatedRoute
                , queryParamsHandling: 'merge'
            });

            this.gridApi?.hideOverlay()

        } catch (err) {
            this.gridApi?.hideOverlay()
        }

    }

    file: File = null;

    myFiles: string[] = [];

    onFilechange(event: any) {
        this.myFiles = [];
        for (var i = 0; i < event.target.files.length; i++) {
            this.myFiles.push(event.target.files[i]);
        }
    }

    isLoading = false
    async onUploadAttachments() {
        if (this.myFiles) {
            let totalAttachments = 0;
            this.isLoading = true;
            const formData = new FormData();
            for (var i = 0; i < this.myFiles.length; i++) {
                formData.append("file", this.myFiles[i]);
                formData.append("field", 'Field Service Scheduler');
                formData.append("uniqueData", `${this.id}`);
                formData.append("folderName", 'fieldService');
                try {
                    await this.publicAttachment.uploadfile(formData);
                    totalAttachments++
                } catch (err) {
                }
            }
            this.isLoading = false;
            await this.getData()
        }
    }

}
