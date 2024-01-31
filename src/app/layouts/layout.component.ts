import { Component, OnInit } from '@angular/core';


// Store
import { RootReducerState } from '../store';
import { Store } from '@ngrx/store';
import { changeMode } from '@app/store/layouts/layout-action';
import { EventService } from '@app/core/services/event.service';
@Component({
  selector: 'app-layout',
  templateUrl: './layout.component.html',
  styleUrls: ['./layout.component.scss']
})

/**
 * Layout Component
 */
export class LayoutComponent implements OnInit {

  layoutType!: string;

  constructor(private store: Store<RootReducerState>, private eventService: EventService) { }

  setThemeLayout(data) {
    this.layoutType = data.LAYOUT;
    document.documentElement.setAttribute('data-layout', data.LAYOUT);
    document.documentElement.setAttribute('data-bs-theme', data.LAYOUT_MODE);
    document.documentElement.setAttribute('data-layout-width', data.LAYOUT_WIDTH);
    document.documentElement.setAttribute('data-layout-position', data.LAYOUT_POSITION);
    document.documentElement.setAttribute('data-topbar', data.TOPBAR);
    data.LAYOUT == "vertical" || data.LAYOUT == "twocolumn" ? document.documentElement.setAttribute('data-sidebar', data.SIDEBAR_COLOR) : '';
    data.LAYOUT == "vertical" || data.LAYOUT == "twocolumn" ? document.documentElement.setAttribute('data-sidebar-size', data.SIDEBAR_SIZE) : '';
    data.LAYOUT == "vertical" || data.LAYOUT == "twocolumn" ? document.documentElement.setAttribute('data-sidebar-image', data.SIDEBAR_IMAGE) : '';
    data.LAYOUT == "vertical" || data.LAYOUT == "twocolumn" ? document.documentElement.setAttribute('data-layout-style', data.SIDEBAR_VIEW) : '';
    document.documentElement.setAttribute('data-preloader', data.DATA_PRELOADER)
    document.documentElement.setAttribute('data-sidebar-visibility', data.SIDEBAR_VISIBILITY);
    document.documentElement.setAttribute('data-sidebar', data.LAYOUT_MODE);

  }

  ngOnInit(): void {
    let data = JSON.parse(localStorage.getItem('eyefi-layout'));
    if (data) {
      this.setThemeLayout(data)
      this.eventService.broadcast('changeMode', data.LAYOUT_MODE);
      this.store.dispatch(changeMode({ mode: data.LAYOUT_MODE }));
    } else {
      this.store.select('layout').subscribe((data) => {
        this.setThemeLayout(data)
      })
    }
  }


  /**
  * Check if the vertical layout is requested
  */
  isVerticalLayoutRequested() {
    return this.layoutType === 'vertical';
  }

  /**
 * Check if the semibox layout is requested
 */
  isSemiboxLayoutRequested() {
    return this.layoutType === 'semibox';
  }

  /**
   * Check if the horizontal layout is requested
   */
  isHorizontalLayoutRequested() {
    return this.layoutType === 'horizontal';
  }

  /**
   * Check if the horizontal layout is requested
   */
  isTwoColumnLayoutRequested() {
    return this.layoutType === 'twocolumn';
  }

}
