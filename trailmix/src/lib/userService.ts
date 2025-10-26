import { 
  doc, 
  setDoc, 
  updateDoc, 
  getDoc, 
  getDocs,
  collection,
  query,
  where,
  serverTimestamp,
  Timestamp 
} from "firebase/firestore";
import { db } from "./firebase";
import { User } from "firebase/auth";

export interface UserProfile {
  uid: string;
  email: string;
  name: string;
  username: string;
  createdAt: Timestamp;
  lastLoginAt: Timestamp;
  isActive: boolean;
  profilePicture?: string;
  bio?: string;
  hikingLevel?: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  favoriteTrails?: string[];
  totalHikes?: number;
  totalDistance?: number;
  achievements?: string[];
}

/**
 * Create a new user profile in Firestore
 */
export const createUserProfile = async (
  user: User, 
  additionalData: { name: string; username: string }
): Promise<void> => {
  try {
    const userRef = doc(db, 'users', user.uid);
    const userProfile: UserProfile = {
      uid: user.uid,
      email: user.email || '',
      name: additionalData.name,
      username: additionalData.username,
      createdAt: serverTimestamp() as Timestamp,
      lastLoginAt: serverTimestamp() as Timestamp,
      isActive: true,
      totalHikes: 0,
      totalDistance: 0,
      achievements: [],
      favoriteTrails: []
    };

    await setDoc(userRef, userProfile);
    console.log('User profile created successfully:', user.uid);
  } catch (error) {
    console.error('Error creating user profile:', error);
    throw error;
  }
};

/**
 * Update user's last login time
 */
export const updateLastLogin = async (uid: string): Promise<void> => {
  try {
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, {
      lastLoginAt: serverTimestamp(),
      isActive: true
    });
    console.log('Last login updated for user:', uid);
  } catch (error) {
    console.error('Error updating last login:', error);
    throw error;
  }
};

/**
 * Get user profile from Firestore
 */
export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  try {
    const userRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      return userSnap.data() as UserProfile;
    } else {
      console.log('No user profile found for:', uid);
      return null;
    }
  } catch (error) {
    console.error('Error getting user profile:', error);
    throw error;
  }
};

/**
 * Update user profile
 */
export const updateUserProfile = async (
  uid: string, 
  updates: Partial<Omit<UserProfile, 'uid' | 'createdAt'>>
): Promise<void> => {
  try {
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, {
      ...updates,
      lastLoginAt: serverTimestamp()
    });
    console.log('User profile updated for:', uid);
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw error;
  }
};

/**
 * Check if username is available
 */
export const isUsernameAvailable = async (username: string): Promise<boolean> => {
  try {
    // Note: This is a simple check. In production, you might want to use
    // a more efficient approach with a separate usernames collection
    // or use Firestore security rules to enforce uniqueness
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('username', '==', username));
    const querySnapshot = await getDocs(q);
    return querySnapshot.empty;
  } catch (error) {
    console.error('Error checking username availability:', error);
    return false;
  }
};
