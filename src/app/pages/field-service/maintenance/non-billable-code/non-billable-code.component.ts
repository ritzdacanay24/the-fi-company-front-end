import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { SharedModule } from '@app/shared/shared.module';

@Component({
  standalone: true,
  imports: [SharedModule],
  selector: 'app-non-billable-code',
  templateUrl: './non-billable-code.component.html',
  styleUrls: []
})
export class NonBillableCodeComponent implements OnInit {

  constructor(
    public route: ActivatedRoute,
    public router: Router
  ) {
  }

  ngOnInit(): void {
  }

  title: string = 'Non Billable Code';

  icon = 'mdi-cogs';


}
