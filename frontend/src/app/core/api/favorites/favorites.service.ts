import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { NavigationEnd, Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { firstValueFrom } from 'rxjs';

const THE_FI_COMPANY_FAVORITES = 'THE_FI_COMPANY_FAVORITES';
const BASE_URL = 'apiv2/favorites';

interface FavoriteItem {
    path: string;
    label?: string;
    icon?: string;
    description?: string;
    showStar?: boolean;
    showStarColor?: boolean;
}

@Injectable({ providedIn: 'root' })
export class FavoriteService {
    routeData: any;
    currentRoute: string = '';
    isCurrentRoute: boolean;
    title: string;
    navFavorites: FavoriteItem[] = [];
    loadFailed = false;
    public getData$ = new BehaviorSubject(false);

    constructor(
        private router: Router,
        private http: HttpClient,
    ) {
        router.events.subscribe((val) => {
            if (val instanceof NavigationEnd) {
                this.currentRoute = this.router.url;
                this.isCurrentRoute = this.isRouteOnFavorite;
            }
        });

        void this.initialize();
    }

    onSave(active) {
        void this.create(active);
    }

    clearAll() {
        void this.clearAllRemote();
    }

    removeByIndex(index) {
        if (index === undefined) return;

        const favorite = this.navFavorites[index];
        if (!favorite?.path) return;

        void this.removeByPath(favorite.path);
    }

    removeByLabel(label) {
        if (!label) return;

        const pathsToRemove = this.navFavorites
            .filter((menuItem: FavoriteItem) => menuItem?.label === label && !!menuItem?.path)
            .map((menuItem: FavoriteItem) => menuItem.path);

        if (pathsToRemove.length === 0) return;

        void this.removeByPaths(pathsToRemove);
    }

    create(active) {
        const favorite = this.normalizeFavorite(active);
        if (!favorite?.path) return;

        if (this.navFavorites.some((item) => item.path === favorite.path)) {
            return;
        }

        const previous = [...this.navFavorites];
        this.navFavorites = [...this.navFavorites, favorite];
        this.persistLocalMirror(this.navFavorites);
        this.emitChange();

        void this.createRemote(favorite.path, favorite.label, favorite.icon, previous);
    }

    remove() {
        const url = this.router.url?.replace(/\?.+/, '');
        if (!url) return;

        void this.removeByPath(url);
    }

    reorder(orderedPaths: string[]): void {
        if (!orderedPaths?.length) return;

        this.navFavorites = orderedPaths
            .map((path) => this.navFavorites.find((f) => f.path === path))
            .filter((f): f is FavoriteItem => !!f);

        this.persistLocalMirror(this.navFavorites);
        this.emitChange();

        void firstValueFrom(
            this.http.patch(`${BASE_URL}/me/reorder`, { paths: orderedPaths })
        ).catch(() => {
            // reorder failure is non-critical — in-memory order is already updated
        });
    }

    getFavorites() {
        return this.navFavorites;
    }

    set(favs) {
        this.navFavorites = (favs || []).map((item) => this.normalizeFavorite(item));
        this.persistLocalMirror(this.navFavorites);
        this.emitChange();
    }

    get isRouteOnFavorite() {
        const normalizedRoute = this.currentRoute?.replace(/\?.+/, '');
        if (!normalizedRoute) return false;

        return this.navFavorites.some((favorite) => favorite.path === normalizedRoute);
    }

    private async initialize(): Promise<void> {
        const localFavorites = this.readLocalFavorites();

        try {
            let remoteFavorites = await this.fetchRemoteFavorites();
            if (remoteFavorites.length === 0 && localFavorites.length > 0) {
                remoteFavorites = await this.importRemoteFavorites(localFavorites);
            }

            this.loadFailed = false;
            this.navFavorites = remoteFavorites;
            this.persistLocalMirror(this.navFavorites);
            this.emitChange();
            return;
        } catch {
            this.loadFailed = true;
            this.navFavorites = localFavorites;
            this.emitChange();
        }
    }

    private async fetchRemoteFavorites(): Promise<FavoriteItem[]> {
        const data = await firstValueFrom(
            this.http.get<any[]>(`${BASE_URL}/me`, { headers: { 'x-silent-error': 'true' } })
        );
        return this.normalizeFavoriteArray(data);
    }

    private async importRemoteFavorites(favorites: FavoriteItem[]): Promise<FavoriteItem[]> {
        const payload = favorites
            .filter((favorite) => !!favorite?.path)
            .map((favorite) => ({ path: favorite.path, label: favorite.label || null, icon: favorite.icon || null }));

        if (payload.length === 0) {
            return [];
        }

        const data = await firstValueFrom(
            this.http.post<any[]>(`${BASE_URL}/me/import`, { favorites: payload })
        );

        return this.normalizeFavoriteArray(data);
    }

    private async createRemote(path: string, label: string | undefined, icon: string | undefined, previous: FavoriteItem[]): Promise<void> {
        try {
            const data = await firstValueFrom(this.http.post<any[]>(`${BASE_URL}/me`, { path, label: label || null, icon: icon || null }));
            this.navFavorites = this.normalizeFavoriteArray(data);
            this.persistLocalMirror(this.navFavorites);
            this.emitChange();
        } catch {
            this.navFavorites = previous;
            this.persistLocalMirror(this.navFavorites);
            this.emitChange();
        }
    }

    private async removeByPath(path: string): Promise<void> {
        await this.removeByPaths([path]);
    }

    private async removeByPaths(paths: string[]): Promise<void> {
        const normalizedPaths = Array.from(
            new Set(
                (paths || [])
                    .map((path) => String(path || '').trim().replace(/\?.+/, ''))
                    .filter((path) => !!path)
            )
        );

        if (normalizedPaths.length === 0) return;

        const previous = [...this.navFavorites];
        this.navFavorites = this.navFavorites.filter((favorite) => !normalizedPaths.includes(favorite.path));
        this.persistLocalMirror(this.navFavorites);
        this.emitChange();

        try {
            for (const normalizedPath of normalizedPaths) {
                await firstValueFrom(
                    this.http.delete<any[]>(`${BASE_URL}/me/by-path?path=${encodeURIComponent(normalizedPath)}`)
                );
            }

            const refreshed = await this.fetchRemoteFavorites();
            this.navFavorites = refreshed;
            this.persistLocalMirror(this.navFavorites);
            this.emitChange();
        } catch {
            this.navFavorites = previous;
            this.persistLocalMirror(this.navFavorites);
            this.emitChange();
        }
    }

    private async clearAllRemote(): Promise<void> {
        const previous = [...this.navFavorites];
        this.navFavorites = [];
        this.persistLocalMirror(this.navFavorites);
        this.emitChange();

        try {
            await firstValueFrom(this.http.delete<any[]>(`${BASE_URL}/me`));
            this.navFavorites = [];
            this.persistLocalMirror(this.navFavorites);
            this.emitChange();
        } catch {
            this.navFavorites = previous;
            this.persistLocalMirror(this.navFavorites);
            this.emitChange();
        }
    }

    private emitChange(): void {
        this.getData$.next(!this.getData$.getValue());
        this.isCurrentRoute = this.isRouteOnFavorite;
    }

    private normalizeFavoriteArray(data: any[]): FavoriteItem[] {
        if (!Array.isArray(data)) return [];

        const uniqueByPath = new Map<string, FavoriteItem>();
        data.forEach((item) => {
            const favorite = this.normalizeFavorite(item);
            if (favorite.path && !uniqueByPath.has(favorite.path)) {
                uniqueByPath.set(favorite.path, favorite);
            }
        });

        return Array.from(uniqueByPath.values());
    }

    private normalizeFavorite(item: any): FavoriteItem {
        const path = String(item?.path || item?.link || '').trim().replace(/\?.+/, '');
        return {
            ...item,
            path,
            label: item?.label || item?.name || path,
            icon: item?.icon || 'ri-star-line',
            showStar: false,
            showStarColor: false,
        };
    }

    private readLocalFavorites(): FavoriteItem[] {
        try {
            const raw = localStorage.getItem(THE_FI_COMPANY_FAVORITES);
            if (!raw) return [];
            const parsed = JSON.parse(raw);
            return this.normalizeFavoriteArray(parsed);
        } catch {
            return [];
        }
    }

    private persistLocalMirror(favorites: FavoriteItem[]): void {
        try {
            localStorage.setItem(THE_FI_COMPANY_FAVORITES, JSON.stringify(favorites));
        } catch {
            // Ignore localStorage failures to avoid blocking favorites behavior.
        }
    }
}