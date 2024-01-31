import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { SharedModule } from '@app/shared/shared.module';

@Component({
  standalone: true,
  imports: [SharedModule],
  selector: 'app-operations',
  templateUrl: './operations.component.html',
  styleUrls: []
})
export class OperationsComponent implements OnInit {


  constructor(
    public route: ActivatedRoute,
    public router: Router
  ) {
  }

  ngOnInit(): void {
  }
}
