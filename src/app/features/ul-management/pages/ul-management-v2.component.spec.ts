import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ULManagementV2Component } from './ul-management-v2.component';

describe('ULManagementV2Component', () => {
  let component: ULManagementV2Component;
  let fixture: ComponentFixture<ULManagementV2Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ULManagementV2Component]
    }).compileComponents();

    fixture = TestBed.createComponent(ULManagementV2Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    localStorage.removeItem(component.storageKey);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should generate labels', () => {
    const before = component.labels.length;
    component.bulkGenerate(3);
    expect(component.labels.length).toBe(before + 3);
  });

  it('should save and load state', () => {
    component.labels = [{ id: 1, ul_number: '7390000001', description: 'x', status: 'active' }];
    component.ranges = [{ id: 2, start: '100', end: '200', note: 'r' }];
    component.nextId = 10;
    component.saveState();

    const copy = new ULManagementV2Component((component as any).fb);
    const loaded = copy.loadState();
    expect(loaded).toBeTrue();
    expect(copy.labels.length).toBe(1);
    expect(copy.ranges.length).toBe(1);
  });

  it('should save range', () => {
    const before = component.ranges.length;
    component.importRange('100', '110');
    expect(component.ranges.length).toBe(before + 1);
  });
});
