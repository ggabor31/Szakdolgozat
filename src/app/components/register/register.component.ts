import { Component, NgZone } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { FormsModule, NgForm } from '@angular/forms'; // NgForm hozzáadása
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss']
})
export class RegisterComponent {
  email: string = '';
  password: string = '';
  username: string = '';
  error: string = '';
  success: string = '';

  constructor(
    private authService: AuthService,
    private router: Router,
    private toastr: ToastrService,
    private ngZone: NgZone
  ) {}

  async onRegister(form: NgForm) {
    // Ellenőrizzük, hogy az űrlap érvényes-e
    if (form.invalid) {
      this.error = 'Kérlek, töltsd ki az összes mezőt helyesen!';
      this.toastr.error('Kérlek, töltsd ki az összes mezőt helyesen!', 'Hiba');
      return;
    }

    try {
      // Regisztráció az AuthService segítségével, username átadása
      const user = await this.authService.register(this.email, this.password, this.username);
      console.log('Regisztráció sikeres a komponensben:', user);

      // Sikeres regisztráció üzenet és átirányítás
      this.success = 'Sikeres regisztráció! Átirányítunk a főoldalra...';
      this.error = '';
      this.ngZone.run(() => {
        this.toastr.success('Sikeres regisztráció! Átirányítunk a főoldalra...', 'Siker');
        setTimeout(() => {
          this.router.navigate(['/']);
        }, 2000);
      });
    } catch (err: any) {
      // Az AuthService-ből érkező specifikus hibaüzenetek kezelése
      if (err.message === 'Ez az email cím már használatban van!') {
        this.error = 'Ez az email cím már használatban van!';
        this.toastr.error('Ez az email cím már használatban van!', 'Hiba');
      } else if (err.message === 'Ez a felhasználónév már használatban van!') {
        this.error = 'Ez a felhasználónév már használatban van!';
        this.toastr.error('Ez a felhasználónév már használatban van!', 'Hiba');
      } else {
        this.error = 'Hiba a regisztrációnál: ' + err.message;
        this.toastr.error('Hiba a regisztráció során: ' + err.message, 'Hiba');
      }
      this.success = '';
      console.error('Regisztrációs hiba a komponensben:', err);
    }
  }

  navigateToLogin() {
    this.ngZone.run(() => {
      this.router.navigate(['/login']);
    });
  }
}