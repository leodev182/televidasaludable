import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DeclaracionJurada } from './declaracion-jurada';

describe('DeclaracionJurada', () => {
  let component: DeclaracionJurada;
  let fixture: ComponentFixture<DeclaracionJurada>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DeclaracionJurada]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DeclaracionJurada);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
