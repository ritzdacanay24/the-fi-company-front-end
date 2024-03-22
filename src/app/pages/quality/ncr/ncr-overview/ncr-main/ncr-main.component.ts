import { Component, Input, OnInit, SimpleChanges } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { SharedModule } from '@app/shared/shared.module';
import { NgbNavModule } from '@ng-bootstrap/ng-bootstrap';
import { UserService } from '@app/core/api/field-service/user.service';
import { NcrFormComponent } from '../../ncr-form/ncr-form.component';
import { FormGroup } from '@angular/forms';
import { NcrService } from '@app/core/api/quality/ncr-service';
import { ToastrService } from 'ngx-toastr';


export const ncr_types: any[] = ["Internal", "Supplier", "Customer Return", "Internal Audit", "Customer Complaint"];
export const cont_types: any[] = ["Rework", "RTV", "UAI", "MRB", "Scrap", "Others"];


@Component({
  standalone: true,
  imports: [
    SharedModule,
    NgbNavModule,
    NcrFormComponent
  ],
  selector: 'app-ncr-main',
  templateUrl: './ncr-main.component.html',
  styleUrls: []
})
export class NcrMainComponent implements OnInit {

  constructor(
    public activatedRoute: ActivatedRoute,
    public router: Router,
    public ncrService: NcrService,
    private api: NcrService,
    private toastrService: ToastrService,
  ) {
  }

  ngOnInit(): void {
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['id']) {
      this.id = changes['id'].currentValue
      this.getData()
    }
  }

  @Input() id = null

  isLoading = false;

  title = "NCR Info";

  form: FormGroup;

  submitted = false;

  async convertToString() {
    this.form.value.ncr_type = this.form.value.ncr_type
      .map((checked, i) => checked ? ncr_types[i] : null)
      .filter(v => v !== null).toString();

    this.form.value.cont_type = this.form.value.cont_type
      .map((checked, i) => checked ? cont_types[i] : null)
      .filter(v => v !== null).toString();
  }

  async onSubmit() {
    this.convertToString();
    try {
      this.isLoading = true;
      await this.api.update(this.id, this.form.value);
      this.isLoading = false;
      this.toastrService.success('Successfully Updated');
    } catch (err) {
      this.isLoading = false;
    }
  }

  async getData() {
    let data = await this.ncrService.getById(this.id);


    data.ncr_type = data.ncr_type.split(',');
    data.cont_type = data.cont_type.split(',');

    this.form.patchValue(data)


    this.form.get('ncr_type').patchValue(ncr_types.map(x => {
      return this.form.value.ncr_type.indexOf(x) > -1
    }));

    this.form.get('cont_type').patchValue(cont_types.map(x => {
      return this.form.value.cont_type.indexOf(x) > -1
    }));



  }

}
