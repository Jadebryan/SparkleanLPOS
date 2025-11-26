import React, { useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Animated,
  PanResponder,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/app/theme/useColors';
import { MinimizedModal } from './ModalTabBar';

interface DraggableTabBarProps {
  minimizedModals: MinimizedModal[];
  onTabPress: (tabId: string) => void;
  onTabClose: (tabId: string) => void;
  onReorder?: (fromIndex: number, toIndex: number) => void;
}

const DraggableTabBar: React.FC<DraggableTabBarProps> = ({
  minimizedModals,
  onTabPress,
  onTabClose,
  onReorder,
}) => {
  const dynamicColors = useColors();
  const dragStartIndex = useRef<number | null>(null);
  const dragOffset = useRef(new Animated.Value(0)).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 5 || Math.abs(gestureState.dy) > 5;
      },
      onPanResponderGrant: (evt, gestureState) => {
        // Find which tab was pressed
        // This is a simplified version - in production you'd calculate based on touch position
      },
      onPanResponderMove: (evt, gestureState) => {
        // Handle drag
      },
      onPanResponderRelease: () => {
        // Handle drop and reorder
        dragStartIndex.current = null;
        Animated.spring(dragOffset, {
          toValue: 0,
          useNativeDriver: true,
        }).start();
      },
    })
  ).current;

  if (minimizedModals.length === 0) return null;

  return (
    <View style={styles.tabBarContainer}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabBarContent}
      >
        {minimizedModals.map((modal, index) => (
          <Animated.View
            key={modal.id}
            style={[
              styles.tab,
              {
                backgroundColor: dynamicColors.primary[50] || '#EFF6FF',
                borderColor: dynamicColors.primary[200] || '#BFDBFE',
              },
            ]}
          >
            <TouchableOpacity
              style={styles.tabContent}
              onPress={() => onTabPress(modal.id)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={modal.icon || 'document-outline'}
                size={16}
                color={dynamicColors.primary[600] || '#2563EB'}
                style={{ marginRight: 6 }}
              />
              <Text
                style={[
                  styles.tabTitle,
                  { color: dynamicColors.primary[700] || '#1D4ED8' },
                ]}
                numberOfLines={1}
              >
                {modal.title}
              </Text>
              <TouchableOpacity
                onPress={(e) => {
                  e.stopPropagation();
                  onTabClose(modal.id);
                }}
                style={styles.closeTabButton}
                hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
              >
                <Ionicons name="close" size={14} color="#6B7280" />
              </TouchableOpacity>
            </TouchableOpacity>
          </Animated.View>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  tabBarContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingVertical: 10,
    paddingHorizontal: 12,
    paddingBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 12,
    zIndex: 10000,
  },
  tabBarContent: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 8,
  },
  tab: {
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 120,
    maxWidth: 200,
    overflow: 'hidden',
  },
  tabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  tabTitle: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'Poppins_600SemiBold',
    flex: 1,
  },
  closeTabButton: {
    marginLeft: 6,
    padding: 2,
  },
});

export default DraggableTabBar;

