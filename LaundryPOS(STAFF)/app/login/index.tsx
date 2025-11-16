import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Image,
  TouchableOpacity,
  useWindowDimensions,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Animated,
  ScrollView,
  Modal,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import BrandIcon from "../components/BrandIcon";
import { API_BASE_URL } from "@/constants/api";

export default function LoginAccount() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;

  // form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [inactiveWarning, setInactiveWarning] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [emailValid, setEmailValid] = useState<boolean | null>(null);
  const [showRememberConfirm, setShowRememberConfirm] = useState(false);
  
  // Helper to check if input is email or username
  const isEmailFormat = (value: string): boolean => {
    return /^\S+@\S+\.\S+$/.test(value.trim());
  };

  // simple captcha state
  const [captchaA, setCaptchaA] = useState<number>(() => Math.floor(Math.random()*9)+1);
  const [captchaB, setCaptchaB] = useState<number>(() => Math.floor(Math.random()*9)+1);
  const [captchaInput, setCaptchaInput] = useState<string>("");
  const [captchaError, setCaptchaError] = useState<string | null>(null);

  // Animation values for background circles
  const circle1Anim = useState(new Animated.Value(0))[0];
  const circle2Anim = useState(new Animated.Value(0))[0];
  const circle3Anim = useState(new Animated.Value(0))[0];

  // Load saved credentials if "Remember Me" was previously checked
  React.useEffect(() => {
    const loadSavedCredentials = async () => {
      try {
        const saved = await AsyncStorage.getItem('rememberedCredentials');
        if (saved) {
          const credentials = JSON.parse(saved);
          const savedValue = credentials.email || credentials.username || "";
          setEmail(savedValue);
          setRememberMe(true);
          if (savedValue) {
            setEmailValid(isEmailFormat(savedValue) || savedValue.length >= 3);
          }
        }
      } catch (error) {
        console.error('Error loading saved credentials:', error);
      }
    };
    loadSavedCredentials();
  }, []);

  // Background circle animations
  React.useEffect(() => {
    const animateCircles = () => {
      const createAnimation = (animValue: Animated.Value, delay: number) => {
        return Animated.sequence([
          Animated.delay(delay),
          Animated.loop(
            Animated.sequence([
              Animated.parallel([
                Animated.timing(animValue, {
                  toValue: 1,
                  duration: 10000,
                  useNativeDriver: true,
                }),
              ]),
              Animated.parallel([
                Animated.timing(animValue, {
                  toValue: 0,
                  duration: 10000,
                  useNativeDriver: true,
                }),
              ]),
            ])
          ),
        ]);
      };

      Animated.parallel([
        createAnimation(circle1Anim, 0),
        createAnimation(circle2Anim, 5000),
        createAnimation(circle3Anim, 10000),
      ]).start();
    };

    animateCircles();
  }, []);

  // validation helpers
  const isValidEmailGeneric = (v: string) => /^\S+@\S+\.\S+$/.test(v.trim());

  const getEmailValidationMessage = (raw: string): string | null => {
    const v = raw.trim();
    if (!v) return "Email or username is required.";
    if (v.includes(" ")) return "Email or username must not contain spaces.";
    
    // If it looks like an email, validate as email
    if (v.includes("@")) {
      const parts = v.split("@");
      if (parts.length !== 2) return "Email must contain a single '@' symbol.";
      const [local, domain] = parts;
      if (!local) return "Missing part before '@' (username).";
      if (!/^[A-Za-z0-9!#$%&'*+\-/=?^_`{|}~.]+$/.test(local)) return "Local part contains invalid characters.";
      if (!domain) return "Missing domain after '@'.";
      if (domain.startsWith(".") || domain.endsWith(".")) return "Domain must not start or end with '.'";
      if (!domain.includes(".")) return "Domain must include a '.' (e.g. example.com).";
      const domParts = domain.split(".");
      const tld = domParts[domParts.length - 1];
      if (!tld || tld.length < 2) return "Top-level domain seems invalid (e.g. .com).";
      if (!isValidEmailGeneric(v)) return "Please enter a valid email address.";
    } else {
      // Validate as username
      if (v.length < 3) return "Username must be at least 3 characters.";
      if (v.length > 30) return "Username cannot exceed 30 characters.";
      if (!/^[A-Za-z0-9_]+$/.test(v)) return "Username can only contain letters, numbers, and underscores.";
    }
    return null;
  };

  const validateFields = () => {
    let ok = true;
    setEmailError(null);
    setPasswordError(null);
    setGeneralError(null);
    setInactiveWarning(null);

    const emailMsg = getEmailValidationMessage(email);
    if (emailMsg) {
      setEmailError(emailMsg);
      setEmailValid(false);
      ok = false;
    } else {
      setEmailValid(true);
    }

    if (!password) {
      setPasswordError("Password is required.");
      ok = false;
    } else if (password.length < 6) {
      setPasswordError("Password must be at least 6 characters.");
      ok = false;
    }

    // captcha check basic format (actual value validated in submit)
    if (!captchaInput.trim()) {
      setCaptchaError("Please solve the captcha.");
      ok = false;
    } else if (!/^\d+$/.test(captchaInput.trim())) {
      setCaptchaError("Captcha must be a number.");
      ok = false;
    } else {
      setCaptchaError(null);
    }

    return ok;
  };

  const submit = async () => {
    const ok = validateFields();
    if (!ok) return;

    // validate captcha equals sum
    const expected = captchaA + captchaB;
    if (parseInt(captchaInput.trim(), 10) !== expected) {
      setCaptchaError("Incorrect captcha. Please try again.");
      // regenerate a new captcha for security
      regenerateCaptcha();
      return;
    }

    setLoading(true);
    setGeneralError(null);
    setInactiveWarning(null);

    try {
      const loginUrl = `${API_BASE_URL}/auth/login`;
      console.log('Login attempt to:', loginUrl);
      
      const trimmedValue = email.trim();
      const loginBody = isEmailFormat(trimmedValue)
        ? { email: trimmedValue, password }
        : { username: trimmedValue, password };
      
      const res = await fetch(loginUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(loginBody),
      });

      const body = await res.json().catch(() => ({}));

      if (res.status === 200) {
        // Handle both response formats (backward compatibility)
        const responseData = body.success ? body.data : body;
        const token = responseData.token || body.token;
        const userData = body.success ? body.data : body.user;

        // Handle "Remember Me" functionality
        if (rememberMe) {
          const trimmedValue = email.trim();
          const credentials = isEmailFormat(trimmedValue)
            ? { email: trimmedValue }
            : { username: trimmedValue };
          await AsyncStorage.setItem('rememberedCredentials', JSON.stringify(credentials));
        } else {
          await AsyncStorage.removeItem('rememberedCredentials');
        }

        // Store JWT token (required for API authentication)
        if (token) {
          await AsyncStorage.setItem("token", token);
          await AsyncStorage.setItem("userToken", token);
        }

        // Save logged-in staff info to AsyncStorage
        const staff = {
          name: userData.fullName || userData.name || userData.username,
          email: userData.email,
          username: userData.username || userData.email.split("@")[0],
          staffId: userData.id || userData.staffId || userData._id,
          _id: userData.id || userData.staffId || userData._id,
          role: userData.role || "staff",
          stationId: userData.stationId || null,
        };
        await AsyncStorage.setItem("user", JSON.stringify(staff));

        router.push("/home/orderList");
        return;
      }

      if (res.status === 404) {
        setEmailError("This email or username is not registered.");
      } else if (res.status === 401) {
        if (body && typeof body.message === "string" && /password/i.test(body.message)) {
          setPasswordError("Incorrect password. Please try again.");
        } else {
          setGeneralError("Invalid email/username or password.");
        }
      } else if (res.status === 403) {
        setInactiveWarning("Your account is inactive. Contact support.");
      } else if (res.status === 429) {
        setGeneralError("Too many login attempts. Please try again later.");
      } else {
        setGeneralError(body.message || "Server error. Try again later.");
      }
    } catch (e: any) {
      console.error('Login error:', e);
      console.error('API_BASE_URL:', API_BASE_URL);
      const errorMessage = e?.message || 'Unknown error';
      setGeneralError(
        `Network error: ${errorMessage}. Ensure the backend is running at ${API_BASE_URL}`
      );
    } finally {
      setLoading(false);
    }
  };

  const cardMaxWidth = isLandscape ? 520 : 460;
  const regenerateCaptcha = () => {
    setCaptchaA(Math.floor(Math.random()*9)+1);
    setCaptchaB(Math.floor(Math.random()*9)+1);
    setCaptchaInput("");
  };

  const cardWidth = Math.min(cardMaxWidth, width * (isLandscape ? 0.5 : 0.9));

  // Circle transform styles
  const circle1Transform = {
    transform: [
      {
        translateX: circle1Anim.interpolate({
          inputRange: [0, 1],
          outputRange: [0, 30],
        }),
      },
      {
        translateY: circle1Anim.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -50],
        }),
      },
      {
        scale: circle1Anim.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 1.1],
        }),
      },
    ],
  };

  const circle2Transform = {
    transform: [
      {
        translateX: circle2Anim.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -20],
        }),
      },
      {
        translateY: circle2Anim.interpolate({
          inputRange: [0, 1],
          outputRange: [0, 20],
        }),
      },
      {
        scale: circle2Anim.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 0.9],
        }),
      },
    ],
  };

  const circle3Transform = {
    transform: [
      {
        translateX: circle3Anim.interpolate({
          inputRange: [0, 1],
          outputRange: [0, 25],
        }),
      },
      {
        translateY: circle3Anim.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -30],
        }),
      },
      {
        scale: circle3Anim.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 1.05],
        }),
      },
    ],
  };

  return (
    <View style={{ flex: 1 }}>
      <LinearGradient
        colors={["#DBEAFE", "#FED7AA"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ flex: 1 }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.root}
        >
          <StatusBar style="dark" />
          
          {/* Animated Background Circles */}
          <View style={styles.loginBg} pointerEvents="none">
            <Animated.View style={[styles.bgCircle, styles.bgCircle1, circle1Transform]} />
            <Animated.View style={[styles.bgCircle, styles.bgCircle2, circle2Transform]} />
            <Animated.View style={[styles.bgCircle, styles.bgCircle3, circle3Transform]} />
          </View>

          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <View style={[styles.loginContainer, { width: cardWidth }]}>
              {/* Logo */}
              <View style={styles.logo}>
                <BrandIcon size={60} />
                <Text style={styles.logoText}>Sparklean Laundry Shop</Text>
              </View>

              <Text style={styles.subtitle}>
                Point of Sale & Management System
              </Text>

              {/* Form */}
              <View style={styles.form}>
                <View style={styles.formGroup}>
                  <View style={styles.labelContainer}>
                    <Ionicons name="person-outline" size={14} color="#6B7280" />
                    <Text style={styles.label}>Email or Username</Text>
                  </View>
                  <TextInput
                    style={[
                      styles.input,
                      emailValid === false && styles.inputError,
                    ]}
                    placeholder="your.email@example.com or username"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="default"
                    autoCapitalize="none"
                    value={email}
                    onChangeText={(t) => {
                      setEmail(t);
                      const msg = getEmailValidationMessage(t);
                      if (msg) {
                        setEmailError(msg);
                        setEmailValid(false);
                      } else {
                        setEmailError(null);
                        setEmailValid(isEmailFormat(t.trim()) || t.trim().length >= 3);
                      }
                      if (generalError) setGeneralError(null);
                    }}
                    editable={!loading}
                  />
                  {emailError && <Text style={styles.errorText}>{emailError}</Text>}
                </View>

                <View style={styles.formGroup}>
                  <View style={styles.labelContainer}>
                    <Ionicons name="lock-closed-outline" size={14} color="#6B7280" />
                    <Text style={styles.label}>Password</Text>
                  </View>
                  <View style={styles.passwordWrapper}>
                    <TextInput
                      style={styles.input}
                      placeholder="Enter your password"
                      placeholderTextColor="#9CA3AF"
                      secureTextEntry={!showPassword}
                      value={password}
                      onChangeText={(t) => {
                        setPassword(t);
                        if (passwordError) setPasswordError(null);
                        if (generalError) setGeneralError(null);
                      }}
                      editable={!loading}
                    />
                    <TouchableOpacity
                      style={styles.passwordToggle}
                      onPress={() => setShowPassword(!showPassword)}
                    >
                      <Ionicons
                        name={showPassword ? "eye-off-outline" : "eye-outline"}
                        size={18}
                        color="#6B7280"
                      />
                    </TouchableOpacity>
                  </View>
                  {passwordError && <Text style={styles.errorText}>{passwordError}</Text>}
                </View>

                {inactiveWarning && (
                  <Text style={styles.warningText}>{inactiveWarning}</Text>
                )}
                {generalError && (
                  <Text style={styles.errorText}>{generalError}</Text>
                )}

                {/* Captcha */}
                <View style={styles.formGroup}>
                  <View style={styles.labelContainer}>
                    <Ionicons name="shield-checkmark-outline" size={14} color="#6B7280" />
                    <Text style={styles.label}>Verify you're human</Text>
                  </View>
                  <View style={styles.captchaRow}>
                    <View style={styles.captchaBadge}>
                      <Text style={styles.captchaText}>{captchaA} + {captchaB} =</Text>
                    </View>
                    <TextInput
                      style={[styles.input, { flex: 1 }]}
                      placeholder="Enter sum"
                      placeholderTextColor="#9CA3AF"
                      keyboardType="number-pad"
                      value={captchaInput}
                      onChangeText={(t) => { setCaptchaInput(t); if (captchaError) setCaptchaError(null); }}
                      editable={!loading}
                    />
                    <TouchableOpacity onPress={regenerateCaptcha} style={styles.captchaRefresh}>
                      <Ionicons name="refresh-outline" size={18} color="#2563EB" />
                    </TouchableOpacity>
                  </View>
                  {captchaError && <Text style={styles.errorText}>{captchaError}</Text>}
                </View>

                <View style={styles.formOptions}>
                  <TouchableOpacity
                    style={styles.rememberMe}
                    onPress={async () => {
                      if (loading) return;
                      if (!rememberMe) {
                        // Ask confirmation similar to admin UX
                        setShowRememberConfirm(true);
                      } else {
                        setRememberMe(false);
                        try { await AsyncStorage.removeItem('rememberedCredentials'); } catch {}
                      }
                    }}
                    disabled={loading}
                  >
                    <View
                      style={[
                        styles.checkbox,
                        rememberMe && styles.checkboxChecked,
                      ]}
                    >
                      {rememberMe && (
                        <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                      )}
                    </View>
                    <Text style={styles.rememberMeText}>Remember me</Text>
                  </TouchableOpacity>
                </View>
                {/* Remember Me Confirm Modal */}
                <Modal
                  visible={showRememberConfirm}
                  transparent
                  animationType="fade"
                  onRequestClose={() => setShowRememberConfirm(false)}
                >
                  <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowRememberConfirm(false)}>
                    <View style={styles.modalCard} onStartShouldSetResponder={() => true}>
                      <Ionicons name="information-circle-outline" size={44} color="#2563EB" style={{ marginBottom: 8 }} />
                      <Text style={styles.modalTitle}>Enable Remember Me?</Text>
                      <Text style={styles.modalSubtitle}>We'll save your email or username on this device for next time. Your password is never saved.</Text>
                      <View style={{ flexDirection:'row', gap:12, marginTop:12 }}>
                        <TouchableOpacity style={styles.backBtn} onPress={() => setShowRememberConfirm(false)}>
                          <Text style={styles.backText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.primaryBtn}
                          onPress={async () => {
                            setRememberMe(true);
                            setShowRememberConfirm(false);
                            // save current email/username if valid; otherwise save empty and it'll update on login
                            try {
                              const trimmedValue = email.trim();
                              const credentials = isEmailFormat(trimmedValue)
                                ? { email: trimmedValue }
                                : { username: trimmedValue };
                              await AsyncStorage.setItem('rememberedCredentials', JSON.stringify(credentials));
                            } catch {}
                          }}
                        >
                          <Ionicons name="checkmark-circle-outline" size={18} color="#FFFFFF" />
                          <Text style={styles.primaryText}>Yes, Remember</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </TouchableOpacity>
                </Modal>

                <TouchableOpacity
                  style={[styles.loginButton, loading && styles.loginButtonDisabled]}
                  onPress={submit}
                  disabled={loading}
                  activeOpacity={0.8}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.loginButtonText}>Login</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => router.push("/login/forgotPassword")}
                  style={styles.forgotPasswordButton}
                  disabled={loading}
                >
                  <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.loginFooter}>
                <Text style={styles.footerText}>
                  Need access?{" "}
                  <Text style={styles.footerLink}>Contact your administrator</Text>
                </Text>
              </View>
              <View style={styles.versionBadge}>
                <Text style={styles.versionText}>v1.0.0</Text>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  loginBg: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: "hidden",
  },
  bgCircle: {
    position: "absolute",
    borderRadius: 9999,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  bgCircle1: {
    width: 400,
    height: 400,
    top: -100,
    left: -100,
  },
  bgCircle2: {
    width: 300,
    height: 300,
    bottom: -50,
    right: -50,
  },
  bgCircle3: {
    width: 250,
    height: 250,
    top: "50%",
    right: "10%",
  },
  loginContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 36,
    maxWidth: "90%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.1,
    shadowRadius: 60,
    elevation: 8,
    zIndex: 1,
  },
  logo: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginBottom: 6,
  },
  logoIcon: {
    width: 60,
    height: 60,
  },
  logoText: {
    fontSize: 28,
    fontWeight: "700",
    color: "#2563EB",
    fontFamily: 'Poppins_700Bold',
  },
  subtitle: {
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 20,
    textAlign: "center",
    fontWeight: "500",
    fontFamily: 'Poppins_500Medium',
  },
  form: {
    width: "100%",
  },
  formGroup: {
    marginBottom: 14,
  },
  labelContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
    fontFamily: 'Poppins_600SemiBold',
  },
  input: {
    width: "100%",
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderWidth: 2,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    fontSize: 14,
    backgroundColor: "#F9FAFB",
    color: "#111827",
    fontFamily: 'Poppins_400Regular',
  },
  inputError: {
    borderColor: "#EF4444",
    backgroundColor: "#FFF",
  },
  passwordWrapper: {
    position: "relative",
  },
  passwordToggle: {
    position: "absolute",
    right: 14,
    top: "50%",
    transform: [{ translateY: -9 }],
    padding: 4,
  },
  formOptions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  rememberMe: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: "#D1D5DB",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: {
    backgroundColor: "#2563EB",
    borderColor: "#2563EB",
  },
  rememberMeText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#374151",
    fontFamily: 'Poppins_500Medium',
  },
  loginButton: {
    width: "100%",
    backgroundColor: "#F97316",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
    shadowColor: "#EA580C",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4,
  },
  loginButtonDisabled: {
    opacity: 0.7,
  },
  loginButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
    fontFamily: 'Poppins_700Bold',
  },
  forgotPasswordButton: {
    marginTop: 20,
    alignItems: "center",
  },
  forgotPasswordText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#2563EB",
    textDecorationLine: "underline",
    fontFamily: 'Poppins_600SemiBold',
  },
  errorText: {
    fontSize: 12,
    color: "#EF4444",
    marginTop: 6,
    paddingLeft: 6,
    fontFamily: 'Poppins_400Regular',
  },
  warningText: {
    fontSize: 12,
    color: "#B45309",
    marginTop: 6,
    textAlign: "center",
    marginBottom: 6,
    fontFamily: 'Poppins_400Regular',
  },
  captchaRow:{
    flexDirection:'row',
    alignItems:'center',
    gap:8,
  },
  captchaBadge:{
    paddingVertical:10,
    paddingHorizontal:12,
    borderRadius:10,
    borderWidth:2,
    borderColor:'#DBEAFE',
    backgroundColor:'#EFF6FF',
  },
  captchaText:{
    fontSize:14,
    fontWeight:'700',
    color:'#1F2937',
  },
  captchaRefresh:{
    marginLeft: 0,
    paddingVertical:10,
    paddingHorizontal:12,
    borderRadius:10,
    borderWidth:2,
    borderColor:'#DBEAFE',
    backgroundColor:'#EFF6FF'
  },
  loginFooter: {
    marginTop: 18,
    paddingTop: 18,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  footerText: {
    fontSize: 13,
    color: "#4B5563",
    textAlign: "center",
    fontFamily: 'Poppins_400Regular',
  },
  footerLink: {
    color: "#2563EB",
    fontWeight: "600",
    textDecorationLine: "underline",
    fontFamily: 'Poppins_600SemiBold',
  },
  versionBadge: {
    position: "absolute",
    left: "50%",
    bottom: 12,
    transform: [{ translateX: -30 }],
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingVertical: 1,
    paddingHorizontal: 6,
    borderRadius: 6,
  },
  versionText: {
    fontSize: 10,
    fontWeight: "500",
    color: "#6B7280",
    fontFamily: 'Poppins_500Medium',
  },
  // Modal reused styles
  modalOverlay:{ flex:1, backgroundColor:'rgba(0,0,0,0.5)', justifyContent:'center', alignItems:'center' },
  modalCard:{ backgroundColor:'#FFFFFF', borderRadius:16, padding:24, width:'90%', maxWidth:420, alignItems:'center', shadowColor:'#000', shadowOffset:{ width:0, height:12 }, shadowOpacity:0.15, shadowRadius:24, elevation:8 },
  modalTitle:{ fontSize:18, fontWeight:'800', color:'#111827', marginTop:6, marginBottom:4, textAlign:'center' },
  modalSubtitle:{ fontSize:13, color:'#6B7280', textAlign:'center' },
  backBtn:{ paddingVertical:12, paddingHorizontal:20, borderRadius:10, backgroundColor:'#E5E7EB' },
  backText:{ color:'#374151', fontWeight:'700' },
  primaryBtn:{ flexDirection:'row', alignItems:'center', gap:8, paddingVertical:12, paddingHorizontal:20, borderRadius:10, backgroundColor:'#3B82F6' },
  primaryText:{ color:'#FFFFFF', fontWeight:'700' }
});
