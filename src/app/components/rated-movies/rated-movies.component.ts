import { Component, OnInit, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { MovieService } from '../../services/movie.service';
import { ToastrService } from 'ngx-toastr';
import { Firestore, collection, query, limit, startAfter, orderBy, getDocs, where } from '@angular/fire/firestore';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { trigger, transition, style, animate } from '@angular/animations';

// Interfész a film adataihoz (TMDB-ből)
interface Movie {
  id: number;
  title: string;
  poster_path: string | null;
  release_date: string;
}

// Interfész az értékelésekhez
interface Review {
  id: string;
  movieId: string;
  reviewId: string;
  rating: number;
  comment: string;
  createdAt: string;
}

@Component({
  selector: 'app-rated-movies',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './rated-movies.component.html',
  styleUrls: ['./rated-movies.component.scss'],
  animations: [
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(10px)' }),
        animate('300ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ])
  ]
})
export class RatedMoviesComponent implements OnInit, OnDestroy {
  user: any = null;
  ratedMovies: { movie: Movie | null; review: Review }[] = [];
  baseImageUrl = 'https://image.tmdb.org/t/p/w500';
  isLoading = true;

  // Pagináció változói
  pageSize = 9;
  currentPage = 1;
  totalItems = 0;
  lastVisible: any = null;
  firstVisible: any = null;
  pages: number[] = [];

  // Szűrési változó
  ratingFilter: number | null = null;

  constructor(
    private authService: AuthService,
    private movieService: MovieService,
    private toastr: ToastrService,
    private firestore: Firestore,
    private cdr: ChangeDetectorRef,
    private router: Router
  ) { }

  ngOnInit() {
    this.authService.getCurrentUser().subscribe(user => {
      this.user = user;
      if (user) {
        this.loadTotalItems(user.uid);
        this.loadRatedMovies(user.uid);
      } else {
        this.isLoading = false;
        this.ratedMovies = [];
        this.cdr.detectChanges();
      }
    }, (error) => {
      console.error('Hiba az autentikáció során:', error);
      this.isLoading = false;
      this.ratedMovies = [];
      this.cdr.detectChanges();
    });
  }

  ngOnDestroy() {
    // Nem kell leiratkozni, mert getDocs-ot használunk
  }

  async loadTotalItems(uid: string) {
    const ratedMoviesRef = collection(this.firestore, `users/${uid}/ratedMovies`);
    let q = query(ratedMoviesRef);
    if (this.ratingFilter !== null) {
      q = query(ratedMoviesRef, where('rating', '>=', this.ratingFilter));
    }
    const snapshot = await getDocs(q);
    this.totalItems = snapshot.size;
    this.updatePages();
  }

  updatePages() {
    const pageCount = Math.ceil(this.totalItems / this.pageSize);
    this.pages = Array.from({ length: pageCount }, (_, i) => i + 1);
  }

  async loadRatedMovies(uid: string, direction: 'next' | 'prev' | 'first' = 'first') {
    try {
      this.isLoading = true;
      this.ratedMovies = []; // Ürítjük a tömböt minden hívás előtt

      const ratedMoviesRef = collection(this.firestore, `users/${uid}/ratedMovies`);
      let q;

      if (direction === 'next' && this.lastVisible) {
        if (this.ratingFilter !== null) {
          q = query(
            ratedMoviesRef,
            orderBy('createdAt', 'desc'),
            where('rating', '>=', this.ratingFilter),
            startAfter(this.lastVisible),
            limit(this.pageSize)
          );
        } else {
          q = query(
            ratedMoviesRef,
            orderBy('createdAt', 'desc'),
            startAfter(this.lastVisible),
            limit(this.pageSize)
          );
        }
      } else if (direction === 'prev' && this.firstVisible) {
        if (this.ratingFilter !== null) {
          q = query(
            ratedMoviesRef,
            orderBy('createdAt', 'desc'),
            where('rating', '>=', this.ratingFilter),
            limit(this.pageSize)
          );
        } else {
          q = query(
            ratedMoviesRef,
            orderBy('createdAt', 'desc'),
            limit(this.pageSize)
          );
        }
        this.currentPage--;
      } else {
        if (this.ratingFilter !== null) {
          q = query(
            ratedMoviesRef,
            orderBy('createdAt', 'desc'),
            where('rating', '>=', this.ratingFilter),
            limit(this.pageSize)
          );
        } else {
          q = query(
            ratedMoviesRef,
            orderBy('createdAt', 'desc'),
            limit(this.pageSize)
          );
        }
        this.currentPage = 1;
      }

      // getDocs használata a collectionData helyett
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        this.ratedMovies = [];
        this.firstVisible = null;
        this.lastVisible = null;
        this.isLoading = false;
        this.cdr.detectChanges();
        return;
      }

      const ratedMoviesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Review));

      // Valódi snapshotok használata
      this.firstVisible = snapshot.docs[0];
      this.lastVisible = snapshot.docs[snapshot.docs.length - 1];

      this.ratedMovies = [];
      for (const review of ratedMoviesData) {
        try {
          const movie = await this.movieService.getMovieDetails(review.movieId).toPromise();
          this.ratedMovies.push({ movie, review });
        } catch (err) {
          console.error(`Hiba a film adatainak betöltése közben (movieId: ${review.movieId}):`, err);
          this.ratedMovies.push({ movie: null, review });
        }
      }

      this.isLoading = false;
      this.cdr.detectChanges();
    } catch (error) {
      this.toastr.error('Hiba az értékelt filmjeid betöltése közben.', 'Hiba');
      console.error('Hiba az értékelt filmjeid betöltése közben:', error);
      this.ratedMovies = [];
      this.firstVisible = null;
      this.lastVisible = null;
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  filterByRating(event: Event) {
    const target = event.target as HTMLSelectElement;
    const value = target.value;
    this.ratingFilter = value ? parseInt(value, 10) : null;
    if (this.user) {
      this.currentPage = 1;
      this.lastVisible = null;
      this.firstVisible = null;
      this.loadTotalItems(this.user.uid);
      this.loadRatedMovies(this.user.uid, 'first');
    }
  }

  refreshMovies() {
    if (this.user) {
      this.currentPage = 1;
      this.lastVisible = null;
      this.firstVisible = null;
      this.loadRatedMovies(this.user.uid, 'first');
    }
  }

  navigateToMovie(movieId: string | null | undefined) {
    if (movieId) {
      this.router.navigate(['/movie', movieId]);
    } else {
      console.warn('Érvénytelen movieId, nem lehet navigálni:', movieId);
    }
  }

  goToPage(page: number) {
    if (page < 1 || page > this.pages.length || page === this.currentPage) return;

    if (page > this.currentPage) {
      this.currentPage = page;
      this.loadRatedMovies(this.user.uid, 'next');
    } else {
      this.loadRatedMovies(this.user.uid, 'prev');
    }
  }

  nextPage() {
    if (this.currentPage < this.pages.length) {
      this.currentPage++;
      this.loadRatedMovies(this.user.uid, 'next');
    }
  }

  prevPage() {
    if (this.currentPage > 1) {
      this.loadRatedMovies(this.user.uid, 'prev');
    }
  }

  getImageUrl(path: string | null | undefined): string {
    return path ? `${this.baseImageUrl}${path}` : 'https://via.placeholder.com/150x225?text=Nincs+kép';
  }
}