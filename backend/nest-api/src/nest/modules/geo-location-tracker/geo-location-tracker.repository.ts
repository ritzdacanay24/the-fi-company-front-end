import { Inject, Injectable } from '@nestjs/common';
import { RowDataPacket } from 'mysql2/promise';
import { MysqlService } from '@/shared/database/mysql.service';

@Injectable()
export class GeoLocationTrackerRepository {
  constructor(@Inject(MysqlService) private readonly mysqlService: MysqlService) {}

  async getGeoLocationTracker(dateFrom: string, dateTo: string): Promise<Record<string, unknown>> {
    const results = await this.mysqlService.query<RowDataPacket[]>(
      `SELECT a.id,
              a.user_id,
              a.accuracy,
              a.latitude,
              a.longitude,
              a.created_date,
              CONCAT(first, ' ', last) AS user,
              color,
              a.id AS geo_id,
              b.image,
              'location' AS type_of,
              '' AS type_of_event
       FROM eyefidb.geo_location_tracker a
       LEFT JOIN db.users b ON b.id = a.user_id
       WHERE DATE(created_date) BETWEEN ? AND ?
         AND created_date > '2024-11-14 13:00:00'

       UNION ALL

       SELECT a.id,
              a.userId AS user_id,
              '' AS accuracy,
              SUBSTRING_INDEX(a.projectStartCoordinates, ',', 1) AS latitude,
              SUBSTRING_INDEX(SUBSTRING_INDEX(a.projectStartCoordinates, ',', -1), ',', 1) AS longitude,
              a.projectStart AS created_date,
              CONCAT(first, ' ', last) AS user,
              color,
              '' AS geo_id,
              b.image,
              'event' AS type_of,
              proj_type AS type_of_event
       FROM eyefidb.fs_workOrderProject a
       LEFT JOIN db.users b ON b.id = a.userId
       WHERE DATE(a.projectStart) BETWEEN ? AND ?
         AND a.projectStartCoordinates IS NOT NULL
         AND projectStart > '2024-11-14 13:00:00'
       ORDER BY created_date DESC`,
      [dateFrom, dateTo, dateFrom, dateTo],
    );

    const list = await this.mysqlService.query<RowDataPacket[]>(
      `SELECT CONCAT(first, ' ', last) AS user,
              a.id AS user_id,
              color,
              SUM(IFNULL(b.total, 0) + IFNULL(c.total, 0)) AS total
       FROM db.users a
       LEFT JOIN (
         SELECT COUNT(*) AS total, user_id
         FROM eyefidb.geo_location_tracker
         WHERE DATE(created_date) BETWEEN ? AND ?
           AND created_date > '2024-11-14 13:00:00'
         GROUP BY user_id
       ) b ON b.user_id = a.id
       LEFT JOIN (
         SELECT COUNT(*) AS total, a.userId AS user_id
         FROM eyefidb.fs_workOrderProject a
         LEFT JOIN db.users b ON b.id = a.userId
         WHERE DATE(a.projectStart) BETWEEN ? AND ?
           AND a.projectStartCoordinates IS NOT NULL
           AND projectStart > '2024-11-14 13:00:00'
         GROUP BY user_id
       ) c ON c.user_id = a.id
       WHERE area = 'Field Service'
         AND a.active = 1
         AND title = 'Installer'
       GROUP BY CONCAT(first, ' ', last), a.id, color`,
      [dateFrom, dateTo, dateFrom, dateTo],
    );

    const jobs = await this.mysqlService.query<RowDataPacket[]>(
      `SELECT a.id AS fs_scheduler_id,
              a.request_date AS start,
              a.start_time,
              b.user_id,
              a.fs_lat,
              a.fs_lon,
              service_type,
              techs,
              CASE
                WHEN a.fs_lat IS NOT NULL AND a.fs_lon IS NOT NULL THEN 'Coordinates Found'
                ELSE 'Coordinates Not Found'
              END AS cordFound,
              CASE
                WHEN d.dateSubmitted IS NOT NULL THEN 'Completed'
                WHEN d.id IS NOT NULL THEN 'Started'
                ELSE 'Not Started'
              END AS status,
              d.dateSubmitted,
              CASE
                WHEN d.dateSubmitted IS NOT NULL THEN 'bg-success'
                WHEN DATE(request_date) = DATE(NOW()) THEN 'bg-warning'
                ELSE 'bg-primary'
              END AS backgroundColor
       FROM eyefidb.fs_scheduler a
       LEFT JOIN eyefidb.fs_team b ON b.fs_det_id = a.id
       LEFT JOIN (
         SELECT GROUP_CONCAT(user ORDER BY user ASC SEPARATOR ', ') AS techs,
                fs_det_id
         FROM eyefidb.fs_team
         GROUP BY fs_det_id
       ) cc ON cc.fs_det_id = a.id
       LEFT JOIN eyefidb.fs_workOrder d ON a.id = d.fs_scheduler_id
       WHERE a.active = 1
         AND DATE(request_date) BETWEEN ? AND ?
       ORDER BY a.request_date ASC`,
      [dateFrom, dateTo],
    );

    const listWithDetails = list.map((row) => ({
      ...row,
      details: results.filter((detail) => Number(detail.user_id) === Number(row.user_id)),
    }));

    return {
      results,
      list: listWithDetails,
      jobs,
    };
  }
}
