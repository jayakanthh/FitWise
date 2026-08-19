import React, { useState, useEffect } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Check, X, ShieldAlert } from "lucide-react-native";
import { colors, spacing, radius } from "../../theme/colors";
import { useCurrentUser } from "../../context/CurrentUser";
import { isUsernameAvailable, saveUsername, validateUsernameFormat, normalizeUsername } from "../../services/index";
import { Typography } from "../../components/ui/Typography";
import { Button } from "../../components/ui/Button";

export default function CreateUsernameScreen() {
  const { profile, refresh } = useCurrentUser();
  
  const [username, setUsername] = useState("");
  const [checking, setChecking] = useState(false);
  const [status, setStatus] = useState<"empty" | "invalid" | "available" | "taken">("empty");
  const [busy, setBusy] = useState(false);

  // Debounced check for username availability
  useEffect(() => {
    if (!username.trim()) {
      setStatus("empty");
      return;
    }

    const clean = normalizeUsername(username);
    if (!validateUsernameFormat(clean)) {
      setStatus("invalid");
      return;
    }

    setChecking(true);
    const delay = setTimeout(async () => {
      try {
        const available = await isUsernameAvailable(clean, profile?.id);
        setStatus(available ? "available" : "taken");
      } catch (e) {
        console.error(e);
        setStatus("invalid");
      } finally {
        setChecking(false);
      }
    }, 500);

    return () => clearTimeout(delay);
  }, [username, profile?.id]);

  const handleSave = async () => {
    if (!profile || status !== "available" || busy) return;
    setBusy(true);
    try {
      const clean = normalizeUsername(username);
      await saveUsername(profile.id, clean);
      await refresh(); // refresh profile context to close gate
    } catch (e: any) {
      Alert.alert("Error", e.message || "Could not save username.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.content}>
        <View style={styles.iconBox}>
          <ShieldAlert size={36} color={colors.primary} />
        </View>

        <Typography variant="h1" align="center" style={styles.title}>
          Create Your Username
        </Typography>
        <Typography variant="body" color={colors.textMuted} align="center" style={styles.desc}>
          Pick a unique username to identify yourself. Your friends can use this to search for and follow you.
        </Typography>

        <View style={styles.inputWrapper}>
          <Text style={styles.atSymbol}>@</Text>
          <TextInput
            style={styles.input}
            placeholder="username"
            placeholderTextColor={colors.textMuted}
            value={username}
            onChangeText={(t) => setUsername(t.replace(/\s+/g, ""))}
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={15}
            editable={!busy}
          />
        </View>

        {/* Status indicator */}
        <View style={styles.statusBox}>
          {checking ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : status === "available" ? (
            <View style={styles.statusRow}>
              <Check size={16} color={colors.success} />
              <Text style={[styles.statusText, { color: colors.success }]}>
                Username available
              </Text>
            </View>
          ) : status === "taken" ? (
            <View style={styles.statusRow}>
              <X size={16} color={colors.danger} />
              <Text style={[styles.statusText, { color: colors.danger }]}>
                Username already taken
              </Text>
            </View>
          ) : status === "invalid" ? (
            <View style={styles.statusRow}>
              <X size={16} color={colors.danger} />
              <Text style={[styles.statusText, { color: colors.danger }]}>
                Must be 3-15 chars (alphanumeric & _)
              </Text>
            </View>
          ) : null}
        </View>

        <Button
          variant="primary"
          onPress={handleSave}
          disabled={status !== "available" || busy}
          style={styles.btn}
        >
          {busy ? <ActivityIndicator color={colors.primaryDark} /> : "Get Started"}
        </Button>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg, justifyContent: "center" },
  content: { padding: spacing.xl, gap: spacing.md, alignItems: "center" },
  iconBox: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(72, 187, 149, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  title: { fontWeight: "800" },
  desc: { lineHeight: 20, marginBottom: spacing.md, maxWidth: 300 },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    width: "100%",
    maxWidth: 320,
    paddingHorizontal: spacing.md,
    height: 52,
  },
  atSymbol: { color: colors.primary, fontSize: 18, fontWeight: "700", marginRight: spacing.xs },
  input: { flex: 1, color: colors.text, fontSize: 16, padding: 0 },
  statusBox: { height: 24, justifyContent: "center" },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  statusText: { fontSize: 13, fontWeight: "600" },
  btn: { width: "100%", maxWidth: 320, marginTop: spacing.sm },
});
