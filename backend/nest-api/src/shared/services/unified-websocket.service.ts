import * as WebSocket from 'ws';
import { Server } from 'http';
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { MenuBadgeService } from '@/nest/modules/menu-badge/menu-badge.service';

export enum WebSocketMessageType {
  JOIN_SIDEBAR_MENU_BADGE_ROOM = 'join_sidebar_menu_badge_room',
  LEAVE_SIDEBAR_MENU_BADGE_ROOM = 'leave_sidebar_menu_badge_room',
  REQUEST_SIDEBAR_MENU_BADGE_COUNTS = 'request_sidebar_menu_badge_counts',
  SIDEBAR_MENU_BADGE_COUNTS = 'sidebar_menu_badge_counts',
  PING = 'ping',
  PONG = 'pong',
}

const BADGE_CHANNEL = 'sidebar-menu-badges';

interface UnifiedWebSocketMessage {
  type: WebSocketMessageType | string;
  channel?: string;
  data?: unknown;
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

      default:
        break;
    }
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
    const subscribedClientIds = Array.from(this.clients.entries())
      .filter(([, client]) => client.channels.has(BADGE_CHANNEL))
      .map(([clientId]) => clientId);

    if (subscribedClientIds.length === 0) {
      return;
    }

    const counts = await this.menuBadgeService.getSidebarBadgeCounts();

    subscribedClientIds.forEach((clientId) => {
      this.sendToClient(clientId, {
        type: WebSocketMessageType.SIDEBAR_MENU_BADGE_COUNTS,
        channel: BADGE_CHANNEL,
        data: { counts },
        timestamp: Date.now(),
      });
    });
  }

  private async sendBadgeCountsToClient(clientId: string): Promise<void> {
    const counts = await this.menuBadgeService.getSidebarBadgeCounts();
    this.sendToClient(clientId, {
      type: WebSocketMessageType.SIDEBAR_MENU_BADGE_COUNTS,
      channel: BADGE_CHANNEL,
      data: { counts },
      timestamp: Date.now(),
    });
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
