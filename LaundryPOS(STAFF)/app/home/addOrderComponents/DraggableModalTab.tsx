import React, { useRef, useState } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  Animated, 
  PanResponder, 
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/app/theme/useColors';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface DraggableModalTabProps {
  id: string;
  title: string;
  isActive: boolean;
  isMinimized: boolean;
  onPress: () => void;
  onClose: () => void;
  onMinimize: () => void;
  onMaximize: () => void;
  onDrag: (id: string, x: number, y: number) => void;
  position: { x: number; y: number };
  zIndex: number;
}

const DraggableModalTab: React.FC<DraggableModalTabProps> = ({
  id,
  title,
  isActive,
  isMinimized,
  onPress,
  onClose,
  onMinimize,
  onMaximize,
  onDrag,
  position,
  zIndex,
}) => {
  const dynamicColors = useColors();
  const pan = useRef(new Animated.ValueXY({ x: position.x, y: position.y })).current;
  const [isDragging, setIsDragging] = useState(false);

  const startPosition = useRef({ x: position.x, y: position.y });
  const dragStart = useRef({ x: 0, y: 0 });

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 10 || Math.abs(gestureState.dy) > 10;
      },
      onPanResponderGrant: (evt) => {
        setIsDragging(true);
        startPosition.current = { x: position.x, y: position.y };
        dragStart.current = { x: evt.nativeEvent.pageX, y: evt.nativeEvent.pageY };
        pan.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: (_, gestureState) => {
        const newX = startPosition.current.x + gestureState.dx;
        const newY = startPosition.current.y + gestureState.dy;
        
        // Constrain to screen bounds
        const tabWidth = isMinimized ? 200 : 300;
        const maxX = SCREEN_WIDTH - tabWidth;
        const maxY = SCREEN_HEIGHT - 60;
        
        pan.setValue({
          x: Math.max(0, Math.min(maxX, newX)) - startPosition.current.x,
          y: Math.max(0, Math.min(maxY, newY)) - startPosition.current.y,
        });
      },
      onPanResponderRelease: () => {
        setIsDragging(false);
        const finalX = startPosition.current.x + ((pan.x as any)._value || 0);
        const finalY = startPosition.current.y + ((pan.y as any)._value || 0);
        
        onDrag(id, finalX, finalY);
      },
    })
  ).current;

  // Update position when prop changes
  React.useEffect(() => {
    if (!isDragging) {
      Animated.spring(pan, {
        toValue: { x: position.x, y: position.y },
        useNativeDriver: false,
        tension: 50,
        friction: 7,
      }).start();
    }
  }, [position.x, position.y, isDragging]);

  const tabWidth = isMinimized ? 200 : 300;
  const tabHeight = isMinimized ? 50 : 60;

  return (
    <Animated.View
      style={[
        styles.tabContainer,
        {
          transform: [{ translateX: pan.x }, { translateY: pan.y }],
          zIndex: isActive ? zIndex + 1000 : zIndex,
          width: tabWidth,
          height: tabHeight,
          backgroundColor: isActive 
            ? dynamicColors.primary[500] 
            : dynamicColors.background.secondary,
        },
        isDragging && styles.draggingTab,
      ]}
      {...panResponder.panHandlers}
    >
      <TouchableOpacity
        style={styles.tabContent}
        onPress={onPress}
        activeOpacity={0.8}
      >
        <View style={styles.tabLeft}>
          <Ionicons 
            name="create-outline" 
            size={16} 
            color={isActive ? '#FFFFFF' : dynamicColors.text.primary} 
            style={{ marginRight: 8 }} 
          />
          <Text 
            style={[
              styles.tabTitle,
              { color: isActive ? '#FFFFFF' : dynamicColors.text.primary }
            ]}
            numberOfLines={1}
          >
            {title}
          </Text>
        </View>
        
        <View style={styles.tabRight}>
          {!isMinimized && (
            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation();
                onMinimize();
              }}
              style={styles.tabButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons 
                name="remove-outline" 
                size={18} 
                color={isActive ? '#FFFFFF' : dynamicColors.text.secondary} 
              />
            </TouchableOpacity>
          )}
          {isMinimized && (
            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation();
                onMaximize();
              }}
              style={styles.tabButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons 
                name="expand-outline" 
                size={18} 
                color={isActive ? '#FFFFFF' : dynamicColors.text.secondary} 
              />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={(e) => {
              e.stopPropagation();
              onClose();
            }}
            style={styles.tabButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons 
              name="close" 
              size={18} 
              color={isActive ? '#FFFFFF' : dynamicColors.text.secondary} 
            />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  tabContainer: {
    position: 'absolute',
    borderRadius: 8,
    ...Platform.select({
      web: {
        cursor: 'move',
      },
    }),
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  draggingTab: {
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 10,
  },
  tabContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  tabLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  tabTitle: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  tabRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  tabButton: {
    padding: 4,
    borderRadius: 4,
  },
});

export default DraggableModalTab;

