import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { firstValueFrom } from "rxjs";

const url = "apiV2/access-control";

export interface AccessControlRole {
  id: number;
  name: string;
  description?: string | null;
}

export interface AccessControlPermission {
  id: number;
  name: string;
  description?: string | null;
}

export interface AccessControlModule {
  id: number;
  module_key: string;
  display_name: string;
  domain: string;
  department?: string | null;
  description?: string | null;
  is_active: number;
}

export interface AccessControlUserSummary {
  id: number;
  name: string;
  email?: string | null;
  employeeType?: number | null;
  active?: number | null;
}

export interface AccessControlUserGrant {
  id: number;
  permission_id: number;
  permission_name: string;
  domain: string;
  expires_at?: string | null;
}

export interface PermissionRequest {
  id: number;
  user_id: number;
  requester_name: string;
  requester_email: string | null;
  permission_id: number;
  permission_name: string;
  domain: string;
  reason: string | null;
  reference: string | null;
  status: 'pending' | 'approved' | 'denied' | 'revoked' | 'expired';
  requested_at: string;
  reviewed_by: number | null;
  reviewer_name: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  expires_at: string | null;
}

@Injectable({
  providedIn: "root",
})
export class AccessControlApiService {
  constructor(private http: HttpClient) {}

  getRoles = async (): Promise<AccessControlRole[]> =>
    firstValueFrom(this.http.get<AccessControlRole[]>(`${url}/roles`));

  createRole = async (payload: { name: string; description?: string | null }) =>
    firstValueFrom(this.http.post<{ success: boolean; id: number; name: string }>(`${url}/roles`, payload));

  updateRole = async (
    roleId: number,
    payload: { name?: string; description?: string | null; isActive?: boolean },
  ) => firstValueFrom(this.http.patch(`${url}/roles/${roleId}`, payload));

  getPermissions = async (): Promise<AccessControlPermission[]> =>
    firstValueFrom(this.http.get<AccessControlPermission[]>(`${url}/permissions`));

  getDomains = async (): Promise<string[]> =>
    firstValueFrom(this.http.get<string[]>(`${url}/domains`));

  getModules = async (): Promise<AccessControlModule[]> =>
    firstValueFrom(this.http.get<AccessControlModule[]>(`${url}/modules`));

  updateModule = async (
    moduleId: number,
    payload: { domain?: string; department?: string | null; isActive?: boolean },
  ) => firstValueFrom(this.http.patch(`${url}/modules/${moduleId}`, payload));

  getUsers = async (): Promise<AccessControlUserSummary[]> =>
    firstValueFrom(this.http.get<AccessControlUserSummary[]>(`${url}/users`));

  getUserRoles = async (userId: number): Promise<AccessControlRole[]> =>
    firstValueFrom(this.http.get<AccessControlRole[]>(`${url}/users/${userId}/roles`));

  getUserPermissions = async (userId: number): Promise<AccessControlPermission[]> =>
    firstValueFrom(this.http.get<AccessControlPermission[]>(`${url}/users/${userId}/permissions`));

  getRolePermissions = async (roleId: number): Promise<AccessControlPermission[]> =>
    firstValueFrom(this.http.get<AccessControlPermission[]>(`${url}/roles/${roleId}/permissions`));

  getUserScopes = async (userId: number): Promise<string[]> =>
    firstValueFrom(this.http.get<string[]>(`${url}/users/${userId}/scopes`));

  getUserGrants = async (userId: number, domain?: string): Promise<AccessControlUserGrant[]> => {
    const query = domain ? `?domain=${encodeURIComponent(domain)}` : "";
    return firstValueFrom(this.http.get<AccessControlUserGrant[]>(`${url}/users/${userId}/grants${query}`));
  };

  replaceUserRoles = async (userId: number, roleIds: number[]) =>
    firstValueFrom(this.http.post(`${url}/users/${userId}/roles`, { roleIds }));

  replaceRolePermissions = async (roleId: number, permissionIds: number[]) =>
    firstValueFrom(this.http.post(`${url}/roles/${roleId}/permissions`, { permissionIds }));

  replaceUserScopes = async (userId: number, scopeValues: string[]) =>
    firstValueFrom(this.http.post(`${url}/users/${userId}/scopes`, { scopeValues }));

  replaceUserGrants = async (
    userId: number,
    payload: { domain: string; permissionIds: number[]; grantedByUserId?: number },
  ) => firstValueFrom(this.http.post(`${url}/users/${userId}/grants`, payload));

  submitPermissionRequest = async (payload: {
    userId: number;
    permissionId: number;
    domain?: string | null;
    reason?: string | null;
  }) => firstValueFrom(this.http.post<{ success: boolean; id: number; status: string }>(`${url}/permission-requests`, payload));

  getPermissionRequests = async (status?: string): Promise<PermissionRequest[]> => {
    const query = status ? `?status=${encodeURIComponent(status)}` : '';
    return firstValueFrom(this.http.get<PermissionRequest[]>(`${url}/permission-requests${query}`));
  };

  approvePermissionRequest = async (id: number, expiresAt?: string | null) =>
    firstValueFrom(this.http.put<{ success: boolean }>(`${url}/permission-requests/${id}/approve`, { expiresAt: expiresAt ?? null }));

  denyPermissionRequest = async (id: number, reviewNotes?: string | null) =>
    firstValueFrom(this.http.put<{ success: boolean }>(`${url}/permission-requests/${id}/deny`, { reviewNotes: reviewNotes ?? null }));
}
