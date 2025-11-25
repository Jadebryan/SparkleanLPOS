import React, { useState, useEffect } from "react";
import { View, Text, TextInput, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform, Animated, Image, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { API_BASE_URL } from "@/constants/api";
import { Ionicons } from "@expo/vector-icons";
import BrandIcon from "../components/BrandIcon";
import { colors } from "@/app/theme/designSystem";

const PRIMARY_COLOR = colors.primary[500];
const PRIMARY_DARK = colors.primary[600];
const PRIMARY_DISABLED = colors.primary[200];
const ACCENT_COLOR = colors.accent[500];

export default function ForgotPassword() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Animated background circles (to match admin design aesthetics)
  const circle1Anim = useState(new Animated.Value(0))[0];
  const circle2Anim = useState(new Animated.Value(0))[0];
  const circle3Anim = useState(new Animated.Value(0))[0];

  useEffect(() => {
    const animate = (anim: Animated.Value, to: number, duration: number) =>
      Animated.timing(anim, { toValue: to, duration, useNativeDriver: true });

    const loopAnim = (anim: Animated.Value, delay: number) =>
      Animated.sequence([
        Animated.delay(delay),
        Animated.loop(
          Animated.sequence([
            Animated.parallel([
              animate(anim, 1, 10000),
            ]),
            Animated.parallel([
              animate(anim, 0, 10000),
            ]),
          ])
        ),
      ]);

    Animated.parallel([
      loopAnim(circle1Anim, 0),
      loopAnim(circle2Anim, 5000),
      loopAnim(circle3Anim, 10000),
    ]).start();
  }, []);

  const isValidEmail = (value: string) => /^\S+@\S+\.\S+$/.test(value.trim());

  const sendCode = async () => {
  if (!email.trim()) {
    setError("Email is required");
    return;
  }
  if (!isValidEmail(email)) {
    setError("Please enter a valid email address");
    return;
  }

  setError(null);

  try {
    setLoading(true);
    // 👇 Call your backend forgot-password API
    const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim() }),
    });

    const data = await response.json();

    if (!response.ok) {
      // ❌ Server error or invalid email
      setError(data.message || "Something went wrong. Please try again.");
      return;
    }

    // ✅ Only navigate if backend successfully sent the code
    router.push({
      pathname: "/login/verifyCode",
      params: { email: email.trim() },
    });
  } catch (err) {
    console.error("Forgot password error:", err);
    setError("Network error. Please try again later.");
  } finally {
    setLoading(false);
  }
};


  // Circle transforms
  const circle1Transform = {
    transform: [
      { translateX: circle1Anim.interpolate({ inputRange: [0, 1], outputRange: [0, 30] }) },
      { translateY: circle1Anim.interpolate({ inputRange: [0, 1], outputRange: [0, -50] }) },
      { scale: circle1Anim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.1] }) },
    ],
  };
  const circle2Transform = {
    transform: [
      { translateX: circle2Anim.interpolate({ inputRange: [0, 1], outputRange: [0, -20] }) },
      { translateY: circle2Anim.interpolate({ inputRange: [0, 1], outputRange: [0, 20] }) },
      { scale: circle2Anim.interpolate({ inputRange: [0, 1], outputRange: [1, 0.9] }) },
    ],
  };
  const circle3Transform = {
    transform: [
      { translateX: circle3Anim.interpolate({ inputRange: [0, 1], outputRange: [0, 25] }) },
      { translateY: circle3Anim.interpolate({ inputRange: [0, 1], outputRange: [0, -30] }) },
      { scale: circle3Anim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.05] }) },
    ],
  };

  return (
    <LinearGradient colors={["#DBEAFE", "#FED7AA"]} style={styles.bg}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.container}>
        <StatusBar style="dark" />

        {/* Animated background circles to match admin visuals */}
        <View style={styles.loginBg} pointerEvents="none">
          <Animated.View style={[styles.bgCircle, styles.bgCircle1, circle1Transform]} />
          <Animated.View style={[styles.bgCircle, styles.bgCircle2, circle2Transform]} />
          <Animated.View style={[styles.bgCircle, styles.bgCircle3, circle3Transform]} />
        </View>

        <ScrollView 
          contentContainerStyle={styles.scrollContent} 
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
        <View style={styles.card}>
            {/* Logo */}
            <View style={styles.logoRow}>
              <BrandIcon size={60} />
              <Text style={styles.logoText}>Sparklean Laundry Shop</Text>
            </View>
            <Text style={styles.subtitleTop}>Point of Sale & Management System</Text>

          <Text style={styles.title}>Reset Password</Text>
          <Text style={styles.subtitle}>Enter your account email to receive a verification code</Text>

          <View style={styles.inputGroup}>
              <View style={styles.labelContainer}>
                <Ionicons name="mail-outline" size={14} color="#6B7280" />
                <Text style={styles.label}>Email Address</Text>
              </View>
            <TextInput
                style={[styles.input, !!error && styles.inputError]}
              value={email}
              onChangeText={(t) => {
                setEmail(t);
                if (error) setError(null);
              }}
                placeholder="your.email@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
                placeholderTextColor="#9CA3AF"
                editable={!loading}
            />
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
          </View>

          <TouchableOpacity
              style={[styles.button, (!email || !isValidEmail(email) || loading) && styles.buttonDisabled]}
            onPress={sendCode}
              disabled={!email || !isValidEmail(email) || loading}
              activeOpacity={0.85}
          >
              <Text style={styles.buttonText}>{loading ? "Sending..." : "Send Reset Code"}</Text>
          </TouchableOpacity>

            <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 12 }}>
              <Text style={styles.cancelText}>← Back to Login</Text>
          </TouchableOpacity>

            <View style={styles.footer}>
              <Text style={styles.footerText}>Need help? <Text style={styles.footerLink}>Contact your administrator</Text></Text>
            </View>
        </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  bg: { 
    flex: 1 
  },
  container: { 
    flex: 1 
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
  scrollContent: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    paddingHorizontal: 16,
  },
  card: {
    width: "90%",
    maxWidth: 460,
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 36,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.1,
    shadowRadius: 60,
    elevation: 8,
    zIndex: 1,
  },
  logoRow: {
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
    color: ACCENT_COLOR,
  },
  subtitleTop: {
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 20,
    textAlign: "center",
    fontWeight: "500",
  },
  title: { 
    fontSize: 20, 
    fontWeight: "700", 
    color: "#1e3a8a", 
    marginBottom: 6,
    textAlign: "center",
  },
  subtitle: { 
    fontSize: 13, 
    color: "#6B7280", 
    textAlign: "center", 
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  inputGroup: { 
    width: "100%", 
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
  },
  input: { 
    width: "100%",
    borderWidth: 2,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    paddingVertical: 11,
    paddingHorizontal: 14,
    fontSize: 14,
    backgroundColor: "#F9FAFB",
    color: "#111827",
  },
  inputError: {
    borderColor: "#EF4444",
    backgroundColor: "#FFF",
  },
  button: { 
    marginTop: 4,
    width: "100%", 
    backgroundColor: PRIMARY_COLOR,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: PRIMARY_DARK,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4,
  },
  buttonDisabled: { 
    backgroundColor: PRIMARY_DISABLED,
    opacity: 0.7,
  },
  buttonText: { 
    color: "#fff", 
    fontWeight: "700",
    fontSize: 15,
  },
  cancelText: { 
    color: ACCENT_COLOR, 
    textDecorationLine: "underline",
    fontSize: 13,
    fontWeight: "600",
  },
  errorText: { 
    color: "#EF4444", 
    marginTop: 6, 
    fontSize: 12,
    paddingLeft: 6,
  },
  footer: {
    marginTop: 18,
    paddingTop: 18,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    width: "100%",
  },
  footerText: {
    fontSize: 13,
    color: "#4B5563",
    textAlign: "center",
  },
  footerLink: {
    color: ACCENT_COLOR,
    fontWeight: "600",
    textDecorationLine: "underline",
  },
});