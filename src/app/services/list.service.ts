import { Injectable } from '@angular/core';
import { Firestore, collection, doc, setDoc, getDocs, deleteDoc, updateDoc, query, where, getDoc } from '@angular/fire/firestore';
import { Observable, from, of, forkJoin } from 'rxjs';
import { map, switchMap, catchError } from 'rxjs/operators';

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

@Injectable({
  providedIn: 'root'
})
export class ListService {
  constructor(private firestore: Firestore) {}

  // Lista létrehozása
  createList(userId: string, listName: string): Observable<void> {
    const listsRef = collection(this.firestore, `users/${userId}/lists`);
    const listId = listName.toLowerCase().replace(/\s+/g, '-'); // pl. "2025" → "2025"
    const listDocRef = doc(listsRef, listId);

    const listData = {
      name: listName,
      isDefault: false,
      createdAt: new Date().toISOString()
    };

    // Ellenőrizzük, hogy a lista neve egyedi-e
    return this.getLists(userId).pipe(
      switchMap(lists => {
        if (lists.some(list => list.name.toLowerCase() === listName.toLowerCase())) {
          throw new Error('Már létezik ilyen nevű lista.');
        }
        return from(setDoc(listDocRef, listData)).pipe(map(() => void 0));
      })
    );
  }

  // Lista átnevezése
  renameList(userId: string, listId: string, newName: string): Observable<void> {
    const listDocRef = doc(this.firestore, `users/${userId}/lists/${listId}`);
    return this.getLists(userId).pipe(
      switchMap(lists => {
        if (lists.some(list => list.name.toLowerCase() === newName.toLowerCase() && list.id !== listId)) {
          throw new Error('Már létezik ilyen nevű lista.');
        }
        return from(updateDoc(listDocRef, { name: newName })).pipe(map(() => void 0));
      })
    );
  }

  // Lista törlése
  deleteList(userId: string, listId: string): Observable<void> {
    const listDocRef = doc(this.firestore, `users/${userId}/lists/${listId}`);
    return from(getDoc(listDocRef)).pipe(
      switchMap(listDoc => {
        if (!listDoc.exists()) {
          throw new Error('A lista nem található.');
        }
        if (listDoc.data()['isDefault']) {
          throw new Error('Az alapértelmezett listák nem törölhetők.');
        }
        return from(deleteDoc(listDocRef)).pipe(map(() => void 0));
      })
    );
  }

  // Összes lista lekérdezése
  getLists(userId: string): Observable<List[]> {
    const listsRef = collection(this.firestore, `users/${userId}/lists`);
    return from(getDocs(listsRef)).pipe(
      map(snapshot => {
        const lists: List[] = snapshot.docs.map(doc => ({
          id: doc.id,
          name: doc.data()['name'],
          isDefault: doc.data()['isDefault'] || false,
          createdAt: doc.data()['createdAt']
        }));
        // Alapértelmezett listák biztosítása, ha nem léteznek
        const defaultLists = [
          { id: 'watchlist', name: 'Watchlist', isDefault: true, createdAt: new Date().toISOString() },
          { id: 'favourites', name: 'Favourites', isDefault: true, createdAt: new Date().toISOString() }
        ];
        const existingListIds = lists.map(list => list.id);
        defaultLists.forEach(defaultList => {
          if (!existingListIds.includes(defaultList.id)) {
            const listDocRef = doc(listsRef, defaultList.id);
            setDoc(listDocRef, defaultList).catch(err => console.error('Hiba az alapértelmezett lista létrehozása közben:', err));
            lists.push(defaultList);
          }
        });
        return lists.sort((a, b) => a.name.localeCompare(b.name));
      })
    );
  }

  // Film hozzáadása egy listához
  addMovieToList(userId: string, listId: string, movieId: string): Observable<void> {
    const movieDocRef = doc(this.firestore, `users/${userId}/lists/${listId}/movies/${movieId}`);
    const movieData = {
      movieId,
      addedAt: new Date().toISOString()
    };
    return from(setDoc(movieDocRef, movieData)).pipe(map(() => void 0));
  }

  // Film eltávolítása egy listáról
  removeMovieFromList(userId: string, listId: string, movieId: string): Observable<void> {
    const movieDocRef = doc(this.firestore, `users/${userId}/lists/${listId}/movies/${movieId}`);
    return from(deleteDoc(movieDocRef)).pipe(map(() => void 0));
  }

  // Lista filmjeinek lekérdezése
  getMoviesInList(userId: string, listId: string): Observable<ListMovie[]> {
    const moviesRef = collection(this.firestore, `users/${userId}/lists/${listId}/movies`);
    return from(getDocs(moviesRef)).pipe(
      map(snapshot => snapshot.docs.map(doc => ({
        movieId: doc.data()['movieId'],
        addedAt: doc.data()['addedAt']
      } as ListMovie)))
    );
  }
}