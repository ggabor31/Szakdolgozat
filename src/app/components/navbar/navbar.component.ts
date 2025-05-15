import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <nav class="navbar">
      <div class="navbar-brand">
      <img src="/assets/images/output.jpg" alt="MovieMate Logo" class="logo" routerLink="/home"/>
        <span class="brand-name" routerLink="/home">MovieMate</span>
      </div>
      <div class="navbar-links">
        <a routerLink="/home">Home</a>
        <a *ngIf="!currentUser" routerLink="/login">Bejelentkezés</a>
        <a routerLink="/profile" *ngIf="currentUser">Profil</a>
        <a routerLink="/rated-movies" *ngIf="currentUser">Értékelések</a>
        <a routerLink="/lists" *ngIf="currentUser">Listák</a>
        <a [routerLink]="['/friends']" *ngIf="currentUser">Barátok</a>
        <a *ngIf="!currentUser" routerLink="/register">Regisztráció</a>
        <a routerLink="/movie-chat">Film Csevegés</a>
        <a (click)="logout()" *ngIf="currentUser" style="cursor: pointer;">Kijelentkezés</a>
      </div>
    </nav>
  `,
  styleUrls: ['./navbar.component.scss']
})
export class NavbarComponent implements OnInit {
  currentUser: any = null;

  constructor(private authService: AuthService, private router: Router) {}

  ngOnInit() {
    this.authService.getCurrentUser().subscribe(user => {
      this.currentUser = user;
    });
  }

  async logout() {
    try {
      await this.authService.logout(); // Promise kezelése async/await-tel
      this.router.navigate(['/']);
    } catch (err) {
      console.error('Kijelentkezési hiba:', err);
    }
  }
}