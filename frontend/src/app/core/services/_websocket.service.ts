import { Injectable } from '@angular/core';
import { webSocket } from 'rxjs/webSocket';
import { CORE_SETTINGS } from '../constants/app.config';

@Injectable({
    providedIn: 'root',
})
export class WebSocketService {
    private webSocketSubject = webSocket<string>(CORE_SETTINGS.websocketUrl);
    webSocket$ = this.webSocketSubject.asObservable();
    sendmessage(message: string) {
        this.webSocketSubject.next(message);
    }
    closeConnection() {
        this.webSocketSubject.complete();
    }
    constructor() { }
}