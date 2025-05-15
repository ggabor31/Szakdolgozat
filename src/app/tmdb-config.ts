import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';

import { appRoutes } from './app.routes';
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';

export const tmdbConfig = {
  apiKey: '2fb0b9bc5e6ad7579ecf2fd38d012797',
  baseUrl: 'https://api.themoviedb.org/3',
  baseImageUrl: 'https://image.tmdb.org/t/p/w200'
};