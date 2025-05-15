import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MovieService } from '../../services/movie.service';
import { AuthService } from '../../services/auth.service';
import { ListService } from '../../services/list.service';
import { ToastrService } from 'ngx-toastr';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Firestore, collection, addDoc, query, orderBy, onSnapshot, deleteDoc, doc, updateDoc, where, getDocs, QueryDocumentSnapshot } from '@angular/fire/firestore';
import { FormsModule } from '@angular/forms';
import { Storage, getDownloadURL, ref } from '@angular/fire/storage';
import { ChatComponent } from "../chat/chat.component";

// Interfész a film adataihoz
interface Movie {
  id: string;
  title: string;
  poster_path: string | null;
  release_date: string;
  vote_average: number;
  overview: string;
  genres: { id: number; name: string }[];
}

// Interfész a credits adataihoz
interface Credits {
  cast: {
    name: string;
    character: string;
    profile_path: string | null;
  }[];
  crew: {
    name: string;
    job: string;
  }[];
}

// Interfész az értékelésekhez/kommentekhez
interface Review {
  id: string;
  userId: string;
  userName: string;
  profilePicture: string | null;
  rating: number; // 1-10 skála
  comment: string;
  createdAt: string;
}

// Interfész a listákhoz
interface List {
  id: string;
  name: string;
  isDefault: boolean;
  createdAt: string;
}

@Component({
  selector: 'app-movie-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, ChatComponent],
  templateUrl: './movie-detail.component.html',
  styleUrls: ['./movie-detail.component.scss']
})
export class MovieDetailComponent implements OnInit {
  movie: Movie | null = null;
  user: any = null;
  isInWatchlist: boolean = false;
  isInFavorites: boolean = false;
  genresString: string = '';
  movieId: string | null = null;
  trailerUrl: SafeResourceUrl | null = null;
  credits: Credits | null = null;
  similarMovies: Movie[] = [];
  baseImageUrl = 'https://image.tmdb.org/t/p/w500';

  // Értékelés és komment változók
  userRating: number = 0;
  userComment: string = '';
  reviews: Review[] = [];
  averageRating: number = 0;
  roundedAverageRating: number = 0;
  editingReviewId: string | null = null;
  editingRating: number = 0;
  editingComment: string = '';
  editingRatingHover: number = 0;
  userRatingHover: number = 0;
  hasUserReviewed: boolean = false;

  // Lista változók
  lists: List[] = [];
  selectedList: string = '';
  newListName: string = ''; // Új lista nevének tárolására

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private movieService: MovieService,
    private authService: AuthService,
    private listService: ListService,
    private toastr: ToastrService,
    private sanitizer: DomSanitizer,
    private firestore: Firestore,
    private storage: Storage,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      this.movieId = params.get('id');
      if (this.movieId) {
        this.loadMovieDetails(this.movieId);
        this.loadMovieVideos(this.movieId);
        this.loadMovieCredits(this.movieId);
        this.loadSimilarMovies(this.movieId);
        this.loadReviews(this.movieId);
      }

      this.authService.getCurrentUser().subscribe(user => {
        this.user = user;
        if (user && this.movieId) {
          this.checkWatchlistAndFavorites(user.uid, this.movieId);
          this.checkUserReview(user.uid, this.movieId);
          this.loadLists(user.uid);
        }
      });

      window.scrollTo(0, 0);
    });
  }

  // Listák betöltése (csak egyéni listák, a Favorites és Watchlist nélkül)
  loadLists(userId: string) {
    this.listService.getLists(userId).subscribe({
      next: (lists: List[]) => {
        this.lists = lists.filter(list => !list.isDefault); // Csak az egyéni listák
        this.selectedList = this.lists.length > 0 ? this.lists[0].id : '';
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        console.error('Hiba a listák lekérdezése közben:', err);
        this.toastr.error('Hiba történt a listák betöltése közben.', 'Hiba');
      }
    });
  }

  // Új lista létrehozása és a film hozzáadása
  createNewList() {
    if (!this.user) {
      this.toastr.warning('Kérlek, jelentkezz be a lista létrehozásához!', 'Figyelmeztetés');
      return;
    }

    if (!this.newListName.trim()) {
      this.toastr.error('Kérlek, adj meg egy lista nevet!', 'Hiba');
      return;
    }

    if (!this.movieId || !this.movie) {
      this.toastr.error('Hiba: A film azonosítója nem található.', 'Hiba');
      return;
    }

    const listNameForToast = this.newListName.trim(); // A toast üzenethez elmentjük a nevet

    // Lista létrehozása
    this.listService.createList(this.user.uid, listNameForToast).subscribe({
      next: () => {
        this.toastr.success(`Új lista létrehozva: ${listNameForToast}`, 'Siker');
        this.newListName = ''; // Töröljük a szövegmező tartalmát

        // Frissítjük a listákat, hogy megkapjuk az új lista ID-ját
        this.listService.getLists(this.user.uid).subscribe({
          next: (lists: List[]) => {
            this.lists = lists.filter(list => !list.isDefault); // Csak az egyéni listák
            const newList = this.lists.find(list => list.name === listNameForToast);
            
            if (newList) {
              this.selectedList = newList.id; // Frissítjük a kiválasztott listát
              // Hozzáadjuk a filmet az új listához
              this.listService.addMovieToList(this.user.uid, newList.id, this.movieId!).subscribe({
                next: () => {
                  this.toastr.success(`${this.movie?.title} hozzáadva a ${listNameForToast} listához!`, 'Siker');
                },
                error: (err: any) => {
                  console.error('Hiba a film hozzáadása közben:', err);
                  this.toastr.error('Hiba történt a film hozzáadása közben.', 'Hiba');
                }
              });
            } else {
              this.toastr.error('Nem található az új lista.', 'Hiba');
            }
            this.cdr.detectChanges();
          },
          error: (err: any) => {
            console.error('Hiba a listák újratöltése közben:', err);
            this.toastr.error('Hiba történt a listák újratöltése közben.', 'Hiba');
          }
        });
      },
      error: (err: any) => {
        console.error('Hiba a lista létrehozása közben:', err);
        this.toastr.error('Hiba történt a lista létrehozása közben.', 'Hiba');
      }
    });
  }

  // Film hozzáadása a kiválasztott listához
  addToList() {
    if (!this.user) {
      this.toastr.warning('Kérlek, jelentkezz be a listák használatához!', 'Figyelmeztetés');
      return;
    }

    if (!this.movieId || !this.movie) {
      this.toastr.error('Hiba: A film azonosítója nem található.', 'Hiba');
      return;
    }

    if (!this.selectedList) {
      this.toastr.error('Kérlek, válassz egy listát!', 'Hiba');
      return;
    }

    this.listService.addMovieToList(this.user.uid, this.selectedList, this.movieId!).subscribe({
      next: () => {
        this.toastr.success(`${this.movie?.title} hozzáadva a ${this.lists.find(list => list.id === this.selectedList)?.name} listához!`, 'Siker');
      },
      error: (err: any) => {
        console.error('Hiba a film hozzáadása közben:', err);
        this.toastr.error('Hiba történt a film hozzáadása közben.', 'Hiba');
      }
    });
  }

  getImageUrl(path: string | null): string {
    return path ? `${this.baseImageUrl}${path}` : 'https://via.placeholder.com/150x225?text=Nincs+kép';
  }

  loadMovieDetails(movieId: string) {
    this.movieService.getMovieDetails(movieId).subscribe({
      next: (data: Movie) => {
        this.movie = { ...data, id: movieId };
        this.genresString = this.movie.genres?.map(g => g.name).join(', ') || 'N/A';
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.toastr.error('Hiba a film adatainak betöltése közben.', 'Hiba');
        console.error(err);
      }
    });
  }

  loadMovieVideos(movieId: string) {
    this.trailerUrl = null;
    this.movieService.getMovieVideos(movieId).subscribe({
      next: (data: any) => {
        const videos = data.results;
        const trailer = videos.find((video: any) => video.type === 'Trailer' && video.site === 'YouTube');
        if (trailer) {
          const youtubeUrl = `https://www.youtube.com/embed/${trailer.key}?autoplay=0`;
          this.trailerUrl = this.sanitizer.bypassSecurityTrustResourceUrl(youtubeUrl);
        }
      },
      error: (err) => {
        console.error('Hiba a videók betöltése közben:', err);
      }
    });
  }

  loadMovieCredits(movieId: string) {
    this.movieService.getMovieCredits(movieId).subscribe({
      next: (data: Credits) => {
        this.credits = data;
      },
      error: (error: any) => {
        console.error('Hiba a credits betöltése közben:', error);
        this.toastr.error('Hiba történt a színészek betöltése közben.', 'Hiba');
      }
    });
  }

  loadSimilarMovies(movieId: string) {
    this.movieService.getSimilarMovies(movieId).subscribe({
      next: (data: any) => {
        this.similarMovies = data.results.map((movie: any) => ({
          ...movie,
          id: movie.id.toString()
        }));
      },
      error: (error: any) => {
        console.error('Hiba a hasonló filmek betöltése közben:', error);
        this.toastr.error('Hiba történt a hasonló filmek betöltése közben.', 'Hiba');
      }
    });
  }

  checkWatchlistAndFavorites(uid: string, movieId: string) {
    this.authService.getWatchlist(uid).then(watchlist => {
      this.isInWatchlist = watchlist.some((item: any) => item.movieId === movieId);
      this.cdr.detectChanges();
    });
    this.authService.getFavorites(uid).then(favorites => {
      this.isInFavorites = favorites.some((item: any) => item.movieId === movieId);
      this.cdr.detectChanges();
    });
  }

  checkUserReview(uid: string, movieId: string) {
    this.hasUserReviewed = this.reviews.some(review => review.userId === uid);
    this.cdr.detectChanges();
  }

  async addToWatchlist() {
    if (!this.user) {
      this.toastr.warning('Kérlek, jelentkezz be a watchlist használatához!', 'Figyelmeztetés');
      return;
    }
    if (!this.movieId) {
      this.toastr.error('Hiba: A film azonosítója nem található.', 'Hiba');
      return;
    }
    try {
      if (this.isInWatchlist) {
        await this.authService.removeFromWatchlist(this.user.uid, this.movieId);
        this.isInWatchlist = false;
        this.toastr.error(`${this.movie!.title} törölve a watchlistből!`, 'Watchlist');
      } else {
        await this.authService.addToWatchlist(this.user.uid, {
          id: parseInt(this.movieId, 10),
          title: this.movie!.title,
          poster_path: this.movie!.poster_path,
          release_date: this.movie!.release_date
        });
        this.isInWatchlist = true;
        this.toastr.success(`${this.movie!.title} hozzáadva a watchlisthez!`, 'Watchlist', {
          toastClass: 'ngx-toastr watchlist-toast'
        });
      }
    } catch (err: any) {
      this.toastr.error('Hiba a watchlist módosítása közben.', 'Hiba');
      console.error('Hiba a watchlisthez adás közben:', err);
    }
  }

  async addToFavorites() {
    if (!this.user) {
      this.toastr.warning('Kérlek, jelentkezz be a kedvencek használatához!', 'Figyelmeztetés');
      return;
    }
    if (!this.movieId) {
      this.toastr.error('Hiba: A film azonosítója nem található.', 'Hiba');
      return;
    }
    try {
      if (this.isInFavorites) {
        await this.authService.removeFromFavorites(this.user.uid, this.movieId);
        this.isInFavorites = false;
        this.toastr.error(`${this.movie!.title} törölve a kedvencekből!`, 'Kedvencek');
      } else {
        await this.authService.addToFavorites(this.user.uid, {
          id: parseInt(this.movieId, 10),
          title: this.movie!.title,
          poster_path: this.movie!.poster_path,
          release_date: this.movie!.release_date
        });
        this.isInFavorites = true;
        this.toastr.success(`${this.movie!.title} hozzáadva a kedvencekhez!`, 'Kedvencek', {
          toastClass: 'ngx-toastr favorites-toast'
        });
      }
    } catch (err: any) {
      this.toastr.error('Hiba a kedvencek módosítása közben.', 'Hiba');
      console.error('Hiba a kedvencekhez adás közben:', err);
    }
  }

  navigateToMovie(movieId: number | string) {
    this.router.navigate(['/movie', movieId]);
  }

  async loadReviews(movieId: string) {
    const reviewsRef = collection(this.firestore, `movies/${movieId}/reviews`);
    const q = query(reviewsRef, orderBy('createdAt', 'desc'));

    onSnapshot(q, async (snapshot) => {
      const reviewsPromises = snapshot.docs.map(async (doc) => {
        let profilePictureUrl = null;
        const profilePicture = doc.data()['profilePicture'];

        if (profilePicture) {
          try {
            const storageRef = ref(this.storage, profilePicture);
            profilePictureUrl = await getDownloadURL(storageRef);
          } catch (error) {
            console.error('Hiba a profilkép URL lekérése közben:', error);
            profilePictureUrl = 'https://via.placeholder.com/50?text=Nincs+kép';
          }
        } else {
          profilePictureUrl = 'https://via.placeholder.com/50?text=Nincs+kép';
        }

        const review = {
          id: doc.id,
          userId: doc.data()['userId'],
          userName: doc.data()['userName'] || 'Névtelen',
          profilePicture: profilePictureUrl,
          rating: Number(doc.data()['rating']),
          comment: doc.data()['comment'],
          createdAt: doc.data()['createdAt']
        };
        return review;
      });

      this.reviews = await Promise.all(reviewsPromises);

      if (this.reviews.length > 0) {
        const totalRating = this.reviews.reduce((sum, review) => sum + review.rating, 0);
        this.averageRating = totalRating / this.reviews.length;
        this.roundedAverageRating = Math.round(this.averageRating);
      } else {
        this.averageRating = 0;
        this.roundedAverageRating = 0;
      }

      if (this.user && this.movieId) {
        this.checkUserReview(this.user.uid, this.movieId);
      }
      this.cdr.detectChanges();
    });
  }

  async submitReview() {
    if (!this.user) {
      this.toastr.warning('Kérlek, jelentkezz be az értékeléshez!', 'Figyelmeztetés');
      return;
    }

    if (!this.movieId) {
      this.toastr.error('Hiba: A film azonosítója nem található.', 'Hiba');
      return;
    }

    if (this.userRating < 1 || this.userRating > 10) {
      this.toastr.error('Kérlek, válassz 1 és 10 között!', 'Hiba');
      return;
    }

    try {
      const userData = await this.authService.getUserData(this.user.uid);
      let profilePicture = userData?.profilePicture || null;

      if (profilePicture && profilePicture.startsWith('profile_pictures/')) {
        profilePicture = profilePicture.replace('profile_pictures/', '');
      }

      const userName = userData?.username || 'Névtelen';

      const reviewData: Review = {
        id: '',
        userId: this.user.uid,
        userName: userName,
        profilePicture: profilePicture,
        rating: this.userRating,
        comment: this.userComment,
        createdAt: new Date().toISOString()
      };

      const reviewsRef = collection(this.firestore, `movies/${this.movieId}/reviews`);
      const reviewDocRef = await addDoc(reviewsRef, reviewData);

      const ratedMoviesRef = collection(this.firestore, `users/${this.user.uid}/ratedMovies`);
      await addDoc(ratedMoviesRef, {
        movieId: this.movieId,
        reviewId: reviewDocRef.id,
        rating: this.userRating,
        comment: this.userComment,
        createdAt: new Date().toISOString()
      });

      this.toastr.success('Értékelés sikeresen beküldve!', 'Siker');
      this.userRating = 0;
      this.userRatingHover = 0;
      this.userComment = '';
      this.hasUserReviewed = true;
      this.cdr.detectChanges();
    } catch (err: any) {
      this.toastr.error('Hiba az értékelés beküldése közben.', 'Hiba');
      console.error('Hiba az értékelés beküldése közben:', err);
    }
  }

  setRating(rating: number) {
    this.userRating = rating;
    this.cdr.detectChanges();
  }

  setUserRatingHover(rating: number) {
    this.userRatingHover = rating;
    this.cdr.detectChanges();
  }

  resetUserRatingHover() {
    this.userRatingHover = 0;
    this.cdr.detectChanges();
  }

  async deleteReview(reviewId: string) {
    if (!this.movieId) {
      this.toastr.error('Hiba: A film azonosítója nem található.', 'Hiba');
      return;
    }

    const confirmed = confirm('Biztosan törlöd ezt az értékelést?');
    if (!confirmed) return;

    try {
      const reviewRef = doc(this.firestore, `movies/${this.movieId}/reviews/${reviewId}`);
      await deleteDoc(reviewRef);

      const ratedMoviesRef = collection(this.firestore, `users/${this.user.uid}/ratedMovies`);
      const q = query(ratedMoviesRef, where('movieId', '==', this.movieId), where('reviewId', '==', reviewId));
      const snapshot = await getDocs(q);
      snapshot.forEach((doc: QueryDocumentSnapshot) => deleteDoc(doc.ref));

      this.toastr.success('Értékelés sikeresen törölve!', 'Siker');
      this.hasUserReviewed = false;
      this.cdr.detectChanges();
    } catch (err: any) {
      this.toastr.error('Hiba az értékelés törlése közben.', 'Hiba');
      console.error('Hiba az értékelés törlése közben:', err);
    }
  }

  editReview(review: Review) {
    this.editingReviewId = review.id;
    this.editingRating = review.rating;
    this.editingComment = review.comment;
    this.editingRatingHover = 0;
    this.cdr.detectChanges();
  }

  async saveReview(reviewId: string) {
    if (!this.movieId) {
      this.toastr.error('Hiba: A film azonosítója nem található.', 'Hiba');
      return;
    }

    if (this.editingRating < 1 || this.editingRating > 10) {
      this.toastr.error('Kérlek, válassz 1 és 10 között!', 'Hiba');
      return;
    }

    try {
      const reviewRef = doc(this.firestore, `movies/${this.movieId}/reviews/${reviewId}`);
      const originalReview = this.reviews.find(r => r.id === reviewId);
      await updateDoc(reviewRef, {
        rating: this.editingRating,
        comment: this.editingComment,
        createdAt: originalReview ? originalReview.createdAt : new Date().toISOString()
      });

      const ratedMoviesRef = collection(this.firestore, `users/${this.user.uid}/ratedMovies`);
      const q = query(ratedMoviesRef, where('movieId', '==', this.movieId), where('reviewId', '==', reviewId));
      const snapshot = await getDocs(q);
      if (snapshot.empty) {
        console.warn('Nincs találat a ratedMovies-ban a következő feltételekkel:', { movieId: this.movieId, reviewId });
      } else {
        snapshot.forEach((doc: QueryDocumentSnapshot) => {
          updateDoc(doc.ref, {
            rating: this.editingRating,
            comment: this.editingComment
          }).catch(err => console.error('Hiba a ratedMovies frissítése közben:', err));
        });
      }

      this.toastr.success('Értékelés sikeresen módosítva!', 'Siker');
      this.editingReviewId = null;
      this.editingRating = 0;
      this.editingRatingHover = 0;
      this.editingComment = '';
      this.cdr.detectChanges();
    } catch (err: any) {
      this.toastr.error('Hiba az értékelés módosítása közben.', 'Hiba');
      console.error('Hiba az értékelés módosítása közben:', err);
    }
  }

  cancelEdit() {
    this.editingReviewId = null;
    this.editingRating = 0;
    this.editingRatingHover = 0;
    this.editingComment = '';
    this.cdr.detectChanges();
  }

  setEditingRating(rating: number) {
    this.editingRating = rating;
    this.cdr.detectChanges();
  }

  setEditingRatingHover(rating: number) {
    this.editingRatingHover = rating;
    this.cdr.detectChanges();
  }

  resetEditingRatingHover() {
    this.editingRatingHover = 0;
    this.cdr.detectChanges();
  }
}