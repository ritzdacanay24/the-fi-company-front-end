import { Component, OnInit } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { SharedModule } from "@app/shared/shared.module";

@Component({
  standalone: true,
  imports: [SharedModule],
  selector: "app-customer-visit",
  templateUrl: "./customer-visit.component.html",
  styleUrls: [],
})
export class CustomerVisitComponent implements OnInit {
  constructor(public route: ActivatedRoute, public router: Router) {}

  ngOnInit(): void {}

  title = "Customer Visit";

  icon = "mdi mdi-note-plus-outline";
}
