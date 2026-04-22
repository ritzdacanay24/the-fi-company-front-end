import { Inject, Injectable } from '@nestjs/common';
import { RowDataPacket } from 'mysql2/promise';
import { MysqlService } from '@/shared/database/mysql.service';

interface EmailNotificationRecipientRow extends RowDataPacket {
  email: string | null;
}

export type EmailNotificationAccessValue =
  | 'safety_incident'
  | 'production_orders'
  | 'overdue_orders'
  | 'vehicle_registration_email'
  | 'lnw_shipping_report_notification'
  | 'lnw_shipping_report_notification_cc'
  | 'field_serivce_copy_of_report'
  | 'field_service_overdue_requests'
  | 'create_forklift_inspection'
  | 'create_vehicle_inspection'
  | 'forklift_and_vehicle_inspection_report'
  | 'igt_transfer_location_R200'
  | 'igt_transfer_location_Z024'
  | 'create_shipping_request'
  | 'tracking_number_notification_shipping_request'
  | 'internal_qir_notification'
  | 'external_qir_notification'
  | 'create_material_request'
  | 'car_corrective_action_complete'
  | 'car_assigned_to_production'
  | 'car_assigned_to_logistics'
  | 'car_assigned_to_quality'
  | 'car_assigned_to_npi'
  | 'shipping_dashboard_access_rights'
  | 'field_service_comment_notification_request_form'
  | 'edit_car'
  | 'field_service_pending_request_changes'
  | 'safety_incident_overdue_email'
  | 'overdue_qir'
  | 'overdue_shipping_request_email'
  | 'overdue_shortages_email'
  | 'overdue_field_service_workorder'
  | 'overdue_rma_email';

@Injectable()
export class EmailNotificationsService {
  constructor(
    @Inject(MysqlService)
    private readonly mysqlService: MysqlService,
  ) {}

  async getRecipients(location: EmailNotificationAccessValue): Promise<string[]> {
    const key = (location || '').trim();
    if (!key) {
      return [];
    }

    const rows = await this.mysqlService.query<EmailNotificationRecipientRow[]>(
      `
        SELECT IFNULL(b.email, a.notification_emails) AS email
        FROM safety_incident_config a
        INNER JOIN email_notification_access_options o ON o.value = a.location
        LEFT JOIN db.users b ON b.id = a.user_id
        WHERE a.location = ?
      `,
      [key],
    );

    return ['ritz.dacanay@the-fi-company.com']

    return rows
      .flatMap((row) =>
        String(row.email || '')
          .split(/[;,]/)
          .map((email) => email.trim())
          .filter(Boolean),
      )
      .filter((email, index, list) => list.indexOf(email) === index);
  }
}
