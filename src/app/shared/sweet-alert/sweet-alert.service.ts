import { Injectable } from '@angular/core';
import { SweetAlertOptions } from 'sweetalert2';
import Swal from 'sweetalert2';

@Injectable({
  providedIn: 'root'
})
export class SweetAlert {

  static imageInfo: SweetAlertOptions = {
    imageUrl: 'assets/images/fi-color.png',
    imageWidth: 160,
    imageAlt: 'Fi Image',
    reverseButtons: true,
  }

  constructor() { }

  static async fire(options: SweetAlertOptions | any) {
    return await Swal.fire({
      ...options,
      confirmButtonColor: '#2271B1',
      allowOutsideClick: false,
      ...this.imageInfo,
    });
  }

  static async confirm(options?: SweetAlertOptions) {
    return await Swal.fire({
      allowOutsideClick: false,
      title: 'Are you sure you want to delete?',
      icon: 'info',
      text: 'This cannot be undone.',
      showCloseButton: false,
      showCancelButton: true,
      focusConfirm: false,
      confirmButtonText: 'Delete',
      confirmButtonColor: '#ff0000',
      cancelButtonText: 'Cancel',
      reverseButtons: true,
      ...options
    })
  }

  static swal() {
    return Swal
  }

  static swalIsLoading() {
    return Swal.isLoading()
  }

  static toast(options: SweetAlertOptions) {
    let Toast = SweetAlert.mixin({
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 1000,
      timerProgressBar: true,
    })


    Toast.fire({
      ...options,
      icon: 'success',
      title: "Saved Successfully",
    })
  }

  static mixin(options: SweetAlertOptions) {
    return Swal.mixin(options)
  }

  static async loading(title = 'Saving. Please wait..') {
    return await Swal.fire({
      showCancelButton: false,
      showCloseButton: false,
      showConfirmButton: false,
      title: title,
      allowOutsideClick: false,
      willOpen: () => {
        Swal.showLoading()
      },
      ...this.imageInfo,
    });
  }

  // static close(time = 700) {
  //   setTimeout(async () => {
  //     await Swal.close();
  //   }, time);
  // }

  static close = (delay = 700) => {
    return new Promise((resolve) => {
      setTimeout(async () => {
        Swal.close();
        resolve(true);
      }, delay);
    });

  }


}
