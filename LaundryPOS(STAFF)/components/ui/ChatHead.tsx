import React, { useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  PanResponder,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/app/theme/useColors';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface ChatHeadProps {
  id: string;
  title: string;
  icon?: keyof typeof Ionicons.glyphMap;
  number?: number;
  onPress: () => void;
  onClose: () => void;
  isActive?: boolean;
  initialPosition?: { x: number; y: number };
}

const ChatHead: React.FC<ChatHeadProps> = ({
  id,
  title,
  icon = 'create-outline',
  number,
  onPress,
  onClose,
  isActive = false,
  initialPosition,
}) => {
  const dynamicColors = useColors();
  const defaultX = initialPosition?.x ?? SCREEN_WIDTH - 70;
  const defaultY = initialPosition?.y ?? 100;
  const pan = useRef(new Animated.ValueXY({ x: defaultX, y: defaultY })).current;
  const scale = useRef(new Animated.Value(1)).current;
  const startX = useRef(defaultX);
  const startY = useRef(defaultY);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        startX.current = (pan.x as any)._value || defaultX;
        startY.current = (pan.y as any)._value || defaultY;
        Animated.spring(scale, {
          toValue: 1.1,
          useNativeDriver: true,
        }).start();
      },
      onPanResponderMove: (_, gestureState) => {
        pan.setValue({
          x: startX.current + gestureState.dx,
          y: startY.current + gestureState.dy,
        });
      },
      onPanResponderRelease: (_, gestureState) => {
        Animated.spring(scale, {
          toValue: 1,
          useNativeDriver: true,
        }).start();

        // Snap to edges
        const currentX = startX.current + gestureState.dx;
        const currentY = startY.current + gestureState.dy;
        const snapX = currentX < SCREEN_WIDTH / 2 ? 10 : SCREEN_WIDTH - 66;
        const snapY = Math.max(50, Math.min(currentY, SCREEN_HEIGHT - 200));
        
        startX.current = snapX;
        startY.current = snapY;
        
        Animated.spring(pan, {
          toValue: { x: snapX, y: snapY },
          useNativeDriver: true,
        }).start();
      },
    })
  ).current;

  return (
    <Animated.View
      style={[
        styles.chatHead,
        {
          transform: [
            { translateX: pan.x },
            { translateY: pan.y },
            { scale: scale },
          ],
          backgroundColor: isActive 
            ? dynamicColors.primary[500] || '#3B82F6'
            : dynamicColors.primary[400] || '#60A5FA',
        },
      ]}
      {...panResponder.panHandlers}
    >
      <TouchableOpacity
        style={styles.chatHeadContent}
        onPress={onPress}
        activeOpacity={0.8}
      >
        {number && (
          <View style={styles.numberBadge}>
            <Text style={styles.numberText}>{number}</Text>
          </View>
        )}
        <Ionicons name={icon} size={20} color="#FFFFFF" />
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.closeButton}
        onPress={onClose}
        hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
      >
        <Ionicons name="close" size={14} color="#FFFFFF" />
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  chatHead: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 10001,
  },
  chatHeadContent: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 28,
  },
  numberBadge: {
    position: 'absolute',
    top: -4,
    left: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  numberText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'Poppins_700Bold',
  },
  closeButton: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default ChatHead;

