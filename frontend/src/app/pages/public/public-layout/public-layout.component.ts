import { Component, Input } from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterModule } from "@angular/router";

@Component({
  standalone: true,
  imports: [CommonModule, RouterModule],
  selector: "app-public-layout",
  templateUrl: "./public-layout.component.html",
  styleUrls: ["./public-layout.component.scss"],
})
export class PublicLayoutComponent {
  @Input() pageTitle: string = "";
  @Input() pageDescription: string = "";
  @Input() pageIcon: string = "mdi-alert-circle-outline";
  @Input() isAuthenticated: boolean = false;
}
