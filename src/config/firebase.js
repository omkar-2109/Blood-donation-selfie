import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  query,
  orderBy
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyBm3_OPgmssdMIXqEJhjnB8QFx5m9nRUMY',
  authDomain: 'blood-donation-721cc.firebaseapp.com',
  projectId: 'blood-donation-721cc',
  storageBucket: 'blood-donation-721cc.firebasestorage.app',
  messagingSenderId: '1050635707575',
  appId: '1:1050635707575:web:48148905d099e432181932',
  measurementId: 'G-7MGH4CXKSN'
};

// Initialize Firebase App & Firestore
export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

const SUBMISSIONS_COLLECTION = 'submissions';

/**
 * Converts a Blob to a base64 Data URL so it can be stored directly
 * in Firestore without requiring Firebase Cloud Storage or a paid plan.
 */
function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Saves visitor registration and framed selfie directly into Firestore.
 * 100% free on Firebase Spark plan (NO credit card or plan upgrade needed).
 */
export async function saveSubmissionToFirebase({ details, frameId, mirror, imageBlob }) {
  try {
    const id = crypto.randomUUID();

    // Convert framed photo to Data URL
    let imageUrl = '';
    if (imageBlob) {
      imageUrl = await blobToBase64(imageBlob);
    }

    // Save document in Firestore
    const record = {
      id,
      createdAt: new Date().toISOString(),
      details: {
        fullName: details.fullName || '',
        formattedName: details.formattedName || '',
        age: String(details.age || ''),
        gender: details.gender || 'Not specified',
        branch: details.branch || '',
        customBranch: details.customBranch || '',
        whatsappNumber: details.whatsappNumber || ''
      },
      frameId: frameId || '',
      mirror: Boolean(mirror),
      imageUrl,
      status: 'Verified'
    };

    const docRef = await addDoc(collection(db, SUBMISSIONS_COLLECTION), record);
    return { ...record, firestoreId: docRef.id };
  } catch (err) {
    console.error('Firebase Firestore save error:', err);
    throw err;
  }
}

/**
 * Fetches all submissions from Firestore.
 */
export async function getSubmissionsFromFirebase() {
  try {
    const q = query(collection(db, SUBMISSIONS_COLLECTION), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    const submissions = [];
    snapshot.forEach((d) => {
      submissions.push({ firestoreId: d.id, ...d.data() });
    });
    return submissions;
  } catch (err) {
    console.warn('Firestore ordered query failed, trying standard fetch:', err);
    try {
      const snapshot = await getDocs(collection(db, SUBMISSIONS_COLLECTION));
      const submissions = [];
      snapshot.forEach((d) => {
        submissions.push({ firestoreId: d.id, ...d.data() });
      });
      return submissions.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
    } catch (fallbackErr) {
      console.error('Firestore get error:', fallbackErr);
      return [];
    }
  }
}

/**
 * Deletes a submission from Firestore.
 */
export async function deleteSubmissionFromFirebase(id, firestoreId) {
  try {
    if (firestoreId) {
      await deleteDoc(doc(db, SUBMISSIONS_COLLECTION, firestoreId));
    }
    return true;
  } catch (err) {
    console.error('Firebase delete error:', err);
    return false;
  }
}
