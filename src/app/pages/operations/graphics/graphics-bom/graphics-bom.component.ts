import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { SharedModule } from '@app/shared/shared.module';

@Component({
  standalone: true,
  imports: [SharedModule],
  selector: 'app-graphics-bom',
  templateUrl: './graphics-bom.component.html',
  styleUrls: []
})
export class GraphicsBomComponent implements OnInit {

  constructor(
    public route: ActivatedRoute,
    public router: Router
  ) {
  }

  ngOnInit(): void {
  }
  
  icon = ""

  title = "Graphics"
}
