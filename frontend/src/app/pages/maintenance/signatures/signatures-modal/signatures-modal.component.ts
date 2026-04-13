import { Component, Input, OnInit } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { NgbActiveModal } from "@ng-bootstrap/ng-bootstrap";
import { SharedModule } from "@app/shared/shared.module";
import { Injectable } from "@angular/core";
import { NgbModal } from "@ng-bootstrap/ng-bootstrap";
import { FormGroup } from "@angular/forms";
import { SignaturesFormComponent } from "../signatures-form/signatures-form.component";
import { SignaturesService } from "@app/core/api/signatures.service";

@Injectable({
  providedIn: "root",
})
export class SignaturesModalService {
  constructor(public modalService: NgbModal) {}

  open(id) {
    let modalRef = this.modalService.open(SignaturesModalComponent, {
      size: "md",
    });
    modalRef.componentInstance.id = id;
    return modalRef;
  }
}

@Component({
  standalone: true,
  imports: [SharedModule, SignaturesFormComponent],
  selector: "app-signatures-modal",
  templateUrl: "./signatures-modal.component.html",
  styleUrls: [],
})
export class SignaturesModalComponent implements OnInit {
  constructor(
    public route: ActivatedRoute,
    public router: Router,
    private ngbActiveModal: NgbActiveModal,
    private api: SignaturesService
  ) {}

  data: any;
  async getData() {
    this.data = await this.api.getById(this.id);
    this.form.patchValue(this.data);
  }

  @Input() id: any;

  ngOnInit(): void {
    if (this.id) {
      this.getData();
    }
  }

  dismiss() {
    this.ngbActiveModal.dismiss();
  }

  close() {
    this.ngbActiveModal.close();
  }

  form: FormGroup;
  setFormEmitter($event) {
    this.form = $event;
  }

  submitted = false;

  async onSubmit() {
    if (this.id) {
      this.onUpdate();
    } else {
      this.onCreate();
    }
  }

  async onCreate() {
    await this.api.create(this.form.value);
    this.close();
  }

  async onUpdate() {
    await this.api.update(this.id, this.form.value);
    this.close();
  }

  async onDelete() {
    if (!confirm("Are you sure you want to delete?")) return;
    await this.api.delete(this.id);
    this.close();
  }
}
