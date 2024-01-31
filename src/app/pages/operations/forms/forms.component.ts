import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { SharedModule } from '@app/shared/shared.module';

@Component({
  standalone: true,
  imports: [SharedModule],
  selector: 'app-forms',
  templateUrl: './forms.component.html',
  styleUrls: []
})
export class FormsComponent implements OnInit {

  constructor(
    public route: ActivatedRoute,
    public router: Router
  ) {
  }

  ngOnInit(): void {
  }

  title = "Forms"

  icon = "mdi-cogs"
}
