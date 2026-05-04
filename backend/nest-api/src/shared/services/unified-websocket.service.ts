import * as WebSocket from 'ws';
import { Server } from 'http';
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { MenuBadgeService } from '@/nest/modules/menu-badge/menu-badge.service';

export enum WebSocketMessageType {
  JOIN_CHANNEL = 'join_channel',
  LEAVE_CHANNEL = 'leave_channel',
  JOIN_SIDEBAR_MENU_BADGE_ROOM = 'join_sidebar_menu_badge_room',
  LEAVE_SIDEBAR_MENU_BADGE_ROOM = 'leave_sidebar_menu_badge_room',
  REQUEST_SIDEBAR_MENU_BADGE_COUNTS = 'request_sidebar_menu_badge_counts',
  SIDEBAR_MENU_BADGE_COUNTS = 'sidebar_menu_badge_counts',
  MR_ALERT_REQUEST_SNAPSHOT = 'MR_ALERT_REQUEST_SNAPSHOT',
  PING = 'ping',
  PONG = 'pong',
}

const BADGE_CHANNEL = 'sidebar-menu-badges';

interface UnifiedWebSocketMessage {
  type: WebSocketMessageType | string;
  channel?: string;
  data?: unknown;
  message?: string;
  timestamp?: number;
}

interface ClientConnection {
  ws: WebSocket;
  userId: number;
  channels: Set<string>;
}

@Injectable()
export class UnifiedWebSocketService implements OnModuleDestroy {
  private readonly logger = new Logger(UnifiedWebSocketService.name);
  private wss!: WebSocket.Server;
  private readonly clients: Map<string, ClientConnection> = new Map();

  private badgePollingInterval: NodeJS.Timeout | null = null;
  private readonly BADGE_POLL_INTERVAL_MS = 60000;
  private isBadgePolling = false;

  private httpServer: Server | null = null;

  private mrAlertRequestHandler: ((clientId: string, userId: number) => Promise<void>) | null = null;

  constructor(private readonly menuBadgeService: MenuBadgeService) {}

  setHttpServer(server: Server): void {
    if (this.httpServer) {
      this.logger.warn('HTTP server already set, skipping websocket setup');
      return;
    }

    this.httpServer = server;

    this.wss = new WebSocket.Server({
      server,
      path: '/api/ws',
    });

    this.setupWebSocketServer();
    this.startBadgePolling();
    this.logger.log('Unified WebSocket server started on /api/ws');
  }

  private setupWebSocketServer(): void {
    this.wss.on('connection', (ws: WebSocket, req: any) => {
      const clientId = this.generateClientId();
      const url = new URL(req.url || '', `http://${req.headers.host}`);
      const userId = Number(url.searchParams.get('userId') || 0);

      this.clients.set(clientId, {
        ws,
        userId,
        channels: new Set(),
      });

      this.sendToClient(clientId, {
        type: WebSocketMessageType.PONG,
        channel: 'system',
        data: { message: 'Connected to modern websocket', clientId },
        timestamp: Date.now(),
      });

      ws.on('message', (data: WebSocket.Data) => {
        try {
          const message = JSON.parse(data.toString()) as UnifiedWebSocketMessage;
          this.handleClientMessage(clientId, message);
        } catch (error) {
          this.logger.error(`Error parsing websocket message for ${clientId}:`, error as Error);
        }
      });

      ws.on('close', () => {
        this.clients.delete(clientId);
      });

      ws.on('error', (error: Error) => {
        this.logger.error(`WebSocket error for ${clientId}:`, error);
      });
    });

    this.wss.on('error', (error: Error) => {
      this.logger.error('Unified websocket server error:', error);
    });
  }

  private handleClientMessage(clientId: string, message: UnifiedWebSocketMessage): void {
    const client = this.clients.get(clientId);
    if (!client) {
      return;
    }

    switch (message.type) {
      case WebSocketMessageType.JOIN_CHANNEL:
        if (typeof message.channel === 'string' && message.channel.length > 0) {
          client.channels.add(message.channel);
        }
        break;

      case WebSocketMessageType.LEAVE_CHANNEL:
        if (typeof message.channel === 'string' && message.channel.length > 0) {
          client.channels.delete(message.channel);
        }
        break;

      case WebSocketMessageType.JOIN_SIDEBAR_MENU_BADGE_ROOM:
        client.channels.add(BADGE_CHANNEL);
        this.sendBadgeCountsToClient(clientId).catch((error) => {
          this.logger.error(`Error sending initial badge counts to ${clientId}:`, error as Error);
        });
        break;

      case WebSocketMessageType.LEAVE_SIDEBAR_MENU_BADGE_ROOM:
        client.channels.delete(BADGE_CHANNEL);
        break;

      case WebSocketMessageType.REQUEST_SIDEBAR_MENU_BADGE_COUNTS:
        client.channels.add(BADGE_CHANNEL);
        this.sendBadgeCountsToClient(clientId).catch((error) => {
          this.logger.error(`Error serving badge request for ${clientId}:`, error as Error);
        });
        break;

      case WebSocketMessageType.PING:
        this.sendToClient(clientId, {
          type: WebSocketMessageType.PONG,
          channel: 'system',
          timestamp: Date.now(),
        });
        break;

      case WebSocketMessageType.MR_ALERT_REQUEST_SNAPSHOT:
        if (this.mrAlertRequestHandler) {
          this.mrAlertRequestHandler(clientId, client.userId).catch((error) => {
            this.logger.error(`Error handling MR alert request for ${clientId}:`, error as Error);
          });
        }
        break;

      default:
        this.broadcastChannelMessage(message);
        break;
    }
  }

  publishToChannel(
    channel: string,
    type: string,
    data?: unknown,
    message?: string,
  ): void {
    if (!channel || !type) {
      return;
    }

    const payload: UnifiedWebSocketMessage = {
      channel,
      type,
      data,
      message,
      timestamp: Date.now(),
    };

    this.clients.forEach((client, targetClientId) => {
      if (client.channels.has(channel)) {
        this.sendToClient(targetClientId, payload);
      }
    });
  }

  private broadcastChannelMessage(message: UnifiedWebSocketMessage): void {
    if (typeof message.type !== 'string' || message.type.length === 0 || !message.channel) {
      return;
    }

    const payload: UnifiedWebSocketMessage = {
      type: message.type,
      channel: message.channel,
      data: message.data,
      message: message.message,
      timestamp: message.timestamp ?? Date.now(),
    };

    this.clients.forEach((client, targetClientId) => {
      if (client.channels.has(message.channel!)) {
        this.sendToClient(targetClientId, payload);
      }
    });
  }

  private startBadgePolling(): void {
    if (this.badgePollingInterval) {
      return;
    }

    this.badgePollingInterval = setInterval(async () => {
      if (this.isBadgePolling) {
        return;
      }

      this.isBadgePolling = true;
      try {
        await this.broadcastBadgeCounts();
      } finally {
        this.isBadgePolling = false;
      }
    }, this.BADGE_POLL_INTERVAL_MS);
  }

  private async broadcastBadgeCounts(): Promise<void> {
    const subscribedClients = Array.from(this.clients.entries())
      .filter(([, client]) => client.channels.has(BADGE_CHANNEL));

    if (subscribedClients.length === 0) {
      return;
    }

    try {
      await Promise.all(
        subscribedClients.map(async ([clientId, client]) => {
          const counts = await this.menuBadgeService.getSidebarBadgeCounts(client.userId || undefined);
          this.sendToClient(clientId, {
            type: WebSocketMessageType.SIDEBAR_MENU_BADGE_COUNTS,
            channel: BADGE_CHANNEL,
            data: { counts },
            timestamp: Date.now(),
          });
        })
      );
    } catch (error) {
      this.logger.error('Failed to broadcast badge counts:', error as Error);
    }
  }

  private async sendBadgeCountsToClient(clientId: string): Promise<void> {
    try {
      const client = this.clients.get(clientId);
      const userId = client?.userId || undefined;
      const counts = await this.menuBadgeService.getSidebarBadgeCounts(userId);
      this.sendToClient(clientId, {
        type: WebSocketMessageType.SIDEBAR_MENU_BADGE_COUNTS,
        channel: BADGE_CHANNEL,
        data: { counts },
        timestamp: Date.now(),
      });
    } catch (error) {
      this.logger.error(`Failed to send badge counts to ${clientId}:`, error as Error);
    }
  }

  private sendToClient(clientId: string, message: UnifiedWebSocketMessage): boolean {
    const client = this.clients.get(clientId);
    if (!client || client.ws.readyState !== WebSocket.OPEN) {
      return false;
    }

    try {
      client.ws.send(JSON.stringify(message));
      return true;
    } catch (error) {
      this.logger.error(`Error sending websocket message to ${clientId}:`, error as Error);
      return false;
    }
  }

  registerMrAlertRequestHandler(handler: (clientId: string, userId: number) => Promise<void>): void {
    this.mrAlertRequestHandler = handler;
  }

  sendToClientInChannel(
    clientId: string,
    channel: string,
    type: string,
    data?: unknown,
    message?: string,
  ): void {
    const client = this.clients.get(clientId);
    if (!client || !client.channels.has(channel)) {
      return;
    }

    this.sendToClient(clientId, {
      channel,
      type,
      data,
      message,
      timestamp: Date.now(),
    });
  }

  private generateClientId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  }

  onModuleDestroy(): void {
    this.close();
  }

  close(): void {
    if (this.badgePollingInterval) {
      clearInterval(this.badgePollingInterval);
      this.badgePollingInterval = null;
    }

    this.clients.forEach((client) => {
      client.ws.close();
    });
    this.clients.clear();

    if (this.wss) {
      this.wss.close();
    }
  }
}
