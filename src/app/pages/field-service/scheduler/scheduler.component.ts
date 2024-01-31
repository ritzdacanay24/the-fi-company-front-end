import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { SharedModule } from '@app/shared/shared.module';

@Component({
  standalone: true,
  imports: [SharedModule],
  selector: 'app-scheduler',
  templateUrl: './scheduler.component.html',
  styleUrls: []
})
export class SchedulerComponent implements OnInit {

  currentUrl: string;

  constructor(
    public route: ActivatedRoute,
    public router: Router
  ) {
    router.events.subscribe((_: NavigationEnd) => this.currentUrl = _.url);
  }

  ngOnInit(): void {
    this.currentUrl = this.router.url;
  }
}
