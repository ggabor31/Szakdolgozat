import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { tmdbConfig } from '../tmdb-config';

@Injectable({
  providedIn: 'root'
})
export class MovieService {
  private apiKey = tmdbConfig.apiKey;
  private baseUrl = tmdbConfig.baseUrl;
  private baseImageUrl = tmdbConfig.baseImageUrl;

  constructor(private http: HttpClient) { }

  // Népszerű filmek lekérdezése
  getPopularMovies(): Observable<any> {
    const url = `${this.baseUrl}/movie/popular?api_key=${this.apiKey}&language=hu-HU&page=1`;
    return this.http.get(url);
  }
  // Legjobbra értékelt filmek lekérdezése
  getTopRatedMovies(): Observable<any> {
    const url = `${this.baseUrl}/movie/top_rated?api_key=${this.apiKey}&language=hu-HU&page=1`;
    return this.http.get(url);
  }
  // Legújabb filmek lekérdezése
  getLatestMovies(): Observable<any> {
    const url = `${this.baseUrl}/movie/now_playing?api_key=${this.apiKey}&language=hu-HU&page=1`;
    return this.http.get(url);
  }
  getMovies(): Observable<any> {
    const url = `${this.baseUrl}/movie/popular?api_key=${this.apiKey}&language=en-US&page=1`;
    return this.http.get(url);
  }
  searchMovies(query: string, page: number = 1): Observable<any> {
    return this.http.get(`${this.baseUrl}/search/movie?api_key=${this.apiKey}&language=hu-HU&query=${encodeURIComponent(query)}&page=${page}`);
  }
  getMovieVideos(movieId: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/movie/${movieId}/videos?api_key=${this.apiKey}&language=en-US`);
  }
  getMovieCredits(movieId: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/movie/${movieId}/credits?api_key=${this.apiKey}&language=hu-HU`);
  }
  getMovieDetails(movieId: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/movie/${movieId}?api_key=${this.apiKey}&language=hu-HU`);
  }
  getSimilarMovies(movieId: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/movie/${movieId}/similar?api_key=${this.apiKey}&language=hu-HU`);
  }
}