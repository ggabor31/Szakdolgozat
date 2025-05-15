import { Injectable } from '@angular/core';
import { Firestore, collection, addDoc, query, where, getDocs, doc, getDoc, updateDoc, deleteDoc, collectionGroup, setDoc } from '@angular/fire/firestore';
import { Observable, from, forkJoin, of, throwError } from 'rxjs';
import { map, switchMap, catchError } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';

interface User {
  id: string;
  username?: string;
  email?: string;
  profilePicture?: string;
  bio?: string;
  [key: string]: any;
}

interface Friendship {
  userId1: string;
  userId2: string;
  createdAt: string;
}

interface Friend {
  friendId: string;
  username: string;
}

interface RatedMovie {
  movieId: string;
  rating: number;
  timestamp: string;
}

interface Review {
  userId: string;
  reviewText?: string;
  rating?: number;
  timestamp: string;
  movieId?: string;
}

interface Movie {
  id: string;
  title: string;
  poster_path?: string;
  release_date?: string;
  [key: string]: any;
}

export interface FriendRequest {
  id: string;
  fromUserId: string;
  toUserId: string;
  fromUsername?: string;
  status: string;
  timestamp: string;
}

@Injectable({
  providedIn: 'root'
})
export class FriendService {
  private tmdbApiKey = '2fb0b9bc5e6ad7579ecf2fd38d012797';
  private tmdbBaseUrl = 'https://api.themoviedb.org/3';

  constructor(
    private firestore: Firestore,
    private http: HttpClient
  ) {}

  searchUsers(queryStr: string): Observable<User[]> {
    const usersRef = collection(this.firestore, 'users');
    return from(getDocs(usersRef)).pipe(
      map(snapshot => {
        const allUsers: User[] = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        return allUsers.filter(user =>
          user.username?.toLowerCase().includes(queryStr.toLowerCase()) ?? false
        );
      })
    );
  }

  sendFriendRequest(fromUserId: string, toUserId: string): Observable<void> {
    const friendsRef = collection(this.firestore, 'friends');
    const q1 = query(friendsRef, where('userId1', '==', fromUserId), where('userId2', '==', toUserId));
    const q2 = query(friendsRef, where('userId1', '==', toUserId), where('userId2', '==', fromUserId));

    return forkJoin([
      from(getDocs(q1)),
      from(getDocs(q2))
    ]).pipe(
      switchMap(([snapshot1, snapshot2]) => {
        if (!snapshot1.empty || !snapshot2.empty) {
          return throwError(() => new Error('A felhasználó már a barátod.'));
        }

        const friendRequestRef = collection(this.firestore, 'friend_requests');
        const q = query(
          friendRequestRef,
          where('fromUserId', '==', fromUserId),
          where('toUserId', '==', toUserId),
          where('status', '==', 'pending')
        );

        return from(getDocs(q)).pipe(
          switchMap(snapshot => {
            if (!snapshot.empty) {
              return of(void 0);
            }
            const requestData = {
              fromUserId,
              toUserId,
              status: 'pending',
              timestamp: new Date().toISOString()
            };
            return from(addDoc(friendRequestRef, requestData)).pipe(map(() => void 0));
          })
        );
      })
    );
  }

  getPendingRequests(userId: string): Observable<FriendRequest[]> {
    const requestsRef = collection(this.firestore, 'friend_requests');
    const q = query(requestsRef, where('toUserId', '==', userId), where('status', '==', 'pending'));
    return from(getDocs(q)).pipe(
      map(snapshot => snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FriendRequest))),
      switchMap(requests => {
        if (requests.length === 0) {
          return of([] as FriendRequest[]);
        }
        const userRequests = requests.map(request => {
          const fromUserDocRef = doc(this.firestore, `users/${request.fromUserId}`);
          return from(getDoc(fromUserDocRef)).pipe(
            map(userDoc => ({
              ...request,
              fromUsername: userDoc.exists() ? userDoc.data()['username'] : 'Ismeretlen felhasználó'
            }))
          );
        });
        return forkJoin(userRequests);
      })
    );
  }

  acceptFriendRequest(requestId: string, fromUserId: string, toUserId: string): Observable<void> {
    const requestRef = doc(this.firestore, `friend_requests/${requestId}`);
    return from(updateDoc(requestRef, { status: 'accepted' })).pipe(
      switchMap(() => {
        const friendsRef = collection(this.firestore, 'friends');
        const friendshipId = fromUserId < toUserId ? `${fromUserId}_${toUserId}` : `${toUserId}_${fromUserId}`;
        const friendshipDocRef = doc(friendsRef, friendshipId);
        const friendshipData = {
          userId1: fromUserId < toUserId ? fromUserId : toUserId,
          userId2: fromUserId < toUserId ? toUserId : fromUserId,
          createdAt: new Date().toISOString()
        };
        return from(setDoc(friendshipDocRef, friendshipData)).pipe(
          map(() => void 0),
          catchError(err => throwError(() => new Error('Nem sikerült létrehozni a barátságot: ' + err.message)))
        );
      }),
      catchError(err => throwError(() => new Error('Nem sikerült elfogadni a barátkérést: ' + err.message)))
    );
  }

  rejectFriendRequest(requestId: string): Observable<void> {
    const requestRef = doc(this.firestore, `friend_requests/${requestId}`);
    return from(updateDoc(requestRef, { status: 'rejected' })).pipe(map(() => void 0));
  }

  removeFriend(fromUserId: string, toUserId: string): Observable<void> {
    const friendsRef = collection(this.firestore, 'friends');
    const friendshipId = fromUserId < toUserId ? `${fromUserId}_${toUserId}` : `${toUserId}_${fromUserId}`;
    const friendshipDocRef = doc(friendsRef, friendshipId);
    return from(deleteDoc(friendshipDocRef)).pipe(
      map(() => void 0),
      catchError(err => throwError(() => new Error('Hiba a barátság törlése közben: ' + err.message)))
    );
  }

  getFriends(userId: string): Observable<Friend[]> {
    const friendsRef = collection(this.firestore, 'friends');
    const q1 = query(friendsRef, where('userId1', '==', userId));
    const q2 = query(friendsRef, where('userId2', '==', userId));

    return forkJoin([
      from(getDocs(q1)),
      from(getDocs(q2))
    ]).pipe(
      map(([snapshot1, snapshot2]) => {
        const friendships: Friendship[] = [
          ...snapshot1.docs.map(doc => doc.data() as Friendship),
          ...snapshot2.docs.map(doc => doc.data() as Friendship)
        ];
        const friendIds = friendships.map(friendship =>
          friendship.userId1 === userId ? friendship.userId2 : friendship.userId1
        );
        return friendIds;
      }),
      switchMap(friendIds => {
        if (friendIds.length === 0) {
          return of([] as Friend[]);
        }
        const friendObservables = friendIds.map(friendId => {
          const userRef = doc(this.firestore, `users/${friendId}`);
          return from(getDoc(userRef)).pipe(
            map(userDoc => ({
              friendId,
              username: userDoc.exists() ? userDoc.data()['username'] : 'Ismeretlen felhasználó'
            } as Friend))
          );
        });
        return forkJoin(friendObservables);
      })
    );
  }

  getUserProfile(userId: string): Observable<User> {
    const userRef = doc(this.firestore, `users/${userId}`);
    return from(getDoc(userRef)).pipe(
      map(userDoc => {
        if (!userDoc.exists()) {
          throw new Error('A felhasználó nem található');
        }
        return { id: userId, ...userDoc.data() } as User;
      })
    );
  }

  getUserRatedMovies(userId: string): Observable<RatedMovie[]> {
    const ratedMoviesRef = collection(this.firestore, `users/${userId}/ratedMovies`);
    return from(getDocs(ratedMoviesRef)).pipe(
      map(snapshot => {
        return snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            movieId: data['movieId'] as string,
            rating: data['rating'] as number,
            timestamp: data['timestamp'] as string
          } as RatedMovie;
        });
      })
    );
  }

  getUserReviews(userId: string): Observable<Review[]> {
    const reviewsQuery = query(
      collectionGroup(this.firestore, 'reviews'),
      where('userId', '==', userId)
    );
    return from(getDocs(reviewsQuery)).pipe(
      map(snapshot => snapshot.docs.map(doc => {
        const reviewData = doc.data();
        const movieId = doc.ref.parent.parent?.id;
        return {
          userId: reviewData['userId'] as string,
          reviewText: reviewData['comment'] as string,
          rating: reviewData['rating'] as number,
          timestamp: reviewData['createdAt'] as string,
          movieId
        } as Review;
      }))
    );
  }

  getMovieDetails(movieId: string): Observable<Movie> {
    const movieRef = doc(this.firestore, `movies/${movieId}`);
    return from(getDoc(movieRef)).pipe(
      switchMap(movieDoc => {
        if (movieDoc.exists()) {
          return of({ id: movieId, ...movieDoc.data() } as Movie);
        }
        return this.fetchMovieFromTMDB(movieId).pipe(
          switchMap(tmdbMovie => {
            const movieData = {
              id: movieId,
              title: tmdbMovie.title,
              release_date: tmdbMovie.release_date,
              poster_path: tmdbMovie.poster_path,
              overview: tmdbMovie.overview
            };
            return from(setDoc(movieRef, movieData)).pipe(
              map(() => movieData as Movie)
            );
          }),
          catchError(err => {
            console.error(`Hiba a TMDB API lekérdezés közben (${movieId}):`, err);
            return of({ id: movieId, title: 'Ismeretlen film' } as Movie);
          })
        );
      }),
      catchError(err => {
        console.error(`Hiba a film lekérdezése közben (${movieId}):`, err);
        return of({ id: movieId, title: 'Ismeretlen film' } as Movie);
      })
    );
  }

  private fetchMovieFromTMDB(movieId: string): Observable<any> {
    const url = `${this.tmdbBaseUrl}/movie/${movieId}?api_key=${this.tmdbApiKey}`;
    return this.http.get(url);
  }
}