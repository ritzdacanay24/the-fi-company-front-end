import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChecklistExecutionComponent } from './checklist-execution.component';

describe('ChecklistExecutionComponent', () => {
  let component: ChecklistExecutionComponent;
  let fixture: ComponentFixture<ChecklistExecutionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ChecklistExecutionComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ChecklistExecutionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
