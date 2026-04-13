//https://rxjs-dev.firebaseapp.com/api/webSocket/webSocket

import { Injectable } from '@angular/core';
import { webSocket, WebSocketSubject } from 'rxjs/webSocket';
import { AuthenticationService } from './auth.service';
import { CORE_SETTINGS } from '../constants/app.config';
import { ToastrService } from 'ngx-toastr';
import { Subject, Observable, BehaviorSubject, retry } from 'rxjs';

@Injectable({
    providedIn: 'root',
})
export class WebsocketService {
    myWebSocket: WebSocketSubject<unknown>;
    userInfo: any;
    showDialog: boolean;

    public messageSubject$ = new BehaviorSubject<any>(undefined);


    constructor(
        public authenticationService: AuthenticationService,
        private toastrService: ToastrService
    ) {
        this.userInfo = this.authenticationService.currentUserValue;

    }
    message$


    sendDialog() {
        setTimeout(() => {
            this.connect()
        }, 5000);
    }

    sendClose() {
        setTimeout(() => {
            this.close()
        }, 10000);
    }

    connect() {
        this.myWebSocket = webSocket({
            url: CORE_SETTINGS.websocketUrl,
            openObserver: {
                next: (data) => {
                    console.log("connection ok");
                    //this.sendClose()
                },
            },
            closeObserver: {
                next: (closeEvent) => {

                    this.messageSubject$.next(closeEvent);
                    console.log("connection closed");
                    // console.log(closeEvent, 'closeEvent');
                    //this.sendDialog()
                    //this.toastrService.warning("Websockets disconnected.Please refresh browser", "", { disableTimeOut: true })

                }
            },
        })
        return this.myWebSocket
        // return this.myWebSocket.pipe(
        //     retry({ count: 10, delay: 5000 })
        // ).subscribe((message) => {
        //     console.log(`message from the websocket: ${message}`)
        // })
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
        return this.myWebSocket?.multiplex(subscribe, unsubscribe, transact);
    }

}
