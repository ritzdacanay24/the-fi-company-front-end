import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MaterialPickingValidationComponent } from './material-picking-validation.component';

describe('MaterialPickingValidationComponent', () => {
  let component: MaterialPickingValidationComponent;
  let fixture: ComponentFixture<MaterialPickingValidationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ MaterialPickingValidationComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(MaterialPickingValidationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
