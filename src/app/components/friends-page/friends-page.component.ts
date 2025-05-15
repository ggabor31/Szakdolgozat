import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FriendService, FriendRequest } from '../../services/friend.service';
import { AuthService } from '../../services/auth.service';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { FormsModule } from '@angular/forms';

interface Friend {
  friendId: string;
  username: string;
}

interface RatedMovieWithTitle {
  movieId: string;
  rating: number;
  movieTitle?: string;
  posterPath?: string;
  releaseDate?: string;
}

interface ReviewWithTitle {
  movieId?: string;
  reviewText?: string;
  rating?: number;
  movieTitle?: string;
  posterPath?: string;
  releaseDate?: string;
}

@Component({
  selector: 'app-friends-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './friends-page.component.html',
  styleUrls: ['./friends-page.component.scss']
})
export class FriendsPageComponent implements OnInit {
  currentUser: any = null;
  pendingRequests: FriendRequest[] = [];
  friends: Friend[] = [];
  selectedFriend: Friend | null = null;
  friendProfile: { id: string, username?: string, profilePicture?: string, bio?: string } | null = null;
  friendRatedMovies: RatedMovieWithTitle[] = [];
  friendReviews: ReviewWithTitle[] = [];
  searchQuery: string = '';
  searchResults: { id: string, username?: string }[] = [];
  isLoading: boolean = true;

  constructor(
    private friendService: FriendService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit() {
    this.authService.getCurrentUser().subscribe({
      next: (user) => {
        if (user) {
          this.currentUser = user;
          this.loadPendingRequests(user.uid);
          this.loadFriends(user.uid);
        } else {
          this.router.navigate(['/login']);
        }
      },
      error: (err) => {
        console.error('Hiba a felhasználói állapot lekérdezése közben:', err);
        this.isLoading = false;
      }
    });
  }

  loadPendingRequests(userId: string) {
    this.friendService.getPendingRequests(userId).subscribe({
      next: (requests) => {
        this.pendingRequests = requests;
      },
      error: (err) => {
        console.error('Hiba a barátkérések lekérdezése közben:', err);
      }
    });
  }

  loadFriends(userId: string) {
    this.friendService.getFriends(userId).subscribe({
      next: (friends) => {
        this.friends = friends;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Hiba a barátok lekérdezése közben:', err);
        this.isLoading = false;
      }
    });
  }

  searchUsers() {
    if (this.searchQuery.trim() === '') {
      this.searchResults = [];
      return;
    }
    this.friendService.searchUsers(this.searchQuery).subscribe({
      next: (users) => {
        this.searchResults = users.filter(user => 
          user.id !== this.currentUser.uid && 
          !this.friends.some(friend => friend.friendId === user.id)
        );
      },
      error: (err) => {
        console.error('Hiba a felhasználók keresése közben:', err);
      }
    });
  }

  sendFriendRequest(toUserId: string) {
    this.friendService.sendFriendRequest(this.currentUser.uid, toUserId).subscribe({
      next: () => {
        this.searchResults = this.searchResults.filter(user => user.id !== toUserId);
      },
      error: (err) => {
        console.error('Hiba a barátkérés küldése közben:', err);
      }
    });
  }

  acceptFriendRequest(request: FriendRequest) {
    this.friendService.acceptFriendRequest(request.id, request.fromUserId, request.toUserId).subscribe({
      next: () => {
        this.pendingRequests = this.pendingRequests.filter(r => r.id !== request.id);
        this.loadFriends(this.currentUser.uid);
      },
      error: (err) => {
        console.error('Hiba a barátkérés elfogadása közben:', err);
      }
    });
  }

  rejectFriendRequest(request: FriendRequest) {
    this.friendService.rejectFriendRequest(request.id).subscribe({
      next: () => {
        this.pendingRequests = this.pendingRequests.filter(r => r.id !== request.id);
      },
      error: (err) => {
        console.error('Hiba a barátkérés elutasítása közben:', err);
      }
    });
  }

  selectFriend(friend: Friend) {
    if (this.selectedFriend?.friendId === friend.friendId) {
      this.selectedFriend = null;
      this.friendProfile = null;
      this.friendRatedMovies = [];
      this.friendReviews = [];
    } else {
      this.selectedFriend = friend;
      this.loadFriendProfile(friend.friendId);
      this.loadFriendRatedMovies(friend.friendId);
      this.loadFriendReviews(friend.friendId);
    }
  }

  removeFriend(friend: Friend) {
    if (!this.currentUser) return;

    this.friendService.removeFriend(this.currentUser.uid, friend.friendId).subscribe({
      next: () => {
        this.friends = this.friends.filter(f => f.friendId !== friend.friendId);
        if (this.selectedFriend?.friendId === friend.friendId) {
          this.selectedFriend = null;
          this.friendProfile = null;
          this.friendRatedMovies = [];
          this.friendReviews = [];
        }
      },
      error: (err) => {
        console.error('Hiba a barát törlése közben:', err);
      }
    });
  }

  refreshData() {
    if (!this.currentUser) return;

    this.isLoading = true;
    this.loadPendingRequests(this.currentUser.uid);
    this.loadFriends(this.currentUser.uid);

    // Ha van kiválasztott barát, frissítjük az adatait
    if (this.selectedFriend) {
      const friendId = this.selectedFriend.friendId;
      this.loadFriendProfile(friendId);
      this.loadFriendRatedMovies(friendId);
      this.loadFriendReviews(friendId);
    }
  }

  loadFriendProfile(friendId: string) {
    this.friendService.getUserProfile(friendId).subscribe({
      next: (profile) => {
        this.friendProfile = profile;
      },
      error: (err) => {
        console.error('Hiba a barát profiljának lekérdezése közben:', err);
      }
    });
  }

  loadFriendRatedMovies(friendId: string) {
    this.friendService.getUserRatedMovies(friendId).subscribe({
      next: (ratedMovies) => {
        this.friendRatedMovies = ratedMovies;
        this.loadMovieTitlesForRatedMovies();
      },
      error: (err) => {
        console.error('Hiba a barát értékelt filmjeinek lekérdezése közben:', err);
        this.friendRatedMovies = [];
      }
    });
  }

  loadFriendReviews(friendId: string) {
    this.friendService.getUserReviews(friendId).subscribe({
      next: (reviews) => {
        console.log('Lekérdezett vélemények:', reviews);
        this.friendReviews = reviews;
        this.loadMovieTitlesForReviews();
      },
      error: (err) => {
        console.error('Hiba a barát véleményeinek lekérdezése közben (részletek):', err);
        this.friendReviews = [];
      }
    });
  }

  loadMovieTitlesForRatedMovies() {
    const movieObservables = this.friendRatedMovies.map(ratedMovie =>
      this.friendService.getMovieDetails(ratedMovie.movieId).pipe(
        map(movie => ({
          movieId: ratedMovie.movieId,
          rating: ratedMovie.rating,
          movieTitle: movie.title,
          posterPath: movie.poster_path,
          releaseDate: movie.release_date
        } as RatedMovieWithTitle)),
        catchError(err => {
          console.error(`Hiba a film lekérdezése közben (${ratedMovie.movieId}):`, err);
          return of({
            movieId: ratedMovie.movieId,
            rating: ratedMovie.rating,
            movieTitle: 'Ismeretlen film',
            posterPath: '',
            releaseDate: ''
          } as RatedMovieWithTitle);
        })
      )
    );

    forkJoin(movieObservables).subscribe({
      next: (ratedMoviesWithTitles) => {
        this.friendRatedMovies = ratedMoviesWithTitles;
      },
      error: (err) => {
        console.error('Hiba a filmnevek lekérdezése közben (értékelések):', err);
      }
    });
  }

  loadMovieTitlesForReviews() {
    const movieObservables = this.friendReviews.map(review =>
      this.friendService.getMovieDetails(review.movieId!).pipe(
        map(movie => ({
          movieId: review.movieId,
          reviewText: review.reviewText,
          rating: review.rating,
          movieTitle: movie.title,
          posterPath: movie.poster_path,
          releaseDate: movie.release_date
        } as ReviewWithTitle)),
        catchError(err => {
          console.error(`Hiba a film lekérdezése közben (${review.movieId}):`, err);
          return of({
            movieId: review.movieId,
            reviewText: review.reviewText,
            rating: review.rating,
            movieTitle: 'Ismeretlen film',
            posterPath: '',
            releaseDate: ''
          } as ReviewWithTitle);
        })
      )
    );

    forkJoin(movieObservables).subscribe({
      next: (reviewsWithTitles) => {
        this.friendReviews = reviewsWithTitles;
      },
      error: (err) => {
        console.error('Hiba a filmnevek lekérdezése közben (vélemények):', err);
      }
    });
  }
}