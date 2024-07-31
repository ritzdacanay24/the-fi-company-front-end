import { Component, Input } from "@angular/core";
import { NgbActiveModal } from "@ng-bootstrap/ng-bootstrap";

import { Injectable } from "@angular/core";
import { NgbModal } from "@ng-bootstrap/ng-bootstrap";
import { SharedModule } from "@app/shared/shared.module";
import { UserService } from "@app/core/api/users/users.service";
import { UserFormComponent } from "../user-form/user-form.component";
import { FormGroup } from "@angular/forms";
import { AuthenticationService } from "@app/core/services/auth.service";

@Injectable({
  providedIn: "root",
})
export class UserModalService {
  modalRef: any;

  constructor(public modalService: NgbModal) {}

  open(id: string) {
    this.modalRef = this.modalService.open(UserModalComponent, {
      size: "lg",
    });
    this.modalRef.componentInstance.id = id;
    return this.modalRef;
  }
}

@Component({
  standalone: true,
  imports: [SharedModule, UserFormComponent],
  selector: "app-user-modal",
  templateUrl: `./user-modal.component.html`,
  styleUrls: [],
})
export class UserModalComponent {
  constructor(
    private api: UserService,
    private ngbActiveModal: NgbActiveModal,
    private authenticationService: AuthenticationService
  ) {}

  @Input() public id;

  data: any;
  isLoading = true;

  form: FormGroup;

  getData = async () => {
    try {
      this.isLoading = true;
      this.data = await this.api.getById(this.id);
      this.form.patchValue(this.data);
      this.form.get("pass").disable();

      if (this.authenticationService.currentUserValue.employeeType === 0 && !this.authenticationService.currentUserValue.isAdmin){
        this.form.disable();
      }

      this.isLoading = false;
    } catch (err) {
      this.isLoading = false;
    }
  };
  ngOnInit() {
    this.getData();
  }

  dismiss() {
    this.ngbActiveModal.dismiss("dismiss");
  }

  close() {
    this.ngbActiveModal.close();
  }

  submitted = false;
  async onSubmit() {
    this.submitted = true;

    if (this.form.invalid) {
      return;
    }

    try {
      this.isLoading = true;
      await this.api.update(this.id, this.form.value);
      this.isLoading = false;
      this.close();
    } catch (err) {
      this.isLoading = false;
    }
  }
}
