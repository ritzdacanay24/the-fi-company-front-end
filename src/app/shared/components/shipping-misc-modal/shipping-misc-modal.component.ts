import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup } from '@angular/forms';
import { NgbActiveModal, NgbNavModule, NgbScrollSpyModule } from '@ng-bootstrap/ng-bootstrap';
import { first } from 'rxjs/operators';
import moment from 'moment';
import { Injectable } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ShippingService } from '@app/core/api/operations/shipping/shipping.service';
import { AuthenticationService } from '@app/core/services/auth.service';
import { SharedModule } from '@app/shared/shared.module';
import { AutosizeModule } from 'ngx-autosize';
import { LateReasonCodesService } from '@app/core/api/operations/late-reason-codes/late-reason-codes.service';
import { SoSearchComponent } from '../so-search/so-search.component';
import { ShippingMiscService } from '@app/core/api/shipping-misc/shipping-misc.service';
import { ControlsOf } from 'src/assets/js/util/_formGroup';
import { NgSelectModule } from '@ng-select/ng-select';

@Injectable({
  providedIn: 'root'
})
export class ShippingMiscModalService {
  modalRef: any;

  constructor(
    public modalService: NgbModal,
  ) { }

  open(soLine) {
    this.modalRef = this.modalService.open(ShippingMiscModalComponent, { size: 'xl' });
    this.modalRef.componentInstance.soLine = soLine;
    return this.modalRef;
  }

}


@Component({
  standalone: true,
  imports: [SharedModule, NgbNavModule, AutosizeModule, NgbScrollSpyModule, SoSearchComponent, NgSelectModule],
  selector: 'app-shipping-misc-modal',
  templateUrl: './shipping-misc-modal.component.html',
  styleUrls: []
})
export class ShippingMiscModalComponent implements OnInit {
  loadingIndicator: boolean;

  accounts: string[] = ["Eyefi", "Customer", "N/A"];

  @Input() public soLine;
  @Input() public data;

  misc: any;
  userInfo: any;

  listOptions = [
    {
      name: "Hot Order",
      ngbScrollSpyItem: 'items-0',
      icon: 'mdi-sticker-alert'
    },
    {
      name: "Owner",
      ngbScrollSpyItem: 'items-1',
      icon: 'mdi-calendar'
    },
    {
      name: "Clear to build status",
      ngbScrollSpyItem: 'items-2',
      icon: 'mdi-calendar'
    },
    {
      name: "Late Reason Code",
      ngbScrollSpyItem: 'items-3',
      icon: 'mdi-calendar'
    },
    {
      name: "Late Reason Code (perf)",
      ngbScrollSpyItem: 'items-4',
      icon: 'mdi-calendar'
    },
    {
      name: "Ship Account Info",
      ngbScrollSpyItem: 'items-5',
      icon: 'mdi-calendar'
    },
    {
      name: "Container Info",
      ngbScrollSpyItem: 'items-6',
      icon: 'mdi-calendar'
    },
    {
      name: "TJ Info",
      ngbScrollSpyItem: 'items-7',
      icon: 'mdi-calendar'
    },
    {
      name: "G2E",
      ngbScrollSpyItem: 'items-8',
      icon: 'mdi-calendar'
    },
    {
      name: "Shortages",
      ngbScrollSpyItem: 'items-9',
      icon: 'mdi-calendar'
    },
    {
      name: "Pallet Info",
      ngbScrollSpyItem: 'items-10',
      icon: 'mdi-calendar'
    },
    {
      name: "Recovery Info",
      ngbScrollSpyItem: 'items-11',
      icon: 'mdi-calendar'
    },
    {
      name: "Inspection Info",
      ngbScrollSpyItem: 'items-12',
      icon: 'mdi-calendar'
    },
  ]

  async notifyParent($event) {
    this.soLine = $event.sod_nbr + "-" + $event.sod_line;
    this.getData()
  }

  isLoading
  async getData() {
    try {
      this.isLoading = true;
      this.data = await this.shippingMiscService.findOne({ so: this.soLine })
      this.form.patchValue({ ...this.data, so: this.soLine })

      this.isLoading = false;
    } catch (err) {
      this.isLoading = false;

    }
  }

  constructor(
    private fb: FormBuilder,
    public activeModal: NgbActiveModal,
    private api: ShippingService,
    private authenticationService: AuthenticationService,
    private lateReasonCodesService: LateReasonCodesService,
    private shippingMiscService: ShippingMiscService,
  ) {
    this.userInfo = authenticationService.currentUserValue;
  }

  currentSection = 'item-1'

  form = new FormGroup<ControlsOf<any>>({
    userName: new FormControl(null),
    clear_to_build_status: new FormControl(null),
    lateReasonCode: new FormControl(null),
    lateReasonCodePerfDate: new FormControl(null),
    arrivalDate: new FormControl(null),
    shipViaAccount: new FormControl(null),
    container: new FormControl(null),
    container_due_date: new FormControl(null),
    tj_po_number: new FormControl(null),
    tj_due_date: new FormControl(null),
    g2e_comments: new FormControl(null),
    shortages_review: new FormControl(null),
    pallet_count: new FormControl(null),
    recoveryDate: new FormControl(null),
    recoveryDateComment: new FormControl(null),
    source_inspection_required: new FormControl(null),
    source_inspection_completed: new FormControl(null),
    source_inspection_waived: new FormControl(null),
    so: new FormControl(null),
    id: new FormControl(null),
    hot_order: new FormControl(0),
  });


  ngOnInit(): void {

    this.getData()

    this.getReasonCodes()
  }

  dismiss() {
    this.activeModal.dismiss('dismiss');
  }
  get formValue() {
    return this.form.value
  }

  public onSubmit() {

    this.loadingIndicator = true;
    this.api
      .saveMisc({ ...this.form.value, shippingMisc: true })
      .pipe(first())
      .subscribe((res) => {
        this.loadingIndicator = false;
        this.activeModal.close(res);
      }, () => this.loadingIndicator = false);


  }

  department = 'Shipping'
  lastReasonCodes: any
  getReasonCodes() {
    this.lateReasonCodesService
      .getData(this.department)
      .pipe(first())
      .subscribe((data) => {
        this.lastReasonCodes = data;
      });
  }

}
