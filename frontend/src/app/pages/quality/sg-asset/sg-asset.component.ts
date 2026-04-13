import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { SharedModule } from '@app/shared/shared.module';

@Component({
  standalone: true,
  imports: [SharedModule],
  selector: 'app-sg-asset',
  templateUrl: './sg-asset.component.html',
  styleUrls: []
})
export class SgAssetComponent implements OnInit {

  constructor(
    public route: ActivatedRoute,
    public router: Router
  ) {
  }

  ngOnInit(): void {
  }

  title = "SG Asset"

  icon = "mdi mdi-cogs";
}
