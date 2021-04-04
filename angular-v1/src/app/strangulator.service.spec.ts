import { TestBed } from '@angular/core/testing';

import { StrangulatorService } from './strangulator.service';

describe('StrangulatorService', () => {
  let service: StrangulatorService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(StrangulatorService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
