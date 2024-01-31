import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { SharedModule } from '@app/shared/shared.module';


@Component({
  standalone: true,
  imports: [SharedModule],
  selector: 'app-request',
  templateUrl: './request.component.html',
  styleUrls: []
})
export class RequestComponent implements OnInit {

  constructor(
    public route: ActivatedRoute,
    public router: Router
  ) {
  }

  ngOnInit(): void {
  }

  title = "Request"

  icon = "mdi mdi-note-plus-outline";
}
