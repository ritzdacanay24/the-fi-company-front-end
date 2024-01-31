import { ErrorHandler, Inject, Injectable, Injector } from "@angular/core";
import { ErrorService } from "./error.service";
import { HttpErrorResponse } from "@angular/common/http";
import { ToastrService } from "ngx-toastr";

@Injectable({ providedIn: 'root' })
export class ErrorHandlerService extends ErrorHandler {

    errorService: ErrorService;

    constructor(@Inject(Injector) private readonly injector: Injector) {
        super();
    }

    private get toastService() {
        return this.injector.get(ToastrService);
    }

    override handleError(error: Error | HttpErrorResponse) {
        console.log(error)
        super.handleError(error);

        // Inject prerequisite services
        this.injectServices();

        /*let name;*/
        let message;
        let code;
        let stackTrace;
        let name;

        // Detect Error type (server or client)
        // Server error
        if (error instanceof HttpErrorResponse) {
            name = this.errorService.getServerName(error);
            code = this.errorService.getServerCode(error);
            message = this.errorService.getServerMessage(error);
            stackTrace = this.errorService.getServerStack(error);

            // You should write code here to send error data to the server ...

            this.toastService.error(message, code);
            // Client error
        } else {
            name = this.errorService.getClientName(error);
            message = this.errorService.getClientMessage(error);
            stackTrace = this.errorService.getClientStack(error);

            this.toastService.error(message, code);
            // You should write code here to send error data to the server ...            

        }
    }

    private injectServices(): void {
        this.errorService = this.injector.get(ErrorService);
    }
}