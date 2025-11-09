import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  PanResponder,
  Dimensions,
  Image,
} from 'react-native';
import { PotentialMatch } from '../src/lib/matchingService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SWIPE_THRESHOLD = 120;
const ROTATION_MULTIPLIER = 0.1;

interface SwipeableCardProps {
  match: PotentialMatch;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  isTopCard: boolean;
}

export const SwipeableCard: React.FC<SwipeableCardProps> = ({
  match,
  onSwipeLeft,
  onSwipeRight,
  isTopCard,
}) => {
  const position = useRef(new Animated.ValueXY()).current;
  const rotate = useRef(new Animated.Value(0)).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => isTopCard,
      onMoveShouldSetPanResponder: () => isTopCard,
      onPanResponderMove: (evt, gestureState) => {
        if (!isTopCard) return;
        
        position.setValue({ x: gestureState.dx, y: gestureState.dy });
        
        // Rotate based on horizontal movement
        const rotation = gestureState.dx * ROTATION_MULTIPLIER;
        rotate.setValue(rotation);
      },
      onPanResponderRelease: (evt, gestureState) => {
        if (!isTopCard) return;

        const { dx } = gestureState;

        if (Math.abs(dx) > SWIPE_THRESHOLD) {
          // Swipe detected
          const direction = dx > 0 ? 1 : -1;
          const toValue = direction * SCREEN_WIDTH * 1.5;

          Animated.parallel([
            Animated.timing(position, {
              toValue: { x: toValue, y: gestureState.dy },
              duration: 300,
              useNativeDriver: false,
            }),
            Animated.timing(rotate, {
              toValue: direction * 30,
              duration: 300,
              useNativeDriver: false,
            }),
          ]).start(() => {
            if (direction > 0) {
              onSwipeRight();
            } else {
              onSwipeLeft();
            }
            position.setValue({ x: 0, y: 0 });
            rotate.setValue(0);
          });
        } else {
          // Snap back
          Animated.parallel([
            Animated.spring(position, {
              toValue: { x: 0, y: 0 },
              useNativeDriver: false,
            }),
            Animated.spring(rotate, {
              toValue: 0,
              useNativeDriver: false,
            }),
          ]).start();
        }
      },
    })
  ).current;

  const rotateInterpolate = rotate.interpolate({
    inputRange: [-30, 0, 30],
    outputRange: ['-30deg', '0deg', '30deg'],
  });

  const likeOpacity = position.x.interpolate({
    inputRange: [0, SWIPE_THRESHOLD],
    outputRange: [0, 1],
  });

  const passOpacity = position.x.interpolate({
    inputRange: [-SWIPE_THRESHOLD, 0],
    outputRange: [1, 0],
  });

  const cardStyle = {
    transform: [
      { translateX: position.x },
      { translateY: position.y },
      { rotate: rotateInterpolate },
    ],
  };

  return (
    <Animated.View
      style={[styles.card, cardStyle]}
      {...panResponder.panHandlers}
    >
      {match.profilePicture ? (
        <Image source={{ uri: match.profilePicture }} style={styles.image} />
      ) : (
        <View style={styles.placeholderImage}>
          <Text style={styles.placeholderText}>
            {match.name?.charAt(0) || '?'}
          </Text>
        </View>
      )}

      <View style={styles.overlay}>
        <Animated.View style={[styles.likeLabel, { opacity: likeOpacity }]}>
          <Text style={styles.likeLabelText}>LIKE</Text>
        </Animated.View>
        <Animated.View style={[styles.passLabel, { opacity: passOpacity }]}>
          <Text style={styles.passLabelText}>PASS</Text>
        </Animated.View>
      </View>

      <View style={styles.infoContainer}>
        <View style={styles.nameRow}>
          <Text style={styles.name}>{match.name || match.username || 'Unknown'}</Text>
          {match.hikingLevel && (
            <View style={styles.levelBadge}>
              <Text style={styles.levelText}>{match.hikingLevel}</Text>
            </View>
          )}
        </View>

        {match.bio && (
          <Text style={styles.bio} numberOfLines={2}>
            {match.bio}
          </Text>
        )}

        {match.profileDescription && (
          <Text style={styles.description} numberOfLines={3}>
            {match.profileDescription}
          </Text>
        )}

        {match.interests && match.interests.length > 0 && (
          <View style={styles.interestsContainer}>
            {match.interests.slice(0, 5).map((interest, index) => (
              <View key={index} style={styles.interestTag}>
                <Text style={styles.interestText}>{interest}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.similarityContainer}>
          <Text style={styles.similarityText}>
            {(match.similarity * 100).toFixed(0)}% match
          </Text>
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    width: SCREEN_WIDTH * 0.9,
    height: 600,
    backgroundColor: '#fff',
    borderRadius: 20,
    position: 'absolute',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '60%',
    resizeMode: 'cover',
  },
  placeholderImage: {
    width: '100%',
    height: '60%',
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 60,
    color: '#999',
    fontWeight: 'bold',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  likeLabel: {
    position: 'absolute',
    right: 20,
    top: 50,
    borderWidth: 4,
    borderColor: '#4CAF50',
    borderRadius: 10,
    padding: 10,
    transform: [{ rotate: '15deg' }],
  },
  likeLabelText: {
    color: '#4CAF50',
    fontSize: 32,
    fontWeight: 'bold',
  },
  passLabel: {
    position: 'absolute',
    left: 20,
    top: 50,
    borderWidth: 4,
    borderColor: '#F44336',
    borderRadius: 10,
    padding: 10,
    transform: [{ rotate: '-15deg' }],
  },
  passLabelText: {
    color: '#F44336',
    fontSize: 32,
    fontWeight: 'bold',
  },
  infoContainer: {
    padding: 20,
    height: '40%',
    justifyContent: 'space-between',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  name: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginRight: 10,
  },
  levelBadge: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  levelText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  bio: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#888',
    marginBottom: 12,
  },
  interestsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  interestTag: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  interestText: {
    color: '#1976D2',
    fontSize: 12,
    fontWeight: '500',
  },
  similarityContainer: {
    alignItems: 'flex-end',
  },
  similarityText: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '600',
  },
});

