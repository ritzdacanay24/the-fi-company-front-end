import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { SharedModule } from '@app/shared/shared.module';

@Component({
  standalone: true,
  imports: [SharedModule],
  selector: 'app-licensed-techs',
  templateUrl: './licensed-techs.component.html',
  styleUrls: []
})
export class LicensedTechsComponent implements OnInit {

  constructor(
    public route: ActivatedRoute,
    public router: Router
  ) {
  }

  ngOnInit(): void {
  }

  title: string = 'Licensed Techs';

  icon:string = "mdi-office-building-marker";

}
