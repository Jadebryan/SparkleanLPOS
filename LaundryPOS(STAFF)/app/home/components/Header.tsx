import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, Modal, Pressable } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import BrandIcon from '../../components/BrandIcon';

interface HeaderProps {
  title?: string;
  showPageTitle?: boolean;
}

const Header: React.FC<HeaderProps> = ({ title, showPageTitle = true }) => {
  const router = useRouter();
  const [user, setUser] = useState<{ name: string; email: string; username?: string; role?: string } | null>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [userButtonLayout, setUserButtonLayout] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const userButtonRef = useRef<any>(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const jsonValue = await AsyncStorage.getItem('user');
        if (jsonValue) setUser(JSON.parse(jsonValue));
      } catch (error) {
        console.error('Error loading user:', error);
      }
    };
    fetchUser();
  }, []);

  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const handleLogout = async () => {
    try {
      await AsyncStorage.multiRemove(['token', 'userToken', 'user']);
      setShowLogoutModal(false);
      setUserMenuOpen(false);
      router.replace('/login');
    } catch (error) {
      console.error('Logout error:', error);
      setShowLogoutModal(false);
      setUserMenuOpen(false);
      router.replace('/login');
    }
  };

  const handleLogoutClick = () => {
    setUserMenuOpen(false);
    setShowLogoutModal(true);
  };

  // Auto logout on inactivity with 60s warning
  const [showIdleWarning, setShowIdleWarning] = useState(false);
  const [idleCountdown, setIdleCountdown] = useState(60);

  useEffect(() => {
    const IDLE_MS = 15 * 60 * 1000;
    const WARNING_MS = 60 * 1000;
    let lastActivity = Date.now();
    let pollInterval: any;
    let countdownInterval: any;
    let warned = false;

    const reset = () => {
      lastActivity = Date.now();
      if (warned) {
        warned = false;
        setShowIdleWarning(false);
        setIdleCountdown(60);
        if (countdownInterval) clearInterval(countdownInterval);
      }
    };

    // Web-specific events when running on web
    if (typeof window !== 'undefined') {
      window.addEventListener('mousemove', reset);
      window.addEventListener('keydown', reset);
      window.addEventListener('click', reset);
      window.addEventListener('scroll', reset);
      document.addEventListener('visibilitychange', () => { if (!document.hidden) reset(); });
    }

    pollInterval = setInterval(async () => {
      const token = (await AsyncStorage.getItem('token')) || (await AsyncStorage.getItem('userToken'));
      if (!token) return;
      const elapsed = Date.now() - lastActivity;

      if (!warned && elapsed >= IDLE_MS - WARNING_MS && elapsed < IDLE_MS) {
        warned = true;
        setShowIdleWarning(true);
        const remaining = Math.ceil((IDLE_MS - elapsed) / 1000);
        setIdleCountdown(remaining);
        countdownInterval = setInterval(() => {
          setIdleCountdown(prev => {
            if (prev <= 1) {
              clearInterval(countdownInterval);
            }
            return Math.max(prev - 1, 0);
          });
        }, 1000);
      }

      if (elapsed >= IDLE_MS) {
        clearInterval(pollInterval);
        if (countdownInterval) clearInterval(countdownInterval);
        await AsyncStorage.multiRemove(['token', 'userToken', 'user']);
        router.replace('/login');
      }
    }, 30000);

    return () => {
      if (pollInterval) clearInterval(pollInterval);
      if (countdownInterval) clearInterval(countdownInterval);
      if (typeof window !== 'undefined') {
        window.removeEventListener('mousemove', reset);
        window.removeEventListener('keydown', reset);
        window.removeEventListener('click', reset);
        window.removeEventListener('scroll', reset);
      }
    };
  }, [router]);

  const handleStayLoggedIn = () => {
    setShowIdleWarning(false);
    setIdleCountdown(60);
  };

  const initial = user?.name?.charAt(0).toUpperCase() || 'U';

  return (
    <View style={styles.headerContainer}>
      <View style={styles.headerSurface}>
        {/* Left: Logo & Title */}
        <View style={styles.headerLeft}>
          <BrandIcon size={28} />
          <View style={styles.logoText}>
            <Text style={styles.brandPart1}>Sparklean</Text>
            <Text style={styles.brandPart2}>Laundry Shop</Text>
            <Text style={styles.brandPart3}>Staff</Text>
          </View>
          {showPageTitle && title && (
            <View style={styles.pageTitleContainer}>
              <Text style={styles.pageTitle}>{title}</Text>
            </View>
          )}
        </View>

        {/* Right: User Menu */}
        <View style={styles.headerRight}>
          <TouchableOpacity
            ref={userButtonRef}
            style={styles.userInfo}
            onPress={() => {
              if (userButtonRef.current) {
                userButtonRef.current.measure((fx: number, fy: number, fwidth: number, fheight: number, px: number, py: number) => {
                  setUserButtonLayout({ x: px, y: py, width: fwidth, height: fheight });
                  setUserMenuOpen(!userMenuOpen);
                });
              } else {
                setUserMenuOpen(!userMenuOpen);
              }
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.welcomeText}>Welcome, {user?.name || 'Staff'}</Text>
            <View style={styles.userAvatar}>
              <Text style={styles.avatarText}>{initial}</Text>
            </View>
            <Ionicons name="chevron-down" size={16} color="#6B7280" />
          </TouchableOpacity>
        </View>
      </View>

      {/* User Menu Dropdown */}
      <Modal
        visible={userMenuOpen}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setUserMenuOpen(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setUserMenuOpen(false)}
        >
          <View 
            style={[
              styles.userMenuWrapper,
              {
                position: 'absolute',
                top: userButtonLayout.y > 0 ? userButtonLayout.y + userButtonLayout.height + 8 : 60,
                right: userButtonLayout.x > 0 && typeof window !== 'undefined' 
                  ? window.innerWidth - userButtonLayout.x - userButtonLayout.width 
                  : 16,
              }
            ]}
            onStartShouldSetResponder={() => true}
          >
            <View style={styles.userMenuPanel} onStartShouldSetResponder={() => true}>
            <View style={styles.userMenuHeader}>
              <View style={styles.userMenuAvatar}>
                <Text style={styles.userMenuAvatarText}>{initial}</Text>
              </View>
              <View style={styles.userMenuInfo}>
                <Text style={styles.userMenuName}>{user?.name || 'Staff User'}</Text>
                <Text style={styles.userMenuRole}>Staff Member</Text>
              </View>
            </View>

            <View style={styles.userMenuDivider} />

            <View style={styles.userMenuItems}>
              <TouchableOpacity
                style={styles.userMenuItem}
                onPress={() => {
                  setUserMenuOpen(false);
                  router.push('/home/settings');
                }}
              >
                <Ionicons name="settings-outline" size={18} color="#374151" />
                <Text style={styles.userMenuItemText}>Settings</Text>
              </TouchableOpacity>

              <View style={styles.userMenuDivider} />

              <TouchableOpacity
                style={[styles.userMenuItem, styles.logoutItem]}
                onPress={() => {
                  setUserMenuOpen(false);
                  handleLogoutClick();
                }}
              >
                <Ionicons name="log-out-outline" size={18} color="#DC2626" />
                <Text style={[styles.userMenuItemText, styles.logoutText]}>Logout</Text>
              </TouchableOpacity>
            </View>
          </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Logout Confirmation Modal */}
      <Modal
        visible={showLogoutModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowLogoutModal(false)}
      >
        <TouchableOpacity
          style={styles.logoutModalOverlay}
          activeOpacity={1}
          onPress={() => setShowLogoutModal(false)}
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
                onPress={() => setShowLogoutModal(false)}
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

      <Modal visible={showIdleWarning} animationType="fade" transparent>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ width: 320, backgroundColor: 'white', borderRadius: 12, padding: 16 }}>
            <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 8 }}>You will be logged out soon</Text>
            <Text style={{ color: '#374151' }}>No activity detected. You will be logged out in <Text style={{ fontWeight: '700' }}>{idleCountdown}</Text> seconds.</Text>
            <View style={{ marginTop: 16, flexDirection: 'row', justifyContent: 'flex-end' }}>
              <Pressable onPress={handleStayLoggedIn} style={{ backgroundColor: '#2563EB', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8 }}>
                <Text style={{ color: 'white', fontWeight: '600' }}>Stay Logged In</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = {
  headerContainer: {
    height: 70,
    paddingHorizontal: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerSurface: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
    flex: 1,
    width: '100%',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  logoImage: {
    width: 28,
    height: 28,
  },
  logoText: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  brandPart1: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2563EB',
    fontFamily: 'Poppins_700Bold',
  },
  brandPart2: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F97316',
    fontFamily: 'Poppins_600SemiBold',
  },
  brandPart3: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
    fontFamily: 'Poppins_500Medium',
  },
  pageTitleContainer: {
    marginLeft: 16,
    paddingLeft: 16,
    borderLeftWidth: 1,
    borderLeftColor: '#E5E7EB',
  },
  pageTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2563EB',
    fontFamily: 'Poppins_600SemiBold',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
  },
  welcomeText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    fontFamily: 'Poppins_500Medium',
  },
  userAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    fontFamily: 'Poppins_600SemiBold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  userMenuWrapper: {
    alignItems: 'flex-end',
  },
  userMenuPanel: {
    width: 240,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 40,
    elevation: 8,
    overflow: 'hidden',
  },
  userMenuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  userMenuAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userMenuAvatarText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: 'Poppins_600SemiBold',
  },
  userMenuInfo: {
    flex: 1,
  },
  userMenuName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    fontFamily: 'Poppins_600SemiBold',
  },
  userMenuRole: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
    fontFamily: 'Poppins_400Regular',
  },
  userMenuDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 4,
  },
  userMenuItems: {
    paddingVertical: 4,
  },
  userMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  userMenuItemText: {
    fontSize: 14,
    color: '#374151',
    fontFamily: 'Poppins_400Regular',
  },
  logoutItem: {},
  logoutText: {
    color: '#DC2626',
  },
  logoutModalOverlay: {
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
    fontFamily: 'Poppins_700Bold',
  },
  logoutModalMessage: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 24,
    lineHeight: 24,
    fontFamily: 'Poppins_400Regular',
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
    fontFamily: 'Poppins_600SemiBold',
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
    fontFamily: 'Poppins_600SemiBold',
  },
};

export default Header;

