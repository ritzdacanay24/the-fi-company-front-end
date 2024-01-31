import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { SharedModule } from '@app/shared/shared.module';

@Component({
  standalone: true,
  imports: [SharedModule],
  selector: 'app-igt-transfer',
  templateUrl: './igt-transfer.component.html',
  styleUrls: []
})
export class IgtTransferComponent implements OnInit {

  constructor(
    public route: ActivatedRoute,
    public router: Router
  ) {
  }

  ngOnInit(): void {
  }

  title: string = 'IGT Transfer';

  icon = 'mdi-account-group';
}
