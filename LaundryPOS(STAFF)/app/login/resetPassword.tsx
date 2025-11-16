import React, { useState, useMemo } from "react";
import { View, Text, TextInput, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform, Modal } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { API_BASE_URL } from "@/constants/api";
import { Ionicons } from "@expo/vector-icons";
import { checkPasswordStrength, generateStrongPassword, PasswordStrength } from "@/app/utils/passwordStrength";

export default function ResetPassword() {
  const router = useRouter();
  const params = useLocalSearchParams() as { email?: string; code?: string };
  const email = params.email ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Check password strength
  const passwordStrength = useMemo(() => {
    if (!password) return null;
    return checkPasswordStrength(password);
  }, [password]);

  const handleSuggestPassword = () => {
    const suggested = generateStrongPassword(16);
    setPassword(suggested);
    setConfirm(suggested);
    setError(null);
  };

  const validatePassword = (p: string) => {
    if (!p) return "Password is required";
    const strength = checkPasswordStrength(p);
    if (!strength.isValid) {
      return strength.feedback[0] || "Password does not meet requirements";
    }
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


  const isDisabled = !!validatePassword(password) || password !== confirm || !password || !confirm || (passwordStrength && !passwordStrength.isValid);

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
              <TouchableOpacity 
                onPress={handleSuggestPassword}
                style={styles.suggestBtn}
              >
                <Ionicons name="sparkles-outline" size={14} color="#3B82F6" />
                <Text style={styles.suggestText}>Suggest</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.passwordInputContainer}>
              <TextInput 
                style={styles.passwordInput} 
                value={password} 
                onChangeText={(t) => { setPassword(t); if (error) setError(null); }} 
                secureTextEntry={!showPassword}
                placeholder="Enter new password" 
                placeholderTextColor="#9CA3AF" 
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeIcon}
              >
                <Ionicons
                  name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                  size={20}
                  color="#6B7280"
                />
              </TouchableOpacity>
            </View>
            {passwordStrength && (
              <View style={styles.strengthContainer}>
                <View style={styles.strengthBar}>
                  <View 
                    style={[
                      styles.strengthFill,
                      {
                        width: `${passwordStrength.score}%`,
                        backgroundColor: getStrengthColor(passwordStrength.strength)
                      }
                    ]} 
                  />
                </View>
                <View style={styles.strengthInfo}>
                  <Text style={[styles.strengthText, { color: getStrengthColor(passwordStrength.strength) }]}>
                    {passwordStrength.strength.toUpperCase()}
                  </Text>
                  {passwordStrength.feedback.length > 0 && (
                    <Text style={styles.strengthFeedback}>
                      {passwordStrength.feedback[0]}
                    </Text>
                  )}
                </View>
              </View>
            )}
          </View>

          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <Ionicons name="lock-closed-outline" size={14} color="#6B7280" />
              <Text style={styles.label}>Confirm Password</Text>
            </View>
            <View style={styles.passwordInputContainer}>
              <TextInput 
                style={styles.passwordInput} 
                value={confirm} 
                onChangeText={(t) => { setConfirm(t); if (error) setError(null); }} 
                secureTextEntry={!showConfirmPassword}
                placeholder="Confirm new password" 
                placeholderTextColor="#9CA3AF" 
              />
              <TouchableOpacity
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                style={styles.eyeIcon}
              >
                <Ionicons
                  name={showConfirmPassword ? 'eye-outline' : 'eye-off-outline'}
                  size={20}
                  color="#6B7280"
                />
              </TouchableOpacity>
            </View>
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

const getStrengthColor = (strength: PasswordStrength | null): string => {
  if (!strength) return '#E5E7EB';
  switch (strength) {
    case 'weak': return '#EF4444';
    case 'fair': return '#F59E0B';
    case 'good': return '#3B82F6';
    case 'strong': return '#10B981';
    default: return '#E5E7EB';
  }
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
  passwordInputContainer:{ position:'relative', width:'100%' },
  passwordInput:{ borderWidth:2, borderColor:'#E5E7EB', borderRadius:10, paddingVertical:11, paddingLeft:14, paddingRight:44, fontSize:16, backgroundColor:'#F9FAFB', color:'#111827', fontFamily:'Poppins_400Regular', width:'100%' },
  eyeIcon:{ position:'absolute', right:12, top:'50%', transform:[{ translateY:-10 }], padding:4 },
  errorText:{ color:'#dc2626', marginTop:8, fontSize:12, width:'100%', textAlign:'left' },
  actionsRow:{ flexDirection:'row', gap:12, marginTop:16, width:'100%', justifyContent:'flex-end' },
  backBtn:{ paddingVertical:12, paddingHorizontal:20, borderRadius:10, backgroundColor:'#E5E7EB' },
  backText:{ color:'#374151', fontWeight:'700', fontFamily:'Poppins_700Bold' },
  primaryBtn:{ flexDirection:'row', alignItems:'center', gap:8, paddingVertical:12, paddingHorizontal:20, borderRadius:10, backgroundColor:'#3B82F6' },
  primaryDisabled:{ backgroundColor:'#9fb7f7' },
  primaryText:{ color:'#FFFFFF', fontWeight:'700', fontFamily:'Poppins_700Bold' },
  suggestBtn:{ flexDirection:'row', alignItems:'center', gap:4, paddingVertical:4, paddingHorizontal:8, borderRadius:6, backgroundColor:'#EFF6FF', marginLeft:'auto' },
  suggestText:{ color:'#3B82F6', fontSize:12, fontWeight:'600', fontFamily:'Poppins_600SemiBold' },
  strengthContainer:{ marginTop:8 },
  strengthBar:{ height:4, backgroundColor:'#E5E7EB', borderRadius:2, overflow:'hidden', marginBottom:6 },
  strengthFill:{ height:'100%', borderRadius:2 },
  strengthInfo:{ flexDirection:'row', alignItems:'center', gap:8 },
  strengthText:{ fontSize:11, fontWeight:'700', fontFamily:'Poppins_700Bold' },
  strengthFeedback:{ fontSize:11, color:'#6B7280', fontFamily:'Poppins_400Regular', flex:1 }
  ,
  // Success Modal styles
  modalOverlay:{ flex:1, backgroundColor:'rgba(0,0,0,0.5)', justifyContent:'center', alignItems:'center' },
  modalCard:{ backgroundColor:'#FFFFFF', borderRadius:16, padding:24, width:'90%', maxWidth:420, alignItems:'center', shadowColor:'#000', shadowOffset:{ width:0, height:12 }, shadowOpacity:0.15, shadowRadius:24, elevation:8 },
  modalTitle:{ fontSize:18, fontWeight:'800', color:'#111827', marginTop:6, marginBottom:4, textAlign:'center', fontFamily:'Poppins_700Bold' },
  modalSubtitle:{ fontSize:13, color:'#6B7280', textAlign:'center', marginBottom:16, fontFamily:'Poppins_400Regular' },
  modalPrimaryBtn:{ flexDirection:'row', alignItems:'center', gap:8, backgroundColor:'#3B82F6', paddingVertical:12, paddingHorizontal:20, borderRadius:10 },
  modalPrimaryText:{ color:'#FFFFFF', fontWeight:'700', fontFamily:'Poppins_700Bold' }
});