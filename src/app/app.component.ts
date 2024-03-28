import { Component } from '@angular/core';
import { NgbModalConfig } from '@ng-bootstrap/ng-bootstrap';
import { Store } from '@ngrx/store';
import { RootReducerState } from './store';
import { TitleService } from './shared/services/title.service';
import { Router } from '@angular/router';
import { environment } from '@environments/environment';
import { SwUpdate } from '@angular/service-worker'
import { interval } from 'rxjs';
import { SweetAlert } from './shared/sweet-alert/sweet-alert.service';
import { THE_FI_COMPANY_LAYOUT } from './layouts/topbar/topbar.component';
import { LightboxConfig } from 'ngx-lightbox';


export function setThemeColor(data) {
  var metaThemeColor = document.querySelector("meta[name=theme-color]");
  metaThemeColor.setAttribute("content", data == 'light' || data == 'semi-dark' ? `#D0D0D0` : '#343b40');
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {

  constructor(
    ngbModalConfig: NgbModalConfig,
    private store: Store<RootReducerState>,
    private titleService: TitleService,
    private router: Router,
    private swUpdate: SwUpdate,
    private _lightboxConfig: LightboxConfig

  ) {
    ngbModalConfig.backdrop = 'static';
    ngbModalConfig.keyboard = false;
    ngbModalConfig.centered = true;
    ngbModalConfig.scrollable = true;


    _lightboxConfig.centerVertically = true;
    _lightboxConfig.showZoom = false;
    _lightboxConfig.showDownloadButton = false;
    _lightboxConfig.wrapAround = true;
    _lightboxConfig.disableScrolling = true;
    _lightboxConfig.showRotate = false;
    _lightboxConfig.fitImageInViewPort = true;

    this.titleService.init();


    if (localStorage.getItem(THE_FI_COMPANY_LAYOUT)) {
      let d = JSON.parse(localStorage.getItem(THE_FI_COMPANY_LAYOUT))
      setThemeColor(d.LAYOUT_MODE);
    }

  }

  title = 'Eye-Fi';

  hasUpdate = false

  ngOnInit(): void {
    this.store.select('layout').subscribe((data) => {
      setThemeColor(data.LAYOUT_MODE);
    })


    if (environment.production) {
      if (location.protocol === 'http:') {
        window.location.href = location.href.replace('http', 'https');
      }
    }

    // check for platform update
    if (this.swUpdate.isEnabled) {
      interval(60000).subscribe(() =>
        this.swUpdate.checkForUpdate().then(() => {
          // checking for updates
        })
      )
    }

    this.swUpdate.versionUpdates.subscribe(async (event) => {
      if (event.type === 'VERSION_DETECTED') {
        // activateUpdate() will trigger the 'VERSION_READY' or 'VERSION_INSTALLATION_FAILED' event when done
        console.log('New server version detected, trying to install...')
        this.swUpdate.activateUpdate().then(() => {
          // checking for updates
        })

        this.hasUpdate = true

        await this.showNewVersionMessage();

      }

      if (event.type === 'VERSION_READY') {
        // this._reloadPage will be set to true, asking a full page reload on next navigation
        //console.log('New server version installed');
      }
      if (event.type === 'VERSION_INSTALLATION_FAILED') {
        // this._clearCacheAndReload will be set to true, asking a cache clear and full page reload on next navigation
        //console.warn('Error while installing update, cache will be cleared and page reloaded');
      }

      if (event.type == 'NO_NEW_VERSION_DETECTED') return
    })
  }


  ngAfterViewInit() {
  }

  async showNewVersionMessage() {
    let { isConfirmed } = await SweetAlert.fire({
      title: `A new version of the dashboard is available`,
      showCloseButton: false,
      showCancelButton: true,
      focusConfirm: true,
      confirmButtonText: `Update dashboard`,
      cancelButtonText: `Update Later`,
      showClass: {
        popup: `
          show-blur
        `
      },
    });

    if (isConfirmed) this.reloadSite()

  }

  reloadSite(): void {
    window.location.reload()
  }

}
