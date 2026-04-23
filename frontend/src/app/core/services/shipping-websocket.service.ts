import { Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { StructuredWebsocketService } from "./structured-websocket.service";

const SHIPPING_CHANNEL = "shipping-schedule";

export enum ShippingMessageType {
  SHIPPING = "WS_SHIPPING",
  SHIPPING_PRIORITY = "WS_SHIPPING_PRIORITY",
}

export interface ShippingSocketEnvelope<T = unknown> {
  type: ShippingMessageType;
  message?: string;
  data?: T;
}

@Injectable({
  providedIn: "root",
})
export class ShippingWebsocketService {
  constructor(
    private readonly structuredWebsocketService: StructuredWebsocketService
  ) {}

  init(): void {
    this.structuredWebsocketService.init();
    this.structuredWebsocketService.joinChannel(SHIPPING_CHANNEL);
  }

  destroy(): void {
    this.structuredWebsocketService.leaveChannel(SHIPPING_CHANNEL);
  }

  subscribe<T = unknown>(
    type: ShippingMessageType
  ): Observable<ShippingSocketEnvelope<T>> {
    return this.structuredWebsocketService.subscribe(
      SHIPPING_CHANNEL,
      type
    ) as Observable<ShippingSocketEnvelope<T>>;
  }

  publish<T = unknown>(
    type: ShippingMessageType,
    data: T,
    message?: string
  ): void {
    this.structuredWebsocketService.publish(
      SHIPPING_CHANNEL,
      type,
      data,
      message
    );
  }
}
