import { Component, EventEmitter, Input, Output } from "@angular/core";
import { FormBuilder, ReactiveFormsModule } from "@angular/forms";
import { LicensedTechsService } from "@app/core/api/field-service/licensed-techs.service";
import { UserService } from "@app/core/api/field-service/user.service";
import { AddressSearchComponent } from "@app/shared/components/address-search/address-search.component";
import { UserSearchComponent } from "@app/shared/components/user-search/user-search.component";
import { SharedModule } from "@app/shared/shared.module";
import { NgSelectModule } from "@ng-select/ng-select";
import { ToastrService } from "ngx-toastr";

@Component({
  standalone: true,
  imports: [
    SharedModule,
    ReactiveFormsModule,
    AddressSearchComponent,
    UserSearchComponent,
    NgSelectModule,
  ],
  selector: "app-licensed-techs-form",
  templateUrl: "./licensed-techs-form.component.html",
  styleUrls: ["./licensed-techs-form.component.scss"],
})
export class LicensedTechsFormComponent {
  constructor(
    private fb: FormBuilder,
    private toastrService: ToastrService,
    private userService: UserService,
    private licensedTechsService: LicensedTechsService
  ) {}

  ngOnInit(): void {
    this.setFormEmitter.emit(this.form);
  }

  @Output() setFormEmitter: EventEmitter<any> = new EventEmitter();

  @Input() submitted = false;
  @Input() id = null;

  get f() {
    return this.form.controls;
  }

  form = this.fb.group({});

  licensed_techs = [];
  techs = [];

  async onTechAdd($event) {
    try {
      let { insertId } = await this.licensedTechsService.create($event);
      $event.id = insertId;
      this.techs.push($event);
      this.toastrService.success("Tech successfully added.");
    } catch (err) {}
  }

  async onTechRemove(i, row) {
    //remove from table
    try {
      if (!confirm("Are you sure you want to remove tech?")) return;

      await this.licensedTechsService.delete(row.id);
      this.techs.splice(i, 1);

      //remove from ng-select
      this.licensed_techs = this.licensed_techs.filter((s) => s != row.user_id);

      this.toastrService.success("Tech successfully removed.");
    } catch (err) {}
  }

  async onTechUpdated(row) {
    try {
      await this.licensedTechsService.update(row.id, row);
      this.toastrService.success("Recordd successfully updated.");
    } catch (err) {}
  }

  users$: any;
  getUserService = async () => {
    try {
      let data: any = await this.userService.find({
        area: "Field Service",
        active: 1,
        access: 1,
      });

      this.users$ = [];
      for (let i = 0; i < data.length; i++) {
        let row = data[i];
        this.users$.push({
          fs_licensed_id: this.id,
          user_id: row.id,
          user_name: row.first + " " + row.last,
          expired_date: null,
          licensed_required: "Yes",
          notes: "",
        });
      }
    } catch (err) {}
  };
}
