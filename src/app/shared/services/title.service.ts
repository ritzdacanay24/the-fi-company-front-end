
//  Fature Referance Links:
//   https://toddmotto.com/dynamic-page-titles-angular-2-router-events
//   https://stackoverflow.com/questions/34597835/how-to-get-current-route
//

import { merge } from 'rxjs';
import { Injectable } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { Router, NavigationEnd, ActivatedRoute } from '@angular/router';
import { filter, map, mergeMap } from 'rxjs/operators';

const APP_TITLE = 'Fi';
const SEPARATOR = ' | ';

@Injectable({ providedIn: 'root' })
export class TitleService {

    static ucFirst(string) {
        if (!string) {
            return string;
        }
        return string.charAt(0).toUpperCase() + string.slice(1);
    }

    constructor(
        private router: Router,
        private activatedRoute: ActivatedRoute,
        private titleService: Title,
    ) { }

    init() {
        const onNavigationEnd = this.router.events.pipe(filter(event => event instanceof NavigationEnd));
        // Change page title on navigation or language change, based on route data

        merge(onNavigationEnd)
            .pipe(
                map(() => {
                    let route = this.activatedRoute;
                    while (route.firstChild) {
                        route = route.firstChild;
                    }
                    return route;
                }),
                filter(route => route.outlet === 'primary'),
                mergeMap(route => route.data)
            )
            .subscribe(event => {
                const title = event['title'];

                

                if (title) {
                    this.titleService.setTitle(`${title}`);
                    return `${title} ${SEPARATOR} ${APP_TITLE} `
                } else {
                    
                    // If not, we do a little magic on the url to create an approximation
                    return this.router.url.split('/').reduce((acc, frag) => {

                        if (acc && frag) { acc += SEPARATOR; }
                        return this.router.url.split('/').reduce((acc, frag) => {
                            if (acc && frag) { acc += SEPARATOR; }
                            this.titleService.setTitle(`${TitleService.ucFirst(frag.split('?')[0])}`);
                            //this.titleService.setTitle(`${acc} ${TitleService.ucFirst(frag)} ${APP_TITLE}`);
                            return acc + TitleService.ucFirst(frag);
                        });
                    });
                }
            });
    }

}