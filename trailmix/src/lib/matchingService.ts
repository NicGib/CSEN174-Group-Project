import { endpoints } from '../constants/api';
import { auth } from './firebase';
import { apiCall, ApiError, ErrorType, getUserFriendlyErrorMessage } from '@/src/utils/errorHandler';

export interface PotentialMatch {
  uid: string;
  name?: string;
  username?: string;
  profilePicture?: string;
  bio?: string;
  profileDescription?: string;
  interests?: string[];
  hikingLevel?: string;
  similarity: number;
}

export interface SwipeResponse {
  success: boolean;
  isMatch: boolean;
  message: string;
}

export interface MutualMatch {
  uid: string;
  name?: string;
  username?: string;
  profilePicture?: string;
  matchedAt: string;
}

/**
 * Get potential matches for swiping
 */
export const getPotentialMatches = async (
  limit: number = 50,
  excludeSwiped: boolean = true
): Promise<{ matches: PotentialMatch[]; hasMore: boolean }> => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('User not authenticated');
  }

  try {
    return await apiCall<{ matches: PotentialMatch[]; hasMore: boolean }>(
      `${endpoints.matching}/potential-matches/${user.uid}?limit=${limit}&exclude_swiped=${excludeSwiped}`,
      { method: 'GET' },
      'Failed to get potential matches'
    );
  } catch (error: any) {
    console.error('Error getting potential matches:', error);
    // Re-throw with user-friendly message
    if (error instanceof ApiError) {
      throw new Error(getUserFriendlyErrorMessage(error));
    }
    throw error instanceof Error ? error : new Error('Failed to get potential matches: Unknown error');
  }
};

/**
 * Record a swipe action
 */
export const swipe = async (
  targetUid: string,
  action: 'like' | 'pass'
): Promise<SwipeResponse> => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('User not authenticated');
  }

  try {
    const data = await apiCall<any>(
      `${endpoints.matching}/swipe/${user.uid}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          targetUid,
          action,
        }),
      },
      'Failed to record swipe'
    );

    return {
      success: data.success,
      isMatch: data.is_match,
      message: data.message,
    };
  } catch (error: any) {
    console.error('Error recording swipe:', error);
    if (error instanceof ApiError) {
      throw new Error(getUserFriendlyErrorMessage(error));
    }
    throw error;
  }
};

/**
 * Get mutual matches
 */
export const getMutualMatches = async (): Promise<MutualMatch[]> => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('User not authenticated');
  }

  try {
    const data = await apiCall<{ matches: any[] }>(
      `${endpoints.matching}/mutual-matches/${user.uid}`,
      { method: 'GET' },
      'Failed to get mutual matches'
    );

    return data.matches.map((match: any) => ({
      uid: match.uid,
      name: match.name,
      username: match.username,
      profilePicture: match.profile_picture,
      matchedAt: match.matched_at,
    }));
  } catch (error: any) {
    console.error('Error getting mutual matches:', error);
    if (error instanceof ApiError) {
      throw new Error(getUserFriendlyErrorMessage(error));
    }
    throw error;
  }
};

