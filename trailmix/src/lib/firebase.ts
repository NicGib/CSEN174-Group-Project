import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
<<<<<<< HEAD
import { getFirestore, doc, setDoc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
=======
>>>>>>> main
import Constants from "expo-constants";

const config = (Constants.expoConfig?.extra as any)?.firebase;
if (!config) throw new Error("Missing extra.firebase in app.json");

const app = getApps().length ? getApps()[0] : initializeApp(config);
export const auth = getAuth(app);
<<<<<<< HEAD
export const db = getFirestore(app);

// User profile interface
export interface UserProfile {
  uid: string;
  email: string;
  name: string;
  username: string;
  createdAt: any;
  lastLoginAt: any;
}

// Create or update user profile
export const createUserProfile = async (user: any, additionalData: { name: string; username: string }) => {
  if (!user) return;

  const userRef = doc(db, 'users', user.uid);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    const { name, username } = additionalData;
    const createdAt = serverTimestamp();
    const lastLoginAt = serverTimestamp();

    try {
      await setDoc(userRef, {
        uid: user.uid,
        email: user.email,
        name,
        username,
        createdAt,
        lastLoginAt
      });
      console.log('User profile created successfully');
    } catch (error) {
      console.error('Error creating user profile:', error);
      throw error;
    }
  } else {
    // Update last login time for existing user
    try {
      await updateDoc(userRef, {
        lastLoginAt: serverTimestamp()
      });
      console.log('User profile updated with last login time');
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  }
};

// Update last login time
export const updateLastLogin = async (user: any) => {
  if (!user) return;

  const userRef = doc(db, 'users', user.uid);
  try {
    await updateDoc(userRef, {
      lastLoginAt: serverTimestamp()
    });
    console.log('Last login time updated successfully');
  } catch (error) {
    console.error('Error updating last login time:', error);
    // Don't throw error here as it's not critical for login
  }
};

// Get user profile
export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  try {
    const userRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      return userSnap.data() as UserProfile;
    } else {
      console.log('No such user profile!');
      return null;
    }
  } catch (error) {
    console.error('Error getting user profile:', error);
    return null;
  }
};
=======
>>>>>>> main
