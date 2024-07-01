import { Component, OnInit, Pipe, PipeTransform } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { agGridOptions } from '@app/shared/config/ag-grid.config';
import { SharedModule } from '@app/shared/shared.module';
import { _compressToEncodedURIComponent, _decompressFromEncodedURIComponent } from 'src/assets/js/util/jslzString';
import { AgGridModule } from 'ag-grid-angular';
import { GridApi, GridOptions } from 'ag-grid-community';
import { NgSelectModule } from '@ng-select/ng-select';
import { DateRangeComponent } from '@app/shared/components/date-range/date-range.component';
import { PhyscialInventoryService } from '@app/core/api/operations/physcial-inventory/physcial-inventory.service';
import { currencyFormatter } from 'src/assets/js/util';
import moment from 'moment';
import { NgxBarcode6Module } from 'ngx-barcode6';
import { SweetAlert } from '@app/shared/sweet-alert/sweet-alert.service';
import { GridFiltersComponent } from '@app/shared/grid-filters/grid-filters.component';
import { GridSettingsComponent } from '@app/shared/grid-settings/grid-settings.component';

@Pipe({
  standalone: true,
  name: "orderBy"
})
export class OrderByPipe implements PipeTransform {
  transform(array: any, field: string): any[] {
    if (!Array.isArray(array)) {
      return null;
    }

    const collator = new Intl.Collator('en', { numeric: true, sensitivity: 'base' })

    return array.sort((a, b) => collator.compare(a[field], b[field]))
  }
}


// @Pipe({
//   standalone: true,
//   name: "orderBy"
// })
// export class OrderByPipe implements PipeTransform {
//   transform(array: any, sortBy: string, order?: string): any[] {
//     const sortOrder:any = order ? order : 'asc'; // setting default ascending order

//     return orderBy(array, [sortBy], [sortOrder]);
//   }
// }



@Component({
  standalone: true,
  imports: [
    SharedModule,
    AgGridModule,
    NgSelectModule,
    DateRangeComponent,
    OrderByPipe,
    NgxBarcode6Module,
    GridSettingsComponent,
    GridFiltersComponent,
  ],
  selector: 'app-tags',
  templateUrl: './tags.component.html',
})
export class TagsComponent implements OnInit {
  totalBlankTags
  pageId = '/physical-inventory/tags'

  externalFilterChanged = (newValue) => {
    this.ageType = newValue;
    this.gridApi.onFilterChanged();
  }

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

  gridApi: GridApi;

  include_blank_after_each_bay = false;

  testMethod = ($event) => {
    this.include_blank_after_each_bay = $event
  }

  id = null;

  title = "Tag Report"

  columnDefs: any = [
    {
      maxWidth: 42,
      checkboxSelection: true,
      pinned: 'left',
      filter: false,
      headerCheckboxSelectionFilteredOnly: true,
      headerCheckboxSelection: true,
      suppressHeaderMenuButton: true,
      cellClass: 'lock-pinned'
    }, {
      headerName: 'Tag Info',
      children: [
        { field: 'tag_type', headerName: 'Tag Type', filter: 'agMultiColumnFilter' }
        , { field: 'AREA1', headerName: 'Area', filter: 'agMultiColumnFilter' }
        , { field: 'tag_nbr', headerName: 'Tag #', filter: 'agTextColumnFilter', maxWidth: 80 }
        , { field: 'tag_part', headerName: 'Part', filter: 'agMultiColumnFilter' }
        , { field: 'AISLE', headerName: 'Aisle', filter: 'agMultiColumnFilter' }
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
          }
        }
        , { field: 'TAG_LOC_REAL', headerName: 'Actual Tag Location', filter: 'agTextColumnFilter', floatingFilter: false }
        , { field: 'LOC_TYPE', headerName: 'Loc Type', filter: 'agMultiColumnFilter' }
        , { field: 'LD_QTY_OH', headerName: 'Qty On Hand', filter: 'agTextColumnFilter' }
        , { field: 'UNIT_COST', headerName: 'Unit Cost', filter: 'agNumberColumnFilter', valueFormatter: currencyFormatter }
        , { field: 'tag_serial', headerName: 'Tag Serial', filter: 'agMultiColumnFilter', hide: false }
        , { field: 'LD_REF', headerName: 'Ref', filter: 'agTextColumnFilter', hide: false }
        , { field: 'tag_crt_dt', headerName: 'Tag Create Date', filter: 'agTextColumnFilter', hide: true }
        , { field: 'tag_crt_time', headerName: 'Tag Create Time', filter: 'agTextColumnFilter', hide: true }
        , { field: 'tag_posted', headerName: 'Tag Posted', filter: 'agTextColumnFilter', hide: false }
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
              let printedCount = 0
              for (let i = 0; i < params.node.allLeafChildren.length; i++) {
                if (params.node.allLeafChildren[i].data.firstCountPrintTag == null) {
                  printedCount++
                  sum = true
                };
              }

              if (sum) {
                return `Printed ${params.node.allLeafChildren.length - printedCount} of ${params.node.allLeafChildren.length}`
              } else {
                return `Printed ${params.node.allLeafChildren.length - printedCount} of ${params.node.allLeafChildren.length}`
              }

            }
            return params.value
          },
          cellClass: (params: any) => {

            if (!params.data && !params.node.footer) {
              let sum = false;
              let printedCount = 0
              for (let i = 0; i < params.node.allLeafChildren.length; i++) {
                if (params.node.allLeafChildren[i].data.firstCountPrintTag == null) {
                  printedCount++
                  sum = true
                };
              }

              if ((params.node.allLeafChildren.length - printedCount) == params.node.allLeafChildren.length) {
                return ['bg-success-subtle bg-opacity-75 text-success'];
              } else {
                return ['bg-danger-subtle bg-opacity-75 text-danger'];
              }
            }

            return null;
          },
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
    groupTotalRow: null,
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
  }

  updateUrl = (params) => {
    let gridParams = _compressToEncodedURIComponent(params.api);
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
      this.calculateCounts();
      this.gridApi?.hideOverlay();
    } catch (err) {
      this.gridApi?.hideOverlay()
    }
  }


  selectedRows = [];
  groupRows = []
  loadingIndicator = false;

  printSelected(printSelection) {

    this.groupRows = []

    this.selectedRows = this.gridApi.getSelectedRows();

    this.groupRows = this.selectedRows.reduce((hash, obj) => {
      let key = obj.AREA1 + '|' + obj.AISLE;
      if (hash[key])
        hash[key].det.push(obj);
      else {
        hash[key] = obj;
        hash[key].det = [obj];
      }
      return hash;
    }, {});

    if (this.selectedRows.length === 0) {
      alert('Please check row to print.')
      return;
    }

    // if (this.selectedRows.length > 500) {
    //   alert('Only 500 can be printed at a time.')
    //   return;
    // }

    let date = moment().format("YYYY-MM-DD HH:mm:ss");
    let tagsToUpdate = []
    for (let i = 0; i < this.selectedRows.length; i++) {
      this.selectedRows[i][printSelection == 1 ? 'firstCountPrintTag' : printSelection == 2 ? 'secondCountPrintTag' : 'thirdCountPrintTag'] = date;
      tagsToUpdate.push(this.selectedRows[i].tag_nbr)
    }

    // this.gridApi.updateRowData({ update: this.selectedRows });
    this.gridApi.applyTransaction({ update: this.selectedRows });

    var params = {
      data: tagsToUpdate,
      type: printSelection == 1 ? 'First counts' : printSelection == 2 ? 'Second counts' : 'Third Counts'
    };

    this.api.updatePrint(params).subscribe(
      (data: any) => {
        this.gridApi.deselectAll();

        this.gridApi.redrawRows();
        //this.gridApi.setFilterModel(null);

        setTimeout(() => {
          this.print(printSelection);
        }, 500);
      }, error => {
        this.loadingIndicator = false;
      })
  }


  public print(printSelection) {
    var printContents = document.getElementById(printSelection == 1 ? 'printDiv' : 'printDiv1').innerHTML;
    var popupWin = window.open('', '_blank', 'width=1000,height=600');
    popupWin.document.open();
    popupWin.document.write(`
      <html>
        <head>
          <title>Tags</title>
          <link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/4.0.0/css/bootstrap.min.css" integrity="sha384-Gn5384xqQ1aoWXA+058RXPxPg6fy4IWvTNh0E263XmFcJlSAwiGgFAW/dAiS6JXm" crossorigin="anonymous">

          <style>
          @page {
            size: portrait;
          }
          @media print {
            body{
                font-size:14px !important
            }
            table{
              font-size: 14px !important;
            }
            barcode-left {
              text-align:left !important
            }
            .table > tbody > tr > td {
              vertical-align: middle;
            }
            .table > thead > tr > th {
              text-align:center
            }
          }
          </style>
        </head>
        <body onload="window.print();window.close()">
          ${printContents}
        </body>

      </html>`
    );
    popupWin.document.close();
    popupWin.onload = function () {
      popupWin.print();
      popupWin.close();
    };
  }

  public printBulk(printSelection) {
    var printContents = document.getElementById('printBlankTagDiv').innerHTML;
    var popupWin = window.open('', '_blank', 'width=1000,height=600');
    popupWin.document.open();
    popupWin.document.write(`
      <html>
        <head>
          <title>Tags</title>
          <link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.7/css/bootstrap.min.css" integrity="sha384-Gn5384xqQ1aoWXA+058RXPxPg6fy4IWvTNh0E263XmFcJlSAwiGgFAW/dAiS6JXm" crossorigin="anonymous">
          <style>
          @page {
            size: portrait;
          }
          @media print {
            body{
              font-size:14px !important
            }
            table{
              font-size: 14px !important;
            }
            barcode-left {
              text-align:left !important
            }
            .table > tbody > tr > td {
              vertical-align: middle;
            }
            .table > thead > tr > th {
              text-align:center
            }
            footer {
              position: fixed;
              bottom:0px
            }
            .bulk-tags{
              font-size:12px !important;
            }
          }
          </style>
        </head>
        <body onload="window.print();window.close()">
          ${printContents}
        </body>
        <footer>
          Blank Tag
        </footer>
      </html>`
    );
    popupWin.document.close();
    popupWin.onload = function () {
      popupWin.print();
      popupWin.close();
    };
  }


  printBlankTags = async function () {
    const { value: numberOfTags } = await SweetAlert.fire({
      title: 'Print Bulk Tags',
      html:
        '<div class="row g-0 m-0 p-0" style="overflow:hidden"><div class="col me-1">' +
        '<input id="swal-input1" class="swal2-input form-control ms-1 me-3" placeholder="Starting Tag Number" autocomplete="off">' +
        '<input id="swal-input2" class="swal2-input form-control ms-1 me-3" placeholder="Ending Tag Number" autocomplete="off">' +
        '</div></div>',
      focusConfirm: false,
      showCancelButton: true,
      inputValidator: (value: any) => {
        if (!value) {
          return 'You need to write something!'
        } else if (value > 100) {
          return 'Cannot print more than 100 bulk tags'
        }
        return null;
      },
      preConfirm: () => {
        return [
          (<HTMLInputElement>document.getElementById("swal-input1")).value,
          (<HTMLInputElement>document.getElementById("swal-input2")).value
        ]
      }
    })

    if (numberOfTags) {

      let values = numberOfTags;
      let starting = parseInt(values[0])
      let ending = parseInt(values[1])

      this.totalBlankTags = [];

      for (let i = starting; i <= ending; i++) {
        this.totalBlankTags.push({
          tag_nbr: i
        })
      }

      setTimeout(() => {
        this.printBulk();
      }, 500);
    }
  }


  totalCount = 0;
  totalFirstCounts = 0;
  completedFirstCounts = 0;
  totalSecondCounts = 0;
  completedSecondCounts = 0;
  totalThirdCounts = 0;
  isFirstCountFinished = true;

  calculateCounts() {
    this.totalCount = this.data.length;
    this.totalFirstCounts = 0;
    this.completedFirstCounts = 0;
    this.totalSecondCounts = 0;
    this.completedSecondCounts = 0;

    this.totalThirdCounts = 0;

    this.isFirstCountFinished = true;
    for (let i = 0; i < this.data.length; i++) {

      if (this.data[i].thirdCountPrintTag != null) {
        this.totalThirdCounts++;
      }

      if (this.data[i].tag_cnt_dt) {
        this.completedFirstCounts++;
        if (this.data[i].secondCountPrintTag) {
          this.totalSecondCounts++
          if (this.data[i].tag_rcnt_dt != null) {
            this.completedSecondCounts++
          }
        }
      } else {
        this.isFirstCountFinished = false;
      }
    }
  }

}
