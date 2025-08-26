import { ComponentFixture, TestBed } from '@angular/core/testing';

import { QuailtyControlPhotosComponent } from './quailty-control-photos.component';

describe('QuailtyControlPhotosComponent', () => {
  let component: QuailtyControlPhotosComponent;
  let fixture: ComponentFixture<QuailtyControlPhotosComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ QuailtyControlPhotosComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(QuailtyControlPhotosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
