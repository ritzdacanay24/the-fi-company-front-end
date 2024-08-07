import { Component, OnInit } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { SharedModule } from "@app/shared/shared.module";

@Component({
  standalone: true,
  imports: [SharedModule],
  selector: "app-scheduled-jobs",
  templateUrl: "./scheduled-jobs.component.html",
  styleUrls: [],
})
export class ScheduledJobsComponent implements OnInit {
  constructor(public route: ActivatedRoute, public router: Router) {}

  ngOnInit(): void {}

  title: string = "Scheduled Jobs";

  icon = "mdi-account-group";
}
