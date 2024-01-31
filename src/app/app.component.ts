import { Component } from '@angular/core';
import { NgbModalConfig } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {

  constructor(ngbModalConfig: NgbModalConfig) {
    ngbModalConfig.backdrop = 'static';
    ngbModalConfig.keyboard = false;
    ngbModalConfig.centered = true;
    ngbModalConfig.scrollable = true;
  }

  title = 'Eye-Fi';
}
