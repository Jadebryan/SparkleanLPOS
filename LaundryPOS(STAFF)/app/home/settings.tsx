import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, Modal, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import EmailInput from '@/components/EmailInput';
import { API_BASE_URL } from '@/constants/api';
import GlobalStyles from "../styles/GlobalStyle";
import ModernSidebar from './components/ModernSidebar';
import Header from './components/Header';
import { colors, typography, spacing, borderRadius, cardStyles, buttonStyles, inputStyles } from '@/app/theme/designSystem';
import { colorPalettes, getColorPalettePreference, setColorPalettePreference } from '@/utils/colorPalette';
import { useColorPalette } from '@/app/context/ColorPaletteContext';
import { useColors } from '@/app/theme/useColors';
import { useButtonStyles } from '@/app/theme/useButtonStyles';

type UserProfile = {
  _id?: string;
  username?: string;
  email?: string;
  role?: string;
  stationId?: string;
  location?: {
    latitude?: number;
    longitude?: number;
    locationUpdatedAt?: string;
  };
};

export default function Settings() {
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'email' | 'appearance'>('profile');
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


  const [sessionSettings, setSessionSettings] = useState({
    enabled: true,
    timeoutMinutes: 15,
    warningSeconds: 60,
  });
  const [sessionLoading, setSessionLoading] = useState(false);
  const [sessionSaving, setSessionSaving] = useState(false);
  const [sessionSaveSuccess, setSessionSaveSuccess] = useState(false);
  
  // Color palette state
  const [selectedPalette, setSelectedPalette] = useState<string>('default');
  const { setActivePalette } = useColorPalette();
  const dynamicColors = useColors();
  const dynamicButtonStyles = useButtonStyles();

  // Load user profile
  useEffect(() => {
    fetchUserProfile();
    fetchSessionSettings();
    loadColorPalette();
  }, []);
  
  const loadColorPalette = async () => {
    const palette = await getColorPalettePreference();
    setSelectedPalette(palette);
  };

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

  const fetchSessionSettings = async () => {
    try {
      setSessionLoading(true);
      const token = await AsyncStorage.getItem('token') || await AsyncStorage.getItem('userToken');
      if (!token) return;
      const headers: any = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
      const response = await axios.get(`${API_BASE_URL}/system-settings/inactivity`, { headers });
      const data = response.data?.data || response.data;
      if (data?.staff) {
        setSessionSettings({
          enabled: data.staff.enabled ?? true,
          timeoutMinutes: data.staff.timeoutMinutes ?? 15,
          warningSeconds: data.staff.warningSeconds ?? 60,
        });
      }
    } catch (error: any) {
      console.error('Error loading session settings:', error);
    } finally {
      setSessionLoading(false);
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

  const handleSessionSettingSave = async () => {
    const minutes = Number(sessionSettings.timeoutMinutes);
    if (minutes < 5 || minutes > 240) {
      Alert.alert('Error', 'Timeout must be between 5 and 240 minutes');
      return;
    }
    const warningLimit = Math.max(minutes * 60 - 5, 5);
    const warning = Number(sessionSettings.warningSeconds);
    if (warning < 5 || warning > warningLimit) {
      Alert.alert('Error', `Warning countdown must be between 5 and ${warningLimit} seconds`);
      return;
    }

    try {
      setSessionSaving(true);
      const token = await AsyncStorage.getItem('token') || await AsyncStorage.getItem('userToken');
      if (!token) {
        Alert.alert('Error', 'Please log in again');
        return;
      }
      const headers: any = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
      await axios.put(`${API_BASE_URL}/system-settings/inactivity`, {
        enabled: sessionSettings.enabled,
        timeoutMinutes: minutes,
        warningSeconds: warning,
        role: 'staff',
      }, { headers });
      
      // Store a flag in AsyncStorage to notify Header to reload settings
      await AsyncStorage.setItem('sessionSettingsUpdated', Date.now().toString());
      
      // Show visual feedback on button
      setSessionSaveSuccess(true);
      setTimeout(() => setSessionSaveSuccess(false), 2000);
      
      // Show success message using the same modal as other operations
      setSuccessMessage('Session timeout settings updated successfully! The new settings will take effect immediately.');
      setShowSuccessMessage(true);
    } catch (error: any) {
      console.error('Error updating session settings:', error);
      Alert.alert('Error', error?.response?.data?.message || 'Failed to update session timeout');
    } finally {
      setSessionSaving(false);
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
            <ActivityIndicator size="large" color={dynamicColors.primary[500]} />
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
                  <Ionicons name="checkmark-circle" size={24} color={dynamicColors.success[500]} />
                  <Text style={styles.feedbackTitle}>Success</Text>
                </View>
                <Text style={styles.feedbackText}>{successMessage}</Text>
                <View style={{ marginTop: 16, alignItems: 'flex-end' }}>
                  <TouchableOpacity style={[styles.saveButton, dynamicButtonStyles.primary]} onPress={() => setShowSuccessMessage(false)}>
                    <Text style={[styles.saveButtonText, dynamicButtonStyles.primaryText]}>OK</Text>
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
              <Ionicons name="settings-outline" size={28} color={dynamicColors.primary[500]} style={{ marginRight: 12 }} />
              <View>
                <Text style={[styles.pageTitle, { color: dynamicColors.primary[500] }]}>Settings</Text>
                <Text style={styles.pageSubtitle}>Manage your profile, email, and security</Text>
              </View>
            </View>
          </View>

          <View style={styles.settingsContainer}>
            {/* Sidebar Tabs */}
            <View style={styles.settingsSidebar}>
              <View style={styles.settingsTabs}>
                <TouchableOpacity
                  style={[
                    styles.settingsTab,
                    activeTab === 'profile' && [styles.settingsTabActive, { borderLeftColor: dynamicColors.primary[500], backgroundColor: dynamicColors.primary[50] }]
                  ]}
                  onPress={() => setActiveTab('profile')}
                >
                  <Ionicons name="person-outline" size={18} color={activeTab === 'profile' ? dynamicColors.primary[500] : '#6B7280'} />
                  <Text style={[styles.settingsTabText, activeTab === 'profile' && { color: dynamicColors.primary[500] }]}>Profile</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.settingsTab,
                    activeTab === 'security' && [styles.settingsTabActive, { borderLeftColor: dynamicColors.primary[500], backgroundColor: dynamicColors.primary[50] }]
                  ]}
                  onPress={() => setActiveTab('security')}
                >
                  <Ionicons name="shield-checkmark-outline" size={18} color={activeTab === 'security' ? dynamicColors.primary[500] : '#6B7280'} />
                  <Text style={[styles.settingsTabText, activeTab === 'security' && { color: dynamicColors.primary[500] }]}>Security</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.settingsTab,
                    activeTab === 'email' && [styles.settingsTabActive, { borderLeftColor: dynamicColors.primary[500], backgroundColor: dynamicColors.primary[50] }]
                  ]}
                  onPress={() => setActiveTab('email')}
                >
                  <Ionicons name="mail-outline" size={18} color={activeTab === 'email' ? dynamicColors.primary[500] : '#6B7280'} />
                  <Text style={[styles.settingsTabText, activeTab === 'email' && { color: dynamicColors.primary[500] }]}>Email</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.settingsTab,
                    activeTab === 'appearance' && [styles.settingsTabActive, { borderLeftColor: dynamicColors.primary[500], backgroundColor: dynamicColors.primary[50] }]
                  ]}
                  onPress={() => setActiveTab('appearance')}
                >
                  <Ionicons name="color-palette-outline" size={18} color={activeTab === 'appearance' ? dynamicColors.primary[500] : '#6B7280'} />
                  <Text style={[styles.settingsTabText, activeTab === 'appearance' && { color: dynamicColors.primary[500] }]}>Appearance</Text>
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
                style={[styles.saveButton, dynamicButtonStyles.primary, saving && styles.saveButtonDisabled]}
                onPress={handleProfileUpdate}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle-outline" size={20} color="#FFFFFF" />
                    <Text style={[styles.saveButtonText, dynamicButtonStyles.primaryText]}>Save Changes</Text>
                  </>
                )}
              </TouchableOpacity>
              </View>
              )}

              {activeTab === 'security' && (
              <>
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
                style={[styles.saveButton, dynamicButtonStyles.primary, saving && styles.saveButtonDisabled]}
                onPress={handlePasswordChange}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="lock-closed-outline" size={20} color="#FFFFFF" />
                    <Text style={[styles.saveButtonText, dynamicButtonStyles.primaryText]}>Update Password</Text>
                  </>
                )}
              </TouchableOpacity>
              </View>

              <View style={styles.card}>
                <Text style={styles.sectionTitle}>Session Timeout</Text>
                <Text style={styles.sectionDescription}>
                  Control automatic logout after inactivity.
                </Text>
                <View style={styles.sessionToggleRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.label}>Automatic Logout</Text>
                    <Text style={styles.hint}>Disable to keep your session active indefinitely.</Text>
                  </View>
                  <Switch
                    value={sessionSettings.enabled}
                    onValueChange={(value) => setSessionSettings(prev => ({ ...prev, enabled: value }))}
                    trackColor={{ false: '#d1d5db', true: '#93c5fd' }}
                    thumbColor={sessionSettings.enabled ? dynamicColors.primary[500] : '#f4f4f5'}
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Timeout (minutes)</Text>
                  <TextInput
                    style={[styles.input, !sessionSettings.enabled && styles.inputDisabled]}
                    keyboardType="numeric"
                    editable={sessionSettings.enabled}
                    value={String(sessionSettings.timeoutMinutes)}
                    onChangeText={(text) => {
                      const minutes = Math.min(Math.max(parseInt(text || '0', 10) || 0, 1), 240)
                      setSessionSettings(prev => ({
                        ...prev,
                        timeoutMinutes: minutes,
                        warningSeconds: Math.min(prev.warningSeconds, Math.max(minutes * 60 - 5, 5)),
                      }))
                    }}
                    placeholder="15"
                  />
                  <Text style={styles.hint}>Between 5 and 240 minutes.</Text>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Warning countdown (seconds)</Text>
                  <TextInput
                    style={[styles.input, !sessionSettings.enabled && styles.inputDisabled]}
                    keyboardType="numeric"
                    editable={sessionSettings.enabled}
                    value={String(sessionSettings.warningSeconds)}
                    onChangeText={(text) => {
                      const seconds = Math.max(parseInt(text || '0', 10) || 0, 5)
                      setSessionSettings(prev => ({ ...prev, warningSeconds: seconds }))
                    }}
                    placeholder="60"
                  />
                  <Text style={styles.hint}>Users will see this warning before being logged out.</Text>
                </View>

                <TouchableOpacity
                  style={[
                    styles.saveButton,
                    dynamicButtonStyles.primary,
                    (sessionSaving || sessionLoading) && styles.saveButtonDisabled,
                    sessionSaveSuccess && { backgroundColor: dynamicColors.success[500] },
                  ]}
                  onPress={handleSessionSettingSave}
                  disabled={sessionSaving || sessionLoading}
                >
                  {sessionSaving ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : sessionSaveSuccess ? (
                    <>
                      <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                      <Text style={[styles.saveButtonText, dynamicButtonStyles.primaryText]}>Saved!</Text>
                    </>
                  ) : (
                    <>
                      <Ionicons name="time-outline" size={20} color="#FFFFFF" />
                      <Text style={[styles.saveButtonText, dynamicButtonStyles.primaryText]}>Save Session Settings</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
              </>
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
                <EmailInput
                  style={styles.input}
                  value={emailForm.newEmail}
                  onChangeText={(text) => setEmailForm({ ...emailForm, newEmail: text })}
                  placeholder="Enter your new email address"
                  editable={!isEmailVerificationSent}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Confirm New Email</Text>
                <EmailInput
                  style={styles.input}
                  value={emailForm.confirmEmail}
                  onChangeText={(text) => setEmailForm({ ...emailForm, confirmEmail: text })}
                  placeholder="Confirm your new email address"
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
                    dynamicButtonStyles.primary,
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
                      <Text style={[styles.saveButtonText, dynamicButtonStyles.primaryText]}>Send Verification Code</Text>
                    </>
                  )}
                </TouchableOpacity>
              ) : (
                <View style={styles.verificationSection}>
                  <View style={[styles.verificationStatus, { backgroundColor: dynamicColors.success[50], borderColor: dynamicColors.success[500] }]}>
                    <Ionicons name="checkmark-circle" size={20} color={dynamicColors.success[500]} />
                    <Text style={[styles.verificationStatusText, { color: dynamicColors.success[500] }]}>
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
                        dynamicButtonStyles.primary,
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
                          <Text style={[styles.saveButtonText, dynamicButtonStyles.primaryText]}>Verify Code</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}

                  {isCodeVerified && (
                    <TouchableOpacity
                      style={[styles.saveButton, dynamicButtonStyles.primary, saving && styles.saveButtonDisabled]}
                      onPress={handleEmailChange}
                      disabled={saving}
                    >
                      {saving ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <>
                          <Ionicons name="mail-outline" size={20} color="#FFFFFF" />
                          <Text style={[styles.saveButtonText, dynamicButtonStyles.primaryText]}>Update Email Address</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              )}
              </View>
              )}

              {activeTab === 'appearance' && (
                <View style={styles.card}>
                  <Text style={styles.sectionTitle}>Appearance Settings</Text>
                  <Text style={styles.sectionDescription}>
                    Customize the look and feel of your application
                  </Text>

                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Color Palette</Text>
                    <Text style={styles.sectionDescription}>
                      Choose a color scheme that matches your style. Changes apply immediately.
                    </Text>
                    <View style={styles.colorPaletteSelector}>
                      {colorPalettes.map((palette) => (
                        <TouchableOpacity
                          key={palette.id}
                          style={[
                            styles.colorPaletteOption,
                            selectedPalette === palette.id && [
                              styles.colorPaletteOptionSelected,
                              { borderColor: dynamicColors.primary[500], backgroundColor: dynamicColors.primary[50] }
                            ],
                          ]}
                          onPress={async () => {
                            setSelectedPalette(palette.id);
                            await setColorPalettePreference(palette.id);
                            await setActivePalette(palette.id);
                            // Small delay to ensure state updates
                            setTimeout(() => {
                              Alert.alert('Success', `Color palette changed to ${palette.name}!`);
                            }, 100);
                          }}
                        >
                          <View style={styles.palettePreview}>
                            {palette.preview.map((color, index) => (
                              <View
                                key={index}
                                style={[styles.paletteColorSwatch, { backgroundColor: color }]}
                              />
                            ))}
                          </View>
                          <View style={styles.paletteInfo}>
                            <Text style={styles.paletteName}>{palette.name}</Text>
                            <Text style={styles.paletteDescription}>{palette.description}</Text>
                          </View>
                          {selectedPalette === palette.id && (
                            <Ionicons name="checkmark-circle" size={24} color={dynamicColors.primary[500]} style={styles.paletteCheckIcon} />
                          )}
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
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
    // backgroundColor: '#EFF6FF', // Now using dynamic color via inline style
    // borderLeftColor: '#2563EB', // Now using dynamic color via inline style
  },
  settingsTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  settingsTabTextActive: {
    // color: '#2563EB', // Now using dynamic color via inline style
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
  sessionToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  saveButton: {
    ...buttonStyles.primary,
    marginTop: spacing.sm,
    zIndex: 10,
  },
  saveButtonDisabled: {
    ...buttonStyles.disabled,
    opacity: 0.5,
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
  colorPaletteSelector: {
    marginTop: 16,
    gap: 16,
  },
  colorPaletteOption: {
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 16,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    position: 'relative',
  },
  colorPaletteOptionSelected: {
    // borderColor: '#2563EB', // Now using dynamic color via inline style
    backgroundColor: '#EFF6FF',
  },
  palettePreview: {
    flexDirection: 'row',
    gap: 8,
    width: 60,
    height: 60,
    borderRadius: 8,
    overflow: 'hidden',
  },
  paletteColorSwatch: {
    flex: 1,
    height: '100%',
  },
  paletteInfo: {
    flex: 1,
    gap: 4,
  },
  paletteName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    fontFamily: 'Poppins_600SemiBold',
  },
  paletteDescription: {
    fontSize: 12,
    color: '#6B7280',
    fontFamily: 'Poppins_400Regular',
  },
  paletteCheckIcon: {
    position: 'absolute',
    top: 12,
    right: 12,
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
    // backgroundColor: '#D1FAE5', // Now using dynamic color via inline style
    borderRadius: 8,
    borderWidth: 1,
    // borderColor: '#059669', // Now using dynamic color via inline style
  },
  verificationStatusText: {
    fontSize: 14,
    fontWeight: '600',
    // color: '#059669', // Now using dynamic color via inline style
    flex: 1,
  },
  warningBox: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#F59E0B',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    color: '#92400E',
    lineHeight: 20,
  },
  debugInfo: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
  },
  debugText: {
    fontSize: 12,
    color: '#6B7280',
    fontFamily: 'monospace',
  },
  cancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
});
