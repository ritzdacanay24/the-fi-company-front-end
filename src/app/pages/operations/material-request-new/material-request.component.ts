import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { SharedModule } from '@app/shared/shared.module';

@Component({
  standalone: true,
  imports: [SharedModule],
  selector: 'app-material-request',
  templateUrl: './material-request.component.html',
  styleUrls: []
})
export class MaterialRequestComponent implements OnInit {


  constructor(
    public route: ActivatedRoute,
    public router: Router
  ) {
  }

  ngOnInit(): void {
  }

  title: string = 'Material Requests';

  icon = 'mdi-account-group';
}
