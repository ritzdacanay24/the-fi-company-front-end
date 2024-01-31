import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-quality',
  templateUrl: './quality.component.html',
  styleUrls: []
})
export class QualityComponent implements OnInit {


  constructor(
    public route: ActivatedRoute,
    public router: Router
  ) {
  }

  ngOnInit(): void {
  }
}
