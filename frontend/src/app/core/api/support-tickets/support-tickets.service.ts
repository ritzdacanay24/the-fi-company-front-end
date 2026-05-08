import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  CreateSupportTicketDto,
  SupportTicket,
  SupportTicketAttachment,
  SupportTicketComment,
  SupportTicketFilters,
  SupportTicketStatus,
} from '@app/shared/models/support-ticket.model';

const SUPPORT_TICKETS_API = 'apiV2/support-tickets';

@Injectable({
  providedIn: 'root',
})
export class SupportTicketsService {
  constructor(private readonly http: HttpClient) {}

  getTickets(filters?: SupportTicketFilters): Observable<SupportTicket[]> {
    let params = new HttpParams();
    Object.entries(filters || {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, String(value));
      }
    });

    return this.http.get<SupportTicket[]>(SUPPORT_TICKETS_API, { params });
  }

  getTicket(id: number): Observable<SupportTicket> {
    return this.http.get<SupportTicket>(`${SUPPORT_TICKETS_API}/${id}`);
  }

  createTicket(payload: CreateSupportTicketDto): Observable<SupportTicket> {
    return this.http.post<SupportTicket>(SUPPORT_TICKETS_API, payload);
  }

  updateTicket(id: number, payload: Partial<SupportTicket>): Observable<SupportTicket> {
    return this.http.put<SupportTicket>(`${SUPPORT_TICKETS_API}/${id}`, payload);
  }

  deleteTicket(id: number): Observable<void> {
    return this.http.delete<void>(`${SUPPORT_TICKETS_API}/${id}`);
  }

  getComments(ticketId: number): Observable<SupportTicketComment[]> {
    return this.http.get<SupportTicketComment[]>(`${SUPPORT_TICKETS_API}/${ticketId}/comments`);
  }

  addComment(ticketId: number, comment: string): Observable<SupportTicketComment> {
    return this.http.post<SupportTicketComment>(`${SUPPORT_TICKETS_API}/${ticketId}/comments`, {
      comment,
    });
  }

  updateComment(ticketId: number, commentId: number, comment: string): Observable<SupportTicketComment> {
    return this.http.put<SupportTicketComment>(`${SUPPORT_TICKETS_API}/${ticketId}/comments/${commentId}`, {
      comment,
    });
  }

  deleteComment(ticketId: number, commentId: number): Observable<void> {
    return this.http.delete<void>(`${SUPPORT_TICKETS_API}/${ticketId}/comments/${commentId}`);
  }

  getAttachments(ticketId: number): Observable<SupportTicketAttachment[]> {
    return this.http.get<SupportTicketAttachment[]>(`${SUPPORT_TICKETS_API}/${ticketId}/attachments`);
  }

  addAttachment(ticketId: number, payload: Partial<SupportTicketAttachment>): Observable<SupportTicketAttachment> {
    return this.http.post<SupportTicketAttachment>(`${SUPPORT_TICKETS_API}/${ticketId}/attachments`, payload);
  }

  deleteAttachment(ticketId: number, attachmentId: number): Observable<void> {
    return this.http.delete<void>(`${SUPPORT_TICKETS_API}/${ticketId}/attachments/${attachmentId}`);
  }

  closeTicket(ticketId: number): Observable<SupportTicket> {
    return this.updateTicket(ticketId, { status: 'closed' as SupportTicketStatus } as Partial<SupportTicket>);
  }
}
