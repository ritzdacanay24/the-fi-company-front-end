import { Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { StructuredWebsocketService } from "./structured-websocket.service";

const MASTER_PRODUCTION_CHANNEL = "master-production";

export enum MasterProductionMessageType {
  MASTER_PRODUCTION = "MASTER_PRODUCTION",
  WORK_ORDER_ROUTING = "Work Order Routing",
}

export interface MasterProductionSocketEnvelope<T = unknown> {
  type: MasterProductionMessageType;
  message?: string;
  data?: T;
}

@Injectable({
  providedIn: "root",
})
export class MasterProductionWebsocketService {
  constructor(
    private readonly structuredWebsocketService: StructuredWebsocketService
  ) {}

  init(): void {
    this.structuredWebsocketService.init();
    this.structuredWebsocketService.joinChannel(MASTER_PRODUCTION_CHANNEL);
  }

  destroy(): void {
    this.structuredWebsocketService.leaveChannel(MASTER_PRODUCTION_CHANNEL);
  }

  subscribe<T = unknown>(
    type: MasterProductionMessageType
  ): Observable<MasterProductionSocketEnvelope<T>> {
    return this.structuredWebsocketService.subscribe(
      MASTER_PRODUCTION_CHANNEL,
      type
    ) as Observable<MasterProductionSocketEnvelope<T>>;
  }

  publish<T = unknown>(
    type: MasterProductionMessageType,
    data: T,
    message?: string
  ): void {
    this.structuredWebsocketService.publish(
      MASTER_PRODUCTION_CHANNEL,
      type,
      data,
      message
    );
  }
}
