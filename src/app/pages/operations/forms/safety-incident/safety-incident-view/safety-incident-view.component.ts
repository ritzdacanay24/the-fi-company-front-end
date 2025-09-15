import { Component } from "@angular/core";
import { SharedModule } from "@app/shared/shared.module";
import { ActivatedRoute, Router } from "@angular/router";
import { ToastrService } from "ngx-toastr";
import { SafetyIncidentService } from "@app/core/api/operations/safety-incident/safety-incident.service";
import { AttachmentsService } from "@app/core/api/attachments/attachments.service";
import { NAVIGATION_ROUTE, FILE } from "../safety-incident-constant";

@Component({
    standalone: true,
    imports: [SharedModule],
    selector: "app-safety-incident-view",
    templateUrl: "./safety-incident-view.component.html",
})
export class SafetyIncidentViewComponent {
    constructor(
        private router: Router,
        private activatedRoute: ActivatedRoute,
        private api: SafetyIncidentService,
        private toastrService: ToastrService,
        private attachmentsService: AttachmentsService
    ) { }

    ngOnInit(): void {
        this.activatedRoute.queryParams.subscribe((params) => {
            this.id = params["id"];
        });

        if (this.id) this.getData();
    }

    title = "Safety Incident Details";
    id = null;
    data: any = {};
    isLoading = false;
    attachments: any = [];

    goBack = () => {
        this.router.navigate([NAVIGATION_ROUTE.LIST], {
            queryParamsHandling: "merge",
        });
    };

    goToEdit = () => {
        this.router.navigate([NAVIGATION_ROUTE.EDIT], {
            queryParams: { id: this.id },
        });
    };

    async getData() {
        try {
            this.isLoading = true;
            this.data = await this.api.getById(this.id);
            await this.getAttachments();
            this.isLoading = false;
        } catch (err) {
            this.isLoading = false;
            this.toastrService.error("Error loading safety incident details");
        }
    }

    async getAttachments() {
        try {
            this.attachments = await this.attachmentsService.find({
                field: FILE.FIELD,
                uniqueId: this.id,
            });
        } catch (err) {
            console.error("Error loading attachments:", err);
        }
    }

    // Helper methods for data processing
    processRawData() {
        if (!this.data) return {};

        return {
            // Core incident information
            id: this.data.id || "N/A",
            first_name: this.data.first_name || "N/A",
            last_name: this.data.last_name || "N/A",
            full_name: this.getFullName(),
            date_of_incident: this.formatDate(this.data.date_of_incident),
            time_of_incident: this.formatTime(this.data.time_of_incident),

            // Incident classification
            type_of_incident: this.data.type_of_incident || "N/A",
            type_of_incident_other: this.data.type_of_incident_other || "N/A",
            location_of_incident: this.data.location_of_incident || "N/A",
            location_of_incident_other: this.data.location_of_incident_other || "N/A",
            location_of_incident_other_other: this.data.location_of_incident_other_other || "N/A",

            // Incident details
            description_of_incident: this.data.description_of_incident || "N/A",
            details_of_any_damage_or_personal_injury: this.data.details_of_any_damage_or_personal_injury || "N/A",

            // Administrative information
            status: this.formatStatus(this.data.status),
            corrective_action_owner: this.data.corrective_action_owner || "N/A",
            corrective_action_owner_user_email: this.data.corrective_action_owner_user_email || "N/A",
            proposed_corrective_action: this.data.proposed_corrective_action || "N/A",
            proposed_corrective_action_completion_date: this.formatDate(this.data.proposed_corrective_action_completion_date),
            confirmed_corrective_action_completion_date: this.formatDate(this.data.confirmed_corrective_action_completion_date),
            comments: this.data.comments || "N/A",

            // Timestamps
            created_date: this.formatDateTime(this.data.created_date),
            updated_date: this.formatDateTime(this.data.updated_date),
            created_by: this.data.created_by || "N/A",
            updated_by: this.data.updated_by || "N/A",
        };
    }

    private getFullName(): string {
        const firstName = this.data?.first_name || "";
        const lastName = this.data?.last_name || "";
        if (!firstName && !lastName) return "N/A";
        return `${firstName} ${lastName}`.trim();
    }

    private formatDate(dateString: any): string {
        if (!dateString || dateString === "0000-00-00") return "N/A";
        try {
            return new Date(dateString).toLocaleDateString();
        } catch {
            return dateString || "N/A";
        }
    }

    private formatTime(timeString: any): string {
        if (!timeString || timeString === "00:00:00") return "N/A";
        try {
            // Handle time format conversion if needed
            return timeString;
        } catch {
            return timeString || "N/A";
        }
    }

    private formatDateTime(dateTimeString: any): string {
        if (!dateTimeString || dateTimeString === "0000-00-00 00:00:00") return "N/A";
        try {
            return new Date(dateTimeString).toLocaleString();
        } catch {
            return dateTimeString || "N/A";
        }
    }

    private formatStatus(status: any): string {
        if (!status) return "N/A";

        // Convert status to display format
        const statusMap = {
            'pending': 'Pending Investigation',
            'investigating': 'Under Investigation',
            'completed': 'Investigation Complete',
            'closed': 'Closed'
        };

        return statusMap[status?.toLowerCase()] || status;
    }

    getStatusBadgeClass(status: string): string {
        switch (status?.toLowerCase()) {
            case 'pending':
                return 'bg-warning';
            case 'investigating':
                return 'bg-info';
            case 'completed':
                return 'bg-success';
            case 'closed':
                return 'bg-secondary';
            default:
                return 'bg-light text-dark';
        }
    }

    getSeverityBadgeClass(type: string): string {
        if (!type) return 'bg-light text-dark';

        const lowerType = type.toLowerCase();
        if (lowerType.includes('serious') || lowerType.includes('paramedics')) {
            return 'bg-danger';
        } else if (lowerType.includes('injury') && lowerType.includes('medical')) {
            return 'bg-warning';
        } else if (lowerType.includes('first aid')) {
            return 'bg-info';
        } else if (lowerType.includes('near miss')) {
            return 'bg-primary';
        } else {
            return 'bg-secondary';
        }
    }

    cleanNAValues(obj: any): any {
        const cleaned = { ...obj };
        Object.keys(cleaned).forEach(key => {
            if (cleaned[key] === "N/A" || cleaned[key] === "" || cleaned[key] === null) {
                cleaned[key] = null;
            }
        });
        return cleaned;
    }

    get processedData() {
        return this.processRawData();
    }
}