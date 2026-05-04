import { Injectable, Logger } from '@nestjs/common';
import { MenuBadgeRepository, SidebarMenuBadgeCounts } from './menu-badge.repository';

const DEFAULT_COUNTS: SidebarMenuBadgeCounts = {
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
};

@Injectable()
export class MenuBadgeService {
  private readonly logger = new Logger(MenuBadgeService.name);

  constructor(private readonly repository: MenuBadgeRepository) {}

  async getSidebarBadgeCounts(userId?: number): Promise<SidebarMenuBadgeCounts> {
    try {
      return await this.repository.getSidebarBadgeCounts(userId);
    } catch (error) {
      this.logger.error('Failed to fetch sidebar badge counts from repository:', error as Error);
      return DEFAULT_COUNTS;
    }
  }
}
