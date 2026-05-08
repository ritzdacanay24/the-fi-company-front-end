import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Subject, Subscription } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { StructuredWebsocketService } from './structured-websocket.service';
import { WebsocketService } from './websocket.service';

// ─── Badge counts interface used by sidebar ───────────────────────────────────
export interface SidebarMenuBadgeCounts {
  validationQueue: number;
  pickingQueue: number;
  pickAndStageOpen: number;
  productionRoutingOpen: number;
  finalTestQcOpen: number;
  shippingScheduleDueNow: number;
  vehicleExpiringSoon: number;
  vehicleInspectionPendingResolutions: number;
  shortagesOpen: number;
  safetyIncidentOpen: number;
  qualityIssuesOpen: number;
  correctiveActionsOpen: number;
  returnsRmaOpen: number;
  permitChecklistOpen: number;
  shippingRequestOpen: number;
  graphicsProductionOpen: number;
  fieldsServiceRequestsOpen: number;
  partsOrderOpen: number;
  trainingLiveSessionsOpen: number;
  inspectionChecklistExecutionInProgress: number;
  pmProjectsOpen: number;
  pmTasksOpen: number;
  supportTicketsOpen: number;
}

// ─── Websocket message types (mirrors backend event names) ───────────────────
export enum BadgeMessageType {
  JOIN_ROOM    = 'join_sidebar_menu_badge_room',
  LEAVE_ROOM   = 'leave_sidebar_menu_badge_room',
  REQUEST      = 'request_sidebar_menu_badge_counts',
  BADGE_COUNTS = 'sidebar_menu_badge_counts',
}

const BADGE_CHANNEL = 'sidebar-menu-badges';

interface BadgeWsMessage {
  type?: string;
  channel?: string;
  data?: { counts?: Partial<SidebarMenuBadgeCounts> } & Partial<SidebarMenuBadgeCounts>;
  counts?: Partial<SidebarMenuBadgeCounts>;
}

const ZERO_COUNTS: SidebarMenuBadgeCounts = {
  validationQueue: 0,
  pickingQueue: 0,
  pickAndStageOpen: 0,
  productionRoutingOpen: 0,
  finalTestQcOpen: 0,
  shippingScheduleDueNow: 0,
  vehicleExpiringSoon: 0,
  vehicleInspectionPendingResolutions: 0,
  shortagesOpen: 0,
  safetyIncidentOpen: 0,
  qualityIssuesOpen: 0,
  correctiveActionsOpen: 0,
  returnsRmaOpen: 0,
  permitChecklistOpen: 0,
  shippingRequestOpen: 0,
  graphicsProductionOpen: 0,
  fieldsServiceRequestsOpen: 0,
  partsOrderOpen: 0,
  trainingLiveSessionsOpen: 0,
  inspectionChecklistExecutionInProgress: 0,
  pmProjectsOpen: 0,
  pmTasksOpen: 0,
  supportTicketsOpen: 0,
};

/**
 * MenuBadgeWebsocketService – Modern
 *
 * Architecture (matches Creorx):
 * 1. Connect websocket (if not already connected)
 * 2. Join badge room → backend starts pushing badge counts
 * 3. Request counts immediately so sidebar populates on first load
 * 4. On each BADGE_COUNTS message → update countsSubject (no API calls)
 * 5. On websocket close / reconnect → re-join and re-request
 * 6. No HTTP polling. No API calls. Listen only.
 */
@Injectable({ providedIn: 'root' })
export class MenuBadgeWebsocketService implements OnDestroy {

  // ── Public observable ──────────────────────────────────────────────────────
  private readonly countsSubject = new BehaviorSubject<SidebarMenuBadgeCounts>({ ...ZERO_COUNTS });
  readonly counts$ = this.countsSubject.asObservable();

  // ── Internal state ─────────────────────────────────────────────────────────
  private badgeSubscription: Subscription | null = null;
  private destroy$ = new Subject<void>();
  private initialized = false;

  constructor(
    private readonly websocketService: WebsocketService,
    private readonly structuredWebsocketService: StructuredWebsocketService,
  ) {}

  // ── Public API used by sidebar.component ──────────────────────────────────

  /**
   * Call once from sidebar ngOnInit.
   * Connects websocket, joins room, requests current counts, and watches for
   * socket reconnection to re-join automatically.
   */
  init(): void {
    if (this.initialized) return;
    this.initialized = true;

    this.structuredWebsocketService.init();

    this.joinBadgeRoom();

    // Watch for websocket close events so we can re-join after reconnection
    this.websocketService.messageSubject$
      .pipe(takeUntil(this.destroy$))
      .subscribe(event => {
        if (event instanceof CloseEvent) {
          if (this.badgeSubscription) {
            this.badgeSubscription.unsubscribe();
            this.badgeSubscription = null;
          }
          this.countsSubject.next({ ...ZERO_COUNTS });

          // Reconnect and re-join after a short delay
          setTimeout(() => {
            this.structuredWebsocketService.init();
            this.joinBadgeRoom();
          }, 3000);
        }
      });
  }

  // ── Private ───────────────────────────────────────────────────────────────

  /**
   * Subscribe to the badge channel, send JOIN, then REQUEST counts.
   * Safe to call multiple times – cleans up existing subscription first.
   */
  private joinBadgeRoom(): void {
    if (this.badgeSubscription) {
      this.badgeSubscription.unsubscribe();
      this.badgeSubscription = null;
    }

    this.structuredWebsocketService.joinChannel(BADGE_CHANNEL);

    this.structuredWebsocketService.publish(BADGE_CHANNEL, BadgeMessageType.JOIN_ROOM, {});

    this.badgeSubscription = this.structuredWebsocketService
      .subscribe<BadgeWsMessage>(BADGE_CHANNEL, BadgeMessageType.BADGE_COUNTS)
      .subscribe((socketEnvelope) => {
        this.handleBadgeMessage({
          type: socketEnvelope.type,
          channel: socketEnvelope.channel,
          data: socketEnvelope.data as any,
        });
      });

    // Immediately request current counts from backend (like Creorx does)
    this.structuredWebsocketService.publish(BADGE_CHANNEL, BadgeMessageType.REQUEST, {});
  }

  /**
   * Parse the incoming websocket message and update badge counts.
   * Supports all payload shapes the backend may send.
   */
  private handleBadgeMessage(msg: BadgeWsMessage): void {
    const current  = this.countsSubject.value;
    const flat     = msg?.counts;           // { validationQueue: N, ... }
    const nested   = msg?.data?.counts;     // { data: { counts: { ... } } }
    const dataFlat = msg?.data;             // { data: { validationQueue: N, ... } }

    const pick = (key: keyof SidebarMenuBadgeCounts): number | undefined =>
      flat?.[key] ?? nested?.[key] ?? dataFlat?.[key];

    // If the message has no recognisable badge fields at all, ignore it
    const keys = Object.keys(ZERO_COUNTS) as (keyof SidebarMenuBadgeCounts)[];
    const hasAny = keys.some(k => pick(k) !== undefined);
    if (!hasAny) return;

    const toNum = (raw: number | undefined, fallback: number): number => {
      const n = Number(raw);
      return Number.isFinite(n) ? n : fallback;
    };

    this.countsSubject.next({
      validationQueue:                     toNum(pick('validationQueue'),                     current.validationQueue),
      pickingQueue:                        toNum(pick('pickingQueue'),                        current.pickingQueue),
      pickAndStageOpen:                    toNum(pick('pickAndStageOpen'),                    current.pickAndStageOpen),
      productionRoutingOpen:               toNum(pick('productionRoutingOpen'),               current.productionRoutingOpen),
      finalTestQcOpen:                     toNum(pick('finalTestQcOpen'),                     current.finalTestQcOpen),
      shippingScheduleDueNow:              toNum(pick('shippingScheduleDueNow'),              current.shippingScheduleDueNow),
      vehicleExpiringSoon:                 toNum(pick('vehicleExpiringSoon'),                 current.vehicleExpiringSoon),
      vehicleInspectionPendingResolutions: toNum(pick('vehicleInspectionPendingResolutions'), current.vehicleInspectionPendingResolutions),
      shortagesOpen:                       toNum(pick('shortagesOpen'),                       current.shortagesOpen),
      safetyIncidentOpen:                  toNum(pick('safetyIncidentOpen'),                  current.safetyIncidentOpen),
      qualityIssuesOpen:                   toNum(pick('qualityIssuesOpen'),                   current.qualityIssuesOpen),
      correctiveActionsOpen:               toNum(pick('correctiveActionsOpen'),               current.correctiveActionsOpen),
      returnsRmaOpen:                      toNum(pick('returnsRmaOpen'),                      current.returnsRmaOpen),
      permitChecklistOpen:                 toNum(pick('permitChecklistOpen'),                 current.permitChecklistOpen),
      shippingRequestOpen:                 toNum(pick('shippingRequestOpen'),                 current.shippingRequestOpen),
      graphicsProductionOpen:              toNum(pick('graphicsProductionOpen'),              current.graphicsProductionOpen),
      fieldsServiceRequestsOpen:           toNum(pick('fieldsServiceRequestsOpen'),           current.fieldsServiceRequestsOpen),
      partsOrderOpen:                      toNum(pick('partsOrderOpen'),                      current.partsOrderOpen),
      trainingLiveSessionsOpen:            toNum(pick('trainingLiveSessionsOpen'),            current.trainingLiveSessionsOpen),
      inspectionChecklistExecutionInProgress: toNum(pick('inspectionChecklistExecutionInProgress'), current.inspectionChecklistExecutionInProgress),
      pmProjectsOpen:                          toNum(pick('pmProjectsOpen'),                          current.pmProjectsOpen),
      pmTasksOpen:                             toNum(pick('pmTasksOpen'),                             current.pmTasksOpen),
      supportTicketsOpen:                      toNum(pick('supportTicketsOpen'),                      current.supportTicketsOpen),
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.badgeSubscription) {
      this.badgeSubscription.unsubscribe();
      this.badgeSubscription = null;
    }
    this.structuredWebsocketService.publish(BADGE_CHANNEL, BadgeMessageType.LEAVE_ROOM, {});
    this.structuredWebsocketService.leaveChannel(BADGE_CHANNEL);
  }
}
