import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { SharedModule } from '@app/shared/shared.module';

@Component({
  standalone: true,
  imports: [SharedModule],
  selector: 'app-master-scheduling',
  templateUrl: './master-scheduling.component.html',
  styleUrls: []
})
export class MasterSchedulingComponent implements OnInit {

  constructor(
    public route: ActivatedRoute,
    public router: Router
  ) {
  }

  ngOnInit(): void {
  }

  title: string = 'Master Scheduling';

  icon = 'mdi-account-group';
}

