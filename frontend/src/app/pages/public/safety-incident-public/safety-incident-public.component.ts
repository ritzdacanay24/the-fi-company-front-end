import { Component } from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterModule } from "@angular/router";

@Component({
  standalone: true,
  imports: [CommonModule, RouterModule],
  selector: "app-safety-incident-public",
  templateUrl: "./safety-incident-public.component.html",
  styleUrls: ["./safety-incident-public.component.scss"],
})
export class SafetyIncidentPublicComponent {
  pageTitle = "Report a Safety Incident";
  pageDescription = "Submit a safety incident report anonymously or with your contact information";
  pageIcon = "mdi-alert-circle-outline";
  isAuthenticated = false;
}
