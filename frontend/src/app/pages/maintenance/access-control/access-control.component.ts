import { Component } from "@angular/core";
import { SharedModule } from "@app/shared/shared.module";
import {
  AccessControlModule,
  AccessControlApiService,
  AccessControlPermission,
  AccessControlRole,
  AccessControlUserSummary,
  PermissionRequest,
} from "@app/core/api/access-control/access-control.service";
import { ToastrService } from "ngx-toastr";
import Swal from "sweetalert2";

@Component({
  standalone: true,
  imports: [SharedModule],
  selector: "app-access-control",
  templateUrl: "./access-control.component.html",
})
export class AccessControlComponent {
  activeTab: "role" | "modules" | "user" | "requests" = "role";

  roles: AccessControlRole[] = [];
  permissions: AccessControlPermission[] = [];
  domains: string[] = [];
  modules: AccessControlModule[] = [];
  users: AccessControlUserSummary[] = [];

  selectedRoleId: number | null = null;
  selectedPermissionIds: number[] = [];
  newRoleName = "";
  newRoleDescription = "";

  selectedUserId: number | null = null;
  selectedGrantDomain = "";
  selectedUserGrantPermissionIds: number[] = [];

  moduleEdits: Record<number, { domain: string; department: string; isActive: boolean }> = {};

  isLoading = false;
  isSaving = false;
  isCreatingRole = false;
  isSavingModuleId: number | null = null;
  isSavingUserGrants = false;

  // Requests tab
  permissionRequests: PermissionRequest[] = [];
  isLoadingRequests = false;
  requestStatusFilter = "pending";
  requestStatusFilters = [
    { label: "Pending", value: "pending" },
    { label: "Approved", value: "approved" },
    { label: "Denied", value: "denied" },
    { label: "All", value: "" },
  ];

  get pendingRequestCount(): number {
    return this.permissionRequests.filter((r) => r.status === "pending").length;
  }

  constructor(
    private readonly accessControlApi: AccessControlApiService,
    private readonly toastrService: ToastrService,
  ) {}

  async ngOnInit(): Promise<void> {
    await this.loadStaticData();
  }

  trackByRole(_: number, role: AccessControlRole): number {
    return role.id;
  }

  trackByPermission(_: number, permission: AccessControlPermission): number {
    return permission.id;
  }

  trackByModule(_: number, module: AccessControlModule): number {
    return module.id;
  }

  trackByUser(_: number, user: AccessControlUserSummary): number {
    return user.id;
  }

  trackByValue(_: number, value: string): string {
    return value;
  }

  trackByStatusFilter(_: number, item: { label: string; value: string }): string {
    return item.value;
  }

  switchTab(tab: "role" | "modules" | "user" | "requests"): void {
    this.activeTab = tab;
    if (tab === "requests") {
      this.loadRequests();
    }
  }

  isPermissionSelected(permissionId: number): boolean {
    return this.selectedPermissionIds.includes(permissionId);
  }

  togglePermission(permissionId: number, checked: boolean): void {
    this.selectedPermissionIds = checked
      ? [...this.selectedPermissionIds, permissionId]
      : this.selectedPermissionIds.filter((id) => id !== permissionId);
  }

  async onRoleChange(value: string): Promise<void> {
    const roleId = Number(value);
    this.selectedRoleId = Number.isInteger(roleId) && roleId > 0 ? roleId : null;

    if (!this.selectedRoleId) {
      this.selectedPermissionIds = [];
      return;
    }

    await this.loadRolePermissions(this.selectedRoleId);
  }

  async save(): Promise<void> {
    if (!this.selectedRoleId) {
      this.toastrService.warning("Please select a role first");
      return;
    }

    try {
      this.isSaving = true;
      await this.accessControlApi.replaceRolePermissions(this.selectedRoleId, this.selectedPermissionIds);
      await this.loadRolePermissions(this.selectedRoleId);
      this.toastrService.success("Role permissions updated successfully");
    } finally {
      this.isSaving = false;
    }
  }

  async createRole(): Promise<void> {
    const roleName = String(this.newRoleName || "").trim();
    if (!roleName) {
      this.toastrService.warning("Role name is required");
      return;
    }

    try {
      this.isCreatingRole = true;
      const created = await this.accessControlApi.createRole({
        name: roleName,
        description: String(this.newRoleDescription || "").trim() || null,
      });

      this.roles = await this.accessControlApi.getRoles();
      this.selectedRoleId = created.id;
      this.selectedPermissionIds = [];
      this.newRoleName = "";
      this.newRoleDescription = "";
      this.toastrService.success("Role created. You can now assign permissions.");
    } finally {
      this.isCreatingRole = false;
    }
  }

  getModuleEdit(module: AccessControlModule): { domain: string; department: string; isActive: boolean } {
    if (!this.moduleEdits[module.id]) {
      this.moduleEdits[module.id] = {
        domain: module.domain || "",
        department: module.department || "",
        isActive: Number(module.is_active) === 1,
      };
    }

    return this.moduleEdits[module.id];
  }

  async saveModule(module: AccessControlModule): Promise<void> {
    const edit = this.getModuleEdit(module);
    const normalizedDomain = String(edit.domain || "").trim();
    if (!normalizedDomain) {
      this.toastrService.warning("Module domain is required");
      return;
    }

    try {
      this.isSavingModuleId = module.id;
      await this.accessControlApi.updateModule(module.id, {
        domain: normalizedDomain,
        department: String(edit.department || "").trim() || null,
        isActive: edit.isActive,
      });

      module.domain = normalizedDomain;
      module.department = String(edit.department || "").trim() || null;
      module.is_active = edit.isActive ? 1 : 0;
      await this.reloadDomains();
      this.toastrService.success(`Updated module ${module.display_name}`);
    } finally {
      this.isSavingModuleId = null;
    }
  }

  isUserGrantPermissionSelected(permissionId: number): boolean {
    return this.selectedUserGrantPermissionIds.includes(permissionId);
  }

  toggleUserGrantPermission(permissionId: number, checked: boolean): void {
    this.selectedUserGrantPermissionIds = checked
      ? [...this.selectedUserGrantPermissionIds, permissionId]
      : this.selectedUserGrantPermissionIds.filter((id) => id !== permissionId);
  }

  async onUserChange(value: string): Promise<void> {
    const userId = Number(value);
    this.selectedUserId = Number.isInteger(userId) && userId > 0 ? userId : null;
    await this.loadUserDomainGrants();
  }

  async onGrantDomainChange(value: string): Promise<void> {
    this.selectedGrantDomain = String(value || "").trim();
    await this.loadUserDomainGrants();
  }

  async saveUserGrants(): Promise<void> {
    if (!this.selectedUserId) {
      this.toastrService.warning("Select a user first");
      return;
    }

    if (!this.selectedGrantDomain) {
      this.toastrService.warning("Select a domain first");
      return;
    }

    try {
      this.isSavingUserGrants = true;
      await this.accessControlApi.replaceUserGrants(this.selectedUserId, {
        domain: this.selectedGrantDomain,
        permissionIds: this.selectedUserGrantPermissionIds,
      });
      await this.loadUserDomainGrants();
      this.toastrService.success("User-specific permissions updated");
    } finally {
      this.isSavingUserGrants = false;
    }
  }

  trackByRequest(_: number, req: PermissionRequest): number {
    return req.id!;
  }

  setRequestStatusFilter(status: string): void {
    this.requestStatusFilter = status;
    this.loadRequests();
  }

  async loadRequests(): Promise<void> {
    try {
      this.isLoadingRequests = true;
      this.permissionRequests = await this.accessControlApi.getPermissionRequests(
        this.requestStatusFilter || undefined,
      );
    } catch {
      this.toastrService.error("Failed to load permission requests");
    } finally {
      this.isLoadingRequests = false;
    }
  }

  async approveRequest(req: PermissionRequest): Promise<void> {
    const result = await Swal.fire({
      title: "Approve Request",
      html: `
        <div class="text-start">
          <p class="mb-3">Grant <strong>${req.permission_name}</strong> in domain <strong>${req.domain}</strong> to <strong>${req.requester_name}</strong>?</p>
          <label class="form-label small text-muted">Expiry date <span class="fw-normal">(leave blank for permanent)</span></label>
          <input id="swal-expires-at" type="date" class="form-control form-control-sm" />
        </div>`,
      confirmButtonText: "Approve & Grant",
      confirmButtonColor: "#198754",
      showCancelButton: true,
      cancelButtonText: "Cancel",
      focusConfirm: false,
      preConfirm: () => {
        const input = document.getElementById("swal-expires-at") as HTMLInputElement;
        return input?.value || null;
      },
    });

    if (!result.isConfirmed) return;

    try {
      await this.accessControlApi.approvePermissionRequest(req.id!, result.value ?? null);
      this.toastrService.success(`Approved: ${req.requester_name} now has ${req.permission_name} in ${req.domain}`);
      await this.loadRequests();
    } catch {
      this.toastrService.error("Failed to approve request");
    }
  }

  async denyRequest(req: PermissionRequest): Promise<void> {
    const result = await Swal.fire({
      title: "Deny Request",
      html: `
        <div class="text-start">
          <p class="mb-3">Deny <strong>${req.permission_name}</strong> request from <strong>${req.requester_name}</strong>?</p>
          <label class="form-label small text-muted">Reason for denial <span class="fw-normal">(optional, shown to user)</span></label>
          <textarea id="swal-deny-notes" class="form-control form-control-sm" rows="2" placeholder="e.g. Not required for your role..."></textarea>
        </div>`,
      confirmButtonText: "Deny",
      confirmButtonColor: "#dc3545",
      showCancelButton: true,
      cancelButtonText: "Cancel",
      focusConfirm: false,
      preConfirm: () => {
        const input = document.getElementById("swal-deny-notes") as HTMLTextAreaElement;
        return input?.value || null;
      },
    });

    if (!result.isConfirmed) return;

    try {
      await this.accessControlApi.denyPermissionRequest(req.id!, result.value ?? null);
      this.toastrService.success("Request denied");
      await this.loadRequests();
    } catch {
      this.toastrService.error("Failed to deny request");
    }
  }

  private async loadStaticData(): Promise<void> {
    try {
      this.isLoading = true;
      const [roles, permissions, domains, modules, users] = await Promise.all([
        this.accessControlApi.getRoles(),
        this.accessControlApi.getPermissions(),
        this.accessControlApi.getDomains(),
        this.accessControlApi.getModules(),
        this.accessControlApi.getUsers(),
      ]);

      this.roles = roles;
      this.permissions = permissions;
      this.domains = domains;
      this.modules = modules;
      this.users = users;

      if (this.domains.length > 0) {
        this.selectedGrantDomain = this.domains[0];
      }

      if (this.users.length > 0) {
        this.selectedUserId = this.users[0].id;
      }

      if (this.roles.length > 0) {
        this.selectedRoleId = this.roles[0].id;
        await this.loadRolePermissions(this.selectedRoleId);
      }

      await this.loadUserDomainGrants();
    } finally {
      this.isLoading = false;
    }
  }

  private async loadRolePermissions(roleId: number): Promise<void> {
    const rolePermissions = await this.accessControlApi.getRolePermissions(roleId);
    this.selectedPermissionIds = rolePermissions.map((permission) => permission.id);
  }

  private async reloadDomains(): Promise<void> {
    this.domains = await this.accessControlApi.getDomains();
    if (!this.selectedGrantDomain && this.domains.length > 0) {
      this.selectedGrantDomain = this.domains[0];
    }
  }

  private async loadUserDomainGrants(): Promise<void> {
    if (!this.selectedUserId || !this.selectedGrantDomain) {
      this.selectedUserGrantPermissionIds = [];
      return;
    }

    const grants = await this.accessControlApi.getUserGrants(this.selectedUserId, this.selectedGrantDomain);
    this.selectedUserGrantPermissionIds = grants.map((grant) => grant.permission_id);
  }
}
