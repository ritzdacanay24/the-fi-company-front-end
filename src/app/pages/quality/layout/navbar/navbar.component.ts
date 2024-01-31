import { Component, OnInit, Inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { ActivatedRoute, Router, NavigationEnd } from '@angular/router';
import { AuthenticationService } from '@app/core/services/auth.service';
import { ROUTE } from '@app/core/constants';

import { Title } from '@angular/platform-browser';

import { getBrowserVersion } from '@app/shared/util';
import { SharedModule } from '@app/shared/shared.module';
import { NgbDropdownModule, NgbCollapseModule } from '@ng-bootstrap/ng-bootstrap';

@Component({
  standalone: true,
  imports: [SharedModule,
    NgbDropdownModule,
    NgbCollapseModule
  ],
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss']
})
export class NavbarComponent implements OnInit {

  currentRoute: string;
  browserVersion: any;

  constructor(
    @Inject(DOCUMENT) private document: Document,
    private authenticationService: AuthenticationService,
    private router: Router,
    private route: ActivatedRoute,
    private titleService: Title,
  ) {
    this.browserVersion = getBrowserVersion();

    router.events.subscribe((val) => {
      // see also
      if (val instanceof NavigationEnd) {
        let title = this.titleService.getTitle();
      }
    });
  }

  ngOnInit(): void {
  }

  currentUserInfo = this.authenticationService.currentUserValue;

  /**
   * Sidebar toggle on hamburger button click
   */
  toggleSidebar(e) {
    e.preventDefault();
    this.document.body.classList.toggle('sidebar-open');
  }

  /**
   * Logout
   */
  onLogout(e) {
    e.preventDefault();
    this.authenticationService.logout();
    this.router.navigate([ROUTE.LOGIN]);
  }


}
