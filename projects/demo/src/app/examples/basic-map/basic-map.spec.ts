import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BasicMap } from './basic-map';

describe('BasicMap', () => {
  let component: BasicMap;
  let fixture: ComponentFixture<BasicMap>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BasicMap]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BasicMap);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
