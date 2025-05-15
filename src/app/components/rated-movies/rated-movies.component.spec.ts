import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RatedMoviesComponent } from './rated-movies.component';

describe('RatedMoviesComponent', () => {
  let component: RatedMoviesComponent;
  let fixture: ComponentFixture<RatedMoviesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RatedMoviesComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RatedMoviesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
