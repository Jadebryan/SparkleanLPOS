import React, { useState } from 'react';
import { View, TouchableOpacity, StyleSheet, Animated, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, shadows, typography } from '@/app/theme/designSystem';
import { useColors } from '@/app/theme/useColors';
import { usePressAnimation } from './animations';

interface Action {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  color?: string;
}

interface FloatingActionButtonProps {
  mainIcon: keyof typeof Ionicons.glyphMap;
  mainAction: () => void;
  actions?: Action[];
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
}

export const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({
  mainIcon,
  mainAction,
  actions = [],
  position = 'bottom-right',
}) => {
  const dynamicColors = useColors();
  const [isExpanded, setIsExpanded] = useState(false);
  const { scaleAnim, handlePressIn, handlePressOut } = usePressAnimation(0.9);
  const overlayOpacity = React.useRef(new Animated.Value(0)).current;

  const toggleExpanded = () => {
    if (actions.length === 0) {
      mainAction();
      return;
    }
    
    setIsExpanded(!isExpanded);
    
    Animated.timing(overlayOpacity, {
      toValue: isExpanded ? 0 : 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  const handleActionPress = (action: Action) => {
    setIsExpanded(false);
    Animated.timing(overlayOpacity, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
    action.onPress();
  };

  const positionStyles = {
    'bottom-right': { bottom: 24, right: 24 },
    'bottom-left': { bottom: 24, left: 24 },
    'top-right': { top: 24, right: 24 },
    'top-left': { top: 24, left: 24 },
  };

  return (
    <>
      <View style={[styles.container, positionStyles[position]]} pointerEvents="box-none">
        {isExpanded && actions.map((action, index) => (
          <Animated.View
            key={action.label}
            style={[
              styles.actionButton,
              {
                marginBottom: (actions.length - index) * 60,
                opacity: overlayOpacity,
                transform: [
                  {
                    translateY: overlayOpacity.interpolate({
                      inputRange: [0, 1],
                      outputRange: [20, 0],
                    }),
                  },
                ],
              },
            ]}
            pointerEvents="box-none"
          >
            <TouchableOpacity
              style={[
                styles.actionButtonInner,
                action.color ? { backgroundColor: action.color } : { backgroundColor: dynamicColors.primary[500] },
              ]}
              onPress={() => handleActionPress(action)}
              activeOpacity={0.8}
            >
              <Ionicons name={action.icon} size={20} color={colors.text.inverse} />
            </TouchableOpacity>
            <View style={styles.actionLabel} pointerEvents="none">
              <View style={styles.actionLabelTextContainer}>
                <View style={styles.actionLabelArrow} />
                <View style={styles.actionLabelContent}>
                  <Text style={styles.actionLabelText}>
                    {action.label}
                  </Text>
                </View>
              </View>
            </View>
          </Animated.View>
        ))}

        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
          <TouchableOpacity
            style={[
              styles.mainButton,
              { backgroundColor: dynamicColors.primary[500] },
              isExpanded && styles.mainButtonExpanded,
            ]}
            onPress={toggleExpanded}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            activeOpacity={0.9}
          >
            <Animated.View
              style={{
                transform: [
                  {
                    rotate: overlayOpacity.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0deg', '45deg'],
                    }),
                  },
                ],
              }}
            >
              <Ionicons
                name={isExpanded ? 'close' : mainIcon}
                size={24}
                color={colors.text.inverse}
              />
            </Animated.View>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    zIndex: 1001,
  },
  mainButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary[500],
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.lg,
    elevation: 8,
  },
  mainButtonExpanded: {
    backgroundColor: colors.error[500],
  },
  actionButton: {
    position: 'absolute',
    bottom: 0,
    alignSelf: 'center',
  },
  actionButtonInner: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary[600],
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.md,
    elevation: 4,
  },
  actionLabel: {
    position: 'absolute',
    right: 60,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  actionLabelTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  actionLabelArrow: {
    width: 0,
    height: 0,
    borderTopWidth: 6,
    borderBottomWidth: 6,
    borderRightWidth: 6,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderRightColor: colors.gray[800],
    alignSelf: 'center',
  },
  actionLabelContent: {
    backgroundColor: colors.gray[800],
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionLabelText: {
    ...typography.bodySmall,
    color: colors.text.inverse,
    fontWeight: '500',
    fontSize: 12,
    lineHeight: 16,
  },
});

