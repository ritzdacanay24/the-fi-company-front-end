import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { SharedModule } from '@app/shared/shared.module';

@Component({
  standalone: true,
  imports: [SharedModule],
  selector: 'app-service-type',
  templateUrl: './service-type.component.html',
  styleUrls: []
})
export class ServiceTypeComponent implements OnInit {

  constructor(
    public route: ActivatedRoute,
    public router: Router
  ) {
  }

  ngOnInit(): void {
  }

  title: string = 'Service Types';

  icon = 'mdi mdi-cogs';
}
