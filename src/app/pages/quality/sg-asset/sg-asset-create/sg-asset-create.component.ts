import { Component, Input } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import moment from 'moment';
import { SgAssetFormComponent } from '../sg-asset-form/sg-asset-form.component';
import { SgAssetService } from '@app/core/api/quality/sg-asset.service';
import { NAVIGATION_ROUTE } from '../sg-asset-constant';
import { AuthenticationService } from '@app/core/services/auth.service';
import { SharedModule } from '@app/shared/shared.module';
import { SweetAlert } from '@app/shared/sweet-alert/sweet-alert.service';

@Component({
  standalone: true,
  imports: [SharedModule, SgAssetFormComponent],
  selector: 'app-sg-asset-create',
  templateUrl: './sg-asset-create.component.html',
  styleUrls: ['./sg-asset-create.component.scss']
})
export class SgAssetCreateComponent {
  constructor(
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private api: SgAssetService,
    private toastrService: ToastrService,
    private authenticationService: AuthenticationService,
  ) { }

  ngOnInit(): void {
    this.activatedRoute.queryParams.subscribe(params => {
      this.id = params['id'];
    });

    if (this.id) this.getData();
  }

  title = "Create SG Asset Record";

  form: FormGroup;

  id = null;

  isLoading = false;

  submitted = false;

  @Input() goBack: Function = () => {
    this.router.navigate([NAVIGATION_ROUTE.LIST], { queryParamsHandling: 'merge' });
  }

  setFormEmitter($event) {
    this.form = $event;
    this.form.patchValue({
      inspectorName: this.authenticationService.currentUserValue.full_name,
      timeStamp: moment().format('YYYY-MM-DD HH:mm:ss'),
      created_by: this.authenticationService.currentUserValue.id,
      lastUpdate: moment().format('YYYY-MM-DD HH:mm:ss'),
    }, { emitEvent: false })
  }

  data: any;

  async getData() {
    try {
      this.data = await this.api.getById(this.id);
      this.form.patchValue(this.data);
    } catch (err) { }
  }

  async onSubmit() {
    this.submitted = true;

    if (this.form.invalid) return;

    if (this.form.value?.generated_SG_asset) {
      let data = await this.api.checkIfSerialIsFound(this.form.value?.generated_SG_asset);

      if (data) {
        const { value: accept } = await SweetAlert.confirmV1({
          title: "Duplicate SG asset found. Are you sure you want to continue?"
        })
        if (!accept) return;
      }
    }

    try {
      this.isLoading = true;
      await this.api.create(this.form.value);
      this.isLoading = false;
      this.toastrService.success('Successfully Created');
      this.goBack();
    } catch (err) {
      this.isLoading = false;
      
      // Extract the error message
      let errorMessage = 'An error occurred while creating the SG Asset';
      
      if (err?.error?.message) {
        errorMessage = err.error.message;
      } else if (err?.message) {
        errorMessage = err.message;
      } else if (typeof err?.error === 'string') {
        errorMessage = err.error;
      } else if (typeof err === 'string') {
        errorMessage = err;
      }
      
      // Check if it's an EyeFi serial duplicate error
      // Handle both trigger errors (SQLSTATE[45000]) and UNIQUE constraint errors
      if (errorMessage.includes('EyeFi serial') || 
          errorMessage.includes('SQLSTATE[45000]') || 
          errorMessage.includes('unique_sg_eyefi_serial') ||
          errorMessage.includes('Duplicate entry')) {
        
        // Try to extract from trigger error message
        const triggerMatch = errorMessage.match(/EyeFi serial "([^"]+)" is already ([^.]+)\./);
        if (triggerMatch) {
          errorMessage = `EyeFi serial "${triggerMatch[1]}" is already ${triggerMatch[2]}. Please select a different serial.`;
        } 
        // Try to extract from UNIQUE constraint error
        else {
          const uniqueMatch = errorMessage.match(/Duplicate entry '([^']+)' for key/);
          if (uniqueMatch) {
            errorMessage = `EyeFi serial "${uniqueMatch[1]}" is already in use. Please select a different serial.`;
          } else {
            // Generic duplicate error message
            errorMessage = 'This EyeFi serial number is already in use. Please select a different serial.';
          }
        }
      }
      
      this.toastrService.error(errorMessage, 'Error', {
        timeOut: 5000,
        closeButton: true,
        progressBar: true
      });
    }
  }

  onCancel() {
    this.goBack()
  }

}
