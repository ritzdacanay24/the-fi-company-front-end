import { Injectable } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class ErrorService {

    getClientName(error: Error): string {
        return error.name ? error.name : error.toString();
    }

    getClientMessage(error: Error): string {
        return error.message ? error.message : error.toString();
    }

    getClientStack(error: Error): string {
        return error.stack;
    }

    getServerName(error: HttpErrorResponse): string {
        return error.name ? error.name : error.toString();
    }

    getServerMessage(error: HttpErrorResponse): string {
        const msg = error.error.message;
        if (!!msg) {
            return msg + " : " + error.error.ExceptionMessage;
        }

        return "Application can not execute because API hasn\'t been started";
    }

    getServerCode(error: HttpErrorResponse): string {
        return error.error.error.code;
    }

    getServerStack(error: HttpErrorResponse): string {
        return error.error.StackTrace;
    }
}