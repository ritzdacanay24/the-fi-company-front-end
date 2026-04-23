import { Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { StructuredWebsocketService } from "./structured-websocket.service";

const GRAPHICS_PRODUCTION_CHANNEL = "graphics-production";

export enum GraphicsProductionMessageType {
  GRAPHICS_PRODUCTION = "GRAPHICS PRODUCTION",
}

export interface GraphicsProductionSocketEnvelope<T = unknown> {
  type: GraphicsProductionMessageType;
  message?: string;
  data?: T;
}

@Injectable({
  providedIn: "root",
})
export class GraphicsProductionWebsocketService {
  constructor(
    private readonly structuredWebsocketService: StructuredWebsocketService
  ) {}

  init(): void {
    this.structuredWebsocketService.init();
    this.structuredWebsocketService.joinChannel(GRAPHICS_PRODUCTION_CHANNEL);
  }

  destroy(): void {
    this.structuredWebsocketService.leaveChannel(GRAPHICS_PRODUCTION_CHANNEL);
  }

  subscribe<T = unknown>(
    type: GraphicsProductionMessageType
  ): Observable<GraphicsProductionSocketEnvelope<T>> {
    return this.structuredWebsocketService.subscribe(
      GRAPHICS_PRODUCTION_CHANNEL,
      type
    ) as Observable<GraphicsProductionSocketEnvelope<T>>;
  }

  publish<T = unknown>(
    type: GraphicsProductionMessageType,
    data: T,
    message?: string
  ): void {
    this.structuredWebsocketService.publish(
      GRAPHICS_PRODUCTION_CHANNEL,
      type,
      data,
      message
    );
  }
}
