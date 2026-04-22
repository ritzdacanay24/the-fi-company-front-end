import { Injectable } from "@angular/core";
import { Observable } from "rxjs";
import {
  StructuredWebsocketService,
} from "./structured-websocket.service";

const MATERIAL_PICKING_CHANNEL = "material-request-picking";

export enum MaterialPickingMessageType {
  MATERIAL_PICKING_TRANSACTION = "MATERIAL_PICKING_TRANSACTION",
  VALIDATE_ADD_TRANSACTION = "VALIDATE_ADD_TRANSACTION",
  PICKING_ADD_TRANSACTION = "PICKING_ADD_TRANSACTION",
}

export interface MaterialPickingSocketMessage<T = unknown> {
  type: MaterialPickingMessageType;
  message?: string;
  data?: T;
}

@Injectable({
  providedIn: "root",
})
export class MaterialRequestPickingWebsocketService {
  constructor(private readonly structuredWebsocketService: StructuredWebsocketService) {}

  init(): void {
    this.structuredWebsocketService.init();
    this.structuredWebsocketService.joinChannel(MATERIAL_PICKING_CHANNEL);
  }

  destroy(): void {
    this.structuredWebsocketService.leaveChannel(MATERIAL_PICKING_CHANNEL);
  }

  subscribe<T = unknown>(
    type: MaterialPickingMessageType
  ): Observable<MaterialPickingSocketMessage<T>> {
    return this.structuredWebsocketService.subscribe(MATERIAL_PICKING_CHANNEL, type) as Observable<
      MaterialPickingSocketMessage<T>
    >;
  }

  publish<T = unknown>(
    type: MaterialPickingMessageType,
    data: T,
    message?: string
  ): void {
    this.structuredWebsocketService.publish(MATERIAL_PICKING_CHANNEL, type, data, message);
  }
}
