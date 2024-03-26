import { Injectable } from '@angular/core';
import { SweetAlertOptions } from 'sweetalert2';
import Swal from 'sweetalert2';

const swalWithBootstrapButtons = Swal.mixin({
  customClass: {
    confirmButton: "btn btn-primary ms-2",
    cancelButton: "btn btn-light",
    denyButton: "btn btn-danger"
  },
  buttonsStyling: false
});

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
    return await swalWithBootstrapButtons.fire({
      ...this.imageInfo,
      ...options,
      allowOutsideClick: false,
    });
  }

  static async confirm(options?: SweetAlertOptions) {
    return await swalWithBootstrapButtons.fire({
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

  static async confirmV1(options?: SweetAlertOptions) {
    return await swalWithBootstrapButtons.fire({
      allowOutsideClick: false,
      title: 'Are you sure?',
      icon: 'info',
      text: 'You want to continue?',
      showCloseButton: false,
      showCancelButton: true,
      focusConfirm: false,
      confirmButtonText: 'Yes',
      cancelButtonText: 'Cancel',
      reverseButtons: true,
      ...options,
    })
  }

  static async alert(options?: SweetAlertOptions) {
    return await swalWithBootstrapButtons.fire({
      allowOutsideClick: false,
      title: 'Are you sure?',
      icon: 'info',
      text: 'You want to continue?',
      showCloseButton: false,
      showCancelButton: true,
      focusConfirm: false,
      confirmButtonText: 'Yes',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#ff0000',
      reverseButtons: true,
      ...options
    })
  }

  static swal() {
    return Swal
  }

  static swalIsLoading() {
    return swalWithBootstrapButtons.isLoading()
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
    return swalWithBootstrapButtons.mixin(options)
  }

  static async loading(title = 'Saving. Please wait..') {
    return await swalWithBootstrapButtons.fire({
      showCancelButton: false,
      showCloseButton: false,
      showConfirmButton: false,
      title: title,
      allowOutsideClick: false,
      willOpen: () => {
        swalWithBootstrapButtons.showLoading()
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
        swalWithBootstrapButtons.close();
        resolve(true);
      }, delay);
    });

  }


}
