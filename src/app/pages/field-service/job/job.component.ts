import { Component, OnInit } from '@angular/core';
import { HeaderComponent } from './header/header.component';
import { SharedModule } from '@app/shared/shared.module';

@Component({
  standalone: true,
  imports: [SharedModule, HeaderComponent],
  selector: 'app-job',
  templateUrl: './job.component.html',
  styleUrls: []
})
export class JobComponent implements OnInit {

  constructor(
  ) {
  }

  ngOnInit(): void {
  }

  title = "Job"

  menu = [
    { name: "List Jobs", link: './list', icon: 'feather icon-list', active: 'list' },
    { name: "Create new job", link: './create', icon: 'feather icon-plus-square' },
    { name: "Open Invoice", link: './job-open-invoice', icon: 'feather icon-layers' },
    { name: "Map", link: './map', icon: 'feather icon-map-pin' }
  ]

}
