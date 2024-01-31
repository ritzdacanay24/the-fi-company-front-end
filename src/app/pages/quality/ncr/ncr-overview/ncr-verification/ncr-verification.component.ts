import { Component, Input, OnInit, SimpleChanges } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { SharedModule } from '@app/shared/shared.module';
import { NgbNavModule } from '@ng-bootstrap/ng-bootstrap';
import { FormGroup } from '@angular/forms';
import { NcrService } from '@app/core/api/quality/ncr-service';
import { NcrVerificationFormComponent } from '../../ncr-verification-form/ncr-verification-form.component';

@Component({
  standalone: true,
  imports: [
    SharedModule,
    NgbNavModule,
    NcrVerificationFormComponent
  ],
  selector: 'app-ncr-verification',
  templateUrl: './ncr-verification.component.html',
  styleUrls: []
})
export class NcrVerificationComponent implements OnInit {

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

  title = "NCR Verification";

  form: FormGroup;

  submitted = false;

  onSubmit() {

  }

  async getData() {
    let data = await this.ncrService.getById(this.id)
    this.form.patchValue(data)
  }



}
