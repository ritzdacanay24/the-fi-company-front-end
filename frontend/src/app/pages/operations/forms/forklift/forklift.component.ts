import { Component } from '@angular/core';
import { SharedModule } from '@app/shared/shared.module';

@Component({
  standalone: true,
  imports: [SharedModule],
  selector: 'app-forklift',
  templateUrl: './forklift.component.html',
})
export class ForkliftComponent {}
