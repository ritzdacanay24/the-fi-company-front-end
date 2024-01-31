import { Component, Input, OnInit } from '@angular/core';
import { SharedModule } from '@app/shared/shared.module';

@Component({
  standalone: true,
  imports: [SharedModule],
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: []
})
export class HeaderComponent implements OnInit {

  constructor(
  ) {
  }

  ngOnInit(): void { }

  @Input() title = "Header";

  @Input() menu = []

  @Input() icon = 'mdi-clipboard-edit-outline'

}
