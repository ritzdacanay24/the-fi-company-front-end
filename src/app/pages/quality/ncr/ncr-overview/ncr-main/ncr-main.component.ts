import { Component, Input, OnInit, SimpleChanges } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { SharedModule } from '@app/shared/shared.module';
import { NgbNavModule } from '@ng-bootstrap/ng-bootstrap';
import { UserService } from '@app/core/api/field-service/user.service';
import { NcrFormComponent } from '../../ncr-form/ncr-form.component';
import { FormGroup } from '@angular/forms';
import { NcrService } from '@app/core/api/quality/ncr-service';

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
    public ncrService: NcrService
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

  onSubmit() {

  }


  ncr_types: any[] = ["Internal", "Supplier", "Customer Return", "Internal Audit", "Customer Complaint"];
  cont_types: any[] = ["Rework", "RTV", "UAI", "MRB", "Scrap", "Others"];


  async getData() {
    let data = await this.ncrService.getById(this.id);


    data.ncr_type = data.ncr_type.split(',');
    data.cont_type = data.cont_type.split(',');


    this.form.patchValue(data)


    this.form.get('ncr_type').patchValue(this.ncr_types.map(x => {
      return this.form.value.ncr_type.indexOf(x) > -1
    }));

    this.form.get('cont_type').patchValue(this.cont_types.map(x => {
      return this.form.value.cont_type.indexOf(x) > -1
    }));



  }

}
