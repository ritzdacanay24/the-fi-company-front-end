import { Component } from '@angular/core';
import { SharedModule } from '@app/shared/shared.module';

@Component({
  standalone: true,
  imports: [SharedModule],
  selector: 'app-qir-options',
  template: '<router-outlet></router-outlet>',
})
export class QirOptionsComponent {}
