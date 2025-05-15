import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent } from './components/navbar/navbar.component';

@Component({
  selector: 'app-root',
  standalone: true,  // Hozzáadva
  imports: [RouterOutlet],  // Helyesen a dekorátorban
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']  // styleUrl -> styleUrls
})
export class AppComponent {
  title = 'filmes-oldal';
}