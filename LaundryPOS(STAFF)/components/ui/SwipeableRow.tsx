import React, { useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, PanResponder, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography } from '@/app/theme/designSystem';

interface SwipeAction {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color: string;
  onPress: () => void;
}

interface SwipeableRowProps {
  children: React.ReactNode;
  leftActions?: SwipeAction[];
  rightActions?: SwipeAction[];
  onSwipe?: (direction: 'left' | 'right') => void;
  threshold?: number;
}

export const SwipeableRow: React.FC<SwipeableRowProps> = ({
  children,
  leftActions = [],
  rightActions = [],
  onSwipe,
  threshold = 100,
}) => {
  const translateX = useRef(new Animated.Value(0)).current;
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 10;
      },
      onPanResponderMove: (_, gestureState) => {
        const maxSwipe = Math.max(
          leftActions.length * 80,
          rightActions.length * 80
        );
        const newValue = Math.max(
          -maxSwipe,
          Math.min(maxSwipe, gestureState.dx)
        );
        translateX.setValue(newValue);
      },
      onPanResponderRelease: (_, gestureState) => {
        const { dx } = gestureState;
        const maxSwipe = Math.max(
          leftActions.length * 80,
          rightActions.length * 80
        );

        if (Math.abs(dx) > threshold) {
          const direction = dx > 0 ? 'right' : 'left';
          const targetValue = direction === 'right' 
            ? rightActions.length * 80 
            : -leftActions.length * 80;
          
          Animated.spring(translateX, {
            toValue: targetValue,
            useNativeDriver: true,
            tension: 100,
            friction: 8,
          }).start();
          
          onSwipe?.(direction);
        } else {
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
            tension: 100,
            friction: 8,
          }).start();
        }
      },
    })
  ).current;

  const renderActions = (actions: SwipeAction[], side: 'left' | 'right') => {
    if (actions.length === 0) return null;

    return (
      <View
        style={[
          styles.actionsContainer,
          side === 'left' ? styles.leftActions : styles.rightActions,
        ]}
      >
        {actions.map((action, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.actionButton,
              { backgroundColor: action.color },
            ]}
            onPress={() => {
              Animated.spring(translateX, {
                toValue: 0,
                useNativeDriver: true,
                tension: 100,
                friction: 8,
              }).start(() => {
                action.onPress();
              });
            }}
            activeOpacity={0.8}
          >
            <Ionicons name={action.icon} size={20} color={colors.text.inverse} />
            <Text style={styles.actionLabel}>{action.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {leftActions.length > 0 && renderActions(leftActions, 'left')}
      {rightActions.length > 0 && renderActions(rightActions, 'right')}
      
      <Animated.View
        style={[
          styles.content,
          {
            transform: [{ translateX }],
          },
        ]}
        {...panResponder.panHandlers}
      >
        {children}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    overflow: 'hidden',
  },
  content: {
    backgroundColor: colors.background.primary,
  },
  actionsContainer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 0,
  },
  leftActions: {
    left: 0,
  },
  rightActions: {
    right: 0,
  },
  actionButton: {
    width: 80,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
  },
  actionLabel: {
    ...typography.caption,
    color: colors.text.inverse,
    marginTop: spacing.xs,
    textAlign: 'center',
    fontSize: 10,
  },
});

