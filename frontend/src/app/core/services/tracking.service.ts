import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Router, NavigationEnd } from "@angular/router";
import { filter } from "rxjs/operators";
import { AuthenticationService } from "./auth.service";
import { time_now } from "src/assets/js/util/time-now";

@Injectable({
  providedIn: "root",
})
export class TrackingService {
  constructor(
    private http: HttpClient,
    private router: Router,
    private authenticationService: AuthenticationService
  ) {
    this.trackPageViews();
  }

  trackPageViews() {
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        this.trackPage(event.url);
      });
  }

  trackPage(url: string) {
    // Send tracking data to your backend
    if(this.authenticationService.currentUserValue)
    this.http
      .post("/track.php", {
        path: url,
        userId: this.authenticationService.currentUserValue.full_name,
        createdDate: time_now(),
        userAgent: navigator.userAgent,
        browserName: navigator.appName,
        browserVersion: navigator.appVersion,
        browserPlatform: navigator.platform,
      })
      .subscribe();
  }
}
