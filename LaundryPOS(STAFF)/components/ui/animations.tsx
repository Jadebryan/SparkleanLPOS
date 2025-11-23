import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, ViewStyle } from 'react-native';

/**
 * Animation utilities for micro-interactions
 */

// Hover/Press animation hook
export const usePressAnimation = (scale: number = 0.95) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: scale,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();
  };

  return {
    scaleAnim,
    handlePressIn,
    handlePressOut,
  };
};

// Pulse animation hook
export const usePulseAnimation = (duration: number = 1000) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: duration / 2,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: duration / 2,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim, duration]);

  return pulseAnim;
};

// Fade in animation hook
export const useFadeIn = (duration: number = 300, delay: number = 0) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration,
      delay,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim, duration, delay]);

  return fadeAnim;
};

// Slide in animation hook
export const useSlideIn = (direction: 'up' | 'down' | 'left' | 'right' = 'up', distance: number = 20) => {
  const slideAnim = useRef(new Animated.Value(distance)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const translateMap = {
      up: { translateY: slideAnim },
      down: { translateY: slideAnim },
      left: { translateX: slideAnim },
      right: { translateX: slideAnim },
    };

    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, [slideAnim, opacityAnim, direction, distance]);

  return {
    transform: [
      direction === 'up' || direction === 'down' 
        ? { translateY: slideAnim }
        : { translateX: slideAnim }
    ],
    opacity: opacityAnim,
  };
};

// Shimmer animation hook
export const useShimmer = () => {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const shimmer = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    shimmer.start();
    return () => shimmer.stop();
  }, [shimmerAnim]);

  const opacity = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return opacity;
};

// Success checkmark animation
export const useSuccessAnimation = () => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  const trigger = () => {
    scaleAnim.setValue(0);
    opacityAnim.setValue(1);
    
    Animated.sequence([
      Animated.spring(scaleAnim, {
        toValue: 1.2,
        useNativeDriver: true,
        tension: 200,
        friction: 3,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 200,
        friction: 3,
      }),
    ]).start();
  };

  return {
    scaleAnim,
    opacityAnim,
    trigger,
  };
};

// Bounce animation hook
export const useBounce = () => {
  const bounceAnim = useRef(new Animated.Value(1)).current;

  const trigger = () => {
    Animated.sequence([
      Animated.timing(bounceAnim, {
        toValue: 1.2,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(bounceAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
  };

  return {
    bounceAnim,
    trigger,
  };
};

