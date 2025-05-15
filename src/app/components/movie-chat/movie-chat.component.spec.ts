import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MovieChatComponent } from './movie-chat.component';

describe('MovieChatComponent', () => {
  let component: MovieChatComponent;
  let fixture: ComponentFixture<MovieChatComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MovieChatComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MovieChatComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
