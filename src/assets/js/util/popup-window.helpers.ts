import { environment } from "@environments/environment";

export function popupWindow(url, windowName, win, w = 800, h = screen.height - 200) {
    const y = win.top.outerHeight / 2 + win.top.screenY - (h / 2);
    const x = win.top.outerWidth / 2 + win.top.screenX - (w / 2);

    return win.open('/dist/v1/' + url, '_blank', `toolbar=no, location=no, directories=no, status=no, menubar=no, scrollbars=no, resizable=0, copyhistory=no, width=${w}, height=${h}, top=${y}, left=${x} target="_blank"`);

    //return win.open('http://localhost:4200/' + url, '_blank', `toolbar=no, location=no, directories=no, status=no, menubar=no, scrollbars=no, resizable=0, copyhistory=no, width=${w}, height=${h}, top=${y}, left=${x} target="_blank"`);

}
