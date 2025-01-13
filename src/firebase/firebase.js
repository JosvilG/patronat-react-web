import log from 'loglevel'
import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID,
}

log.info('Inicializando la aplicación de Firebase...')
const app = initializeApp(firebaseConfig)
log.info('Firebase ha sido inicializado correctamente.')

const auth = getAuth(app)
const db = getFirestore(app)
const storage = getStorage(app)

log.info('Servicios de autenticación, Firestore y Storage inicializados.')

export { auth, db, storage }
