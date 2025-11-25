import React, { useState } from "react";
import { View, Text, TextInput, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform } from "react-native";
import type { TextInput as RNTextInput } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { API_BASE_URL } from "@/constants/api";
import { colors } from "@/app/theme/designSystem";

const PRIMARY_COLOR = colors.primary[500];
const PRIMARY_DISABLED = colors.primary[200];
const ACCENT_COLOR = colors.accent[500];

export default function VerifyCode() {
  const router = useRouter();
  const params = useLocalSearchParams() as { email?: string; code?: string };
  const email = params.email ?? "";

  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submitCode = async () => {
    if (code.length !== 6) {
      setError("Please enter the 6-digit verification code");
      return;
    }
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/auth/verify-reset-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code })
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || body?.success === false) {
        setError(body?.message || 'Invalid or expired code');
        return;
      }
      router.push({ pathname: "/login/resetPassword", params: { email, code } });
    } catch (e) {
      setError('Network error. Please try again.');
    }
  };

  return (
    <LinearGradient colors={[colors.accent[100], colors.primary[100]]} style={styles.bg}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.container}>
        <StatusBar style="dark" />
        <View style={styles.card}>
          <Ionicons name="mail-open-outline" size={44} color={ACCENT_COLOR} style={{ marginBottom: 10 }} />
          <Text style={styles.title}>Enter Verification Code</Text>
          <Text style={styles.subtitle}>
            We sent a 6-digit code to <Text style={styles.email}>{email || "your email"}</Text>. Please enter it below.
          </Text>

          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <Ionicons name="checkmark-done-outline" size={14} color="#6B7280" />
              <Text style={styles.label}>Verification Code</Text>
            </View>
            <TextInput
              style={styles.codeField}
              keyboardType="number-pad"
              maxLength={6}
              value={code}
              onChangeText={(v) => { setCode(v.replace(/[^0-9]/g, "")); if (error) setError(null); }}
              placeholder="000000"
              placeholderTextColor="#9CA3AF"
            />
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : <Text style={styles.hint}>Code expires in 10 minutes</Text>}

          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
              <Text style={styles.backText}>Back</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.primaryBtn, code.length !== 6 && styles.primaryDisabled]} onPress={submitCode} disabled={code.length !== 6}>
              <Ionicons name="checkmark-circle-outline" size={18} color="#FFFFFF" />
              <Text style={styles.primaryText}>Verify Code</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  bg:{ flex:1 },
  container:{ flex:1, alignItems:'center', justifyContent:'center' },
  card:{
    width:'92%',
    maxWidth:520,
    backgroundColor:'#fff',
    borderRadius:20,
    padding:28,
    alignItems:'center',
    elevation:6,
    shadowColor:'#000',
    shadowOffset:{ width:0, height:20 },
    shadowOpacity:0.1,
    shadowRadius:60,
  },
  title:{ fontSize:18, fontWeight:'800', color:'#111827', marginBottom:6, textAlign:'center', fontFamily:'Poppins_700Bold' },
  subtitle:{ fontSize:13, color:'#374151', textAlign:'center', marginBottom:14, fontFamily:'Poppins_400Regular' },
  email:{ color:ACCENT_COLOR, fontWeight:'700', fontFamily:'Poppins_700Bold' },
  inputGroup:{ width:'100%', marginTop:8 },
  labelRow:{ flexDirection:'row', alignItems:'center', gap:6, marginBottom:6 },
  label:{ fontSize:13, fontWeight:'600', color:'#374151', fontFamily:'Poppins_600SemiBold' },
  codeField:{ borderWidth:2, borderColor:'#E5E7EB', borderRadius:10, paddingVertical:11, paddingHorizontal:14, fontSize:18, letterSpacing:6, textAlign:'center', fontFamily:'Poppins_700Bold' },
  hint:{ fontSize:12, color:'#6B7280', marginTop:8, fontFamily:'Poppins_400Regular' },
  errorText:{ color:'#dc2626', marginTop:8, fontSize:12, fontFamily:'Poppins_400Regular' },
  actionsRow:{ flexDirection:'row', gap:12, marginTop:16, width:'100%', justifyContent:'flex-end' },
  backBtn:{ paddingVertical:12, paddingHorizontal:20, borderRadius:10, backgroundColor:'#E5E7EB' },
  backText:{ color:'#374151', fontWeight:'700', fontFamily:'Poppins_700Bold' },
  primaryBtn:{ flexDirection:'row', alignItems:'center', gap:8, paddingVertical:12, paddingHorizontal:20, borderRadius:10, backgroundColor:PRIMARY_COLOR },
  primaryDisabled:{ backgroundColor:PRIMARY_DISABLED },
  primaryText:{ color:'#FFFFFF', fontWeight:'700', fontFamily:'Poppins_700Bold' },
});