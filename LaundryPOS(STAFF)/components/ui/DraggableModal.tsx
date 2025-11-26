import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Animated,
  PanResponder,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/app/theme/useColors';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface DraggableModalProps {
  visible: boolean;
  onClose: () => void;
  onMinimize?: () => void;
  title: string;
  subtitle?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  children: React.ReactNode;
  minimized?: boolean;
  onRestore?: () => void;
}

const DraggableModal: React.FC<DraggableModalProps> = ({
  visible,
  onClose,
  onMinimize,
  title,
  subtitle,
  icon = 'create-outline',
  children,
  minimized = false,
  onRestore,
}) => {
  const dynamicColors = useColors();
  const pan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const scale = useRef(new Animated.Value(1)).current;
  const [isDragging, setIsDragging] = useState(false);
  const startX = useRef(0);
  const startY = useRef(0);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Respond to any significant movement
        return Math.abs(gestureState.dx) > 5 || Math.abs(gestureState.dy) > 5;
      },
      onPanResponderGrant: () => {
        setIsDragging(true);
        startX.current = (pan.x as any)._value || 0;
        startY.current = (pan.y as any)._value || 0;
        // Haptic feedback when starting to drag
        if (Platform.OS !== 'web') {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        Animated.spring(scale, {
          toValue: 0.98,
          useNativeDriver: true,
        }).start();
      },
      onPanResponderMove: (_, gestureState) => {
        // Allow full dragging
        pan.setValue({ 
          x: startX.current + gestureState.dx, 
          y: startY.current + gestureState.dy 
        });
      },
      onPanResponderRelease: (_, gestureState) => {
        setIsDragging(false);
        Animated.spring(scale, {
          toValue: 1,
          useNativeDriver: true,
        }).start();

        // If dragged down significantly, minimize
        if (gestureState.dy > 100 && onMinimize) {
          // Haptic feedback when minimizing
          if (Platform.OS !== 'web') {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }
          onMinimize();
          Animated.timing(pan, {
            toValue: { x: 0, y: 0 },
            duration: 200,
            useNativeDriver: true,
          }).start();
          startX.current = 0;
          startY.current = 0;
        } else {
          // Keep the new position
          startX.current = startX.current + gestureState.dx;
          startY.current = startY.current + gestureState.dy;
        }
      },
    })
  ).current;

  if (minimized) {
    // Keep children mounted but hidden to preserve state
    return (
      <View style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', zIndex: -1, width: 0, height: 0, overflow: 'hidden' }}>
        {children}
      </View>
    );
  }

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <Animated.View
          style={[
            styles.modalContainer,
            {
              transform: [
                { translateX: pan.x },
                { translateY: pan.y },
                { scale: scale },
              ],
            },
          ]}
        >
          {/* Draggable Header */}
          <View
            style={[styles.modalHeader, { borderBottomColor: dynamicColors.border?.light || '#E5E7EB' }]}
            {...panResponder.panHandlers}
          >
            <View style={styles.modalHeaderLeft}>
              <Ionicons
                name={icon}
                size={28}
                color={dynamicColors.primary[500]}
                style={{ marginRight: 12 }}
              />
              <View style={styles.modalHeaderText}>
                <Text style={[styles.modalTitle, { color: dynamicColors.primary[500] }]}>
                  {title}
                </Text>
                {subtitle && <Text style={styles.modalSubtitle}>{subtitle}</Text>}
              </View>
            </View>
            <View style={styles.modalHeaderActions}>
              {onMinimize && (
                <TouchableOpacity
                  onPress={onMinimize}
                  style={styles.headerButton}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="remove-outline" size={20} color="#6B7280" />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={onClose}
                style={styles.headerButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Drag Indicator */}
          <View style={styles.dragIndicator} />

          {/* Modal Content */}
          <View style={styles.modalContent}>{children}</View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '95%',
    maxWidth: 1100,
    height: '90%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 16,
    ...Platform.select({
      web: {
        maxHeight: '90vh',
      },
    }),
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    backgroundColor: '#FAFAFA',
    cursor: Platform.OS === 'web' ? 'move' : 'default',
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  modalHeaderText: {
    flex: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    fontFamily: 'Poppins_700Bold',
    marginBottom: 2,
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    fontFamily: 'Poppins_400Regular',
  },
  modalHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerButton: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: 'transparent',
  },
  dragIndicator: {
    width: 50,
    height: 5,
    backgroundColor: '#9CA3AF',
    borderRadius: 3,
    alignSelf: 'center',
    marginTop: 2,
    marginBottom: 8,
    opacity: 0.6,
  },
  modalContent: {
    flex: 1,
    overflow: 'hidden',
  },
});

export default DraggableModal;

