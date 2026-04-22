import { Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { filter } from "rxjs/operators";
import { WebsocketService } from "./websocket.service";

export interface StructuredSocketMessage<T = unknown> {
  type: string;
  channel?: string;
  message?: string;
  data?: T;
}

export enum StructuredSocketControlType {
  JOIN_CHANNEL = "join_channel",
  LEAVE_CHANNEL = "leave_channel",
}

@Injectable({
  providedIn: "root",
})
export class StructuredWebsocketService {
  constructor(private readonly websocketService: WebsocketService) {}

  init(): void {
    if (!this.websocketService.getWebSocket()) {
      this.websocketService.connect();
    }
  }

  joinChannel(channel: string): void {
    this.init();
    this.websocketService.next({
      type: StructuredSocketControlType.JOIN_CHANNEL,
      channel,
    });
  }

  leaveChannel(channel: string): void {
    this.websocketService.next({
      type: StructuredSocketControlType.LEAVE_CHANNEL,
      channel,
    });
  }

  subscribe<T = unknown>(
    channel: string,
    type: string
  ): Observable<StructuredSocketMessage<T>> {
    this.init();
    const socket = this.websocketService.getWebSocket();
    if (!socket) {
      throw new Error("WebSocket is not connected");
    }

    return (socket as Observable<StructuredSocketMessage<T>>).pipe(
      filter((message) => message?.channel === channel && message?.type === type)
    );
  }

  publish<T = unknown>(
    channel: string,
    type: string,
    data: T,
    message?: string
  ): void {
    this.websocketService.next({ channel, type, data, message });
  }
}
