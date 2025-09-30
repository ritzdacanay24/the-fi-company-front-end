import { Component, OnInit } from '@angular/core';
import { EventService } from '../../core/services/event.service';

@Component({
  selector: 'app-two-column',
  templateUrl: './two-column.component.html',
  styleUrls: ['./two-column.component.scss']
})

/**
 * TwoColumnComponent
 */
export class TwoColumnComponent implements OnInit {

  constructor(private eventService: EventService) {
    this.loadSidebarPreferences();
  }
  isCondensed = false;

  // Sidebar preferences for two-column layout
  sidebarPreferences = {
    panelCollapsed: false
  };

  ngOnInit(): void {
    window.addEventListener('resize', () => {
      if (document.documentElement.getAttribute('data-layout') == "twocolumn") {
        if (document.documentElement.clientWidth <= 767) {
          this.eventService.broadcast('changeLayout', 'vertical');
          document.documentElement.setAttribute('data-layout', 'vertical');
          document.body.classList.add('twocolumn-panel');
        } else {
          this.eventService.broadcast('changeLayout', 'twocolumn');
          document.documentElement.setAttribute('data-layout', 'twocolumn');
          document.body.classList.remove('twocolumn-panel');
          document.getElementById('side-bar')?.classList.add('d-none')
        }
      }
      else {
        if (document.body.classList.contains('twocolumn-panel')) {
          if (document.documentElement.clientWidth <= 767) {
            this.eventService.broadcast('changeLayout', 'vertical');
            document.documentElement.setAttribute('data-layout', 'vertical');
          } else {
            this.eventService.broadcast('changeLayout', 'twocolumn');
            document.documentElement.setAttribute('data-layout', 'twocolumn');
            document.body.classList.remove('twocolumn-panel')
            document.getElementById('side-bar')?.classList.add('d-none')
          }
        }
      }
    })
  }

  /**
   * On mobile toggle button clicked
   * Now saves the panel state preference to localStorage
   */
  onToggleMobileMenu() {
    if (document.documentElement.clientWidth <= 767) {
      document.body.classList.toggle('vertical-sidebar-enable');
      document.getElementById('side-bar')?.classList.remove('d-none')
      this.sidebarPreferences.panelCollapsed = false;
    } else {
      document.body.classList.toggle('twocolumn-panel');
      document.getElementById('side-bar')?.classList.add('d-none')
      this.sidebarPreferences.panelCollapsed = document.body.classList.contains('twocolumn-panel');
    }
    
    // Save the panel state preference
    this.saveSidebarPreferences();
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

  isTwoColumnLayoutRequested() {
    return 'twocolumn' === document.documentElement.getAttribute('data-layout');

  }

  issemiboxLayoutRequested() {
    return 'semibox' === document.documentElement.getAttribute('data-layout');
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

  // Two-column layout preferences management
  private loadSidebarPreferences(): void {
    try {
      const savedPreferences = localStorage.getItem('two-column-sidebar-preferences');
      if (savedPreferences) {
        this.sidebarPreferences = { ...this.sidebarPreferences, ...JSON.parse(savedPreferences) };
      }
      
      // Apply saved panel state
      this.applySavedPanelState();
    } catch (error) {
      console.warn('Failed to load two-column sidebar preferences:', error);
    }
  }

  private saveSidebarPreferences(): void {
    try {
      localStorage.setItem('two-column-sidebar-preferences', JSON.stringify(this.sidebarPreferences));
    } catch (error) {
      console.warn('Failed to save two-column sidebar preferences:', error);
    }
  }

  private applySavedPanelState(): void {
    if (document.documentElement.clientWidth > 767) {
      // Only apply on larger screens
      if (this.sidebarPreferences.panelCollapsed) {
        document.body.classList.add('twocolumn-panel');
        document.getElementById('side-bar')?.classList.add('d-none');
      } else {
        document.body.classList.remove('twocolumn-panel');
        document.getElementById('side-bar')?.classList.remove('d-none');
      }
    }
  }
}
