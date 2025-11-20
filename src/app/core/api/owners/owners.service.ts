import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { DataService } from '../DataService';
import { firstValueFrom } from 'rxjs';

export interface Owner {
  id: number;
  name: string;
  email?: string;
  department?: string;
  description?: string;
  display_order: number;
  is_active: boolean;
  created_at?: string;
  created_by?: string;
  updated_at?: string;
  updated_by?: string;
}

export interface OwnerResponse {
  success: boolean;
  data?: Owner | Owner[];
  count?: number;
  message?: string;
  error?: string;
}

let url = 'owners/index.php';

@Injectable({
  providedIn: 'root'
})
export class OwnersService extends DataService<any> {
  
  // Cache for owners list
  private _owners$ = new BehaviorSubject<Owner[]>([]);
  public readonly owners$ = this._owners$.asObservable();
  
  // Cache for active owners only (for dropdowns)
  private _activeOwners$ = new BehaviorSubject<Owner[]>([]);
  public readonly activeOwners$ = this._activeOwners$.asObservable();

  // Cache for user-specific owners (owners assigned to current user)
  private _userOwners$ = new BehaviorSubject<Owner[]>([]);
  public readonly userOwners$ = this._userOwners$.asObservable();

  constructor(http: HttpClient) {
    super(url, http);
    // Load active owners on initialization
    this.loadActiveOwners();
  }

  /**
   * Get all owners (active and inactive)
   */
  getAllOwners = async (): Promise<OwnerResponse> => {
    const response = await firstValueFrom(this.http.get<OwnerResponse>(url));
    if (response.success && Array.isArray(response.data)) {
      this._owners$.next(response.data);
    }
    return response;
  }

  /**
   * Get active owners only (for dropdowns)
   */
  getActiveOwners = async (): Promise<OwnerResponse> => {
    const response = await firstValueFrom(
      this.http.get<OwnerResponse>(`${url}?active=true`)
    );
    if (response.success && Array.isArray(response.data)) {
      this._activeOwners$.next(response.data);
    }
    return response;
  }

  /**
   * Load active owners and update cache
   */
  loadActiveOwners(): void {
    this.getActiveOwners().catch(err => {
      console.error('Error loading active owners:', err);
    });
  }

  /**
   * Refresh all owners cache
   */
  refreshOwners(): void {
    this.getAllOwners().catch(err => {
      console.error('Error refreshing owners:', err);
    });
    this.loadActiveOwners();
  }

  /**
   * Get owner by ID
   */
  getOwnerById = async (id: number): Promise<OwnerResponse> => {
    return await firstValueFrom(
      this.http.get<OwnerResponse>(`${url}?id=${id}`)
    );
  }

  /**
   * Create a new owner
   */
  createOwner = async (owner: Partial<Owner>, userId?: string): Promise<OwnerResponse> => {
    const payload = {
      ...owner,
      user_id: userId
    };
    const response = await firstValueFrom(
      this.http.post<OwnerResponse>(url, payload)
    );
    if (response.success) {
      this.refreshOwners();
    }
    return response;
  }

  /**
   * Update an existing owner
   */
  updateOwner = async (id: number, owner: Partial<Owner>, userId?: string): Promise<OwnerResponse> => {
    const payload = {
      id,
      ...owner,
      user_id: userId
    };
    const response = await firstValueFrom(
      this.http.put<OwnerResponse>(url, payload)
    );
    if (response.success) {
      this.refreshOwners();
    }
    return response;
  }

  /**
   * Delete an owner (soft delete - marks as inactive)
   */
  deleteOwner = async (id: number, userId?: string): Promise<OwnerResponse> => {
    const payload = {
      id,
      user_id: userId
    };
    const response = await firstValueFrom(
      this.http.request<OwnerResponse>('DELETE', url, { body: payload })
    );
    if (response.success) {
      this.refreshOwners();
    }
    return response;
  }

  /**
   * Reorder owners display order
   */
  reorderOwners = async (
    orders: Array<{ id: number, display_order: number }>, 
    userId?: string
  ): Promise<OwnerResponse> => {
    const payload = {
      action: 'reorder',
      orders,
      user_id: userId
    };
    const response = await firstValueFrom(
      this.http.post<OwnerResponse>(url, payload)
    );
    if (response.success) {
      this.refreshOwners();
    }
    return response;
  }

  /**
   * Get current owners from cache (synchronous)
   */
  getOwnersFromCache(): Owner[] {
    return this._owners$.value;
  }

  /**
   * Get active owners from cache (synchronous)
   */
  getActiveOwnersFromCache(): Owner[] {
    return this._activeOwners$.value;
  }

  /**
   * Get user-specific owners from cache (synchronous)
   * Returns owners that are assigned to the current user
   */
  getUserOwnersFromCache(): Owner[] {
    return this._userOwners$.value;
  }

  /**
   * Load owners for a specific user and update cache
   */
  async loadOwnersForUser(userId: string | number): Promise<void> {
    try {
      const response = await this.getOwnersForUser(userId, true);
      if (response.success && Array.isArray(response.data)) {
        this._userOwners$.next(response.data);
        console.log(`✅ Loaded ${response.data.length} owners for user ${userId}`);
      } else {
        console.warn('⚠️ No owners found for user, using empty array');
        this._userOwners$.next([]);
      }
    } catch (error) {
      console.error('Error loading owners for user:', error);
      this._userOwners$.next([]);
    }
  }
  
  /**
   * Get owners available to a specific user
   * If user is admin, returns all owners
   * Otherwise returns only assigned owners
   */
  getOwnersForUser = async (userId: string | number, activeOnly: boolean = true): Promise<OwnerResponse> => {
    return await firstValueFrom(
      this.http.get<OwnerResponse>(`${url}?action=for-user&user_id=${userId}&active=${activeOnly}`)
    );
  }
  
  /**
   * Assign an owner to a user
   */
  assignOwnerToUser = async (userId: string | number, ownerId: number, adminUserId?: string): Promise<OwnerResponse> => {
    const payload = {
      action: 'assign-to-user',
      user_id: userId,
      owner_id: ownerId,
      admin_user_id: adminUserId
    };
    return await firstValueFrom(
      this.http.post<OwnerResponse>(url, payload)
    );
  }
  
  /**
   * Remove owner assignment from a user
   */
  removeOwnerFromUser = async (userId: string | number, ownerId: number, adminUserId?: string): Promise<OwnerResponse> => {
    const payload = {
      action: 'remove-from-user',
      user_id: userId,
      owner_id: ownerId,
      admin_user_id: adminUserId
    };
    return await firstValueFrom(
      this.http.post<OwnerResponse>(url, payload)
    );
  }
  
  /**
   * Get users assigned to an owner
   */
  getUsersForOwner = async (ownerId: number): Promise<any> => {
    return await firstValueFrom(
      this.http.get<any>(`${url}?action=users-for-owner&owner_id=${ownerId}`)
    );
  }
  
  /**
   * Get owner assignments for a user
   */
  getOwnerAssignmentsForUser = async (userId: string | number): Promise<OwnerResponse> => {
    return await firstValueFrom(
      this.http.get<OwnerResponse>(`${url}?action=owner-assignments&user_id=${userId}`)
    );
  }
  
  /**
   * Get all active users
   */
  getAllUsers = async (): Promise<any> => {
    return await firstValueFrom(
      this.http.get<any>('FieldServiceMobile/user/find.php?active=1')
    );
  }

  /**
   * Get all admin users (users with permission to manage owners)
   */
  getAdminUsers = async (): Promise<OwnerResponse> => {
    return await firstValueFrom(
      this.http.get<OwnerResponse>(`${url}?action=get-admin-users`)
    );
  }

  /**
   * Add a user as an admin (grant owner management permissions)
   */
  addAdminUser = async (userId: string | number, createdBy?: string): Promise<OwnerResponse> => {
    const payload = {
      action: 'add-admin-user',
      user_id: userId,
      created_by: createdBy
    };
    return await firstValueFrom(
      this.http.post<OwnerResponse>(url, payload)
    );
  }

  /**
   * Remove admin access from a user
   */
  removeAdminUser = async (userId: string | number, removedBy?: string): Promise<OwnerResponse> => {
    const payload = {
      action: 'remove-admin-user',
      user_id: userId,
      removed_by: removedBy
    };
    return await firstValueFrom(
      this.http.post<OwnerResponse>(url, payload)
    );
  }
}
