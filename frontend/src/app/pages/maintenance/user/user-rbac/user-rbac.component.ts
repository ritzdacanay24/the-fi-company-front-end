import { Component, Input } from "@angular/core";
import { SharedModule } from "@app/shared/shared.module";
import { ToastrService } from "ngx-toastr";
import {
  AccessControlApiService,
  AccessControlPermission,
  AccessControlRole,
} from "@app/core/api/access-control/access-control.service";

@Component({
  standalone: true,
  imports: [SharedModule],
  selector: "app-user-rbac",
  templateUrl: "./user-rbac.component.html",
})
export class UserRbacComponent {
  @Input() id: number | null = null;

  isLoading = false;
  isSaving = false;

  roles: AccessControlRole[] = [];
  permissions: AccessControlPermission[] = [];
  domains: string[] = [];

  selectedRoleIds: number[] = [];
  selectedScopeValues: string[] = [];

  async ngOnInit(): Promise<void> {
    if (this.id) {
      await this.loadData();
    }
  }

  async ngOnChanges(): Promise<void> {
    if (this.id) {
      await this.loadData();
    }
  }

  constructor(
    private readonly accessControlApi: AccessControlApiService,
    private readonly toastrService: ToastrService,
  ) {}

  isRoleSelected(roleId: number): boolean {
    return this.selectedRoleIds.includes(roleId);
  }

  toggleRole(roleId: number, checked: boolean): void {
    this.selectedRoleIds = checked
      ? [...this.selectedRoleIds, roleId]
      : this.selectedRoleIds.filter((id) => id !== roleId);
  }

  isScopeSelected(scopeValue: string): boolean {
    return this.selectedScopeValues.includes(scopeValue);
  }

  toggleScope(scopeValue: string, checked: boolean): void {
    this.selectedScopeValues = checked
      ? [...this.selectedScopeValues, scopeValue]
      : this.selectedScopeValues.filter((value) => value !== scopeValue);
  }

  trackByRole(_: number, role: AccessControlRole): number {
    return role.id;
  }

  trackByValue(_: number, value: string): string {
    return value;
  }

  async save(): Promise<void> {
    if (!this.id) {
      return;
    }

    try {
      this.isSaving = true;
      await this.accessControlApi.replaceUserRoles(this.id, this.selectedRoleIds);
      await this.accessControlApi.replaceUserScopes(this.id, this.selectedScopeValues);
      await this.loadData();
      this.toastrService.success("RBAC updated successfully");
    } finally {
      this.isSaving = false;
    }
  }

  private async loadData(): Promise<void> {
    if (!this.id) {
      return;
    }

    try {
      this.isLoading = true;
      const [roles, domains, userRoles, userPermissions, userScopes] = await Promise.all([
        this.accessControlApi.getRoles(),
        this.accessControlApi.getDomains(),
        this.accessControlApi.getUserRoles(this.id),
        this.accessControlApi.getUserPermissions(this.id),
        this.accessControlApi.getUserScopes(this.id),
      ]);

      this.roles = roles;
      this.domains = domains;
      this.permissions = userPermissions;
      this.selectedRoleIds = userRoles.map((role) => role.id);
      this.selectedScopeValues = userScopes;
    } finally {
      this.isLoading = false;
    }
  }
}
