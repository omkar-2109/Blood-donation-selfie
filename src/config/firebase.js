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
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject
} from 'firebase/storage';

const firebaseConfig = {
  apiKey: 'AIzaSyBm3_OPgmssdMIXqEJhjnB8QFx5m9nRUMY',
  authDomain: 'blood-donation-721cc.firebaseapp.com',
  projectId: 'blood-donation-721cc',
  storageBucket: 'blood-donation-721cc.firebasestorage.app',
  messagingSenderId: '1050635707575',
  appId: '1:1050635707575:web:48148905d099e432181932',
  measurementId: 'G-7MGH4CXKSN'
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);

const SUBMISSIONS_COLLECTION = 'submissions';

/**
 * Uploads framed image to Firebase Cloud Storage and saves metadata in Firestore.
 */
export async function saveSubmissionToFirebase({ details, frameId, mirror, imageBlob }) {
  try {
    const id = crypto.randomUUID();
    const storagePath = `submissions/${id}.png`;
    const imageRef = ref(storage, storagePath);

    // 1. Upload image to Firebase Storage
    let imageUrl = '';
    try {
      const uploadResult = await uploadBytes(imageRef, imageBlob, {
        contentType: 'image/png',
        customMetadata: {
          participantName: details.fullName || '',
          branch: details.branch || ''
        }
      });
      imageUrl = await getDownloadURL(uploadResult.ref);
    } catch (storageErr) {
      console.warn('Firebase Storage upload warning:', storageErr);
      // Fallback: create base64 preview URL if storage fails
      imageUrl = URL.createObjectURL(imageBlob);
    }

    // 2. Save document to Firestore
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
      storagePath,
      status: 'Verified'
    };

    const docRef = await addDoc(collection(db, SUBMISSIONS_COLLECTION), record);
    return { ...record, firestoreId: docRef.id };
  } catch (err) {
    console.error('Firebase save error:', err);
    throw err;
  }
}

/**
 * Fetches all submissions from Firestore ordered by createdAt descending.
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
    console.warn('Firestore read error, falling back to all docs without order:', err);
    try {
      const snapshot = await getDocs(collection(db, SUBMISSIONS_COLLECTION));
      const submissions = [];
      snapshot.forEach((d) => {
        submissions.push({ firestoreId: d.id, ...d.data() });
      });
      return submissions.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    } catch (fallbackErr) {
      console.error('Firestore get error:', fallbackErr);
      return [];
    }
  }
}

/**
 * Deletes a submission from Firestore and its image from Firebase Storage.
 */
export async function deleteSubmissionFromFirebase(id, firestoreId, storagePath) {
  try {
    // 1. Delete image from Storage if path exists
    if (storagePath) {
      try {
        const imageRef = ref(storage, storagePath);
        await deleteObject(imageRef);
      } catch (err) {
        console.warn('Storage delete warning:', err);
      }
    }

    // 2. Delete document from Firestore
    if (firestoreId) {
      await deleteDoc(doc(db, SUBMISSIONS_COLLECTION, firestoreId));
    }
    return true;
  } catch (err) {
    console.error('Firebase delete error:', err);
    return false;
  }
}
