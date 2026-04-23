import { Component, OnDestroy, OnInit } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { GraphicsService } from "@app/core/api/operations/graphics/graphics.service";
import { SharedModule } from "@app/shared/shared.module";
import { QueueSelectionService } from "./queue-selection/queue-selection.component";
import { GraphicsBomModalService } from "./graphics-bom-modal/graphics-bom-modal.component";
import { CommentsModalService } from "@app/shared/components/comments/comments-modal.service";
import { CompleteService } from "./complete/complete.component";
import {
  GraphicsProductionMessageType,
  GraphicsProductionWebsocketService,
} from "@app/core/services/graphics-production-websocket.service";

import { Pipe, PipeTransform } from "@angular/core";
import { SweetAlert } from "@app/shared/sweet-alert/sweet-alert.service";
import { Subscription } from "rxjs";

@Pipe({
  standalone: true,
  name: "filterlist",
})
export class FilterlistPipe implements PipeTransform {
  transform(value: any, args?: any): any {
    if (!args) return value;
    return value.filter(
      (item) => item.graphicsWorkOrder.toString().indexOf(args.toString()) > -1
    );
  }
}

@Component({
  standalone: true,
  imports: [SharedModule, FilterlistPipe],
  selector: "app-graphics-production",
  templateUrl: "./graphics-production.component.html",
  styleUrls: ["./graphics-production.component.scss"],
})
export class GraphicsProductionComponent implements OnInit, OnDestroy {
  constructor(
    public route: ActivatedRoute,
    public router: Router,
    public graphicsService: GraphicsService,
    private queueSelectionService: QueueSelectionService,
    private graphicsBomModalService: GraphicsBomModalService,
    private commentsModalService: CommentsModalService,
    private completeService: CompleteService,
    private graphicsProductionWebsocketService: GraphicsProductionWebsocketService
  ) {}

  private graphicsProductionSubscription?: Subscription;

  ngOnInit(): void {
    this.graphicsProductionWebsocketService.init();
    this.setupWebSocketSubscriptions();
    this.getData();
  }

  ngOnDestroy(): void {
    if (this.graphicsProductionSubscription) {
      this.graphicsProductionSubscription.unsubscribe();
    }
    this.graphicsProductionWebsocketService.destroy();
  }

  private setupWebSocketSubscriptions(): void {
    this.graphicsProductionSubscription = this.graphicsProductionWebsocketService
      .subscribe<any>(GraphicsProductionMessageType.GRAPHICS_PRODUCTION)
      .subscribe(() => {
        this.getData(false);
      });
  }

  searchWorkOrder = "";

  send() {
    this.graphicsProductionWebsocketService.publish(
      GraphicsProductionMessageType.GRAPHICS_PRODUCTION,
      {}
    );
  }

  async onDeleteWO(row) {
    if (!confirm("Are you sure you want to delete WO?")) return;
    try {
      SweetAlert.loading("Deleting WO. Please wait.");
      await this.graphicsService.update(row.id, { active: 0 });
      await this.getData(false);
      this.send();
      SweetAlert.close();
    } catch (err) {
      SweetAlert.close();
    }
  }

  openComplete(item) {
    const modalRef = this.completeService.open(item, item.queueNames);
    modalRef.result.then(
      (data: any) => {
        this.getData(false);
        this.send();
      },
      () => {}
    );
  }

  openComments(item) {
    let modalRef = this.commentsModalService.open(
      item.graphicsWorkOrder,
      "Graphics"
    );
    modalRef.result.then(
      (result: any) => {
        this.getData(false);
        this.send();
      },
      () => {}
    );
  }

  data: any;

  isLoading = false;
  async getData(showIsLoading = true) {
    try {
      this.isLoading = showIsLoading;
      this.data = await this.graphicsService.getGraphicsProduction();
      this.isLoading = false;
    } catch (err) {
      this.isLoading = false;
    }
  }

  async openQueueSelection(row: any) {
    if (parseInt(row.holdCount) > 0) {
      alert("Remove all hold before continuing.");
      return;
    }
    const modalRef = this.queueSelectionService.open(row, this.data.queueNames);

    modalRef.result.then(
      async (result: any) => {
        try {
          SweetAlert.loading("Moving WO. Please wait..");
          await this.getData(false);
          this.send();
          SweetAlert.close();
        } catch (err) {
          SweetAlert.close();
        }
      },
      () => {}
    );
  }

  async openGraphicsBom(row) {
    const modalRef = this.graphicsBomModalService.open(row.graphicsWorkOrder);
    modalRef.result.then(
      (result: any) => {
        this.getData(false);
        this.send();
      },
      () => {}
    );
  }
}
