import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { SharedModule } from '@app/shared/shared.module';

@Component({
  standalone: true,
  imports: [SharedModule],
  selector: 'app-job-status',
  templateUrl: './job-status.component.html',
  styleUrls: []
})
export class JobStatusComponent implements OnInit {

  constructor(
    public route: ActivatedRoute,
    public router: Router
  ) {
  }

  ngOnInit(): void {
  }
  selectedTab = 'list';

  title: string = 'Job Status';

  icon = 'mdi-cogs';

  onNavChange($event){
    console.log($event)
  }
}
