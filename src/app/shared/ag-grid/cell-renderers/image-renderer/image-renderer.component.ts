
import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ICellRendererAngularComp } from 'ag-grid-angular';

@Component({
  standalone: true,
  imports: [CommonModule],
  selector: 'app-image-renderer',
  templateUrl: './image-renderer.component.html'
})

export class ImageRendererComponent implements ICellRendererAngularComp {

  params: any;

  isLink = false;

  image = ""

  onImgError(image) {
    image.target.parentNode.style.display = 'none';
  }
  anonImg(image) {
    image.src = 'https://instagramimages-a.akamaihd.net/profiles/anonymousUser.jpg';
  }

  agInit(params): void {

    if (!params.data) return

    this.params = params;

    this.image = params.link + ' ' + params.value
  }

  refresh(params?: any): boolean {

    this.params.value = params?.value;
    return true;
  }

  onClick($event: any) {
    window.open($event);

  }
}
