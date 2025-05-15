import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ListService } from '../../services/list.service';
import { FriendService } from '../../services/friend.service';
import { forkJoin, of, Observable } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

interface List {
  id: string;
  name: string;
  isDefault: boolean;
  createdAt: string;
}

interface ListMovie {
  movieId: string;
  addedAt: string;
}

interface Genre {
  id: number;
  name: string;
}

interface MovieDetails {
  id: string;
  title: string;
  poster_path?: string;
  release_date?: string;
  overview?: string;
  genres?: Genre[];
}

interface ListMovieWithDetails extends ListMovie {
  movieTitle?: string;
  posterPath?: string;
  releaseDate?: string;
  overview?: string;
  genres?: Genre[];
}

@Component({
  selector: 'app-list-view',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './list-view.component.html',
  styleUrls: ['./list-view.component.scss']
})
export class ListViewComponent implements OnInit {
  currentUser: any = null;
  list: List | null = null;
  movies: ListMovieWithDetails[] = [];
  isLoading: boolean = true;

  constructor(
    private authService: AuthService,
    private listService: ListService,
    private friendService: FriendService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit() {
    this.authService.getCurrentUser().subscribe({
      next: (user: any) => {
        if (user) {
          this.currentUser = user;
          this.loadList();
        } else {
          this.router.navigate(['/login']);
        }
      },
      error: (err: any) => {
        console.error('Hiba a felhasználói állapot lekérdezése közben:', err);
        this.isLoading = false;
      }
    });
  }

  loadList() {
    const listId = this.route.snapshot.paramMap.get('listId');
    if (!listId) {
      this.router.navigate(['/lists']);
      return;
    }

    this.listService.getLists(this.currentUser.uid).subscribe({
      next: (lists: List[]) => {
        const customLists = lists.filter(list => !list.isDefault);
        this.list = customLists.find(list => list.id === listId) || null;
        if (!this.list) {
          this.router.navigate(['/lists']);
          return;
        }
        this.loadMovies(listId);
      },
      error: (err: any) => {
        console.error('Hiba a lista lekérdezése közben:', err);
        this.isLoading = false;
      }
    });
  }

  loadMovies(listId: string) {
    this.listService.getMoviesInList(this.currentUser.uid, listId).subscribe({
      next: (movies: ListMovie[]) => {
        this.movies = movies;
        this.loadMovieDetails();
      },
      error: (err: any) => {
        console.error('Hiba a filmek lekérdezése közben:', err);
        this.isLoading = false;
      }
    });
  }

  loadMovieDetails() {
    const movieObservables: Observable<ListMovieWithDetails>[] = this.movies.map(movie =>
      this.friendService.getMovieDetails(movie.movieId).pipe(
        map((movieDetails: MovieDetails) => ({
          movieId: movie.movieId,
          addedAt: movie.addedAt,
          movieTitle: movieDetails.title,
          posterPath: movieDetails.poster_path,
          releaseDate: movieDetails.release_date,
          overview: movieDetails.overview,
          genres: movieDetails.genres
        } as ListMovieWithDetails)),
        catchError((err: any) => {
          console.error(`Hiba a film lekérdezése közben (${movie.movieId}):`, err);
          return of({
            movieId: movie.movieId,
            addedAt: movie.addedAt,
            movieTitle: 'Ismeretlen film',
            posterPath: '',
            releaseDate: '',
            overview: 'Nincs leírás',
            genres: []
          } as ListMovieWithDetails);
        })
      )
    );

    forkJoin(movieObservables).subscribe({
      next: (moviesWithDetails: ListMovieWithDetails[]) => {
        this.movies = moviesWithDetails;
        this.isLoading = false;
      },
      error: (err: any) => {
        console.error('Hiba a film részleteinek lekérdezése közben:', err);
        this.isLoading = false;
      }
    });
  }

  removeMovie(movie: ListMovieWithDetails) {
    if (!this.list) return;
    this.listService.removeMovieFromList(this.currentUser.uid, this.list.id, movie.movieId).subscribe({
      next: () => {
        this.movies = this.movies.filter(m => m.movieId !== movie.movieId);
      },
      error: (err: any) => {
        console.error('Hiba a film eltávolítása közben:', err);
      }
    });
  }

  viewMovie(movie: ListMovieWithDetails) {
    this.router.navigate(['/movie', movie.movieId]);
  }

  getGenres(movie: ListMovieWithDetails): string {
    if (!movie.genres || movie.genres.length === 0) {
      return 'N/A';
    }
    return movie.genres.map(g => g.name).join(', ');
  }
}