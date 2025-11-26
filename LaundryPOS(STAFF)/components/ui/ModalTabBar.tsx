import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/app/theme/useColors';
import { useModalTabs } from '@/app/context/ModalTabContext';

export interface MinimizedModal {
  id: string;
  title: string;
  subtitle?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  onRestore: () => void;
  onClose: () => void;
}

interface ModalTabBarProps {
  minimizedModals: MinimizedModal[];
}

const ModalTabBar: React.FC<ModalTabBarProps> = ({ minimizedModals }) => {
  const dynamicColors = useColors();
  const { restoreTab, closeTab, isTabActive } = useModalTabs();

  if (minimizedModals.length === 0) return null;

  return (
    <View style={styles.tabBarContainer}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabBarContent}
      >
        {minimizedModals.map((modal, index) => {
          const isActive = isTabActive(modal.id);
          return (
            <TouchableOpacity
              key={modal.id}
              style={[
                styles.tab,
                {
                  backgroundColor: isActive 
                    ? dynamicColors.primary[100] || '#DBEAFE'
                    : dynamicColors.primary[50] || '#EFF6FF',
                  borderColor: isActive
                    ? dynamicColors.primary[500] || '#3B82F6'
                    : dynamicColors.primary[200] || '#BFDBFE',
                  borderWidth: isActive ? 2 : 1,
                },
              ]}
              onPress={() => {
                restoreTab(modal.id);
                modal.onRestore();
              }}
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
                  { 
                    color: isActive
                      ? dynamicColors.primary[700] || '#1D4ED8'
                      : dynamicColors.primary[700] || '#1D4ED8',
                    fontWeight: isActive ? '700' : '600',
                  },
                ]}
                numberOfLines={1}
              >
                {modal.title}
              </Text>
              <TouchableOpacity
                onPress={(e) => {
                  e.stopPropagation();
                  closeTab(modal.id);
                  modal.onClose();
                }}
                style={styles.closeTabButton}
                hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
              >
                <Ionicons name="close" size={14} color="#6B7280" />
              </TouchableOpacity>
            </TouchableOpacity>
          );
        })}
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
    paddingBottom: 12, // Extra padding for FAB clearance
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 120,
    maxWidth: 200,
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

export default ModalTabBar;

