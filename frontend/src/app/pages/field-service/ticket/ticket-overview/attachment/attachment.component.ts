import { Component, Input } from '@angular/core'
import { FeatureType } from '@app/shared/enums/feature.enum'
import { FeatureAttachmentsPanelComponent } from '@app/shared/components/attachments/feature-attachments-panel/feature-attachments-panel.component'
import { SharedModule } from '@app/shared/shared.module'

@Component({
  standalone: true,
  imports: [
    SharedModule,
    FeatureAttachmentsPanelComponent,
  ],
  selector: 'app-attachment',
  templateUrl: `./attachment.component.html`,
})
export class AttachmentComponent {
  @Input() public workOrderId: number | string;
  @Input() public disabled: boolean = false;
  readonly FeatureType = FeatureType;
  readonly legacyFieldNames = ['Field Service'];
}
