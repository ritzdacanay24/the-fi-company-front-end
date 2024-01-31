import { Component, OnInit, Input } from '@angular/core';
import { SharedModule } from '../shared.module';

@Component({
  standalone: true,
  imports: [SharedModule],
  selector: 'app-breadcrumbs',
  templateUrl: './breadcrumbs.component.html',
  styleUrls: ['./breadcrumbs.component.scss']
})

/**
 * Bread Crumbs Component
 */
export class BreadcrumbsComponent implements OnInit {

  @Input() title: string | undefined;
  @Input()
  breadcrumbItems!: Array<{
    active?: boolean;
    label?: string;
  }>;

  constructor() { }

  ngOnInit(): void {
  }

}
