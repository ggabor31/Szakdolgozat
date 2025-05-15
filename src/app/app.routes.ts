import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { RegisterComponent } from './components/register/register.component';
import { HomeComponent } from './components/home/home.component';
import { NavbarComponent } from './components/navbar/navbar.component';
import { ProfileComponent } from './components/profile/profile.component';
import { MovieDetailComponent } from './components/movie-detail/movie-detail.component';
import { RatedMoviesComponent } from './components/rated-movies/rated-movies.component';
import { FriendsPageComponent } from './components/friends-page/friends-page.component';
import { ListsPageComponent } from './components/lists-page/lists-page.component';
import { ListViewComponent } from './components/list-view/list-view.component';
import { MovieChatComponent } from './components/movie-chat/movie-chat.component';
import { ProfileModule } from './components/profile/profile.module';
export const appRoutes: Routes = [
  { path: '', component: NavbarComponent, outlet: 'navbar' }, // Navbar minden oldalon megjelenik
  { path: '', component: HomeComponent }, // Alapértelmezett útvonal a HomeComponent-re
  { path: 'home', component: HomeComponent }, // A /home útvonal is a HomeComponent-re mutat
  { path: 'register', component: RegisterComponent },
  { path: 'login', component: LoginComponent },
  { path: 'profile', loadChildren: () => import('./components/profile/profile.module').then(m => m.ProfileModule) },
  { path: 'movie/:id', component: MovieDetailComponent },
  { path: 'rated-movies', component: RatedMoviesComponent },
  { path: 'friends', component: FriendsPageComponent },
  { path: 'lists', component: ListsPageComponent },
  { path: 'list/:listId', component: ListViewComponent },
  { path: 'movie-chat', component: MovieChatComponent },
  { path: '**', redirectTo: '' } // Minden ismeretlen útvonal a Home oldalra irányít
];