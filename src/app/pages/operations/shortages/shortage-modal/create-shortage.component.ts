import { Component, Input } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { Injectable } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ShortagesService } from '@app/core/api/operations/shortages/shortages.service';
import { SharedModule } from '@app/shared/shared.module';
import { SweetAlert } from '@app/shared/sweet-alert/sweet-alert.service';

@Injectable({
  providedIn: 'root'
})
export class CreateShortageModalService {
  modalRef: any;

  constructor(
    public modalService: NgbModal
  ) { }

  open(shortages: any[]) {
    this.modalRef = this.modalService.open(CreateShortageComponent, { size: 'xl' });
    this.modalRef.componentInstance.shortages = shortages;
    return this.modalRef;
  }

}


@Component({
  standalone: true,
  imports: [SharedModule],
  selector: 'app-create-shortage',
  templateUrl: './create-shortage.component.html'
})

export class CreateShortageComponent {

  constructor(
    private ngbActiveModal: NgbActiveModal,
    private api: ShortagesService,
  ) { }

  @Input() public shortages: any;

  data: any;
  loadingIndicator = true;

  ngOnInit() {
    this.loadingIndicator = false;
  }

  dismiss() {
    this.ngbActiveModal.dismiss('dismiss');
  }

  close() {
    this.ngbActiveModal.close(this.shortages);
  }

  exlcudeUnCheckItems() {
    let newData = [];
    for (let i = 0; i < this.shortages.length; i++) {
      if (this.shortages[i].isChecked) {
        newData.push(this.shortages[i]);
      }
    }
    return newData;
  }

  async submit() {
    let newShortages = this.exlcudeUnCheckItems();

    if (newShortages.length == 0) {
      alert('No items selected.');
      return;
    }

    const { value: accept } = await SweetAlert.confirmV1(
      {
        title: 'Create Shortage?',
        text: 'Are you sure you want to send these items to the shortage log?',
      });


    if (!accept) return;

    let params = {
      data: newShortages
    }

    try {
      await this.api.createShortages(params);
      this.close()
    } catch (err) {
    }
  }

}
