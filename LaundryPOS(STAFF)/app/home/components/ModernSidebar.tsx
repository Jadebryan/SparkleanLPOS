import React, { useState } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Modal } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_BASE_URL } from '@/constants/api';

type RouteLiteral =
  | '/home/orderList'
  | '/home/customer'
  | '/home/request'
  | '/home/settings'
  | '/home/help';

interface NavItem {
  icon: keyof typeof Ionicons.glyphMap;
  iconActive?: keyof typeof Ionicons.glyphMap;
  route: RouteLiteral;
  label: string;
}

interface NavItemComponentProps {
  item: NavItem;
  isActive: boolean;
  isLogout: boolean;
  onPress: () => void;
}

const NavItemComponent: React.FC<NavItemComponentProps> = ({ item, isActive, isLogout, onPress }) => {
  const [hovered, setHovered] = useState(false);

  return (
    <View
      style={styles.navItemWrapper}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <TouchableOpacity
        style={[styles.navItem, isActive && styles.navItemActive]}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <View style={[styles.navIconContainer, isActive && styles.navIconContainerActive, hovered && !isActive && styles.navIconContainerHovered]}>
          <Ionicons
            name={isActive && item.iconActive ? item.iconActive : item.icon}
            size={20}
            color={isActive ? '#FFFFFF' : isLogout ? '#DC2626' : '#4B5563'}
          />
        </View>
      </TouchableOpacity>
      
      {/* Hover Tooltip */}
      {hovered && (
        <View style={[styles.tooltip, isLogout && styles.tooltipLogout]}>
          <Text style={[styles.tooltipText, isLogout && styles.tooltipTextLogout]}>
            {item.label}
          </Text>
        </View>
      )}
    </View>
  );
};

const ModernSidebar: React.FC = () => {
  const router = useRouter();
  const pathname = usePathname();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const menuItems: NavItem[] = [
    { icon: 'list-outline', iconActive: 'list', route: '/home/orderList', label: 'Orders' },
    { icon: 'people-outline', iconActive: 'people', route: '/home/customer', label: 'Customers' },
    { icon: 'folder-outline', iconActive: 'folder', route: '/home/request', label: 'Requests' },
  ];

  const generalItems: NavItem[] = [
    { icon: 'settings-outline', iconActive: 'settings', route: '/home/settings', label: 'Settings' },
    { icon: 'help-circle-outline', iconActive: 'help-circle', route: '/home/help', label: 'Help' },
    { icon: 'log-out-outline', route: '/home/orderList', label: 'Logout' },
  ];

  const handleNavigation = (route: RouteLiteral, isLogout: boolean = false) => {
    if (isLogout) {
      setShowLogoutModal(true);
      return;
    }
    router.push(route);
  };

  const handleLogout = async () => {
    try {
      // Call logout API to log the audit event
      const token = await AsyncStorage.getItem('token') || await AsyncStorage.getItem('userToken');
      if (token) {
        try {
          await axios.post(`${API_BASE_URL}/auth/logout`, {}, {
            headers: { Authorization: `Bearer ${token}` }
          });
        } catch (apiError) {
          // Log error but continue with logout even if API fails
          console.error('Logout API error (continuing with local logout):', apiError);
        }
      }
      
      // Clear local storage
      await AsyncStorage.multiRemove(['token', 'userToken', 'user']);
      setShowLogoutModal(false);
      router.replace('/login');
    } catch (error) {
      console.error('Logout error:', error);
      setShowLogoutModal(false);
      // Still navigate to login even if there's an error
      router.replace('/login');
    }
  };

  const handleCancelLogout = () => {
    setShowLogoutModal(false);
  };


  // Combine all items for even distribution
  const allItems: (NavItem & { isLogout: boolean })[] = [
    ...menuItems.map(item => ({ ...item, isLogout: false })),
    ...generalItems.slice(0, -1).map(item => ({ ...item, isLogout: false })),
    { ...generalItems[generalItems.length - 1], isLogout: true }
  ];

  return (
    <View style={styles.sidebarContainer}>
    <View style={styles.sidebar}>
      {/* Navigation Items - Evenly Distributed */}
      <View style={styles.navContainer}>
        {allItems.map((item, index) => {
          const isActive = !item.isLogout && pathname === item.route;
          // Create a truly unique key using label and index to avoid duplicates
          const uniqueKey = item.isLogout ? `logout-${item.label}-${index}` : `${item.route}-${item.label}-${index}`;
            return (
              <NavItemComponent
                key={uniqueKey}
                item={item}
                isActive={isActive}
              isLogout={item.isLogout}
              onPress={() => handleNavigation(item.route, item.isLogout)}
              />
            );
          })}
        </View>

      {/* Logout Confirmation Modal */}
      <Modal
        visible={showLogoutModal}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCancelLogout}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={handleCancelLogout}
        >
          <View style={styles.logoutModal} onStartShouldSetResponder={() => true}>
            <View style={styles.logoutModalHeader}>
              <Ionicons name="log-out-outline" size={24} color="#DC2626" />
              <Text style={styles.logoutModalTitle}>Logout</Text>
            </View>
            <Text style={styles.logoutModalMessage}>
              Are you sure you want to logout?
            </Text>
            <View style={styles.logoutModalButtons}>
              <TouchableOpacity
                style={styles.logoutModalCancelButton}
                onPress={handleCancelLogout}
              >
                <Text style={styles.logoutModalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.logoutModalConfirmButton}
                onPress={handleLogout}
              >
                <Text style={styles.logoutModalConfirmText}>Logout</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  sidebarContainer: {
    width: 80,
    marginVertical: 8,
    marginLeft: 8,
    marginRight: 0,
  },
  sidebar: {
    width: 64,
    backgroundColor: '#FFFFFF',
    borderRightWidth: 0,
    borderRightColor: 'transparent',
    paddingVertical: 16,
    paddingHorizontal: 8,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    flex: 1,
  },
  navContainer: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  navItemWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    width: '100%',
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    flex: 1,
  },
  navItemActive: {
    backgroundColor: 'transparent',
  },
  navIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navIconContainerActive: {
    backgroundColor: '#111827',
    borderRadius: 18,
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 5,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  navIconContainerHovered: {
    backgroundColor: '#F9FAFB',
    borderRadius: 18,
  },
  tooltip: {
    position: 'absolute',
    left: 80,
    top: 10,
    backgroundColor: '#111827',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  tooltipLogout: {
    backgroundColor: '#DC2626',
  },
  tooltipText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
  },
  tooltipTextLogout: {
    color: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutModal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  logoutModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  logoutModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  logoutModalMessage: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 24,
    lineHeight: 24,
  },
  logoutModalButtons: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'flex-end',
  },
  logoutModalCancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  logoutModalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  logoutModalConfirmButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    backgroundColor: '#DC2626',
  },
  logoutModalConfirmText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default ModernSidebar;

