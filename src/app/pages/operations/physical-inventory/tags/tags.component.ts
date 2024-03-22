import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { agGridOptions } from '@app/shared/config/ag-grid.config';
import { SharedModule } from '@app/shared/shared.module';
import { _compressToEncodedURIComponent, _decompressFromEncodedURIComponent } from 'src/assets/js/util/jslzString';
import { AgGridModule } from 'ag-grid-angular';
import { GridOptions } from 'ag-grid-community';
import { NgSelectModule } from '@ng-select/ng-select';
import { DateRangeComponent } from '@app/shared/components/date-range/date-range.component';
import { PhyscialInventoryService } from '@app/core/api/operations/physcial-inventory/physcial-inventory.service';
import { currencyFormatter } from 'src/assets/js/util';

@Component({
  standalone: true,
  imports: [
    SharedModule,
    AgGridModule,
    NgSelectModule,
    DateRangeComponent
  ],
  selector: 'app-tags',
  templateUrl: './tags.component.html',
})
export class TagsComponent implements OnInit {

  constructor(
    public router: Router,
    private api: PhyscialInventoryService,
    public activatedRoute: ActivatedRoute,
  ) {
  }

  ngOnInit(): void {
    this.activatedRoute.queryParams.subscribe(params => {
      this.id = params['id'];
    })

    this.getData()
  }

  gridApi: any;

  gridColumnApi: any;

  id = null;

  title = "Tag Report"

  columnDefs:any = [
    {
      maxWidth: 42,
      checkboxSelection: true,
      pinned: 'left',
      filter: false,
      headerCheckboxSelectionFilteredOnly: true,
      headerCheckboxSelection: true,
      suppressHeaderMenuButton: true,
      cellClass: 'lock-pinned'
    }
    , {
      headerName: 'Tag Info',
      children: [
        { field: 'tag_type', headerName: 'Tag Type', filter: 'agMultiColumnFilter' }
        , { field: 'AREA1', headerName: 'Area', filter: 'agMultiColumnFilter' }
        , { field: 'tag_nbr', headerName: 'Tag #', filter: 'agTextColumnFilter', maxWidth: 80 }
        , { field: 'tag_part', headerName: 'Part', filter: 'agMultiColumnFilter' }
        , { field: 'AISLE', headerName: 'Aisle', filter: 'agMultiColumnFilter', applyMiniFilterWhileTyping: true }
        , {
          field: 'TAG_LOC', headerName: 'Tag Location', filter: 'agMultiColumnFilter', filterParams: {
            filters: [
              {
                filter: 'agTextColumnFilter',
                filterParams: {
                  defaultOption: 'startsWith',
                },
              },
              { filter: 'agSetColumnFilter' },
            ],
          },
        }
        , { field: 'TAG_LOC_REAL', headerName: 'Actual Tag Location', filter: 'agTextColumnFilter', floatingFilter: false }
        , { field: 'LOC_TYPE', headerName: 'Loc Type', filter: 'agMultiColumnFilter' }
        , { field: 'LD_QTY_OH', headerName: 'Qty On Hand', filter: 'agTextColumnFilter' }
        , { field: 'UNIT_COST', headerName: 'Unit Cost', filter: 'agNumberColumnFilter', valueFormatter: currencyFormatter }
        , { field: 'tag_serial', headerName: 'Tag Serial', filter: 'agMultiColumnFilter', hide: false }
        , { field: 'LD_REF', headerName: 'Ref', filter: 'agTextColumnFilter', hide: false }
        , { field: 'tag_crt_dt', headerName: 'Tag Create Date', filter: 'agTextColumnFilter', hide: true }
        , { field: 'tag_crt_time', headerName: 'Tag Create Time', filter: 'agTextColumnFilter', hide: true }
        , { field: 'tag_posted', headerName: 'Tag Posted', filter: 'agTextColumnFilter', hide: true }
      ]
    }
    , {
      headerName: 'First Count Info',
      children: [
        {
          field: 'tag_cnt_qty', headerName: '1st Count Qty', filter: 'agTextColumnFilter'
          , cellStyle: function (params) {
            if (params.data && params.data.tag_cnt_dt && params.data.LD_QTY_OH != params.data.tag_cnt_qty && params.data.tag_posted == 0)
              return {
                borderColor: 'red',
                borderWidth: '3px',
              };
              return null;
          },
        }
        , { field: 'tag_cnt_dt', headerName: '1st Count Date', filter: 'agTextColumnFilter' }
        , {
          field: 'firstCountPrintTag', headerName: '1st Count Print Date', filter: 'agTextColumnFilter',
          cellRenderer: (params) => {
            if (!params.data && !params.node.footer) {
              let sum = false;
              let count = 0
              let printedCount = 0
              for (let i = 0; i < params.node.allLeafChildren.length; i++) {
                if (params.node.allLeafChildren[i].data.firstCountPrintTag == null) {
                  printedCount++
                  sum = true
                };
              }

              if (sum) {
                return `Printed ${params.node.allLeafChildren.length - printedCount} of ${params.node.allLeafChildren.length}`
              }

            }
            return params.value
          }
        }
        , { field: 'POV', headerName: 'PQV %', filter: 'agNumberColumnFilter' }
        , { field: 'COV', headerName: 'COV $', filter: 'agNumberColumnFilter', valueFormatter: currencyFormatter }
        , { field: 'tag_cnt_nam', headerName: 'Counted By', filter: 'agMultiColumnFilter' }
      ]
    },
    {
      headerName: 'Second Count Info',
      children: [
        {
          field: 'tag_rcnt_qty', headerName: '2nd Count Qty', filter: 'agTextColumnFilter', cellStyle: function (params) {
            if (params.data && params.data.LD_QTY_OH != params.data.tag_rcnt_qty && params.data.tag_rcnt_dt && params.data.tag_posted == 0)
              return {
                borderColor: 'red',
                borderWidth: '3px',
              };
              return null;
          },
        }
        , { field: 'tag_rcnt_dt', headerName: '2nd Count Date', filter: 'agTextColumnFilter' }
        , { field: 'secondCountPrintTag', headerName: '2nd Count Print Date', filter: 'agTextColumnFilter' }
        , { field: 'tag_rcnt_nam', headerName: 'Counted By', filter: 'agMultiColumnFilter' }
      ]
    },
    {
      headerName: 'Third Count Info',
      children: [
        {
          field: 'thirdCountRequired', headerName: '3rd Count Required', filter: 'agMultiColumnFilter', cellRenderer: function (params) {
            if (params.data && params.data.tag_cnt_qty != params.data.tag_rcnt_qty && params.data.tag_rcnt_dt) {
              return 'Yes'
            } else if (params.data && params.data.tag_cnt_qty == params.data.tag_rcnt_qty && params.data.tag_rcnt_dt) {
              return '1st and 2nd Count Matches'
            } else {
              return ''
            }
          },
          valueGetter: function (params) {
            if (params.data && params.data.tag_cnt_qty != params.data.tag_rcnt_qty && params.data.tag_rcnt_dt) {
              return 'Yes'
            } else if (params.data && params.data.tag_cnt_qty == params.data.tag_rcnt_qty && params.data.tag_rcnt_dt) {
              return '1st and 2nd Count Matches'
            }
            return null
          },
        }
        , { field: 'thirdCountPrintTag', headerName: '3rd Count Print Date', filter: 'agTextColumnFilter' }
      ]
    }
  ]

  ageType = 'All';

  selectedRowCount: any;

  gridOptions: GridOptions = {
    ...agGridOptions,
    groupIncludeFooter: false,
    groupSelectsChildren: true,
    groupSelectsFiltered: true,
    suppressAggFuncInHeader: true,
    columnDefs: this.columnDefs,
    pagination: false,
    onGridReady: this.onGridReady.bind(this),
    suppressRowClickSelection: true,
    getRowId: (data) => {
      return data.data?.tag_nbr;
    },
    onFirstDataRendered: () => {
      const allColumnIds = [];
      this.gridColumnApi.getAllColumns().forEach((column) => {
        allColumnIds.push(column.getId());
      });

      this.gridColumnApi.autoSizeColumns(allColumnIds, false);
    },
    onRowSelected: (event) => {
      if (event.data) {
        if (event.data) {
          this.selectedRowCount = this.gridApi.getSelectedRows().length;
        }
      }
    },
    isExternalFilterPresent: () => {
      // if ageType is not everyone, then we are filtering
      return this.ageType !== 'All';
    },
    doesExternalFilterPass: (node) => {
      switch (this.ageType) {
        case 'Second_Count_Variance':
          return node.data && node.data.LD_QTY_OH != node.data.tag_rcnt_qty && node.data.tag_rcnt_dt && node.data.tag_posted == 0;
        case 'First_Count_Variance':
          return node.data.tag_cnt_dt && node.data.LD_QTY_OH != node.data.tag_cnt_qty && !node.data.tag_rcnt_dt && node.data.tag_posted == 0;
        case 'Not_Posted':
          return node.data.tag_posted == 0;
        case 'Need_First_Count_Printed':
          return node.data.firstCountPrintTag == null;
        case '1st_counts_completed':
          return node.data.tag_cnt_dt != null;
        case 'Bulk_tags_with_on_hand_qty':
          return node.data && node.data.tag_type == 'B' && node.data.LD_QTY_OH > 0;
        default:
          return true;
      }

    }
  };

  onGridReady(params: any) {
    this.gridApi = params.api;
    this.gridColumnApi = params.columnApi;
  }

  updateUrl = (params) => {
    let gridParams = _compressToEncodedURIComponent(params.api, params.columnApi);
    this.router.navigate([`.`], {
      relativeTo: this.activatedRoute,
      queryParamsHandling: 'merge',
      queryParams: {
        gridParams
      }
    });
  }

  data: any;
  async getData() {
    try {
      this.gridApi?.showLoadingOverlay()
      this.data = await this.api.getTags();
      this.gridApi?.hideOverlay();
    } catch (err) {
      this.gridApi?.hideOverlay()
    }
  }

}
