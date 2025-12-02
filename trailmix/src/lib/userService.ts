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
import { db, auth } from "./firebase";
import { User } from "firebase/auth";

export type UserStatus = 'user' | 'wayfarer' | 'admin';

export interface HomeAddress {
  street?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  formattedAddress?: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  name: string;
  username: string;
  createdAt: Timestamp;
  lastLoginAt: Timestamp;
  isActive: boolean;
  status?: UserStatus;
  preferredName?: string;
  interests?: string[];
  birthday?: Date | Timestamp;
  profileDescription?: string;
  gender?: string;
  profilePicture?: string;
  bio?: string;
  hikingLevel?: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  homeAddress?: HomeAddress;
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
      status: 'user',
      totalHikes: 0,
      totalDistance: 0,
      achievements: [],
      favoriteTrails: [],
      interests: [],
      profileDescription: ''
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
 * Creates the document if it doesn't exist (for users created via Firebase Auth directly)
 */
export const updateLastLogin = async (uid: string): Promise<void> => {
  try {
    const userRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      // Document exists, update it
      await updateDoc(userRef, {
        lastLoginAt: serverTimestamp(),
        isActive: true
      });
      console.log('Last login updated for user:', uid);
    } else {
      // Document doesn't exist, create a basic profile
      // This can happen if user was created via Firebase Auth directly
      const user = auth.currentUser;
      await setDoc(userRef, {
        uid: uid,
        email: user?.email || '',
        name: user?.displayName || 'Unknown User',
        username: `user_${uid.substring(0, 8)}`,
        createdAt: serverTimestamp(),
        lastLoginAt: serverTimestamp(),
        isActive: true,
        status: 'user',
        totalHikes: 0,
        totalDistance: 0,
        achievements: [],
        favoriteTrails: [],
        interests: [],
        profileDescription: ''
      });
      console.log('User profile created during login for:', uid);
    }
  } catch (error) {
    console.error('Error updating last login:', error);
    // Don't throw - allow login to succeed even if Firestore update fails
    // The backend will handle creating the profile if needed
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
  updates: Partial<Omit<UserProfile, 'uid' | 'createdAt' | 'lastLoginAt' | 'isActive'>>
): Promise<void> => {
  try {
    const userRef = doc(db, 'users', uid);
    
    // Convert updates to Firestore format
    const firestoreUpdates: any = {};
    
    if (updates.name !== undefined) {
      firestoreUpdates.name = updates.name;
    }
    if (updates.username !== undefined) {
      firestoreUpdates.username = updates.username;
    }
    if (updates.preferredName !== undefined) {
      firestoreUpdates.preferredName = updates.preferredName;
    }
    if (updates.interests !== undefined) {
      firestoreUpdates.interests = updates.interests;
    }
    if (updates.birthday !== undefined) {
      // Convert Date to Firestore Timestamp if needed
      if (updates.birthday instanceof Date) {
        firestoreUpdates.birthday = Timestamp.fromDate(updates.birthday);
      } else {
        firestoreUpdates.birthday = updates.birthday;
      }
    }
    if (updates.profileDescription !== undefined) {
      firestoreUpdates.profileDescription = updates.profileDescription;
    }
    if (updates.gender !== undefined) {
      firestoreUpdates.gender = updates.gender;
    }
    if (updates.bio !== undefined) {
      firestoreUpdates.bio = updates.bio;
    }
    if (updates.profilePicture !== undefined) {
      firestoreUpdates.profilePicture = updates.profilePicture;
    }
    if (updates.hikingLevel !== undefined) {
      firestoreUpdates.hikingLevel = updates.hikingLevel;
    }
    if (updates.homeAddress !== undefined) {
      firestoreUpdates.homeAddress = updates.homeAddress;
    }
    if (updates.favoriteTrails !== undefined) {
      firestoreUpdates.favoriteTrails = updates.favoriteTrails;
    }
    if (updates.totalHikes !== undefined) {
      firestoreUpdates.totalHikes = updates.totalHikes;
    }
    if (updates.totalDistance !== undefined) {
      firestoreUpdates.totalDistance = updates.totalDistance;
    }
    if (updates.achievements !== undefined) {
      firestoreUpdates.achievements = updates.achievements;
    }
    
    await updateDoc(userRef, firestoreUpdates);
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
