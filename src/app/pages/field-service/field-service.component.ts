import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';

@Component({
  selector: 'app-field-service',
  templateUrl: './field-service.component.html',
  styleUrls: []
})
export class FieldServiceComponent implements OnInit {

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
