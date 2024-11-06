import { Component } from "@angular/core";
import { NgbModalConfig } from "@ng-bootstrap/ng-bootstrap";
import { TitleService } from "./shared/services/title.service";
import { environment } from "@environments/environment";
import { SwUpdate } from "@angular/service-worker";
import { interval } from "rxjs";
import { SweetAlert } from "./shared/sweet-alert/sweet-alert.service";
import { THE_FI_COMPANY_LAYOUT } from "./layouts/topbar/topbar.component";
import { LightboxConfig } from "ngx-lightbox";
import { isMobile } from "src/assets/js/util/is-mobile-helpers";
import { ToastrService } from "ngx-toastr";
import { TrackingService } from "./core/services/tracking.service";

export function setThemeColor(data) {
  setTimeout(function () {
    var metaThemeColor = document.querySelector("meta[name=theme-color]");
    if (!data) {
      metaThemeColor.setAttribute("content", `#D0D0D0`);
    } else if (data.SIDEBAR_COLOR == "light") {
      metaThemeColor.setAttribute("content", `#D0D0D0`);
    } else if (data.SIDEBAR_COLOR == "dark" && data.LAYOUT_MODE == "light") {
      metaThemeColor.setAttribute("content", `#D0D0D0`);
    } else {
      metaThemeColor.setAttribute("content", `#343b40`);
    }
  }, 500);
}

@Component({
  selector: "app-root",
  templateUrl: "./app.component.html",
  styleUrls: ["./app.component.scss"],
})
export class AppComponent {
  constructor(
    ngbModalConfig: NgbModalConfig,
    private titleService: TitleService,
    private swUpdate: SwUpdate,
    private _lightboxConfig: LightboxConfig,
    private toastr: ToastrService,
    private trackingService: TrackingService
  ) {
    ngbModalConfig.backdrop = "static";
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
  }

  isMobile = false;

  title = "Eye-Fi";

  hasUpdate = false;

  enableSwUpdate = false;

  ngOnInit(): void {
    this.isMobile = isMobile();

    if (localStorage.getItem(THE_FI_COMPANY_LAYOUT)) {
      let d = JSON.parse(localStorage.getItem(THE_FI_COMPANY_LAYOUT));
      setThemeColor(d);
    }

    if (environment.production) {
      if (location.protocol === "http:") {
        window.location.href = location.href.replace("http", "https");
      }
    }

    // check for platform update
    if (this.swUpdate.isEnabled && this.enableSwUpdate) {
      interval(60000).subscribe(() =>
        this.swUpdate.checkForUpdate().then(() => {
          // checking for updates
        })
      );
    }

    this.swUpdate.versionUpdates.subscribe(async (event) => {
      if (event.type === "VERSION_DETECTED") {
        // activateUpdate() will trigger the 'VERSION_READY' or 'VERSION_INSTALLATION_FAILED' event when done
        console.log("New server version detected, trying to install...");
        this.swUpdate.activateUpdate().then(() => {
          // checking for updates
        });

        this.hasUpdate = true;

        await this.showNewVersionMessage();
      }

      if (event.type === "VERSION_READY") {
        // this._reloadPage will be set to true, asking a full page reload on next navigation
        //console.log('New server version installed');
      }
      if (event.type === "VERSION_INSTALLATION_FAILED") {
        // this._clearCacheAndReload will be set to true, asking a cache clear and full page reload on next navigation
        //console.warn('Error while installing update, cache will be cleared and page reloaded');
      }

      if (event.type == "NO_NEW_VERSION_DETECTED") return;
    });
  }

  async showNewVersionMessage() {
    let { isConfirmed } = await SweetAlert.fire({
      toast: true,
      imageUrl: "",
      position: "bottom-end",
      title: `A new version of the dashboard is available`,
      showCloseButton: false,
      showCancelButton: true,
      focusConfirm: true,
      confirmButtonText: `Update dashboard`,
      cancelButtonText: `Update Later`,
      showClass: {
        popup: `
          show-blur
        `,
      },
    });

    if (isConfirmed) this.reloadSite();
  }

  reloadSite(): void {
    window.location.reload();
  }
}
