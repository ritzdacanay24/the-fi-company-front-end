import { Component, OnInit, Input } from "@angular/core";
import { CommonModule } from "@angular/common";

@Component({
  standalone: true,
  imports: [CommonModule],
  selector: "app-loading",
  templateUrl: "./loading.component.html",
  styleUrls: [],
})

/**
 * Loading Component
 */
export class LoadingComponent implements OnInit {
  @Input({ required: true }) isLoading: boolean = false;
  @Input({ required: false }) showBorder: boolean = true;

  constructor() {}

  ngOnInit(): void {}
}
