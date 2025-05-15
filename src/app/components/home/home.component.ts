import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MovieService } from '../../services/movie.service';
import { AuthService } from '../../services/auth.service';
import { tmdbConfig } from '../../tmdb-config';
import { ToastrService } from 'ngx-toastr'; // ToastrService importálása
import { Router } from '@angular/router';


@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {
  popularMovies: any[] = [];
  topRatedMovies: any[] = [];
  latestMovies: any[] = [];
  searchQuery: string = '';
  searchResults: any[] = [];
  currentPage: number = 1;
  totalPages: number = 1;
  currentUser: any = null;
  watchlist: any[] = [];
  favorites: any[] = [];
  hoveredMovie: any = null;
  baseImageUrl = tmdbConfig.baseImageUrl;

  constructor(
    private movieService: MovieService,
    private authService: AuthService,
    private toastr: ToastrService,
    private router: Router
  ) { }

  ngOnInit() {
    this.authService.getCurrentUser().subscribe(user => {
      this.currentUser = user;
      if (user) {
        this.loadWatchlist();
        this.loadFavorites();
      } else {
        this.watchlist = [];
        this.favorites = [];
      }
    });
    this.loadLatestMovies();
    this.loadPopularMovies();
    this.loadTopRatedMovies();
  }
  navigateToMovie(movieId: number) {
    this.router.navigate(['/movie', movieId]);
  }

  loadPopularMovies() {
    this.movieService.getPopularMovies().subscribe({
      next: (movies: any) => {
        console.log('Népszerű filmek:', movies);
        this.popularMovies = movies.results || [];
      },
      error: (error: any) => {
        console.error('Hiba a népszerű filmek betöltése közben:', error);
        this.popularMovies = [];
      }
    });
  }

  loadTopRatedMovies() {
    this.movieService.getTopRatedMovies().subscribe({
      next: (movies: any) => {
        console.log('Legjobbra értékelt filmek:', movies);
        this.topRatedMovies = movies.results || [];
      },
      error: (error: any) => {
        console.error('Hiba a legjobbra értékelt filmek betöltése közben:', error);
        this.topRatedMovies = [];
      }
    });
  }

  loadLatestMovies() {
    this.movieService.getLatestMovies().subscribe({
      next: (movies: any) => {
        console.log('Legújabb filmek:', movies);
        this.latestMovies = movies.results || [];
      },
      error: (error: any) => {
        console.error('Hiba a legújabb filmek betöltése közben:', error);
        this.latestMovies = [];
      }
    });
  }

  loadWatchlist() {
    if (this.currentUser) {
      this.authService.getWatchlist(this.currentUser.uid).then(watchlist => {
        this.watchlist = watchlist;
      });
    }
  }

  loadFavorites() {
    if (this.currentUser) {
      this.authService.getFavorites(this.currentUser.uid).then(favorites => {
        this.favorites = favorites;
      });
    }
  }

  searchMovies() {
    if (!this.searchQuery.trim()) {
      this.searchResults = [];
      this.currentPage = 1;
      this.totalPages = 1;
      return;
    }

    this.movieService.searchMovies(this.searchQuery, this.currentPage).subscribe({
      next: (response) => {
        this.searchResults = response.results;
        this.totalPages = response.total_pages;
        console.log('Keresési eredmények:', this.searchResults);
      },
      error: (error) => {
        console.error('Hiba a keresés közben:', error);
        this.searchResults = [];
        this.currentPage = 1;
        this.totalPages = 1;
      }
    });
  }

  loadMoreResults() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.movieService.searchMovies(this.searchQuery, this.currentPage).subscribe({
        next: (response) => {
          this.searchResults = [...this.searchResults, ...response.results];
          this.totalPages = response.total_pages;
          console.log('További keresési eredmények:', this.searchResults);
        },
        error: (error) => {
          console.error('Hiba a további eredmények betöltése közben:', error);
        }
      });
    }
  }

  isInWatchlist(movieId: number): boolean {
    return this.watchlist.some(movie => movie.movieId === movieId.toString());
  }

  isInFavorites(movieId: number): boolean {
    return this.favorites.some(movie => movie.movieId === movieId.toString());
  }

  async toggleWatchlist(movie: any) {
    if (!this.currentUser) {
      this.toastr.warning('Kérlek, jelentkezz be a watchlist használatához!', 'Figyelmeztetés');
      return;
    }

    try {
      if (this.isInWatchlist(movie.id)) {
        await this.authService.removeFromWatchlist(this.currentUser.uid, movie.id.toString());
        this.toastr.error(`${movie.title} törölve a watchlistből!`, 'Watchlist', {
          progressBar: true,
          timeOut: 3000,
          toastClass: 'ngx-toastr watchlist-toast' // Egyedi osztály a watchlisthez
        });
      } else {
        await this.authService.addToWatchlist(this.currentUser.uid, movie);
        this.toastr.success(`${movie.title} hozzáadva a watchlisthez!`, 'Watchlist', {
          progressBar: true,
          timeOut: 3000,
          toastClass: 'ngx-toastr watchlist-toast' // Egyedi osztály a watchlisthez
        });
      }
      this.loadWatchlist();
    } catch (error) {
      console.error('Hiba a watchlist kezelése közben:', error);
      this.toastr.error('Hiba történt a watchlist kezelése közben.', 'Hiba');
    }
  }

  async toggleFavorite(movie: any) {
    if (!this.currentUser) {
      this.toastr.warning('Kérlek, jelentkezz be a kedvencek használatához!', 'Figyelmeztetés');
      return;
    }

    try {
      if (this.isInFavorites(movie.id)) {
        await this.authService.removeFromFavorites(this.currentUser.uid, movie.id.toString());
        this.toastr.error(`${movie.title} törölve a kedvencekből!`, 'Kedvencek', {
          progressBar: true,
          timeOut: 3000,
          toastClass: 'ngx-toastr favorites-toast' // Egyedi osztály a kedvencekhez
        });
      } else {
        await this.authService.addToFavorites(this.currentUser.uid, movie);
        this.toastr.success(`${movie.title} hozzáadva a kedvencekhez!`, 'Kedvencek', {
          progressBar: true,
          timeOut: 3000,
          toastClass: 'ngx-toastr favorites-toast' // Egyedi osztály a kedvencekhez
        });
      }
      this.loadFavorites();
    } catch (error) {
      console.error('Hiba a kedvencek kezelése közben:', error);
      this.toastr.error('Hiba történt a kedvencek kezelése közben.', 'Hiba');
    }
  }
}