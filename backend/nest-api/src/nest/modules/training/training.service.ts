import { ForbiddenException, Inject, Injectable, Logger } from '@nestjs/common';
import { PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { MysqlService } from '@/shared/database/mysql.service';
import { AccessControlService } from '../access-control';
import { EmailService } from '@/shared/email/email.service';
import { EmailTemplateService } from '@/shared/email/email-template.service';

type Dict = Record<string, unknown>;

@Injectable()
export class TrainingService {
  private readonly logger = new Logger(TrainingService.name);

  constructor(
    @Inject(MysqlService)
    private readonly mysqlService: MysqlService,
    @Inject(AccessControlService)
    private readonly accessControlService: AccessControlService,
    @Inject(EmailService)
    private readonly emailService: EmailService,
    @Inject(EmailTemplateService)
    private readonly emailTemplateService: EmailTemplateService,
  ) {}

  async getSessions() {
    return this.mysqlService.query<RowDataPacket[]>(
      `
        SELECT
          ts.*,
          tc.name AS category_name,
          tc.color_code AS category_color,
          COUNT(DISTINCT ta.employee_id) AS expected_count,
          COUNT(DISTINCT att.employee_id) AS completed_count
        FROM training_sessions ts
        LEFT JOIN training_categories tc ON ts.category_id = tc.id
        LEFT JOIN training_attendees ta ON ts.id = ta.session_id
        LEFT JOIN training_attendance att ON ts.id = att.session_id
        GROUP BY ts.id
        ORDER BY ts.date DESC, ts.start_time DESC
      `,
    );
  }

  async getSession(idRaw: string) {
    const sessionId = this.toPositiveInt(idRaw);
    if (!sessionId) {
      return { error: 'Session id is required' };
    }

    const sessions = await this.mysqlService.query<RowDataPacket[]>(
      `
        SELECT
          ts.*,
          tc.name AS category_name,
          tc.color_code AS category_color
        FROM training_sessions ts
        LEFT JOIN training_categories tc ON ts.category_id = tc.id
        WHERE ts.id = :id
      `,
      { id: sessionId },
    );

    const session = sessions[0];
    if (!session) {
      return { error: 'Session not found' };
    }

    const expectedAttendees = await this.mysqlService.query<RowDataPacket[]>(
      `
        SELECT
          ta.*,
          e.card_number AS badge_number,
          e.first AS first_name,
          e.last AS last_name,
          e.title AS position,
          e.department,
          e.email,
          e.image
        FROM training_attendees ta
        JOIN db.users e ON ta.employee_id = e.id
        WHERE ta.session_id = :session_id
        ORDER BY e.first, e.last
      `,
      { session_id: sessionId },
    );

    const actualAttendees = await this.mysqlService.query<RowDataPacket[]>(
      `
        SELECT
          att.*,
          e.card_number AS badge_number,
          e.first AS first_name,
          e.last AS last_name,
          e.title AS position,
          e.department,
          e.email,
          e.image
        FROM training_attendance att
        JOIN db.users e ON att.employee_id = e.id
        WHERE att.session_id = :session_id
        ORDER BY att.sign_in_time DESC
      `,
      { session_id: sessionId },
    );

    return {
      ...session,
      expectedAttendees: expectedAttendees.map((attendee) => this.mapExpectedAttendee(attendee)),
      actualAttendees: actualAttendees.map((attendance) => this.mapAttendance(attendance)),
      durationMinutes: Number(session.duration_minutes || 0),
    };
  }

  async createSession(body: Dict, currentUserId?: number) {
    const title = String(body.title || '').trim();
    const description = String(body.description || '').trim();
    const purpose = String(body.purpose || '').trim();
    const date = String(body.date || '').trim();
    const startTime = String(body.startTime || '').trim();
    const endTime = String(body.endTime || '').trim();
    const location = String(body.location || '').trim();
    const facilitatorName = String(body.facilitatorName || '').trim();
    const categoryId = this.toNullableInt(body.categoryId);
    const payloadCreatedBy = this.toPositiveInt(body.createdBy) || 1;
    const createdBy = Number(currentUserId) > 0 ? Number(currentUserId) : payloadCreatedBy;
    const expectedAttendeeIds = Array.isArray(body.expectedAttendeeIds)
      ? body.expectedAttendeeIds.map((id) => this.toPositiveInt(id)).filter((id): id is number => Boolean(id))
      : [];

    if (!title || !description || !purpose || !date || !startTime || !endTime || !location || !facilitatorName) {
      return { error: 'Missing required session fields' };
    }

    const createdId = await this.mysqlService.withTransaction(async (connection: PoolConnection) => {
      const [result] = await connection.execute<ResultSetHeader>(
        `
          INSERT INTO training_sessions
          (title, description, purpose, date, start_time, end_time, location, facilitator_name, category_id, created_by)
          VALUES
          (:title, :description, :purpose, :date, :start_time, :end_time, :location, :facilitator_name, :category_id, :created_by)
        `,
        {
          title,
          description,
          purpose,
          date,
          start_time: startTime,
          end_time: endTime,
          location,
          facilitator_name: facilitatorName,
          category_id: categoryId,
          created_by: createdBy,
        },
      );

      const sessionId = result.insertId;

      if (expectedAttendeeIds.length > 0) {
        for (const employeeId of expectedAttendeeIds) {
          await connection.execute(
            `
              INSERT INTO training_attendees (session_id, employee_id, is_required, added_by)
              VALUES (:session_id, :employee_id, :is_required, :added_by)
            `,
            {
              session_id: sessionId,
              employee_id: employeeId,
              is_required: 1,
              added_by: createdBy,
            },
          );
        }
      }

      return sessionId;
    });

    await this.notifySessionCreatedAttendees(createdId);

    return this.getSession(String(createdId));
  }

  async updateSession(idRaw: string, body: Dict, userId: number) {
    const sessionId = this.toPositiveInt(idRaw);
    if (!sessionId) {
      return { error: 'Session id is required' };
    }

    const existingSession = await this.mysqlService.query<RowDataPacket[]>(
      `
        SELECT id, created_by, status
        FROM training_sessions
        WHERE id = :id
        LIMIT 1
      `,
      { id: sessionId },
    );

    const session = existingSession[0];
    if (!session) {
      return { error: 'Session not found' };
    }

    const isCreator = Number(session.created_by) === userId;
    const canManageAnySession = await this.accessControlService.userHasRoles(userId, ['manager', 'admin']);

    if (!isCreator && !canManageAnySession) {
      throw new ForbiddenException('Only the training session creator or a manager can modify this session');
    }

    if (typeof body.status === 'string' && Object.keys(body).length === 1) {
      const status = String(body.status);
      if (!['scheduled', 'in-progress', 'completed', 'cancelled'].includes(status)) {
        return { error: 'Invalid session status' };
      }

      const previousStatus = String(session.status || '').trim().toLowerCase();

      await this.mysqlService.execute(
        `
          UPDATE training_sessions
          SET status = :status, updated_at = NOW()
          WHERE id = :id
        `,
        {
          status,
          id: sessionId,
        },
      );

      if (status === 'cancelled' && previousStatus !== 'cancelled') {
        await this.notifySessionCancelledAttendees(sessionId);
      }

      return this.getSession(String(sessionId));
    }

    const isAdmin = await this.accessControlService.userHasRoles(userId, ['admin']);
    if (!isAdmin) {
      throw new ForbiddenException('Only admins can modify session details (duration, schedule, and metadata)');
    }

    const title = String(body.title || '').trim();
    const description = String(body.description || '').trim();
    const purpose = String(body.purpose || '').trim();
    const date = String(body.date || '').trim();
    const startTime = String(body.startTime || '').trim();
    const endTime = String(body.endTime || '').trim();
    const location = String(body.location || '').trim();
    const facilitatorName = String(body.facilitatorName || '').trim();
    const categoryId = this.toNullableInt(body.categoryId);

    if (!title || !description || !purpose || !date || !startTime || !endTime || !location || !facilitatorName) {
      return { error: 'Missing required session fields' };
    }

    const expectedAttendeeIds = Array.isArray(body.expectedAttendeeIds)
      ? body.expectedAttendeeIds.map((id) => this.toPositiveInt(id)).filter((id): id is number => Boolean(id))
      : undefined;

    await this.mysqlService.withTransaction(async (connection: PoolConnection) => {
      await connection.execute(
        `
          UPDATE training_sessions
          SET title = :title,
              description = :description,
              purpose = :purpose,
              date = :date,
              start_time = :start_time,
              end_time = :end_time,
              location = :location,
              facilitator_name = :facilitator_name,
              category_id = :category_id,
              updated_at = NOW()
          WHERE id = :id
        `,
        {
          id: sessionId,
          title,
          description,
          purpose,
          date,
          start_time: startTime,
          end_time: endTime,
          location,
          facilitator_name: facilitatorName,
          category_id: categoryId,
        },
      );

      if (expectedAttendeeIds) {
        await connection.execute('DELETE FROM training_attendees WHERE session_id = :session_id', {
          session_id: sessionId,
        });

        for (const employeeId of expectedAttendeeIds) {
          await connection.execute(
            `
              INSERT INTO training_attendees (session_id, employee_id, is_required, added_by, added_date)
              VALUES (:session_id, :employee_id, :is_required, :added_by, NOW())
            `,
            {
              session_id: sessionId,
              employee_id: employeeId,
              is_required: 1,
              added_by: 1,
            },
          );
        }
      }
    });

    return this.getSession(String(sessionId));
  }

  async deleteSession(idRaw: string) {
    const sessionId = this.toPositiveInt(idRaw);
    if (!sessionId) {
      return { error: 'Session id is required' };
    }

    await this.mysqlService.execute('DELETE FROM training_sessions WHERE id = :id', { id: sessionId });
    return { message: 'Session deleted successfully' };
  }

  async getSessionAttendance(sessionIdRaw: string) {
    const sessionId = this.toPositiveInt(sessionIdRaw);
    if (!sessionId) {
      return { error: 'Session id is required' };
    }

    const rows = await this.mysqlService.query<RowDataPacket[]>(
      `
        SELECT
          att.*,
          e.card_number AS badge_number,
          e.first AS first_name,
          e.last AS last_name,
          e.title AS position,
          e.department,
          e.email,
          e.image
        FROM training_attendance att
        JOIN db.users e ON att.employee_id = e.id
        WHERE att.session_id = :session_id
        ORDER BY att.sign_in_time DESC
      `,
      { session_id: sessionId },
    );

    return rows.map((row) => this.mapAttendance(row));
  }

  async getSessionMetrics(sessionIdRaw: string) {
    const sessionId = this.toPositiveInt(sessionIdRaw);
    if (!sessionId) {
      return { error: 'Session id is required' };
    }

    const rows = await this.mysqlService.query<RowDataPacket[]>(
      `
        SELECT
          COUNT(DISTINCT ta.employee_id) AS total_expected,
          COUNT(DISTINCT att.employee_id) AS total_present,
          COUNT(DISTINCT att.employee_id) AS completed_count,
          ROUND(
            CASE
              WHEN COUNT(DISTINCT ta.employee_id) > 0
                THEN (COUNT(DISTINCT att.employee_id) * 100.0 / COUNT(DISTINCT ta.employee_id))
              ELSE 0
            END,
            2
          ) AS attendance_rate,
          COUNT(CASE WHEN att.is_late_arrival = 1 THEN 1 END) AS late_arrivals,
          COUNT(CASE WHEN ta.employee_id IS NULL THEN 1 END) AS unexpected_attendees
        FROM training_sessions ts
        LEFT JOIN training_attendees ta ON ts.id = ta.session_id
        LEFT JOIN training_attendance att ON ts.id = att.session_id
        WHERE ts.id = :id
        GROUP BY ts.id
      `,
      { id: sessionId },
    );

    const metrics = rows[0] || {
      total_expected: 0,
      total_present: 0,
      completed_count: 0,
      attendance_rate: 0,
      late_arrivals: 0,
      unexpected_attendees: 0,
    };

    return {
      totalExpected: Number(metrics.total_expected || 0),
      totalPresent: Number(metrics.total_present || 0),
      completedCount: Number(metrics.completed_count || 0),
      attendanceRate: Number(metrics.attendance_rate || 0),
      lateArrivals: Number(metrics.late_arrivals || 0),
      unexpectedAttendees: Number(metrics.unexpected_attendees || 0),
    };
  }

  async getReportSummary(dateFromRaw?: string, dateToRaw?: string, daysRaw?: string) {
    const { dateFrom, dateTo } = this.resolveReportDateRange(dateFromRaw, dateToRaw, daysRaw);

    const totalsRows = await this.mysqlService.query<RowDataPacket[]>(
      `
        SELECT
          COUNT(*) AS total_sessions,
          SUM(CASE WHEN s.status = 'completed' THEN 1 ELSE 0 END) AS completed_sessions,
          SUM(CASE WHEN s.status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled_sessions,
          SUM(CASE WHEN s.status = 'scheduled' THEN 1 ELSE 0 END) AS scheduled_sessions,
          SUM(CASE WHEN s.status = 'in-progress' THEN 1 ELSE 0 END) AS in_progress_sessions,
          COALESCE(SUM(s.expected_count), 0) AS expected_attendees,
          COALESCE(SUM(s.actual_count), 0) AS actual_attendees,
          ROUND(
            CASE
              WHEN COALESCE(SUM(s.expected_count), 0) > 0
                THEN (COALESCE(SUM(s.actual_count), 0) * 100.0 / SUM(s.expected_count))
              ELSE 0
            END,
            2
          ) AS attendance_rate
        FROM (
          SELECT
            ts.id,
            ts.status,
            COALESCE((SELECT COUNT(*) FROM training_attendees ta WHERE ta.session_id = ts.id), 0) AS expected_count,
            COALESCE((SELECT COUNT(*) FROM training_attendance att WHERE att.session_id = ts.id), 0) AS actual_count
          FROM training_sessions ts
          WHERE ts.date BETWEEN :date_from AND :date_to
        ) s
      `,
      { date_from: dateFrom, date_to: dateTo },
    );

    const weeklyTrend = await this.mysqlService.query<RowDataPacket[]>(
      `
        SELECT
          YEAR(ts.date) AS year_num,
          WEEK(ts.date, 1) AS week_num,
          COUNT(*) AS total_sessions,
          SUM(CASE WHEN ts.status = 'completed' THEN 1 ELSE 0 END) AS completed_sessions,
          COALESCE(SUM(exp.expected_count), 0) AS expected_attendees,
          COALESCE(SUM(act.actual_count), 0) AS actual_attendees,
          ROUND(
            CASE
              WHEN COALESCE(SUM(exp.expected_count), 0) > 0
                THEN (COALESCE(SUM(act.actual_count), 0) * 100.0 / SUM(exp.expected_count))
              ELSE 0
            END,
            2
          ) AS attendance_rate
        FROM training_sessions ts
        LEFT JOIN (
          SELECT session_id, COUNT(*) AS expected_count
          FROM training_attendees
          GROUP BY session_id
        ) exp ON exp.session_id = ts.id
        LEFT JOIN (
          SELECT session_id, COUNT(*) AS actual_count
          FROM training_attendance
          GROUP BY session_id
        ) act ON act.session_id = ts.id
        WHERE ts.date BETWEEN :date_from AND :date_to
        GROUP BY YEAR(ts.date), WEEK(ts.date, 1)
        ORDER BY year_num ASC, week_num ASC
      `,
      { date_from: dateFrom, date_to: dateTo },
    );

    const facilitatorPerformance = await this.mysqlService.query<RowDataPacket[]>(
      `
        SELECT
          s.facilitator_name,
          COUNT(*) AS sessions,
          COALESCE(SUM(s.expected_count), 0) AS expected_attendees,
          COALESCE(SUM(s.actual_count), 0) AS actual_attendees,
          ROUND(
            CASE
              WHEN COALESCE(SUM(s.expected_count), 0) > 0
                THEN (COALESCE(SUM(s.actual_count), 0) * 100.0 / SUM(s.expected_count))
              ELSE 0
            END,
            2
          ) AS attendance_rate
        FROM (
          SELECT
            ts.id,
            ts.facilitator_name,
            COALESCE((SELECT COUNT(*) FROM training_attendees ta WHERE ta.session_id = ts.id), 0) AS expected_count,
            COALESCE((SELECT COUNT(*) FROM training_attendance att WHERE att.session_id = ts.id), 0) AS actual_count
          FROM training_sessions ts
          WHERE ts.date BETWEEN :date_from AND :date_to
        ) s
        GROUP BY s.facilitator_name
        ORDER BY sessions DESC, attendance_rate DESC
        LIMIT 10
      `,
      { date_from: dateFrom, date_to: dateTo },
    );

    const departmentCompliance = await this.mysqlService.query<RowDataPacket[]>(
      `
        SELECT
          dept.department,
          COALESCE(exp.expected_count, 0) AS expected_attendees,
          COALESCE(act.actual_count, 0) AS actual_attendees,
          ROUND(
            CASE
              WHEN COALESCE(exp.expected_count, 0) > 0
                THEN (COALESCE(act.actual_count, 0) * 100.0 / exp.expected_count)
              ELSE 0
            END,
            2
          ) AS attendance_rate
        FROM (
          SELECT department FROM (
            SELECT COALESCE(NULLIF(TRIM(u.department), ''), 'Unassigned') AS department
            FROM training_attendees ta
            JOIN training_sessions ts ON ts.id = ta.session_id
            JOIN db.users u ON u.id = ta.employee_id
            WHERE ts.date BETWEEN :date_from AND :date_to
            UNION
            SELECT COALESCE(NULLIF(TRIM(u.department), ''), 'Unassigned') AS department
            FROM training_attendance att
            JOIN training_sessions ts ON ts.id = att.session_id
            JOIN db.users u ON u.id = att.employee_id
            WHERE ts.date BETWEEN :date_from AND :date_to
          ) names
        ) dept
        LEFT JOIN (
          SELECT
            COALESCE(NULLIF(TRIM(u.department), ''), 'Unassigned') AS department,
            COUNT(*) AS expected_count
          FROM training_attendees ta
          JOIN training_sessions ts ON ts.id = ta.session_id
          JOIN db.users u ON u.id = ta.employee_id
          WHERE ts.date BETWEEN :date_from AND :date_to
          GROUP BY COALESCE(NULLIF(TRIM(u.department), ''), 'Unassigned')
        ) exp ON exp.department = dept.department
        LEFT JOIN (
          SELECT
            COALESCE(NULLIF(TRIM(u.department), ''), 'Unassigned') AS department,
            COUNT(*) AS actual_count
          FROM training_attendance att
          JOIN training_sessions ts ON ts.id = att.session_id
          JOIN db.users u ON u.id = att.employee_id
          WHERE ts.date BETWEEN :date_from AND :date_to
          GROUP BY COALESCE(NULLIF(TRIM(u.department), ''), 'Unassigned')
        ) act ON act.department = dept.department
        ORDER BY attendance_rate DESC, expected_attendees DESC
        LIMIT 12
      `,
      { date_from: dateFrom, date_to: dateTo },
    );

    return {
      totals: totalsRows[0] || {
        total_sessions: 0,
        completed_sessions: 0,
        cancelled_sessions: 0,
        scheduled_sessions: 0,
        in_progress_sessions: 0,
        expected_attendees: 0,
        actual_attendees: 0,
        attendance_rate: 0,
      },
      weekly_trend: weeklyTrend,
      facilitator_performance: facilitatorPerformance,
      department_compliance: departmentCompliance,
    };
  }

  private resolveReportDateRange(dateFromRaw?: string, dateToRaw?: string, daysRaw?: string) {
    const now = new Date();
    const defaultEnd = new Date(now);
    const defaultStart = new Date(now);
    defaultStart.setFullYear(defaultStart.getFullYear() - 1);

    const normalizedFrom = this.parseDateInput(dateFromRaw);
    const normalizedTo = this.parseDateInput(dateToRaw);

    if (normalizedFrom && normalizedTo) {
      if (normalizedFrom <= normalizedTo) {
        return { dateFrom: normalizedFrom, dateTo: normalizedTo };
      }
      return { dateFrom: normalizedTo, dateTo: normalizedFrom };
    }

    if (normalizedFrom && !normalizedTo) {
      return {
        dateFrom: normalizedFrom,
        dateTo: this.formatDateYmd(defaultEnd),
      };
    }

    if (!normalizedFrom && normalizedTo) {
      return {
        dateFrom: this.formatDateYmd(defaultStart),
        dateTo: normalizedTo,
      };
    }

    const parsedDays = Number(daysRaw || 0);
    if (Number.isFinite(parsedDays) && parsedDays > 0) {
      const clampedDays = Math.min(Math.max(Math.floor(parsedDays), 1), 3650);
      const start = new Date(defaultEnd);
      start.setDate(start.getDate() - clampedDays);
      return {
        dateFrom: this.formatDateYmd(start),
        dateTo: this.formatDateYmd(defaultEnd),
      };
    }

    return {
      dateFrom: this.formatDateYmd(defaultStart),
      dateTo: this.formatDateYmd(defaultEnd),
    };
  }

  private parseDateInput(value?: string): string | null {
    const raw = String(value || '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      return null;
    }

    const date = new Date(`${raw}T00:00:00`);
    if (Number.isNaN(date.getTime())) {
      return null;
    }

    return this.formatDateYmd(date);
  }

  private formatDateYmd(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  async exportAttendanceSheet(sessionIdRaw: string) {
    return this.getSession(sessionIdRaw);
  }

  async addExpectedAttendee(sessionIdRaw: string, body: Dict) {
    const sessionId = this.toPositiveInt(sessionIdRaw);
    const employeeId = this.toPositiveInt(body.employeeId);
    const isRequired = body.isRequired === false ? 0 : 1;
    const addedBy = this.toPositiveInt(body.addedBy) || 1;

    if (!sessionId || !employeeId) {
      return { error: 'sessionId and employeeId are required' };
    }

    await this.mysqlService.execute(
      `
        INSERT INTO training_attendees (session_id, employee_id, is_required, added_by)
        VALUES (:session_id, :employee_id, :is_required, :added_by)
      `,
      {
        session_id: sessionId,
        employee_id: employeeId,
        is_required: isRequired,
        added_by: addedBy,
      },
    );

    return { message: 'Expected attendee added successfully' };
  }

  async removeExpectedAttendee(sessionIdRaw: string, employeeIdRaw: string) {
    const sessionId = this.toPositiveInt(sessionIdRaw);
    const employeeId = this.toPositiveInt(employeeIdRaw);
    if (!sessionId || !employeeId) {
      return { error: 'sessionId and employeeId are required' };
    }

    const attendeeRows = await this.mysqlService.query<RowDataPacket[]>(
      `
        SELECT
          u.id,
          u.first,
          u.last,
          u.email,
          ts.title,
          ts.date,
          ts.start_time,
          ts.end_time,
          ts.location
        FROM training_attendees ta
        JOIN db.users u ON u.id = ta.employee_id
        JOIN training_sessions ts ON ts.id = ta.session_id
        WHERE ta.session_id = :session_id
          AND ta.employee_id = :employee_id
        LIMIT 1
      `,
      {
        session_id: sessionId,
        employee_id: employeeId,
      },
    );

    const removedAttendee = attendeeRows[0];

    await this.mysqlService.execute(
      'DELETE FROM training_attendees WHERE session_id = :session_id AND employee_id = :employee_id',
      {
        session_id: sessionId,
        employee_id: employeeId,
      },
    );

    if (removedAttendee) {
      await this.notifySessionAttendeeRemoved(removedAttendee);
    }

    return { message: 'Expected attendee removed successfully' };
  }

  async bulkAddExpectedAttendees(sessionIdRaw: string, body: Dict) {
    const sessionId = this.toPositiveInt(sessionIdRaw);
    const addedBy = this.toPositiveInt(body.addedBy) || 1;
    const employeeIds = Array.isArray(body.employeeIds)
      ? body.employeeIds.map((id) => this.toPositiveInt(id)).filter((id): id is number => Boolean(id))
      : [];

    if (!sessionId || employeeIds.length === 0) {
      return { error: 'sessionId and employeeIds are required' };
    }

    await this.mysqlService.withTransaction(async (connection: PoolConnection) => {
      for (const employeeId of employeeIds) {
        const existing = await connection.execute<RowDataPacket[]>(
          'SELECT id FROM training_attendees WHERE session_id = :session_id AND employee_id = :employee_id',
          {
            session_id: sessionId,
            employee_id: employeeId,
          },
        );

        const rows = existing[0] as RowDataPacket[];
        if (rows.length > 0) {
          continue;
        }

        await connection.execute(
          `
            INSERT INTO training_attendees (session_id, employee_id, is_required, added_by, added_date)
            VALUES (:session_id, :employee_id, :is_required, :added_by, NOW())
          `,
          {
            session_id: sessionId,
            employee_id: employeeId,
            is_required: 1,
            added_by: addedBy,
          },
        );
      }
    });

    return { message: 'Expected attendees added successfully' };
  }

  async removeAttendance(attendanceIdRaw: string) {
    const attendanceId = this.toPositiveInt(attendanceIdRaw);
    if (!attendanceId) {
      return { error: 'Attendance id is required' };
    }

    await this.mysqlService.execute('DELETE FROM training_attendance WHERE id = :id', { id: attendanceId });
    return { message: 'Attendance record removed successfully' };
  }

  async markAttendanceManually(
    sessionIdRaw: string,
    body: Dict,
    ipAddress?: string,
    userAgent?: string,
    markedByUserId?: number,
  ) {
    const sessionId = this.toPositiveInt(sessionIdRaw);
    const employeeId = this.toPositiveInt(body.employeeId);

    if (!sessionId || !employeeId) {
      return {
        success: false,
        message: 'Missing sessionId or employeeId',
        alreadySignedIn: false,
        isExpectedAttendee: false,
      };
    }

    const employeeRows = await this.mysqlService.query<RowDataPacket[]>(
      `
        SELECT id, card_number, first, last, title, department, email, image
        FROM db.users
        WHERE id = :employee_id
          AND active = 1
      `,
      { employee_id: employeeId },
    );

    const employee = employeeRows[0];
    if (!employee) {
      return {
        success: false,
        message: 'Employee not found',
        alreadySignedIn: false,
        isExpectedAttendee: false,
      };
    }

    const sessionRows = await this.mysqlService.query<RowDataPacket[]>(
      'SELECT id, status FROM training_sessions WHERE id = :id',
      { id: sessionId },
    );
    const session = sessionRows[0];

    if (!session) {
      return {
        success: false,
        message: 'Training session not found',
        alreadySignedIn: false,
        isExpectedAttendee: false,
      };
    }

    if (!['scheduled', 'in-progress', 'completed'].includes(String(session.status))) {
      return {
        success: false,
        message: `Training session is not active (status: ${String(session.status)})`,
        alreadySignedIn: false,
        isExpectedAttendee: false,
      };
    }

    const expectedRows = await this.mysqlService.query<RowDataPacket[]>(
      'SELECT id FROM training_attendees WHERE session_id = :session_id AND employee_id = :employee_id',
      {
        session_id: sessionId,
        employee_id: Number(employee.id),
      },
    );
    const isExpectedAttendee = expectedRows.length > 0;

    const attendanceRows = await this.mysqlService.query<RowDataPacket[]>(
      'SELECT id FROM training_attendance WHERE session_id = :session_id AND employee_id = :employee_id',
      {
        session_id: sessionId,
        employee_id: Number(employee.id),
      },
    );

    if (attendanceRows.length > 0) {
      return {
        success: false,
        message: 'Employee already signed in for this session',
        alreadySignedIn: true,
        isExpectedAttendee,
        employee: this.mapEmployeeRow(employee),
      };
    }

    const badgeScanned = String(employee.card_number || '').trim() || `MANUAL-${employee.id}`;
    await this.mysqlService.execute(
      `
        INSERT INTO training_attendance
        (session_id, employee_id, sign_in_time, badge_scanned, ip_address, device_info)
        VALUES
        (:session_id, :employee_id, NOW(), :badge_scanned, :ip_address, :device_info)
      `,
      {
        session_id: sessionId,
        employee_id: Number(employee.id),
        badge_scanned: badgeScanned,
        ip_address: ipAddress || null,
        device_info: JSON.stringify({
          user_agent: userAgent || 'Unknown',
          timestamp: new Date().toISOString(),
          manual_signoff: true,
          marked_by_user_id: markedByUserId || null,
        }),
      },
    );

    return {
      success: true,
      message: `${String(employee.first || '')} ${String(employee.last || '')}`.trim() + ' manually marked as attended',
      alreadySignedIn: false,
      isExpectedAttendee,
      employee: this.mapEmployeeRow(employee),
    };
  }

  async scanBadge(body: Dict, ipAddress?: string, userAgent?: string) {
    const sessionId = this.toPositiveInt(body.sessionId);
    const badgeNumber = String(body.badgeNumber || '').trim();

    if (!sessionId || !badgeNumber) {
      return {
        success: false,
        message: 'Missing sessionId or badgeNumber',
        alreadySignedIn: false,
        isExpectedAttendee: false,
      };
    }

    const employeeRows = await this.mysqlService.query<RowDataPacket[]>(
      `
        SELECT id, card_number, first, last, title, department, email, image
        FROM db.users
        WHERE card_number = :badge_number
          AND active = 1
      `,
      { badge_number: badgeNumber },
    );

    const employee = employeeRows[0];
    if (!employee) {
      await this.logScanAttempt(sessionId, badgeNumber, 'BADGE_NOT_FOUND', ipAddress || null, null, userAgent || null);
      return {
        success: false,
        message: 'Badge number not found',
        alreadySignedIn: false,
        isExpectedAttendee: false,
      };
    }

    const sessionRows = await this.mysqlService.query<RowDataPacket[]>(
      'SELECT id, status FROM training_sessions WHERE id = :id',
      { id: sessionId },
    );
    const session = sessionRows[0];

    if (!session) {
      await this.logScanAttempt(sessionId, badgeNumber, 'SESSION_NOT_FOUND', ipAddress || null, Number(employee.id), userAgent || null);
      return {
        success: false,
        message: 'Training session not found',
        alreadySignedIn: false,
        isExpectedAttendee: false,
      };
    }

    if (!['scheduled', 'in-progress', 'completed'].includes(String(session.status))) {
      return {
        success: false,
        message: `Training session is not active (status: ${String(session.status)})`,
        alreadySignedIn: false,
        isExpectedAttendee: false,
      };
    }

    const expectedRows = await this.mysqlService.query<RowDataPacket[]>(
      'SELECT id FROM training_attendees WHERE session_id = :session_id AND employee_id = :employee_id',
      {
        session_id: sessionId,
        employee_id: Number(employee.id),
      },
    );
    const isExpectedAttendee = expectedRows.length > 0;

    const attendanceRows = await this.mysqlService.query<RowDataPacket[]>(
      'SELECT id FROM training_attendance WHERE session_id = :session_id AND employee_id = :employee_id',
      {
        session_id: sessionId,
        employee_id: Number(employee.id),
      },
    );

    if (attendanceRows.length > 0) {
      await this.logScanAttempt(sessionId, badgeNumber, 'ALREADY_SIGNED_IN', ipAddress || null, Number(employee.id), userAgent || null);
      return {
        success: false,
        message: 'Employee already signed in for this session',
        alreadySignedIn: true,
        isExpectedAttendee,
        employee: this.mapEmployeeRow(employee),
      };
    }

    await this.mysqlService.execute(
      `
        INSERT INTO training_attendance
        (session_id, employee_id, sign_in_time, badge_scanned, ip_address, device_info)
        VALUES
        (:session_id, :employee_id, NOW(), :badge_scanned, :ip_address, :device_info)
      `,
      {
        session_id: sessionId,
        employee_id: Number(employee.id),
        badge_scanned: badgeNumber,
        ip_address: ipAddress || null,
        device_info: JSON.stringify({
          user_agent: userAgent || 'Unknown',
          timestamp: new Date().toISOString(),
        }),
      },
    );

    await this.logScanAttempt(sessionId, badgeNumber, 'SUCCESS', ipAddress || null, Number(employee.id), userAgent || null);

    return {
      success: true,
      message: `${String(employee.first || '')} ${String(employee.last || '')}`.trim() + ' successfully signed in for training',
      alreadySignedIn: false,
      isExpectedAttendee,
      employee: this.mapEmployeeRow(employee),
    };
  }

  async getEmployees() {
    const rows = await this.mysqlService.query<RowDataPacket[]>(
      `
        SELECT
          id,
          card_number AS badge_number,
          card_number AS badge_id,
          first AS first_name,
          last AS last_name,
          title AS position,
          title,
          department,
          email,
          image
        FROM db.users
        WHERE active = 1
        ORDER BY first, last
      `,
    );

    return rows.map((row) => this.mapEmployeeRow(row));
  }

  async searchEmployees(queryRaw: string) {
    const query = String(queryRaw || '').trim();
    if (!query) {
      return [];
    }

    const like = `%${query}%`;
    const rows = await this.mysqlService.query<RowDataPacket[]>(
      `
        SELECT
          id,
          card_number AS badge_number,
          card_number AS badge_id,
          first AS first_name,
          last AS last_name,
          title AS position,
          title,
          department,
          email,
          image
        FROM db.users
        WHERE active = 1
          AND (
            first LIKE :like_query OR
            last LIKE :like_query OR
            card_number LIKE :like_query OR
            title LIKE :like_query OR
            department LIKE :like_query
          )
        ORDER BY last, first
        LIMIT 50
      `,
      { like_query: like },
    );

    return rows.map((row) => this.mapEmployeeRow(row));
  }

  async getEmployeeByBadge(badgeNumberRaw: string) {
    const badgeNumber = String(badgeNumberRaw || '').trim();
    if (!badgeNumber) {
      return { error: 'badgeNumber is required' };
    }

    const rows = await this.mysqlService.query<RowDataPacket[]>(
      `
        SELECT
          id,
          card_number AS badge_number,
          card_number AS badge_id,
          first AS first_name,
          last AS last_name,
          title AS position,
          title,
          department,
          email,
          image
        FROM db.users
        WHERE active = 1
          AND card_number = :badge_number
      `,
      { badge_number: badgeNumber },
    );

    const employee = rows[0];
    if (!employee) {
      return { error: 'Employee not found' };
    }

    return this.mapEmployeeRow(employee);
  }

  async getCategories() {
    return this.mysqlService.query<RowDataPacket[]>(
      'SELECT * FROM training_categories WHERE is_active = 1 ORDER BY name',
    );
  }

  async getTemplates(activeOnlyRaw?: string) {
    const activeOnly = String(activeOnlyRaw || '').toLowerCase() === 'true';
    const whereClause = activeOnly ? 'WHERE tst.is_active = 1' : '';

    return this.mysqlService.query<RowDataPacket[]>(
      `
        SELECT
          tst.*, tc.name AS category_name, tc.color_code AS category_color
        FROM training_session_templates tst
        LEFT JOIN training_categories tc ON tst.category_id = tc.id
        ${whereClause}
        ORDER BY tst.name
      `,
    );
  }

  async getTemplate(idRaw: string) {
    const templateId = this.toPositiveInt(idRaw);
    if (!templateId) {
      return { error: 'Template id is required' };
    }

    const rows = await this.mysqlService.query<RowDataPacket[]>(
      `
        SELECT
          tst.*, tc.name AS category_name, tc.color_code AS category_color
        FROM training_session_templates tst
        LEFT JOIN training_categories tc ON tst.category_id = tc.id
        WHERE tst.id = :id
      `,
      { id: templateId },
    );

    return rows[0] || { error: 'Template not found' };
  }

  async createTemplate(body: Dict) {
    const payload = this.normalizeTemplatePayload(body);

    const result = await this.mysqlService.execute<ResultSetHeader>(
      `
        INSERT INTO training_session_templates
        (name, title_template, description_template, purpose_template, default_duration_minutes, default_location, category_id, is_active, created_by)
        VALUES
        (:name, :title_template, :description_template, :purpose_template, :default_duration_minutes, :default_location, :category_id, :is_active, :created_by)
      `,
      payload,
    );

    return this.getTemplate(String(result.insertId));
  }

  async updateTemplate(idRaw: string, body: Dict) {
    const templateId = this.toPositiveInt(idRaw);
    if (!templateId) {
      return { error: 'Template id is required' };
    }

    const payload = this.normalizeTemplatePayload(body);

    await this.mysqlService.execute(
      `
        UPDATE training_session_templates
        SET name = :name,
            title_template = :title_template,
            description_template = :description_template,
            purpose_template = :purpose_template,
            default_duration_minutes = :default_duration_minutes,
            default_location = :default_location,
            category_id = :category_id,
            is_active = :is_active
        WHERE id = :id
      `,
      {
        ...payload,
        id: templateId,
      },
    );

    return this.getTemplate(String(templateId));
  }

  async deleteTemplate(idRaw: string) {
    const templateId = this.toPositiveInt(idRaw);
    if (!templateId) {
      return { error: 'Template id is required' };
    }

    await this.mysqlService.execute('DELETE FROM training_session_templates WHERE id = :id', { id: templateId });
    return { message: 'Template deleted successfully' };
  }

  private normalizeTemplatePayload(body: Dict) {
    return {
      name: String(body.name || '').trim(),
      title_template: String(body.title_template || '').trim(),
      description_template: String(body.description_template || ''),
      purpose_template: String(body.purpose_template || ''),
      default_duration_minutes: this.toPositiveInt(body.default_duration_minutes) || 60,
      default_location: String(body.default_location || ''),
      category_id: this.toNullableInt(body.category_id),
      is_active: body.is_active === 0 || body.is_active === false ? 0 : 1,
      created_by: this.toPositiveInt(body.created_by) || 1,
    };
  }

  private async logScanAttempt(
    sessionId: number,
    badgeNumber: string,
    result: string,
    ipAddress: string | null,
    employeeId: number | null,
    userAgent: string | null,
  ) {
    try {
      await this.mysqlService.execute(
        `
          INSERT INTO training_scan_log
          (session_id, badge_number, employee_id, scan_result, ip_address, device_info, scan_timestamp)
          VALUES
          (:session_id, :badge_number, :employee_id, :scan_result, :ip_address, :device_info, NOW())
        `,
        {
          session_id: sessionId,
          badge_number: badgeNumber,
          employee_id: employeeId,
          scan_result: result,
          ip_address: ipAddress,
          device_info: JSON.stringify({
            user_agent: userAgent || 'Unknown',
            timestamp: new Date().toISOString(),
          }),
        },
      );
    } catch {
      // best effort logging only
    }
  }

  private mapEmployeeRow(row: RowDataPacket) {
    return {
      // Joined training rows often include both row.id (attendance/attendee id)
      // and row.employee_id (actual user id). Prefer employee_id for employee identity.
      id: Number(row.employee_id || row.user_id || row.id || 0),
      badgeNumber: String(row.badge_number || row.card_number || ''),
      badgeId: String(row.badge_id || row.badge_number || row.card_number || ''),
      firstName: String(row.first_name || row.first || ''),
      lastName: String(row.last_name || row.last || ''),
      position: String(row.position || row.title || ''),
      title: String(row.title || row.position || ''),
      department: String(row.department || ''),
      email: row.email ? String(row.email) : undefined,
      image: row.image ? String(row.image) : undefined,
      photoUrl: row.image ? String(row.image) : undefined,
    };
  }

  private mapExpectedAttendee(attendee: RowDataPacket) {
    return {
      id: Number(attendee.id || 0),
      sessionId: Number(attendee.session_id || 0),
      employeeId: Number(attendee.employee_id || 0),
      isRequired: Boolean(attendee.is_required),
      notificationSent: Boolean(attendee.notification_sent),
      addedDate: String(attendee.added_date || ''),
      addedBy: Number(attendee.added_by || 0),
      employee: this.mapEmployeeRow(attendee),
    };
  }

  private mapAttendance(attendance: RowDataPacket) {
    return {
      id: Number(attendance.id || 0),
      sessionId: Number(attendance.session_id || 0),
      employeeId: Number(attendance.employee_id || 0),
      signInTime: String(attendance.sign_in_time || ''),
      signoffTime: String(attendance.sign_in_time || ''),
      attendanceDuration: Number(attendance.attendance_duration || 0),
      badgeScanned: String(attendance.badge_scanned || ''),
      ipAddress: attendance.ip_address ? String(attendance.ip_address) : undefined,
      deviceInfo: attendance.device_info ? String(attendance.device_info) : undefined,
      isLateArrival: Boolean(attendance.is_late_arrival),
      notes: attendance.notes ? String(attendance.notes) : undefined,
      employee: this.mapEmployeeRow(attendance),
    };
  }

  private toPositiveInt(value: unknown): number | null {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return null;
    }
    return Math.floor(parsed);
  }

  private toNullableInt(value: unknown): number | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }
    return this.toPositiveInt(value);
  }

  private async notifySessionCreatedAttendees(sessionId: number): Promise<void> {
    try {
      const attendeeRows = await this.mysqlService.query<RowDataPacket[]>(
        `
          SELECT
            u.id,
            u.first,
            u.last,
            u.email,
            ts.title,
            ts.date,
            ts.start_time,
            ts.end_time,
            ts.location
          FROM training_attendees ta
          JOIN db.users u ON u.id = ta.employee_id
          JOIN training_sessions ts ON ts.id = ta.session_id
          WHERE ta.session_id = :session_id
            AND u.active = 1
            AND COALESCE(TRIM(u.email), '') <> ''
        `,
        { session_id: sessionId },
      );

      for (const attendee of attendeeRows) {
        const email = String(attendee.email || '').trim();
        if (!email) {
          continue;
        }

        const fullName = `${String(attendee.first || '').trim()} ${String(attendee.last || '').trim()}`.trim() || 'Team Member';
        const subject = `Training Session Assigned: ${String(attendee.title || 'Training Session').trim()}`;
        const html = this.emailTemplateService.render('training-session-assigned', {
          fullName,
          title: String(attendee.title || '').trim(),
          date: String(attendee.date || '').trim(),
          startTime: String(attendee.start_time || '').trim(),
          endTime: String(attendee.end_time || '').trim(),
          location: String(attendee.location || '').trim(),
        });

        await this.emailService.sendMail({
          to: email,
          subject,
          html,
        });
      }
    } catch (error) {
      this.logger.warn(
        `Failed to send training session creation notifications for session ${sessionId}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private async notifySessionAttendeeRemoved(attendee: RowDataPacket): Promise<void> {
    try {
      const email = String(attendee.email || '').trim();
      if (!email) {
        return;
      }

      const fullName = `${String(attendee.first || '').trim()} ${String(attendee.last || '').trim()}`.trim() || 'Team Member';
      const subject = `Training Session Update: Removed from ${String(attendee.title || 'Training Session').trim()}`;
      const html = this.emailTemplateService.render('training-session-removed', {
        fullName,
        title: String(attendee.title || '').trim(),
        date: String(attendee.date || '').trim(),
        startTime: String(attendee.start_time || '').trim(),
        endTime: String(attendee.end_time || '').trim(),
        location: String(attendee.location || '').trim(),
      });

      await this.emailService.sendMail({
        to: email,
        subject,
        html,
      });
    } catch (error) {
      this.logger.warn(
        `Failed to send attendee removal notification for session ${String(attendee.session_id || '')}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private async notifySessionCancelledAttendees(sessionId: number): Promise<void> {
    try {
      const attendeeRows = await this.mysqlService.query<RowDataPacket[]>(
        `
          SELECT
            u.id,
            u.first,
            u.last,
            u.email,
            ts.title,
            ts.date,
            ts.start_time,
            ts.end_time,
            ts.location
          FROM training_attendees ta
          JOIN db.users u ON u.id = ta.employee_id
          JOIN training_sessions ts ON ts.id = ta.session_id
          WHERE ta.session_id = :session_id
            AND u.active = 1
            AND COALESCE(TRIM(u.email), '') <> ''
        `,
        { session_id: sessionId },
      );

      for (const attendee of attendeeRows) {
        const email = String(attendee.email || '').trim();
        if (!email) {
          continue;
        }

        const fullName = `${String(attendee.first || '').trim()} ${String(attendee.last || '').trim()}`.trim() || 'Team Member';
        const subject = `Training Session Cancelled: ${String(attendee.title || 'Training Session').trim()}`;
        const html = this.emailTemplateService.render('training-session-cancelled', {
          fullName,
          title: String(attendee.title || '').trim(),
          date: String(attendee.date || '').trim(),
          startTime: String(attendee.start_time || '').trim(),
          endTime: String(attendee.end_time || '').trim(),
          location: String(attendee.location || '').trim(),
        });

        await this.emailService.sendMail({
          to: email,
          subject,
          html,
        });
      }
    } catch (error) {
      this.logger.warn(
        `Failed to send training session cancellation notifications for session ${sessionId}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}

