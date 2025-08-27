import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InformacionEmpleador } from './informacion-empleador';

describe('InformacionEmpleador', () => {
  let component: InformacionEmpleador;
  let fixture: ComponentFixture<InformacionEmpleador>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InformacionEmpleador]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InformacionEmpleador);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
