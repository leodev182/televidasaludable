import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RestoreDraftDialogComponent } from './restore-draft-dialog.component';

describe('RestoreDraftDialogComponent', () => {
  let component: RestoreDraftDialogComponent;
  let fixture: ComponentFixture<RestoreDraftDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RestoreDraftDialogComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RestoreDraftDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
