import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
import { SharedModule } from '@app/shared/shared.module';
import { NewUserService } from '@app/core/api/users/users.service';
import { MyFormGroup } from 'src/assets/js/util/_formGroup';
import { IComputerForm } from './computer-form.type';

@Component({
  standalone: true,
  imports: [SharedModule, NgSelectModule],
  selector: 'app-computer-form',
  templateUrl: './computer-form.component.html',
})
export class ComputerFormComponent {
  @Input() submitted = false;
  @Output() setFormEmitter = new EventEmitter<MyFormGroup<IComputerForm>>();

  form: MyFormGroup<IComputerForm>;
  assignedToUsers: { id: number; name: string }[] = [];
  readonly computerTypes: string[] = [
    'Desktop',
    'Laptop',
    'Tablet',
    'Phone',
    'Workstation',
    'Server',
    'Notebook',
    'Other',
  ];

  constructor(
    private readonly fb: FormBuilder,
    private readonly userService: NewUserService,
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      computer_type: [null, [Validators.required, Validators.maxLength(120)]],
      asset_tag: ['', [Validators.maxLength(80)]],
      computer_name: ['', [Validators.maxLength(120)]],
      model_name: ['', [Validators.maxLength(120)]],
      serial_number: ['', [Validators.maxLength(150)]],
      department: ['', [Validators.maxLength(60)]],
      assigned_to: [null, [Validators.maxLength(120)]],
      operating_system: ['', [Validators.maxLength(120)]],
      created_by: [null],
      created_date: [''],
      active: [1],
      include_in_inspection_report: [1],
    }) as MyFormGroup<IComputerForm>;

    this.loadAssignedToUsers();
    this.setFormEmitter.emit(this.form);
  }

  private async loadAssignedToUsers(): Promise<void> {
    try {
      const users = await this.userService.getActiveUsers();
      const mapped = (users || [])
        .map((row: any) => {
          const first = String(row?.first || '').trim();
          const last = String(row?.last || '').trim();
          const fullName = `${first} ${last}`.trim();
          const fallbackName = String(row?.user_name || row?.username || '').trim();
          const name = fullName || fallbackName;

          if (!name) {
            return null;
          }

          return {
            id: Number(row?.id) || 0,
            name,
          };
        })
        .filter((row: { id: number; name: string } | null): row is { id: number; name: string } => !!row);

      const uniqueByName = new Map<string, { id: number; name: string }>();
      for (const user of mapped) {
        if (!uniqueByName.has(user.name)) {
          uniqueByName.set(user.name, user);
        }
      }

      this.assignedToUsers = [
        { id: 0, name: 'Unassigned' },
        ...Array.from(uniqueByName.values()).sort((a, b) => a.name.localeCompare(b.name)),
      ];
    } catch {
      this.assignedToUsers = [{ id: 0, name: 'Unassigned' }];
    }
  }

  get f() {
    return this.form?.controls;
  }
}
