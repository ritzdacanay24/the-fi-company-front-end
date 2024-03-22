import { TestBed } from '@angular/core/testing';

import { MaterialPickingValidationService } from './material-picking-validation.service';

describe('MaterialPickingValidationService', () => {
  let service: MaterialPickingValidationService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MaterialPickingValidationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
