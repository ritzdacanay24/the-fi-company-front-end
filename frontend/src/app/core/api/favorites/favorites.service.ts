import { Injectable } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';

const THE_FI_COMPANY_FAVORITES = 'THE_FI_COMPANY_FAVORITES';

@Injectable({ providedIn: 'root' })
export class FavoriteService {
    routeData: any;
    currentRoute: string;
    isCurrentRoute: boolean;
    title: string;
    navFavorites = [];
    public getData$ = new BehaviorSubject(false);

    constructor(
        private router: Router
    ) {

        router.events.subscribe((val) => {
            if (val instanceof NavigationEnd) {
                this.currentRoute = this.router.url;
                this.isCurrentRoute = this.isRouteOnFavorite;
            }
        });
    }

    onSave(active) {
        this.create(active);
    }

    clearAll() {
        localStorage.removeItem(THE_FI_COMPANY_FAVORITES);
        this.getData$.next(!this.getData$.getValue());
    }

    removeByIndex(index) {
        if (index === undefined) return

        let faves = this.getFavorites();

        faves.splice(index, 1);
        this.set(faves);
        this.getData$.next(!this.getData$.getValue());
    }

    removeByLabel(label) {
        let faves = this.getFavorites();
        faves.forEach((menuItem: any, index) => {
            if (label == menuItem.label) {
                faves.splice(index, 1);
            }
        })

        this.set(faves);
        this.getData$.next(!this.getData$.getValue());
    }

    create(active) {
        this.navFavorites = this.getFavorites() || [];
        this.navFavorites.push(active)
        this.set(this.navFavorites);
        this.getData$.next(!this.getData$.getValue());
    }

    remove() {
        let url = this.router.url?.replace(/\?.+/, '')
        let faves = this.getFavorites();
        let index;
        for (var i = 0; i < faves.length; i++) {
            if (faves[i].path === url) {
                index = i;
                break;
            }
        }

        if (index === undefined) return
        faves.splice(index, 1);
        this.set(faves);
        this.getData$.next(!this.getData$.getValue());
    }

    getFavorites() {
        if (localStorage.getItem(THE_FI_COMPANY_FAVORITES)) {
            let data = JSON.parse(localStorage.getItem(THE_FI_COMPANY_FAVORITES));
            data.forEach((item: any) => {
                item.showStar = false
                item.icon = 'ri-star-line'
            });
            return data;
        }

        return []
    }

    set(favs) {
        localStorage.setItem(THE_FI_COMPANY_FAVORITES, JSON.stringify(favs));
    }

    get isRouteOnFavorite() {
        let favs = this.getFavorites();
        if (!favs) return false;

        for (let i = 0; i < favs.length; i++) {
            if (favs[i].path == this.currentRoute?.replace(/\?.+/, '')) {
                return true
            }
        }
        return false
    }

}