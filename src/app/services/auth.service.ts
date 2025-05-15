import { Injectable, NgZone } from '@angular/core';
import { Auth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, authState, User, updatePassword } from '@angular/fire/auth';
import { Firestore, collection, deleteDoc, doc, getDocs, query } from '@angular/fire/firestore';
import { Storage, ref, uploadBytes, getDownloadURL, deleteObject } from '@angular/fire/storage';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject, fromEvent } from 'rxjs';
import { map } from 'rxjs/operators';
import { getFirestore, doc as firebaseDoc, getDoc as firebaseGetDoc, setDoc as firebaseSetDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject = new BehaviorSubject<any>(null);
  currentUser$ = this.currentUserSubject.asObservable();

  private db = getFirestore();
  private authInstance = getAuth();
  private baseUrl = 'https://us-central1-moviemate-27c54.cloudfunctions.net';

  constructor(
    private auth: Auth,
    private firestore: Firestore,
    private storage: Storage,
    private ngZone: NgZone,
    private http: HttpClient
  ) {
    this.auth = this.authInstance;
    // Hitelesítési állapot figyelése
    this.auth.onAuthStateChanged(user => {
      console.log('Auth state changed:', user);
      this.currentUserSubject.next(user);
    });

    // Offline állapot figyelése
    this.monitorNetworkStatus();
  }

  // Hálózati állapot figyelése és kijelentkezés offline esetén
  private monitorNetworkStatus() {
    fromEvent(window, 'offline').subscribe(() => {
      console.log('Kapcsolat megszakadt, kijelentkezés...');
      this.logoutOnDisconnect();
    });

    fromEvent(window, 'online').subscribe(() => {
      console.log('Kapcsolat visszaállt');
      
    });
  }

  // Kijelentkezés kapcsolat megszakadásakor
  private async logoutOnDisconnect() {
    try {
      await signOut(this.auth);
      // Töröljük a helyi tárolót
      localStorage.removeItem('firebase:authUser'); // Firebase token törlése
      localStorage.removeItem('user'); // Egyéni felhasználói adat törlése
      sessionStorage.clear(); // Session adatok törlése
      console.log('Kijelentkezés sikeres, helyi tároló törölve');
    } catch (error) {
      console.error('Hiba a kijelentkezésnél offline állapotban:', error);
    }
  }

  async getUserData(uid: string): Promise<any> {
    const userRef = firebaseDoc(this.db, `users/${uid}`);
    const userSnap = await firebaseGetDoc(userRef);
    return userSnap.exists() ? userSnap.data() : null;
  }

  async updateUserData(uid: string, data: any): Promise<void> {
    const userRef = firebaseDoc(this.db, `users/${uid}`);
    try {
      const docSnap = await firebaseGetDoc(userRef);
      if (!docSnap.exists()) {
        await firebaseSetDoc(userRef, { uid, email: this.auth.currentUser?.email || '' });
      }
      await firebaseSetDoc(userRef, data, { merge: true });
    } catch (err) {
      console.error('Hiba a felhasználói adatok frissítése közben:', err);
      throw err;
    }
  }

  async deleteProfilePicture(uid: string): Promise<void> {
    try {
      const userData = await this.getUserData(uid);
      const currentProfilePictureUrl = userData?.profilePicture;

      if (currentProfilePictureUrl) {
        const profilePictureRef = ref(this.storage, `profile_pictures/${uid}`);
        await deleteObject(profilePictureRef);
        console.log('Régi profilkép törölve a Storage-ból:', currentProfilePictureUrl);
      }
    } catch (err: any) {
      console.warn('Nem sikerült törölni a régi profilképet (lehet, hogy nem létezik):', err);
    }
  }

  async uploadProfilePicture(file: File, uid: string): Promise<string> {
    await this.deleteProfilePicture(uid);
    const filePath = `profile_pictures/${uid}`;
    const storageRef = ref(this.storage, filePath);
    try {
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);
      return downloadURL;
    } catch (err) {
      console.error('Hiba a profilkép feltöltése közben:', err);
      throw err;
    }
  }

  getCurrentUser(): Observable<any> {
    return authState(this.auth).pipe(
      map(user => {
        console.log('getCurrentUser() - authState user:', user);
        return user ? { uid: user.uid, email: user.email } : null;
      })
    );
  }

  async register(email: string, password: string, username: string): Promise<User> {
    try {
      console.log('Regisztráció kezdete:', { email, username });
      console.log('Email és felhasználónév ellenőrzés Cloud Function hívással...');
      console.log('Küldött kérés törzse:', { email, username });
      const checkResult: any = await this.http.post(
        `${this.baseUrl}/checkEmailAndUsername`,
        { email, username },
        { headers: { 'Content-Type': 'application/json' } }
      ).toPromise();
      console.log('Email és felhasználónév ellenőrzés eredménye:', checkResult);

      if (!checkResult.success) {
        throw new Error(checkResult.message || 'Email vagy felhasználónév ellenőrzési hiba.');
      }

      console.log('Felhasználó létrehozása...');
      const userCredential = await createUserWithEmailAndPassword(this.auth, email, password);
      const user = userCredential.user;
      console.log('Felhasználó létrehozva:', user);

      console.log('Várakozás a hitelesítési állapot frissülésére...');
      await new Promise<void>((resolve, reject) => {
        const unsubscribe = this.auth.onAuthStateChanged(async (currentUser) => {
          if (currentUser && currentUser.uid === user.uid) {
            console.log('Hitelesítési állapot frissült:', currentUser);
            try {
              const tokenResult = await currentUser.getIdTokenResult(true);
              console.log('Hitelesítési token frissítve:', tokenResult.token);
              unsubscribe();
              resolve();
            } catch (error) {
              console.error('Hiba a token frissítése közben:', error);
              unsubscribe();
              reject(error);
            }
          }
        }, (error) => {
          console.error('Hiba a hitelesítési állapot figyelése közben:', error);
          unsubscribe();
          reject(error);
        });
      });

      const currentUser = this.auth.currentUser;
      if (!currentUser) {
        throw new Error('A hitelesítési állapot nem frissült megfelelően.');
      }
      console.log('Hitelesítési állapot ellenőrizve, currentUser:', currentUser);

      console.log('Firestore műveletek hívása a Cloud Functionön keresztül...');
      console.log('Küldött kérés törzse:', { email, username, uid: user.uid });
      const result: any = await this.http.post(
        `${this.baseUrl}/registerUser`,
        { email, username, uid: user.uid },
        { headers: { 'Content-Type': 'application/json' } }
      ).toPromise();
      console.log('Cloud Function eredménye:', result);

      if (!result.success) {
        throw new Error(result.message || 'Firestore regisztrációs hiba.');
      }

      console.log('Regisztráció sikeres:', user);
      return user;
    } catch (error: any) {
      console.error('Regisztrációs hiba:', error);
      if (error.status === 400 && error.error && error.error.message) {
        throw new Error(error.error.message);
      }
      throw new Error(error.message || 'Regisztrációs hiba történt.');
    }
  }

  async login(email: string, password: string): Promise<User> {
    try {
      const userCredential = await signInWithEmailAndPassword(this.auth, email, password);
      return userCredential.user;
    } catch (error) {
      console.error('Bejelentkezési hiba:', error);
      throw error;
    }
  }

  async logout(): Promise<void> {
    try {
      await signOut(this.auth);
      // Töröljük a Firebase és egyéni adatokat a helyi tárolóból
      localStorage.removeItem('firebase:authUser');
      localStorage.removeItem('user');
      sessionStorage.clear();
      console.log('Kijelentkezés sikeres, helyi tároló törölve');
    } catch (error) {
      console.error('Kijelentkezési hiba:', error);
      throw error;
    }
  }

  async updatePassword(newPassword: string): Promise<void> {
    try {
      const user = this.auth.currentUser;
      if (!user) {
        throw new Error('Nincs bejelentkezett felhasználó.');
      }
      await updatePassword(user, newPassword);
    } catch (error) {
      console.error('Hiba a jelszó módosításakor:', error);
      throw error;
    }
  }

  async addToWatchlist(uid: string, movie: any): Promise<void> {
    try {
      const movieDocRef = firebaseDoc(this.db, `users/${uid}/watchlist/${movie.id}`);
      await firebaseSetDoc(movieDocRef, {
        movieId: movie.id.toString(),
        title: movie.title,
        poster_path: movie.poster_path,
        release_date: movie.release_date || movie.first_air_date || null,
        addedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Hiba a watchlisthez adás közben:', error);
      throw error;
    }
  }

  async removeFromWatchlist(uid: string, movieId: string): Promise<void> {
    try {
      const movieDocRef = firebaseDoc(this.db, `users/${uid}/watchlist/${movieId}`);
      await deleteDoc(movieDocRef);
    } catch (error) {
      console.error('Hiba a watchlistből való eltávolítás közben:', error);
      throw error;
    }
  }

  async getWatchlist(uid: string): Promise<any[]> {
    try {
      const watchlistRef = collection(this.firestore, `users/${uid}/watchlist`);
      const watchlistSnapshot = await getDocs(query(watchlistRef));
      return watchlistSnapshot.docs.map(doc => doc.data());
    } catch (error) {
      console.error('Hiba a watchlist lekérdezése közben:', error);
      return [];
    }
  }

  async addToFavorites(uid: string, movie: any): Promise<void> {
    try {
      const movieDocRef = firebaseDoc(this.db, `users/${uid}/favorites/${movie.id}`);
      await firebaseSetDoc(movieDocRef, {
        movieId: movie.id.toString(),
        title: movie.title,
        poster_path: movie.poster_path,
        release_date: movie.release_date || movie.first_air_date || null,
        addedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Hiba a kedvencekhez adás közben:', error);
      throw error;
    }
  }

  async removeFromFavorites(uid: string, movieId: string): Promise<void> {
    try {
      const movieDocRef = firebaseDoc(this.db, `users/${uid}/favorites/${movieId}`);
      await deleteDoc(movieDocRef);
    } catch (error) {
      console.error('Hiba a kedvencekből való eltávolítás közben:', error);
      throw error;
    }
  }

  async getFavorites(uid: string): Promise<any[]> {
    try {
      const favoritesRef = collection(this.firestore, `users/${uid}/favorites`);
      const favoritesSnapshot = await getDocs(query(favoritesRef));
      return favoritesSnapshot.docs.map(doc => doc.data());
    } catch (error) {
      console.error('Hiba a kedvencek lekérdezése közben:', error);
      return [];
    }
  }
}