import React, { useState } from "react";
import { View, Text, TextInput, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform, Modal } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { API_BASE_URL } from "@/constants/api";
import { Ionicons } from "@expo/vector-icons";

export default function ResetPassword() {
  const router = useRouter();
  const params = useLocalSearchParams() as { email?: string; code?: string };
  const email = params.email ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  const validatePassword = (p: string) => {
    if (p.length < 8) return "Password must be at least 8 characters";
    if (!/\d/.test(p)) return "Password must include at least one number";
    return null;
  };

  const submit = async () => {
  const pwError = validatePassword(password);
  if (pwError) {
    setError(pwError);
    return;
  }
  if (password !== confirm) {
    setError("Passwords do not match");
    return;
  }

  setError(null);

  try {
    const response = await fetch(`${API_BASE_URL}/auth/reset-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        code: params.code,
        newPassword: password,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      setError(data.message || "Failed to reset password");
      return;
    }

    setShowSuccess(true);
  } catch (err) {
    console.error("Reset error:", err);
    setError("Server unreachable. Please try again.");
  }
};


  const isDisabled = !!validatePassword(password) || password !== confirm || !password || !confirm;

  return (
    <LinearGradient colors={["#DBEAFE", "#FED7AA"]} style={styles.bg}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.container}>
        <StatusBar style="dark" />
        <View style={styles.card}>
          <Ionicons name="checkmark-circle" size={52} color="#10B981" style={{ marginBottom: 10 }} />
          <Text style={styles.title}>Set New Password</Text>
          <Text style={styles.subtitle}>Code verified! Please enter your new password below.</Text>

          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <Ionicons name="lock-closed-outline" size={14} color="#6B7280" />
              <Text style={styles.label}>New Password</Text>
            </View>
            <TextInput style={styles.input} value={password} onChangeText={(t) => { setPassword(t); if (error) setError(null); }} secureTextEntry placeholder="Enter new password" placeholderTextColor="#9CA3AF" />
          </View>

          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <Ionicons name="lock-closed-outline" size={14} color="#6B7280" />
              <Text style={styles.label}>Confirm Password</Text>
            </View>
            <TextInput style={styles.input} value={confirm} onChangeText={(t) => { setConfirm(t); if (error) setError(null); }} secureTextEntry placeholder="Confirm new password" placeholderTextColor="#9CA3AF" />
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
              <Text style={styles.backText}>Back</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.primaryBtn, isDisabled && styles.primaryDisabled]} onPress={submit} disabled={isDisabled}>
              <Ionicons name="lock-open-outline" size={18} color="#FFFFFF" />
              <Text style={styles.primaryText}>Reset Password</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Success Modal */}
        <Modal
          visible={showSuccess}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowSuccess(false)}
        >
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowSuccess(false)}>
            <View style={styles.modalCard} onStartShouldSetResponder={() => true}>
              <Ionicons name="checkmark-circle" size={56} color="#10B981" style={{ marginBottom: 10 }} />
              <Text style={styles.modalTitle}>Password reset successful!</Text>
              <Text style={styles.modalSubtitle}>You can now log in with your new password.</Text>

              <TouchableOpacity
                style={styles.modalPrimaryBtn}
                onPress={() => {
                  setShowSuccess(false);
                  router.replace("/login");
                }}
              >
                <Ionicons name="log-in-outline" size={18} color="#FFFFFF" />
                <Text style={styles.modalPrimaryText}>Go to Login</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  bg:{ flex:1 },
  container:{ flex:1, alignItems:'center', justifyContent:'center' },
  card:{ width:'92%', maxWidth:520, backgroundColor:'#fff', borderRadius:20, padding:28, alignItems:'center', elevation:6, shadowColor:'#000', shadowOffset:{ width:0, height:20 }, shadowOpacity:0.1, shadowRadius:60 },
  title:{ fontSize:18, fontWeight:'800', color:'#111827', marginBottom:6, textAlign:'center', fontFamily:'Poppins_700Bold' },
  subtitle:{ fontSize:13, color:'#374151', textAlign:'center', marginBottom:14, fontFamily:'Poppins_400Regular' },
  inputGroup:{ width:'100%', marginTop:8 },
  labelRow:{ flexDirection:'row', alignItems:'center', gap:6, marginBottom:6 },
  label:{ fontSize:13, fontWeight:'600', color:'#374151', fontFamily:'Poppins_600SemiBold' },
  input:{ borderWidth:2, borderColor:'#E5E7EB', borderRadius:10, paddingVertical:11, paddingHorizontal:14, fontSize:16, backgroundColor:'#F9FAFB', color:'#111827', fontFamily:'Poppins_400Regular' },
  errorText:{ color:'#dc2626', marginTop:8, fontSize:12, width:'100%', textAlign:'left' },
  actionsRow:{ flexDirection:'row', gap:12, marginTop:16, width:'100%', justifyContent:'flex-end' },
  backBtn:{ paddingVertical:12, paddingHorizontal:20, borderRadius:10, backgroundColor:'#E5E7EB' },
  backText:{ color:'#374151', fontWeight:'700', fontFamily:'Poppins_700Bold' },
  primaryBtn:{ flexDirection:'row', alignItems:'center', gap:8, paddingVertical:12, paddingHorizontal:20, borderRadius:10, backgroundColor:'#3B82F6' },
  primaryDisabled:{ backgroundColor:'#9fb7f7' },
  primaryText:{ color:'#FFFFFF', fontWeight:'700', fontFamily:'Poppins_700Bold' }
  ,
  // Success Modal styles
  modalOverlay:{ flex:1, backgroundColor:'rgba(0,0,0,0.5)', justifyContent:'center', alignItems:'center' },
  modalCard:{ backgroundColor:'#FFFFFF', borderRadius:16, padding:24, width:'90%', maxWidth:420, alignItems:'center', shadowColor:'#000', shadowOffset:{ width:0, height:12 }, shadowOpacity:0.15, shadowRadius:24, elevation:8 },
  modalTitle:{ fontSize:18, fontWeight:'800', color:'#111827', marginTop:6, marginBottom:4, textAlign:'center', fontFamily:'Poppins_700Bold' },
  modalSubtitle:{ fontSize:13, color:'#6B7280', textAlign:'center', marginBottom:16, fontFamily:'Poppins_400Regular' },
  modalPrimaryBtn:{ flexDirection:'row', alignItems:'center', gap:8, backgroundColor:'#3B82F6', paddingVertical:12, paddingHorizontal:20, borderRadius:10 },
  modalPrimaryText:{ color:'#FFFFFF', fontWeight:'700', fontFamily:'Poppins_700Bold' }
});