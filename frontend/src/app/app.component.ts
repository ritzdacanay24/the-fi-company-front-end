import { Component, Inject, OnDestroy, OnInit } from "@angular/core";
import { NgbModalConfig } from "@ng-bootstrap/ng-bootstrap";
import { TitleService } from "./shared/services/title.service";
import { environment } from "@environments/environment";
import { Subscription } from "rxjs";
import { THE_FI_COMPANY_LAYOUT } from "./layouts/topbar/topbar.component";
import { LightboxConfig } from "ngx-lightbox";
import { isMobile } from "src/assets/js/util/is-mobile-helpers";
import { ToastrService } from "ngx-toastr";
import { Router, NavigationEnd } from "@angular/router";
import { filter } from "rxjs/operators";
import { AuthenticationService } from "./core/services/auth.service";
import { QadHealthStatusService } from "./core/services/qad-health-status.service";
import { AppUpdateService } from "./core/services/app-update.service";
import { SupportTicketMinimizedTabComponent } from "./core/components/support-ticket-minimized-tab/support-ticket-minimized-tab.component";

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
export class AppComponent implements OnInit, OnDestroy {
  private routerEventsSubscription?: Subscription;

  constructor(
    ngbModalConfig: NgbModalConfig,
    private titleService: TitleService,
    private _lightboxConfig: LightboxConfig,
    private toastr: ToastrService,
    private router: Router,
    private authenticationService: AuthenticationService,
    @Inject(QadHealthStatusService)
    private qadHealthStatusService: QadHealthStatusService,
    private appUpdateService: AppUpdateService,
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
  isAuthenticated = false;
  showQadStatusBanner = environment.production ? true : environment.showQadStatusBanner;

  ngOnInit(): void {
    this.isMobile = isMobile();
    this.subscribeToQadHealthState();
    this.syncAuthAndHealthTracking();
    this.appUpdateService.initializeUpdateChecking();

    this.routerEventsSubscription = this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe(() => {
        this.syncAuthAndHealthTracking();
      });

    if (localStorage.getItem(THE_FI_COMPANY_LAYOUT)) {
      let d = JSON.parse(localStorage.getItem(THE_FI_COMPANY_LAYOUT));
      setThemeColor(d);
    }

    if (environment.production) {
      if (location.protocol === "http:") {
        window.location.href = location.href.replace("http", "https");
      }
    }
  }

  ngOnDestroy(): void {
    this.routerEventsSubscription?.unsubscribe();
    this.qadHealthStatusService.stop();
  }

  private subscribeToQadHealthState(): void {
    // QAD health display is handled by AppBannersComponent inside the layout.
    // app.component only manages service start/stop lifecycle.
  }

  private syncAuthAndHealthTracking(): void {
    if (!this.showQadStatusBanner) {
      this.qadHealthStatusService.stop();
      this.qadHealthStatusService.reset();
      return;
    }

    const wasAuthenticated = this.isAuthenticated;
    this.isAuthenticated = !!this.authenticationService.currentUserValue;

    if (!this.isAuthenticated) {
      this.qadHealthStatusService.stop();
      this.qadHealthStatusService.reset();
      return;
    }

    this.qadHealthStatusService.start();
    if (!wasAuthenticated) {
      void this.qadHealthStatusService.refresh(true);
    }
  }
}
