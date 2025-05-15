import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {
  email: string = '';
  password: string = '';

  constructor(
    private authService: AuthService,
    private router: Router,
    private toastr: ToastrService
  ) {}

  async login() {
    try {
      await this.authService.login(this.email, this.password);
      this.toastr.success('Sikeres bejelentkezés!', 'Siker');
      this.router.navigate(['/']); // Átirányítás a főoldalra
    } catch (error: any) {
      this.toastr.error('Hiba a bejelentkezés során: ' + error.message, 'Hiba');
      console.error('Bejelentkezési hiba:', error);
    }
  }

  navigateToRegister() {
    this.router.navigate(['/register']);
  }
}