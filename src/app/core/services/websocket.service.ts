//https://rxjs-dev.firebaseapp.com/api/webSocket/webSocket

import { Injectable } from '@angular/core';
import { webSocket, WebSocketSubject } from 'rxjs/webSocket';
import { AuthenticationService } from './auth.service';
import { CORE_SETTINGS } from '../constants/app.config';
import { ToastrService } from 'ngx-toastr';

@Injectable({
    providedIn: 'root',
})
export class WebsocketService {
    myWebSocket: WebSocketSubject<unknown>;
    userInfo: any;
    showDialog: boolean;
    constructor(
        public authenticationService: AuthenticationService,
        private toastrService: ToastrService
    ) {
        this.userInfo = this.authenticationService.currentUserValue;
    }

    sendDialog() {
        setTimeout(() => {
            this.connect()
        }, 5000);
    }

    sendClose() {
        setTimeout(() => {
            this.close()
        }, 5000);
    }

    connect() {
        this.myWebSocket = webSocket({
            url: CORE_SETTINGS.websocketUrl,
            openObserver: {
                next: () => {
                    //console.log("connection ok");
                },
            },
            closeObserver: {
                next: (closeEvent) => {
                    //console.log("connection closed");
                    // console.log(closeEvent, 'closeEvent');
                    //this.sendDialog()
                    this.toastrService.warning("Websockets disconnected.Please refresh browser", "", { disableTimeOut: true })

                }
            },
        })
        return this.myWebSocket;
    }


    getWebSocket() {
        return this.myWebSocket;
    }


    public close(value: boolean = false) {
        this.showDialog = value;
        this.myWebSocket.complete(); // Closes the connection.
    }

    subscribe(subscribeType: string) {
        return this.myWebSocket.multiplex(
            () => ({ subscribe: subscribeType }),
            () => ({ unsubscribe: subscribeType }),
            (message: { type: string; }) => message.type === subscribeType
        );
    }

    sendComments(data: any, subscribeType: string) {
        return this.myWebSocket.next({ message: data, type: subscribeType });
    }

    next(obj: any) {
        return this.myWebSocket.next(obj);
    }

    multiplex(subscribe, unsubscribe, transact) {
        return this.myWebSocket.multiplex(subscribe, unsubscribe, transact);
    }

}
