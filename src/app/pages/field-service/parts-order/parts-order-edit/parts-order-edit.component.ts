import { Component, Input } from '@angular/core';
import { FormArray, FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { SharedModule } from '@app/shared/shared.module';
import { PartsOrderFormComponent } from '../parts-order-form/parts-order-form-component';
import { PartsOrderService } from '@app/core/api/field-service/parts-order/parts-order.service';
import { NAVIGATION_ROUTE } from '../parts-order-constant';
import { AttachmentsService } from '@app/core/api/attachments/attachments.service';
import { Lightbox } from 'ngx-lightbox';

@Component({
  standalone: true,
  imports: [SharedModule, PartsOrderFormComponent],
  selector: 'app-parts-order-edit',
  templateUrl: './parts-order-edit.component.html',
})
export class PartsOrderEditComponent {
  constructor(
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private api: PartsOrderService,
    private toastrService: ToastrService,
    private attachmentsService: AttachmentsService,
    private lightbox: Lightbox,
    private fb: FormBuilder,

  ) { }

  ngOnInit(): void {
    this.activatedRoute.queryParams.subscribe(params => {
      this.id = params['id'];
    });

    if (this.id) this.getData();
  }


  title = "Edit";

  form: FormGroup;

  id = null;

  isLoading = false;

  submitted = false;

  @Input() goBack: Function = () => {
    this.router.navigate([NAVIGATION_ROUTE.LIST], { queryParamsHandling: 'merge' });
  }

  data: any;
  details: FormArray;

  async getData() {
    try {
      this.data = await this.api.getById(this.id);


      if (this.data.details) {
        this.data.details = JSON.parse(this.data.details);

        this.details = this.form.get('details') as FormArray;

        for (let i = 0; i < this.data.details.length; i++) {
          let row = this.data.details[i];

          this.details.push(this.fb.group({
            part_number: new FormControl(row.part_number, Validators.required),
            qty: new FormControl(row.qty, Validators.required),
            billable: new FormControl(row.billable, Validators.required),
            description: new FormControl(row.description, Validators.required),
          }))
        }
      };

      this.form.patchValue(this.data);
      
      this.getAttachments()

    } catch (err) { }
  }

  async onSubmit() {
    this.submitted = true;

    if (this.form.value.details.length == 0) {
      alert('You have not items in your cart. Unable to submit request.');
      return;
    };

    if (this.form.invalid) {
      return;
    };

    try {

      this.form.value.details = JSON.stringify(this.form.value.details);

      this.isLoading = true;
      await this.api.update(this.id, this.form.value);
      this.isLoading = false;
      this.toastrService.success('Successfully Updated');
      this.goBack();
    } catch (err) {
      this.isLoading = false;
    }
  }

  onCancel() {
    this.goBack()
  }


  images
  attachments: any = []
  async getAttachments() {
    this.images = []
    this.attachments = await this.attachmentsService.find({ field: 'FS Parts Order', uniqueId: this.id })

    for (let i = 0; i < this.attachments.length; i++) {
      let row = this.attachments[i]
      const src = 'https://dashboard.eye-fi.com/attachments/fieldService/' + row.fileName;
      const caption = 'Image ' + i + '- ' + row.createdDate;
      const thumb = 'https://dashboard.eye-fi.com/attachments/fieldService/' + row.fileName;
      const item = {
        src: src,
        caption: caption,
        thumb: thumb
      };
      this.images.push(item);
    }

  }


  open(index: number): void {
    // open lightbox
    this.lightbox.open(this.images, index, {});
  }

  close(): void {
    // close lightbox programmatically
    this.lightbox.close();
  }

  async deleteAttachment(id, index) {
    if (!confirm('Are you sure you want to remove attachment?')) return
    await this.attachmentsService.delete(id);
    this.attachments.splice(index, 1)
  }

  file: File = null;

  myFiles: string[] = [];

  onFilechange(event: any) {
    this.myFiles = [];
    for (var i = 0; i < event.target.files.length; i++) {
      this.myFiles.push(event.target.files[i]);
    }
  }

  async onUploadAttachments() {
    if (this.myFiles) {
      let totalAttachments = 0;
      this.isLoading = true;
      const formData = new FormData();
      for (var i = 0; i < this.myFiles.length; i++) {
        formData.append("file", this.myFiles[i]);
        formData.append("field", "FS Parts Order");
        formData.append("uniqueData", `${this.id}`);
        formData.append("folderName", 'fieldService');
        try {
          await this.attachmentsService.uploadfile(formData);
          totalAttachments++
        } catch (err) {
        }
      }
      this.isLoading = false;
      await this.getAttachments()
    }
  }


}
