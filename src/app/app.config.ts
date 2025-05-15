import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { appRoutes } from './app.routes';
import { provideFirebaseApp, initializeApp } from '@angular/fire/app';
import { provideAuth, getAuth } from '@angular/fire/auth';
import { provideFirestore, getFirestore } from '@angular/fire/firestore';
import { provideStorage, getStorage } from '@angular/fire/storage';
import { provideHttpClient } from '@angular/common/http';
import { provideToastr } from 'ngx-toastr';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideRouter, withComponentInputBinding, withRouterConfig } from '@angular/router';


const firebaseConfig = {
  apiKey: "AIzaSyB6snCLjH_CqSGe7vHM013uGw0sAI3-IMo",
  authDomain: "moviemate-27c54.firebaseapp.com",
  projectId: "moviemate-27c54",
  storageBucket: "moviemate-27c54.firebasestorage.app",
  messagingSenderId: "971999321203",
  appId: "1:971999321203:web:8b204cafd8b4fe57bade06"
};

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }), // Hozzáadva a provideZoneChangeDetection
    provideRouter(appRoutes),
    provideFirebaseApp(() => initializeApp(firebaseConfig)),
    provideAuth(() => getAuth()),
    provideFirestore(() => getFirestore()),
    provideStorage(() => getStorage()), // Hozzáadva a provideStorage
    provideHttpClient(),
    provideToastr({
      timeOut: 3000, // 3 másodpercig látható
      positionClass: 'toast-top-right', // Jobb felső sarokban jelenik meg
      preventDuplicates: true, // Ne jelenjen meg ugyanaz az üzenet többször
      progressBar: true, // Haladási sáv
      closeButton: true // Bezáró gomb
    }),
    provideAnimations(),
  ]
};