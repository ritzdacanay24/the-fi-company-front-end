import { Component, Input, OnInit, SimpleChanges } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { SharedModule } from '@app/shared/shared.module';
import { NgbNavModule } from '@ng-bootstrap/ng-bootstrap';
import { NcrFormComponent } from '../../ncr-form/ncr-form.component';
import { FormGroup } from '@angular/forms';
import { NcrService } from '@app/core/api/quality/ncr-service';
import { NcrCorrectiveActionFormComponent } from '../../ncr-corrective-action-form/ncr-corrective-action-form.component';

@Component({
  standalone: true,
  imports: [
    SharedModule,
    NgbNavModule,
    NcrCorrectiveActionFormComponent
  ],
  selector: 'app-ncr-corrective-action',
  templateUrl: './ncr-corrective-action.component.html',
  styleUrls: []
})
export class NcrCorrectiveAcrionComponent implements OnInit {

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

  title = "Corrective Action";

  form: FormGroup;

  submitted = false;

  onSubmit() {

  }

  async getData() {
    let data = await this.ncrService.getById(this.id)
    this.form.patchValue(data)
  }



}
