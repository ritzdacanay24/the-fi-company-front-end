import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { SharedModule } from '@app/shared/shared.module';
import { environment } from '@environments/environment';

@Component({
  standalone: true,
  imports: [SharedModule],
  selector: 'app-menu',
  templateUrl: './menu.component.html',
  styleUrls: []
})
export class MenuComponent implements OnInit {


  constructor(
    public route: ActivatedRoute,
    public router: Router
  ) {
  }

  ngOnInit(): void {
  }

  data = [
    {
      name: "Las Vegas",
      children: [
        { name: 'Field Service Dashboard', link: '/dashboard/field-service' },
        { name: 'FS App', link: 'https://dashboard.eye-fi.com/dist/fsm-mobile/assignments' },
        { name: 'Quality Dashboard', link: '/dashboard/quality' },
        { name: 'Operations Dashboard', link: 'https://dashboard.eye-fi.com/dist/v1/dashboard' },
        { name: 'Operations Dashboard V1', link: '/dashboard/operations' },
        { name: 'Field Service Request Form', link: '/request' },
        { name: 'Quality Incident Request Form', link: '/quality-incident-request' },
        { name: 'MRO', link: 'https://mro.swstms.com/users/sign_in' },
      ]
    },
    {
      name: "TJ",
      children: [
        { name: 'SouthFi', link: 'https://portal.southfi-apps.com/' },
      ]
    }
  ]

  isLink(row) {
    if (row.link?.includes('https')) {
      window.open(row.link, '_blank');
    } else {

      let link = row.link;
      if (environment.production) {
        link = '/dist/web' + row.link
      }

      const url = this.router.serializeUrl(
        this.router.createUrlTree([link])
      );
      window.open(url, '_blank');
    }
  }
}
