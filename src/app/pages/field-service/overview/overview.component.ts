import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { SharedModule } from 'src/app/shared/shared.module';

@Component({
  standalone: true,
  imports: [SharedModule],
  selector: 'app-overview',
  templateUrl: './overview.component.html',
  styleUrls: []
})
export class OverviewComponent implements OnInit {
  constructor(
    public route: ActivatedRoute,
    public router: Router,
  ) {
  }

  ngOnInit(): void {
  }


}
