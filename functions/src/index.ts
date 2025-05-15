import { onRequest } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import cors from 'cors';

admin.initializeApp();

// Opciók a Cloud Functionhöz (pl. régió és időtúllépés beállítása)
const functionOptions = {
  region: 'us-central1',
  timeoutSeconds: 120, // Időtúllépés növelése 120 másodpercre (opcionális)
};

// CORS middleware
const corsHandler = cors({ origin: true }); // Engedélyezzük az összes eredetet

// checkEmailAndUsername Cloud Function
export const checkEmailAndUsername = onRequest(
  functionOptions,
  (req, res) => {
    console.log('checkEmailAndUsername függvény meghívva');
    console.log('Kérés fejlécei:', req.headers);
    console.log('Kérés metódusa:', req.method);
    console.log('Bejövő kérés törzse (nyers):', req.body);

    // CORS middleware
    corsHandler(req, res, () => {
      // Csak POST kéréseket fogadunk
      if (req.method !== 'POST') {
        console.log('Nem POST kérés, elutasítva:', req.method);
        res.status(405).send('Method Not Allowed');
        return;
      }

      // Ellenőrizzük, hogy a Content-Type application/json
      if (req.headers['content-type'] !== 'application/json') {
        console.log('Hibás Content-Type fejléc:', req.headers['content-type']);
        res.status(400).send('Content-Type must be application/json');
        return;
      }

      // A req.body automatikusan parse-olva van az onRequest által
      const { email, username } = req.body;

      console.log('Parse-olt email és username:', { email, username });

      if (!email || !username) {
        console.log('Hiányzó email vagy username:', { email, username });
        res.status(400).send('Email and username are required');
        return;
      }

      // Email ellenőrzése
      admin.firestore().collection('emails').doc(email).get()
        .then(emailDoc => {
          if (emailDoc.exists) {
            console.log('Email már létezik:', email);
            res.status(400).json({ success: false, message: 'Ez az email cím már használatban van!' });
            return;
          }

          // Felhasználónév ellenőrzése
          admin.firestore().collection('usernames').doc(username).get()
            .then(usernameDoc => {
              if (usernameDoc.exists) {
                console.log('Felhasználónév már létezik:', username);
                res.status(400).json({ success: false, message: 'Ez a felhasználónév már használatban van!' });
                return;
              }

              console.log('Email és felhasználónév elérhető:', { email, username });
              res.status(200).json({ success: true, message: 'Email és felhasználónév elérhető.' });
            })
            .catch(error => {
              console.error('Hiba a felhasználónév ellenőrzése közben:', error);
              res.status(500).json({ success: false, message: 'Hiba az email és felhasználónév ellenőrzése közben: ' + error.message });
            });
        })
        .catch(error => {
          console.error('Hiba az email ellenőrzése közben:', error);
          res.status(500).json({ success: false, message: 'Hiba az email és felhasználónév ellenőrzése közben: ' + error.message });
        });
    });
  }
);

// registerUser Cloud Function
export const registerUser = onRequest(
  functionOptions,
  (req, res) => {
    console.log('registerUser függvény meghívva');
    console.log('Kérés fejlécei:', req.headers);
    console.log('Kérés metódusa:', req.method);
    console.log('Bejövő kérés törzse (nyers):', req.body);

    // CORS middleware
    corsHandler(req, res, () => {
      // Csak POST kéréseket fogadunk
      if (req.method !== 'POST') {
        console.log('Nem POST kérés, elutasítva:', req.method);
        res.status(405).send('Method Not Allowed');
        return;
      }

      // Ellenőrizzük, hogy a Content-Type application/json
      if (req.headers['content-type'] !== 'application/json') {
        console.log('Hibás Content-Type fejléc:', req.headers['content-type']);
        res.status(400).send('Content-Type must be application/json');
        return;
      }

      const { email, username, uid } = req.body;

      console.log('Parse-olt email, username és uid:', { email, username, uid });

      if (!email || !username || !uid) {
        console.log('Hiányzó email, username vagy uid:', { email, username, uid });
        res.status(400).send('Email, username, and uid are required');
        return;
      }

      // Felhasználói adatok mentése a Firestore-ba
      admin.firestore().collection('users').doc(uid).set({
        uid: uid,
        email: email,
        username: username,
        profilePicture: null,
        createdAt: new Date().toISOString(),
      })
        .then(() => {
          // Email és username mentése az egyediség ellenőrzéséhez
          Promise.all([
            admin.firestore().collection('emails').doc(email).set({ userId: uid }),
            admin.firestore().collection('usernames').doc(username).set({ userId: uid }),
          ])
            .then(() => {
              console.log('Felhasználó sikeresen regisztrálva:', { email, username, uid });
              res.status(200).json({ success: true, message: 'Felhasználó sikeresen regisztrálva a Firestore-ban.' });
            })
            .catch(error => {
              console.error('Hiba az email és username mentése közben:', error);
              res.status(500).json({ success: false, message: 'Hiba a regisztráció során: ' + error.message });
            });
        })
        .catch(error => {
          console.error('Hiba a felhasználói adatok mentése közben:', error);
          res.status(500).json({ success: false, message: 'Hiba a regisztráció során: ' + error.message });
        });
    });
  }
);