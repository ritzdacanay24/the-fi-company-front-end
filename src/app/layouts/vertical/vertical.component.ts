import { Component, OnInit } from '@angular/core';
import { EventService } from '../../core/services/event.service';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { getSidebarSize } from 'src/app/store/layouts/layout-selector';
import { RootReducerState } from 'src/app/store';
import { Store } from '@ngrx/store';

@Component({
  selector: 'app-vertical',
  templateUrl: './vertical.component.html',
  styleUrls: ['./vertical.component.scss']
})
export class VerticalComponent implements OnInit {

  isCondensed = false;
  getsize:any;

  // Sidebar preferences
  sidebarPreferences = {
    sidebarSize: 'lg' // Default size
  };

  constructor(private eventService: EventService, private router: Router, private activatedRoute: ActivatedRoute,private store: Store<RootReducerState>) {
    // Load preferences on initialization
    this.loadSidebarPreferences();
  }

  ngOnInit(): void {

    this.router.events.subscribe((event: any) => {
      if (document.documentElement.getAttribute('data-preloader') == 'enable') {
        if (event instanceof NavigationEnd) {
          // Update the attribute state based on the current route or any other conditions
          if (event.url !== '/disabled-route') {
            (document.getElementById("preloader") as HTMLElement).style.opacity = "1";
            (document.getElementById("preloader") as HTMLElement).style.visibility = "";
            setTimeout(() => {
              (document.getElementById("preloader") as HTMLElement).style.opacity = "0";
              (document.getElementById("preloader") as HTMLElement).style.visibility = "hidden";
            }, 1000);
          } else {
            (document.getElementById("preloader") as HTMLElement).style.opacity = "0";
            (document.getElementById("preloader") as HTMLElement).style.visibility = "hidden";
          }
        }
      }
    });

    this.handlePreloader(this.activatedRoute.snapshot.routeConfig?.path);
    if (document.documentElement.getAttribute('data-sidebar-size') == 'lg') {
      this.store.select(getSidebarSize).subscribe((size) => {
        this.getsize = size
        })
      window.addEventListener('resize', () => {
        var self = this;
        if (document.documentElement.clientWidth <= 767) {
          document.documentElement.setAttribute('data-sidebar-size', '');
          document.querySelector('.hamburger-icon')?.classList.add('open')
        }
        else if (document.documentElement.clientWidth <= 1024) {
          document.documentElement.setAttribute('data-sidebar-size', 'sm');
          document.querySelector('.hamburger-icon')?.classList.add('open')
        }
        else if (document.documentElement.clientWidth >= 1024) {
          if(document.documentElement.getAttribute('data-layout-width') == 'fluid'){
            document.documentElement.setAttribute('data-sidebar-size', self.getsize);
            document.querySelector('.hamburger-icon')?.classList.remove('open')
          }
        }
      })
    }
  }
  private handlePreloader(route: any) {
    // if (route !== '/disabled-route') {
    //   (document.getElementById("preloader") as HTMLElement).style.opacity = "1";
    //   (document.getElementById("preloader") as HTMLElement).style.visibility = "";
    //   setTimeout(() => {
    //     (document.getElementById("preloader") as HTMLElement).style.opacity = "0";
    //     (document.getElementById("preloader") as HTMLElement).style.visibility = "hidden";
    //   }, 1000);
    // } else {
    //   (document.getElementById("preloader") as HTMLElement).style.opacity = "0";
    //   (document.getElementById("preloader") as HTMLElement).style.visibility = "hidden";
    // }
  }


  /**
   * On mobile toggle button clicked
   * Now saves the sidebar size preference to localStorage
   */
  onToggleMobileMenu() {
    const currentSIdebarSize = document.documentElement.getAttribute("data-sidebar-size");
    let newSidebarSize = currentSIdebarSize;
    
    if (document.documentElement.clientWidth >= 767) {
      if (currentSIdebarSize == null) {
        newSidebarSize = (document.documentElement.getAttribute('data-sidebar-size') == null || document.documentElement.getAttribute('data-sidebar-size') == "lg") ? 'sm' : 'lg';
        document.documentElement.setAttribute('data-sidebar-size', newSidebarSize);
      } else if (currentSIdebarSize == "md") {
        newSidebarSize = (document.documentElement.getAttribute('data-sidebar-size') == "md") ? 'sm' : 'md';
        document.documentElement.setAttribute('data-sidebar-size', newSidebarSize);
      } else {
        newSidebarSize = (document.documentElement.getAttribute('data-sidebar-size') == "sm") ? 'lg' : 'sm';
        document.documentElement.setAttribute('data-sidebar-size', newSidebarSize);
      }
      
      // Save the new sidebar size preference
      this.sidebarPreferences.sidebarSize = newSidebarSize;
      this.saveSidebarPreferences();
    }

    if (document.documentElement.clientWidth <= 767) {
      document.body.classList.toggle('vertical-sidebar-enable');
    }
    this.isCondensed = !this.isCondensed;
  }

  /**
   * on settings button clicked from topbar
   */
  onSettingsButtonClicked() {
    document.body.classList.toggle('right-bar-enabled');
    const rightBar = document.getElementById('theme-settings-offcanvas');
    if (rightBar != null) {
      rightBar.classList.toggle('show');
      rightBar.setAttribute('style', "visibility: visible;");

    }
  }

  onResize(event: any) {
    if (document.body.getAttribute('layout') == "twocolumn") {
      if (event.target.innerWidth <= 767) {
        this.eventService.broadcast('changeLayout', 'vertical');
      } else {
        this.eventService.broadcast('changeLayout', 'twocolumn');
        document.body.classList.remove('twocolumn-panel');
        document.body.classList.remove('vertical-sidebar-enable');
      }
    }
  }

  // Sidebar preferences management
  private loadSidebarPreferences(): void {
    try {
      const savedPreferences = localStorage.getItem('vertical-sidebar-preferences');
      if (savedPreferences) {
        this.sidebarPreferences = { ...this.sidebarPreferences, ...JSON.parse(savedPreferences) };
      }
      
      // Apply the saved sidebar size on initialization
      this.applySavedSidebarSize();
    } catch (error) {
      console.warn('Failed to load vertical sidebar preferences:', error);
    }
  }

  private saveSidebarPreferences(): void {
    try {
      localStorage.setItem('vertical-sidebar-preferences', JSON.stringify(this.sidebarPreferences));
    } catch (error) {
      console.warn('Failed to save vertical sidebar preferences:', error);
    }
  }

  private applySavedSidebarSize(): void {
    if (document.documentElement.clientWidth >= 767) {
      // Only apply on larger screens to avoid conflicts with mobile behavior
      const savedSize = this.sidebarPreferences.sidebarSize;
      if (savedSize && savedSize !== 'lg') { // lg is often the default, so only set if different
        document.documentElement.setAttribute('data-sidebar-size', savedSize);
      }
    }
  }

  private getCurrentSidebarSize(): string {
    const currentSize = document.documentElement.getAttribute("data-sidebar-size");
    return currentSize || 'lg'; // Default to 'lg' if no attribute
  }

}
