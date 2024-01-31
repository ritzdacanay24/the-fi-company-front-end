import { Component, OnInit } from '@angular/core';
import { SharedModule } from '@app/shared/shared.module';

@Component({
  standalone: true,
  imports: [SharedModule],
  selector: 'app-job-map',
  templateUrl: './job-map.component.html',
  styleUrls: ['./job-map.component.scss']
})
export class JobMapComponent implements OnInit {

  constructor(
  ) {
  }

  ngOnInit(): void {
  }

  title = "Job Map"

}
