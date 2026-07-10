import { Component, Input } from "@angular/core";
import { SharedModule } from "@app/shared/shared.module";
import { FeatureType } from "@app/shared/enums/feature.enum";

@Component({
  standalone: true,
  imports: [
    SharedModule,
  ],
  selector: "app-ncr-attachments-list",
  templateUrl: "./ncr-attachments-list.component.html",
  styleUrls: [],
})
export class NcrAttachmentsListComponent {
  readonly FeatureType = FeatureType;

  @Input() id = null;
}
