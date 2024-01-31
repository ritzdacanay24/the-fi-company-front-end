import { AuthenticationService } from '@app/core/services/auth.service';
import { Component, OnInit, ViewChild, ElementRef, AfterViewInit, Inject, HostListener } from '@angular/core';
import { DOCUMENT } from '@angular/common';

import { MetisMenu } from 'metismenujs';

import { MENU } from './menu';
import { MenuItem } from './menu.model';
import { Router, NavigationEnd, ActivatedRoute } from '@angular/router';
import { User } from '@app/shared/models/user-model';
import { SharedModule } from '@app/shared/shared.module';
import { ToastDefaults, SnotifyService } from 'ng-snotify';
import { PerfectScrollbarConfigInterface, PerfectScrollbarModule, PERFECT_SCROLLBAR_CONFIG } from 'ngx-perfect-scrollbar';

const DEFAULT_PERFECT_SCROLLBAR_CONFIG: PerfectScrollbarConfigInterface = {
  suppressScrollX: true,
  wheelPropagation: true,
  minScrollbarLength: 10
};

@Component({
  standalone: true,
  imports: [SharedModule, PerfectScrollbarModule],
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss'],
  providers: [
    {
      provide: PERFECT_SCROLLBAR_CONFIG,
      useValue: DEFAULT_PERFECT_SCROLLBAR_CONFIG
    },
    { provide: 'SnotifyToastConfig', useValue: ToastDefaults },
    SnotifyService
  ]
})
export class SidebarComponent implements OnInit, AfterViewInit {

  @ViewChild('sidebarToggler') sidebarToggler: ElementRef;

  version = 'v.1.10';

  menuItems = [];
  @ViewChild('sidebarMenu') sidebarMenu: ElementRef;
  userInfo: User;

  onWheel($event) {
    $event.preventDefault();
    $event.stopPropagation();
  }

  constructor(
    @Inject(DOCUMENT) private document: Document,
    router: Router,
    private authenticationService: AuthenticationService,
    private route: ActivatedRoute,
  ) {

    router.events.forEach((event) => {
      if (event instanceof NavigationEnd) {
        /**
         * Activating the current active item dropdown
         */
        this._activateMenuDropdown();

        /**
         * closing the sidebar
         */
        if (window.matchMedia('(max-width: 991px)').matches) {
          this.document.body.classList.remove('sidebar-open');
        }

      }
    });


    this.scroll();

  }

  ngOnInit(): void {
    this.userInfo = this.authenticationService.currentUserValue;

    /**
     * Set menus based on user roles
     */
    this.menuItems = MENU;

    /**
     * Sidebar-folded on desktop (min-width:992px and max-width: 1199px)
     */
    const desktopMedium = window.matchMedia('(min-width:992px) and (max-width: 1199px)');

    desktopMedium.addEventListener("change", () => {
      this.iconSidebar(desktopMedium);
    });


  }

  ngAfterViewInit() {
    // activate menu item
    new MetisMenu(this.sidebarMenu.nativeElement);

    this._activateMenuDropdown();
  }

  /**
   * Toggle sidebar on hamburger button click
   */
  toggleSidebar(e) {

    this.scroll()

    this.sidebarToggler.nativeElement.classList.toggle('active');
    this.sidebarToggler.nativeElement.classList.toggle('not-active');
    if (window.matchMedia('(min-width: 992px)').matches) {
      e.preventDefault();
      this.document.body.classList.toggle('sidebar-folded');
    } else if (window.matchMedia('(max-width: 991px)').matches) {
      e.preventDefault();
      this.document.body.classList.toggle('sidebar-open');
    }
  }


  @HostListener('window:keydown.control.shift', ['$event'])

  showPinned(event: KeyboardEvent) {
    event.preventDefault();
    //...
    this.toggleSidebar(event)

  }

  /**
   * Toggle settings-sidebar
   */
  toggleSettingsSidebar(e) {
    e.preventDefault();
    this.document.body.classList.toggle('settings-open');
  }


  /**
   * Open sidebar when hover (in folded folded state)
   */
  operSidebarFolded() {
    if (this.document.body.classList.contains('sidebar-folded')) {
      this.document.body.classList.add("open-sidebar-folded");
      this.scroll()
    }
  }


  /**
   * Fold sidebar after mouse leave (in folded state)
   */
  closeSidebarFolded() {
    if (this.document.body.classList.contains('sidebar-folded')) {
      this.document.body.classList.remove("open-sidebar-folded");
      this.scroll()
    }
  }

  /**
   * Sidebar-folded on desktop (min-width:992px and max-width: 1199px)
   */
  iconSidebar(e) {
    if (e.matches) {
      this.document.body.classList.add('sidebar-folded');
    } else {
      this.document.body.classList.remove('sidebar-folded');
    }
  }


  /**
   * Switching sidebar light/dark
   */
  onSidebarThemeChange(event) {
    this.document.body.classList.remove('sidebar-light', 'sidebar-dark');
    this.document.body.classList.add(event.target.value);
    this.document.body.classList.remove('settings-open');
  }


  /**
   * Returns true or false if given menu item has child or not
   * @param item menuItem
   */
  hasItems(item: MenuItem) {
    return item.subItems !== undefined ? item.subItems.length > 0 : false;
  }


  /**
   * Reset the menus then hilight current active menu item
   */
  _activateMenuDropdown() {
    this.resetMenuItems();
    this.activateMenuItems();
  }


  /**
   * Resets the menus
   */
  resetMenuItems() {

    const links = document.getElementsByClassName('nav-link-ref');
    for (let i = 0; i < links.length; i++) {

      const menuItemEl = links[i];
      menuItemEl.classList.remove('mm-active');
      const parentEl = menuItemEl.parentElement;

      if (parentEl) {
        parentEl.classList.remove('mm-active');
        const parent2El = parentEl.parentElement;

        if (parent2El) {
          parent2El.classList.remove('mm-show');
        }

        const parent3El = parent2El.parentElement;
        if (parent3El) {
          parent3El.classList.remove('mm-active');

          if (parent3El.classList.contains('side-nav-item')) {
            const firstAnchor = parent3El.querySelector('.side-nav-link-a-ref');

            if (firstAnchor) {
              firstAnchor.classList.remove('mm-active');
            }
          }

          const parent4El = parent3El.parentElement;
          if (parent4El) {
            parent4El.classList.remove('mm-show');

            const parent5El = parent4El.parentElement;
            if (parent5El) {
              parent5El.classList.remove('mm-active');
            }
          }
        }
      }
    }
  };


  /**
   * Toggles the menu items
   */
  activateMenuItems() {

    const links = document.getElementsByClassName('nav-link-ref');

    let menuItemEl = null;

    for (let i = 0; i < links.length; i++) {
      // tslint:disable-next-line: no-string-literal
      if (window.location.pathname === links[i]['pathname']) {

        menuItemEl = links[i];

        //break;
      }
    }

    if (menuItemEl) {
      menuItemEl.classList.add('mm-active');
      const parentEl = menuItemEl.parentElement;

      if (parentEl) {
        parentEl.classList.add('mm-active');

        const parent2El = parentEl.parentElement;
        if (parent2El) {
          parent2El.classList.add('mm-show');
        }

        const parent3El = parent2El.parentElement;
        if (parent3El) {
          parent3El.classList.add('mm-active');

          if (parent3El.classList.contains('side-nav-item')) {
            const firstAnchor = parent3El.querySelector('.side-nav-link-a-ref');

            if (firstAnchor) {
              firstAnchor.classList.add('mm-active');
            }
          }

          const parent4El = parent3El.parentElement;
          if (parent4El) {
            parent4El.classList.add('mm-show');

            const parent5El = parent4El.parentElement;
            if (parent5El) {
              parent5El.classList.add('mm-active');
            }
          }
        }
      }
    }
  };

  scroll() {
    setTimeout(() => {
      const classElement = document.getElementsByClassName('mm-active');
      if (classElement.length > 0) {
        classElement[classElement.length - 1].scrollIntoView({
          behavior: 'auto',
          block: 'center',
          inline: 'center'
        });
      }
    }, 100);
  }


}
