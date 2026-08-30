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
 * Compresses the framed image into a compact JPEG data URL (~80-150KB)
 * so it fits safely within Firestore's strict 1 MiB document size limit.
 */
function compressImageForFirestore(blob, maxWidth = 800, quality = 0.75) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(blob);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxWidth / img.width);
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);

      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      const dataUrl = canvas.toDataURL('image/jpeg', quality);
      resolve(dataUrl);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Image compression failed'));
    };
    img.src = url;
  });
}

/**
 * Saves visitor registration and framed selfie directly into Firestore.
 * 100% free on Firebase Spark plan (NO credit card or plan upgrade needed).
 */
export async function saveSubmissionToFirebase({ details, frameId, mirror, imageBlob }) {
  try {
    const id = crypto.randomUUID();

    // Compress image to ensure payload is < 200KB (well under Firestore's 1MB limit)
    let imageUrl = '';
    if (imageBlob) {
      try {
        imageUrl = await compressImageForFirestore(imageBlob, 760, 0.72);
      } catch {
        // Fallback
        imageUrl = '';
      }
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
