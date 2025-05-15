import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ToastrService } from 'ngx-toastr';
import { User } from '@angular/fire/auth';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss']
})
export class ProfileComponent implements OnInit {
  user: User | null = null;
  userData: any = null;
  watchlist: any[] = [];
  favorites: any[] = [];
  newBio: string = '';
  newProfilePictureUrl: string | null = null;
  newPassword: string = '';

  watchlistSortOption: string = 'added-desc';
  favoritesSortOption: string = 'added-desc';

  constructor(
    private authService: AuthService,
    private toastr: ToastrService,
    private router: Router
  ) {}

  ngOnInit() {
    this.authService.getCurrentUser().subscribe(user => {
      this.user = user;
      if (user) {
        this.loadUserData(user.uid);
        this.loadWatchlist(user.uid);
        this.loadFavorites(user.uid);
      }
    });
  }

  async loadUserData(uid: string) {
    try {
      this.userData = await this.authService.getUserData(uid);
      this.newBio = this.userData?.bio || '';
      this.newProfilePictureUrl = this.userData?.profilePicture || null;
    } catch (err: any) {
      this.toastr.error('Hiba a felhasználói adatok betöltése közben.', 'Hiba');
      console.error(err);
    }
  }

  async loadWatchlist(uid: string) {
    try {
      this.watchlist = await this.authService.getWatchlist(uid);
      this.sortWatchlist();
    } catch (err: any) {
      this.toastr.error('Hiba a watchlist betöltése közben.', 'Hiba');
      console.error(err);
    }
  }

  async loadFavorites(uid: string) {
    try {
      this.favorites = await this.authService.getFavorites(uid);
      this.sortFavorites();
    } catch (err: any) {
      this.toastr.error('Hiba a kedvencek betöltése közben.', 'Hiba');
      console.error(err);
    }
  }

  sortWatchlist() {
    if (this.watchlistSortOption === 'added-desc') {
      this.watchlist.sort((a, b) => {
        const dateA = a.addedAt ? new Date(a.addedAt).getTime() : 0;
        const dateB = b.addedAt ? new Date(b.addedAt).getTime() : 0;
        return dateB - dateA;
      });
    } else if (this.watchlistSortOption === 'added-asc') {
      this.watchlist.sort((a, b) => {
        const dateA = a.addedAt ? new Date(a.addedAt).getTime() : 0;
        const dateB = b.addedAt ? new Date(b.addedAt).getTime() : 0;
        return dateA - dateB;
      });
    } else if (this.watchlistSortOption === 'title-asc') {
      this.watchlist.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    }
  }

  sortFavorites() {
    if (this.favoritesSortOption === 'added-desc') {
      this.favorites.sort((a, b) => {
        const dateA = a.addedAt ? new Date(a.addedAt).getTime() : 0;
        const dateB = b.addedAt ? new Date(b.addedAt).getTime() : 0;
        return dateB - dateA;
      });
    } else if (this.favoritesSortOption === 'added-asc') {
      this.favorites.sort((a, b) => {
        const dateA = a.addedAt ? new Date(a.addedAt).getTime() : 0;
        const dateB = b.addedAt ? new Date(b.addedAt).getTime() : 0;
        return dateA - dateB;
      });
    } else if (this.favoritesSortOption === 'title-asc') {
      this.favorites.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    }
  }

  onWatchlistSortChange(event: Event) {
    const selectElement = event.target as HTMLSelectElement;
    this.watchlistSortOption = selectElement.value;
    this.sortWatchlist();
  }

  onFavoritesSortChange(event: Event) {
    const selectElement = event.target as HTMLSelectElement;
    this.favoritesSortOption = selectElement.value;
    this.sortFavorites();
  }

  async updateProfile() {
    if (!this.user) return;
    try {
      const updatedData: any = {};
      if (this.newBio !== this.userData?.bio) {
        updatedData.bio = this.newBio;
      }
      if (this.userData?.profilePicture && !this.newProfilePictureUrl) {
        // Ha a profilkép törlésre került, töröljük a Storage-ból is
        await this.authService.deleteProfilePicture(this.user.uid);
        updatedData.profilePicture = null;
      }
      if (Object.keys(updatedData).length > 0) {
        await this.authService.updateUserData(this.user.uid, updatedData);
        this.toastr.success('Profil sikeresen frissítve!', 'Siker');
        this.loadUserData(this.user.uid);
      } else {
        this.toastr.info('Nincs változás a profiladatokban.', 'Info');
      }
    } catch (err: any) {
      this.toastr.error('Hiba a profil frissítése közben.', 'Hiba');
      console.error(err);
    }
  }

  async updatePassword() {
    if (!this.user || !this.newPassword) {
      this.toastr.error('Kérlek, add meg az új jelszót!', 'Hiba');
      return;
    }
    try {
      await this.authService.updatePassword(this.newPassword);
      this.toastr.success('Jelszó sikeresen frissítve!', 'Siker');
      this.newPassword = '';
    } catch (err: any) {
      this.toastr.error('Hiba a jelszó frissítése közben.', 'Hiba');
      console.error(err);
    }
  }

  async onFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      if (file.size > 2 * 1024 * 1024) {
        this.toastr.error('A fájl mérete nem lehet nagyobb 2 MB-nál!', 'Hiba');
        return;
      }
      try {
        // Feltöltjük az új profilképet (a régi automatikusan törlődik az uploadProfilePicture metódusban)
        const downloadURL = await this.authService.uploadProfilePicture(file, this.user!.uid);
        this.newProfilePictureUrl = downloadURL;
        await this.authService.updateUserData(this.user!.uid, { profilePicture: downloadURL });
        this.toastr.success('Profilkép sikeresen feltöltve!', 'Siker');
        this.loadUserData(this.user!.uid);
      } catch (err: any) {
        this.toastr.error('Hiba a profilkép feltöltése közben.', 'Hiba');
        console.error(err);
      }
    }
  }

  async removeFromWatchlist(movieId: string) {
    if (!this.user) return;
    try {
      await this.authService.removeFromWatchlist(this.user.uid, movieId);
      this.toastr.error('Film törölve a watchlistből!', 'Watchlist');
      this.loadWatchlist(this.user.uid);
    } catch (err: any) {
      this.toastr.error('Hiba a film törlése közben.', 'Hiba');
      console.error(err);
    }
  }

  async removeFromFavorites(movieId: string) {
    if (!this.user) return;
    try {
      await this.authService.removeFromFavorites(this.user.uid, movieId);
      this.loadFavorites(this.user.uid);
    } catch (err: any) {
      this.toastr.error('Hiba a film törlése közben.', 'Hiba');
      console.error(err);
    }
  }

  navigateToMovie(movieId: string) {
    this.router.navigate(['/movie', movieId]);
  }
}