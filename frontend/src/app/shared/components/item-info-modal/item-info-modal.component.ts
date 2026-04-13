import { Injectable } from "@angular/core";
import { NgbModal } from "@ng-bootstrap/ng-bootstrap";

import { Component, Input } from "@angular/core";
import { NgbActiveModal } from "@ng-bootstrap/ng-bootstrap";
import { SharedModule } from "@app/shared/shared.module";
import { AgGridModule } from "ag-grid-angular";
import { QadPartSearchComponent } from "../qad-part-search/qad-part-search.component";
import { PartLookupComponent } from "../part-lookup/part-lookup.component";
import { DragDropModule } from "@angular/cdk/drag-drop";
import { ResizableModule } from "angular-resizable-element";
import { AngularDraggableModule } from "angular2-draggable";

@Injectable({
  providedIn: "root",
})
export class ItemInfoModalService {
  modalRef: any;

  constructor(public modalService: NgbModal) { }

  public open(partNumber: string) {
    this.modalRef = this.modalService.open(ItemInfoModalComponent, {
      size: "xl",
      fullscreen: false,
      backdrop:false,
      scrollable: true,
      centered: true,
      backdropClass: 'backgroundTransparent',
      modalDialogClass: 'backgroundTransparent1',
      windowClass: 'backgroundTransparent'
    });
    this.modalRef.componentInstance.partNumber = partNumber;
    return this.modalRef;
  }
}

@Component({
  standalone: true,
  imports: [
    SharedModule,
    AgGridModule,
    QadPartSearchComponent,
    PartLookupComponent, DragDropModule, AngularDraggableModule, ResizableModule
  ],
  selector: "app-item-info-modal",
  templateUrl: `./item-info-modal.component.html`,
  styleUrls: [],
  styles: [
    `
      .rectangle {
        position: relative;
        top: 200px;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 300px;
        height: 150px;
        background-color: #fd4140;
        border: solid 1px #121621;
        color: #121621;
        margin: auto;
      }

      mwlResizable {
        box-sizing: border-box; // required for the enableGhostResize option to work
      }

      .resize-handle-top,
      .resize-handle-bottom {
        position: absolute;
        height: 5px;
        cursor: row-resize;
        width: 100%;
      }

      .resize-handle-top {
        top: 0;
      }

      .resize-handle-bottom {
        bottom: 0;
      }

      .resize-handle-left,
      .resize-handle-right {
        position: absolute;
        height: 100%;
        cursor: col-resize;
        width: 5px;
      }

      .resize-handle-left {
        left: 0;
      }

      .resize-handle-right {
        right: 0;
      }
    `,
  ],
})
export class ItemInfoModalComponent {
  constructor(private ngbActiveModal: NgbActiveModal) { }

  ngOnInit() { }

  notifyParent($event) {
    this.partNumber = $event.pt_part;
  }

  public dismiss() {
    this.ngbActiveModal.dismiss("dismiss");
  }

  public close() {
    this.ngbActiveModal.close(this.partNumber);
  }

  isLoadingEmitter($event) { }

  hasDataEmitter = false;
  isLoading = false;
  @Input() partNumber = null;

  getData;

  getDataEmitter($event) {
    this.getData = $event;
  }
}
