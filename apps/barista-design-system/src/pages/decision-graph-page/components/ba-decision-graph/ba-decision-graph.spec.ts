import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { BaDecisionGraphComponent } from './ba-decision-graph';

describe('BaDecisionGraphComponent', () => {
  let component: BaDecisionGraphComponent;
  let fixture: ComponentFixture<BaDecisionGraphComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [BaDecisionGraphComponent],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(BaDecisionGraphComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
