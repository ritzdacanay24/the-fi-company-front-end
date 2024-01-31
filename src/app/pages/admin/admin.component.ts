import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-admin',
  templateUrl: './admin.component.html',
  styleUrls: []
})
export class AdminComponent implements OnInit {


  constructor(
    public route: ActivatedRoute,
    public router: Router
  ) {
  }

  ngOnInit(): void {
  }
}
