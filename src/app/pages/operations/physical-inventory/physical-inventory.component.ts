import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { SharedModule } from '@app/shared/shared.module';

@Component({
  standalone: true,
  imports: [SharedModule],
  selector: 'app-physical-inventory',
  templateUrl: './physical-inventory.component.html',
  styleUrls: []
})
export class PhysicalInventoryComponent implements OnInit {

  constructor(
    public route: ActivatedRoute,
    public router: Router
  ) {
  }

  ngOnInit(): void {
  }

  title: string = 'Physcial Inventory';

  icon = 'mdi-account-group';
}

