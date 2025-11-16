import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_BASE_URL } from '@/constants/api';
import GlobalStyles from "../styles/GlobalStyle";
import ModernSidebar from './components/ModernSidebar';
import Header from './components/Header';
import { colors, typography, spacing, borderRadius, cardStyles, buttonStyles, inputStyles } from '@/app/theme/designSystem';

type UserProfile = {
  _id?: string;
  username?: string;
  email?: string;
  role?: string;
  stationId?: string;
};

export default function Settings() {
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'email'>('profile');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Profile form state
  const [profileForm, setProfileForm] = useState({
    username: '',
  });

  // Password form state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  // Email form state
  const [emailForm, setEmailForm] = useState({
    newEmail: '',
    confirmEmail: '',
  });
  const [isEmailVerificationSent, setIsEmailVerificationSent] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [isCodeVerified, setIsCodeVerified] = useState(false);

  // Load user profile
  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('token') || await AsyncStorage.getItem('userToken');
      if (!token) {
        Alert.alert('Error', 'Please log in again');
        return;
      }

      const response = await axios.get(`${API_BASE_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        const userData = response.data.data;
        setUser(userData);
        setProfileForm({
          username: userData.username || '',
        });
      }
    } catch (error: any) {
      console.error('Error fetching profile:', error);
      Alert.alert('Error', error?.response?.data?.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleProfileUpdate = async () => {
    if (!profileForm.username.trim()) {
      Alert.alert('Error', 'Please enter a username');
      return;
    }

    try {
      setSaving(true);
      const token = await AsyncStorage.getItem('token') || await AsyncStorage.getItem('userToken');
      
      const response = await axios.put(`${API_BASE_URL}/auth/me`, { username: profileForm.username }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setUser(response.data.data);
        setSuccessMessage('Profile updated successfully!');
        setShowSuccessMessage(true);
      }
    } catch (error: any) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', error?.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleSendVerificationEmail = async () => {
    if (!emailForm.newEmail || !emailForm.confirmEmail) {
      Alert.alert('Error', 'Please enter email addresses');
      return;
    }

    if (emailForm.newEmail !== emailForm.confirmEmail) {
      Alert.alert('Error', 'Email addresses do not match');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailForm.newEmail)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    try {
      setSaving(true);
      const token = await AsyncStorage.getItem('token') || await AsyncStorage.getItem('userToken');
      
      const response = await axios.post(
        `${API_BASE_URL}/auth/send-verification-code`,
        { email: emailForm.newEmail },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.data.success) {
        setIsEmailVerificationSent(true);
        setSuccessMessage('Verification code sent to your email! Please check your inbox.');
        setShowSuccessMessage(true);
      }
    } catch (error: any) {
      console.error('Error sending verification code:', error);
      Alert.alert('Error', error?.response?.data?.message || 'Failed to send verification code');
    } finally {
      setSaving(false);
    }
  };

  const handleVerifyCode = async () => {
    if (verificationCode.length !== 6) {
      Alert.alert('Error', 'Please enter a valid 6-digit code');
      return;
    }

    try {
      setSaving(true);
      const token = await AsyncStorage.getItem('token') || await AsyncStorage.getItem('userToken');
      
      const response = await axios.post(
        `${API_BASE_URL}/auth/verify-email-code`,
        {
          email: emailForm.newEmail,
          code: verificationCode,
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.data.success) {
        setIsCodeVerified(true);
        setSuccessMessage('Email verified successfully!');
        setShowSuccessMessage(true);
      }
    } catch (error: any) {
      console.error('Error verifying code:', error);
      Alert.alert('Error', error?.response?.data?.message || 'Invalid verification code');
    } finally {
      setSaving(false);
    }
  };

  const handleEmailChange = async () => {
    if (emailForm.newEmail !== emailForm.confirmEmail) {
      Alert.alert('Error', 'Email addresses do not match');
      return;
    }

    if (!isCodeVerified) {
      Alert.alert('Error', 'Please verify your email address first');
      return;
    }

    try {
      setSaving(true);
      const token = await AsyncStorage.getItem('token') || await AsyncStorage.getItem('userToken');
      
      const response = await axios.put(
        `${API_BASE_URL}/auth/me`,
        { email: emailForm.newEmail },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.data.success) {
        setUser(response.data.data);
        setSuccessMessage('Email changed successfully!');
        setShowSuccessMessage(true);
        setEmailForm({ newEmail: '', confirmEmail: '' });
        setIsEmailVerificationSent(false);
        setIsCodeVerified(false);
        setVerificationCode('');
        // Persist updated user in storage so header and other places reflect new email
        try {
          await AsyncStorage.setItem('user', JSON.stringify(response.data.data));
        } catch {}
      }
    } catch (error: any) {
      console.error('Error changing email:', error);
      Alert.alert('Error', error?.response?.data?.message || 'Failed to change email');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      Alert.alert('Error', 'Please fill in all password fields');
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      Alert.alert('Error', 'New passwords do not match');
      return;
    }

    try {
      setSaving(true);
      const token = await AsyncStorage.getItem('token') || await AsyncStorage.getItem('userToken');
      
      const response = await axios.put(
        `${API_BASE_URL}/auth/change-password`,
        {
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.data.success) {
        setSuccessMessage('Password changed successfully!');
        setShowSuccessMessage(true);
        setPasswordForm({
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        });
      }
    } catch (error: any) {
      console.error('Error changing password:', error);
      Alert.alert('Error', error?.response?.data?.message || 'Failed to change password');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={GlobalStyles.mainLayout}>
        <ModernSidebar />
        <View style={GlobalStyles.mainContent}>
          <Header title="Settings" />
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2563EB" />
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={GlobalStyles.mainLayout}>
      <ModernSidebar />
      <View style={GlobalStyles.mainContent}>
        <Header title="Settings" />
        
        {/* Success Modal */}
        {showSuccessMessage && (
          <Modal visible transparent animationType="fade" onRequestClose={() => setShowSuccessMessage(false)}>
            <View style={styles.feedbackOverlay}>
              <View style={styles.feedbackCard}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons name="checkmark-circle" size={24} color="#059669" />
                  <Text style={styles.feedbackTitle}>Success</Text>
                </View>
                <Text style={styles.feedbackText}>{successMessage}</Text>
                <View style={{ marginTop: 16, alignItems: 'flex-end' }}>
                  <TouchableOpacity style={[styles.saveButton]} onPress={() => setShowSuccessMessage(false)}>
                    <Text style={styles.saveButtonText}>OK</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        )}
        
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, paddingBottom: 20 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Page Header */}
          <View style={styles.pageHeader}>
            <View style={styles.titleRow}>
              <Ionicons name="settings-outline" size={28} color="#111827" style={{ marginRight: 12 }} />
              <View>
                <Text style={styles.pageTitle}>Settings</Text>
                <Text style={styles.pageSubtitle}>Manage your profile, email, and security</Text>
              </View>
            </View>
          </View>

          <View style={styles.settingsContainer}>
            {/* Sidebar Tabs */}
            <View style={styles.settingsSidebar}>
              <View style={styles.settingsTabs}>
                <TouchableOpacity
                  style={[styles.settingsTab, activeTab === 'profile' && styles.settingsTabActive]}
                  onPress={() => setActiveTab('profile')}
                >
                  <Ionicons name="person-outline" size={18} color={activeTab === 'profile' ? '#2563EB' : '#6B7280'} />
                  <Text style={[styles.settingsTabText, activeTab === 'profile' && styles.settingsTabTextActive]}>Profile</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.settingsTab, activeTab === 'security' && styles.settingsTabActive]}
                  onPress={() => setActiveTab('security')}
                >
                  <Ionicons name="shield-checkmark-outline" size={18} color={activeTab === 'security' ? '#2563EB' : '#6B7280'} />
                  <Text style={[styles.settingsTabText, activeTab === 'security' && styles.settingsTabTextActive]}>Security</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.settingsTab, activeTab === 'email' && styles.settingsTabActive]}
                  onPress={() => setActiveTab('email')}
                >
                  <Ionicons name="mail-outline" size={18} color={activeTab === 'email' ? '#2563EB' : '#6B7280'} />
                  <Text style={[styles.settingsTabText, activeTab === 'email' && styles.settingsTabTextActive]}>Email</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Content Panel */}
            <View style={styles.settingsContent}>
              {activeTab === 'profile' && (
              <View style={styles.card}>
              <Text style={styles.sectionTitle}>Profile Information</Text>
              <Text style={styles.sectionDescription}>
                Update your account information
              </Text>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Username</Text>
                <TextInput
                  style={styles.input}
                  value={profileForm.username}
                  onChangeText={(text) => setProfileForm({ ...profileForm, username: text })}
                  placeholder="Enter username"
                  autoCapitalize="none"
                />
              </View>

              {user?.email && (
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Email Address</Text>
                  <TextInput
                    style={[styles.input, styles.inputDisabled]}
                    value={user.email}
                    editable={false}
                  />
                  <Text style={styles.hint}>Email can be changed in the Email tab</Text>
                </View>
              )}

              {user?.stationId && (
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Station ID</Text>
                  <TextInput
                    style={[styles.input, styles.inputDisabled]}
                    value={user.stationId}
                    editable={false}
                  />
                  <Text style={styles.hint}>Station ID cannot be changed</Text>
                </View>
              )}

              <TouchableOpacity
                style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                onPress={handleProfileUpdate}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle-outline" size={20} color="#FFFFFF" />
                    <Text style={styles.saveButtonText}>Save Changes</Text>
                  </>
                )}
              </TouchableOpacity>
              </View>
              )}

              {activeTab === 'security' && (
              <View style={styles.card}>
              <Text style={styles.sectionTitle}>Change Password</Text>
              <Text style={styles.sectionDescription}>
                Update your password to keep your account secure
              </Text>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Current Password</Text>
                <View style={styles.passwordInputContainer}>
                  <TextInput
                    style={styles.passwordInput}
                    value={passwordForm.currentPassword}
                    onChangeText={(text) => setPasswordForm({ ...passwordForm, currentPassword: text })}
                    placeholder="Enter current password"
                    secureTextEntry={!showPasswords.current}
                  />
                  <TouchableOpacity
                    onPress={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                    style={styles.eyeIcon}
                  >
                    <Ionicons
                      name={showPasswords.current ? 'eye-outline' : 'eye-off-outline'}
                      size={20}
                      color="#6B7280"
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>New Password</Text>
                <View style={styles.passwordInputContainer}>
                  <TextInput
                    style={styles.passwordInput}
                    value={passwordForm.newPassword}
                    onChangeText={(text) => setPasswordForm({ ...passwordForm, newPassword: text })}
                    placeholder="Enter new password"
                    secureTextEntry={!showPasswords.new}
                  />
                  <TouchableOpacity
                    onPress={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                    style={styles.eyeIcon}
                  >
                    <Ionicons
                      name={showPasswords.new ? 'eye-outline' : 'eye-off-outline'}
                      size={20}
                      color="#6B7280"
                    />
                  </TouchableOpacity>
                </View>
                <Text style={styles.hint}>Password must be at least 6 characters long</Text>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Confirm New Password</Text>
                <View style={styles.passwordInputContainer}>
                  <TextInput
                    style={styles.passwordInput}
                    value={passwordForm.confirmPassword}
                    onChangeText={(text) => setPasswordForm({ ...passwordForm, confirmPassword: text })}
                    placeholder="Confirm new password"
                    secureTextEntry={!showPasswords.confirm}
                  />
                  <TouchableOpacity
                    onPress={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                    style={styles.eyeIcon}
                  >
                    <Ionicons
                      name={showPasswords.confirm ? 'eye-outline' : 'eye-off-outline'}
                      size={20}
                      color="#6B7280"
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                onPress={handlePasswordChange}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="lock-closed-outline" size={20} color="#FFFFFF" />
                    <Text style={styles.saveButtonText}>Update Password</Text>
                  </>
                )}
              </TouchableOpacity>
              </View>
              )}

              {activeTab === 'email' && (
              <View style={styles.card}>
              <Text style={styles.sectionTitle}>Change Email Address</Text>
              <Text style={styles.sectionDescription}>
                Update your email address with verification
              </Text>

              {user?.email && (
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Current Email</Text>
                  <Text style={styles.currentEmailValue}>{user.email}</Text>
                </View>
              )}

              <View style={styles.formGroup}>
                <Text style={styles.label}>New Email Address</Text>
                <TextInput
                  style={styles.input}
                  value={emailForm.newEmail}
                  onChangeText={(text) => setEmailForm({ ...emailForm, newEmail: text })}
                  placeholder="Enter your new email address"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  editable={!isEmailVerificationSent}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Confirm New Email</Text>
                <TextInput
                  style={styles.input}
                  value={emailForm.confirmEmail}
                  onChangeText={(text) => setEmailForm({ ...emailForm, confirmEmail: text })}
                  placeholder="Confirm your new email address"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  editable={!isEmailVerificationSent}
                />
                {emailForm.confirmEmail && emailForm.newEmail !== emailForm.confirmEmail && (
                  <Text style={styles.errorText}>Email addresses do not match</Text>
                )}
              </View>

              {!isEmailVerificationSent ? (
                <TouchableOpacity
                  style={[
                    styles.saveButton,
                    (saving || !emailForm.newEmail || !emailForm.confirmEmail || emailForm.newEmail !== emailForm.confirmEmail) && styles.saveButtonDisabled
                  ]}
                  onPress={handleSendVerificationEmail}
                  disabled={saving || !emailForm.newEmail || !emailForm.confirmEmail || emailForm.newEmail !== emailForm.confirmEmail}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons name="send-outline" size={20} color="#FFFFFF" />
                      <Text style={styles.saveButtonText}>Send Verification Code</Text>
                    </>
                  )}
                </TouchableOpacity>
              ) : (
                <View style={styles.verificationSection}>
                  <View style={styles.verificationStatus}>
                    <Ionicons name="checkmark-circle" size={20} color="#059669" />
                    <Text style={styles.verificationStatusText}>
                      Verification code sent to {emailForm.newEmail}
                    </Text>
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Verification Code</Text>
                    <TextInput
                      style={styles.input}
                      value={verificationCode}
                      onChangeText={(text) => setVerificationCode(text.replace(/\D/g, '').slice(0, 6))}
                      placeholder="Enter 6-digit code"
                      keyboardType="number-pad"
                      maxLength={6}
                      editable={!isCodeVerified}
                    />
                  </View>

                  {!isCodeVerified && (
                    <TouchableOpacity
                      style={[
                        styles.saveButton,
                        (saving || verificationCode.length !== 6) && styles.saveButtonDisabled
                      ]}
                      onPress={handleVerifyCode}
                      disabled={saving || verificationCode.length !== 6}
                    >
                      {saving ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <>
                          <Ionicons name="checkmark-circle-outline" size={20} color="#FFFFFF" />
                          <Text style={styles.saveButtonText}>Verify Code</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}

                  {isCodeVerified && (
                    <TouchableOpacity
                      style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                      onPress={handleEmailChange}
                      disabled={saving}
                    >
                      {saving ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <>
                          <Ionicons name="mail-outline" size={20} color="#FFFFFF" />
                          <Text style={styles.saveButtonText}>Update Email Address</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              )}
              </View>
              )}

            </View>
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  settingsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
    margin: 16,
  },
  settingsSidebar: {
    width: 220,
    backgroundColor: '#F9FAFB',
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
  },
  settingsTabs: {
    paddingVertical: 8,
  },
  settingsTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderLeftWidth: 3,
    borderLeftColor: 'transparent',
  },
  settingsTabActive: {
    backgroundColor: '#EFF6FF',
    borderLeftColor: '#2563EB',
  },
  settingsTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  settingsTabTextActive: {
    color: '#2563EB',
  },
  settingsContent: {
    flex: 1,
    padding: 16,
  },
  columnsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 0,
    marginHorizontal: 0,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    flexGrow: 1,
    flexBasis: '32%',
    minWidth: 300,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    margin: 16,
    borderRadius: 12,
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
    fontFamily: 'Poppins_700Bold',
  },
  sectionDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
    fontFamily: 'Poppins_400Regular',
  },
  formGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    fontFamily: 'Poppins_600SemiBold',
  },
  input: {
    ...inputStyles.base,
  },
  inputDisabled: {
    ...inputStyles.disabled,
  },
  passwordInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
  },
  eyeIcon: {
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  hint: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  saveButton: {
    ...buttonStyles.primary,
    marginTop: spacing.sm,
  },
  saveButtonDisabled: {
    ...buttonStyles.disabled,
  },
  saveButtonText: {
    ...buttonStyles.primaryText,
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    borderWidth: 1,
    borderColor: '#059669',
    borderRadius: 8,
    padding: 16,
    margin: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  successBannerText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#059669',
  },
  successBannerClose: {
    padding: 4,
  },
  feedbackOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  feedbackCard: {
    width: '100%',
    maxWidth: 520,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  feedbackTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
    fontFamily: 'Poppins_700Bold',
  },
  feedbackText: {
    fontSize: 16,
    color: '#374151',
    fontFamily: 'Poppins_400Regular',
  },
  pageHeader: {
    marginBottom: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pageTitle: {
    ...typography.h1,
    marginBottom: spacing.xs,
  },
  pageSubtitle: {
    ...typography.body,
    color: colors.text.secondary,
  },
  currentEmailValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    fontFamily: 'Poppins_600SemiBold',
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 4,
  },
  verificationSection: {
    gap: 16,
  },
  verificationStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: '#D1FAE5',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#059669',
  },
  verificationStatusText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#059669',
    flex: 1,
  },
});
