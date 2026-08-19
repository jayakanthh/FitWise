import React, { useState, useEffect } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Scale, Bell, Shield, Info, ChevronRight, ChevronLeft, Check, X, Edit2 } from "lucide-react-native";
import { colors, spacing, radius } from "../../theme/colors";
import { useCurrentUser } from "../../context/CurrentUser";
import { signOutUser, isUsernameAvailable, saveUsername, validateUsernameFormat, normalizeUsername } from "../../services/index";

export default function SettingsScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { profile, refresh } = useCurrentUser();

  // Units toggle: default to metric (kg)
  const [useMetric, setUseMetric] = useState(true);
  // Notification toggle: placeholder (no push yet)
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  // Username edit states
  const [editingUsername, setEditingUsername] = useState(false);
  const [newUsername, setNewUsername] = useState(profile?.username ? normalizeUsername(profile.username) : "");
  const [checking, setChecking] = useState(false);
  const [status, setStatus] = useState<"empty" | "invalid" | "available" | "taken">("empty");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!editingUsername) return;
    if (!newUsername.trim()) {
      setStatus("empty");
      return;
    }

    const clean = normalizeUsername(newUsername);
    if (profile?.username && clean === normalizeUsername(profile.username)) {
      setStatus("available");
      return;
    }

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
  }, [newUsername, editingUsername, profile]);

  const handleSaveUsername = async () => {
    if (!profile || status !== "available" || busy) return;
    setBusy(true);
    try {
      const clean = normalizeUsername(newUsername);
      await saveUsername(profile.id, clean);
      await refresh();
      setEditingUsername(false);
      Alert.alert("Success", "Username updated successfully!");
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to update username.");
    } finally {
      setBusy(false);
    }
  };

  const handleUnitsToggle = (val: boolean) => {
    setUseMetric(val);
    Alert.alert(
      "Units changed",
      val
        ? "Using metric units (kg, cm)"
        : "Using imperial units (lbs, in)",
      [{ text: "OK" }],
    );
  };

  const handleNotificationsToggle = (val: boolean) => {
    setNotificationsEnabled(val);
    if (!val) {
      Alert.alert(
        "Notifications disabled",
        "You will no longer receive workout reminders or social alerts.",
        [{ text: "OK" }],
      );
    }
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Settings</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Account */}
        {profile && (
          <>
            <Text style={styles.sectionLabel}>ACCOUNT</Text>
            <View style={styles.card}>
              <Row label="Name" value={profile.displayName} />
              <Row label="Email" value={profile.email} />
              
              {editingUsername ? (
                <View style={styles.editUsernameBox}>
                  <Text style={styles.editLabel}>Edit Username</Text>
                  <View style={styles.editRow}>
                    <Text style={styles.atPrefix}>@</Text>
                    <TextInput
                      style={styles.usernameInput}
                      value={newUsername}
                      onChangeText={(t) => setNewUsername(t.replace(/\s+/g, ""))}
                      autoCapitalize="none"
                      autoCorrect={false}
                      maxLength={15}
                    />
                  </View>
                  
                  {/* Status Indicator */}
                  <View style={styles.inlineStatusBox}>
                    {checking ? (
                      <ActivityIndicator size="small" color={colors.primary} />
                    ) : status === "available" ? (
                      <Text style={[styles.statusText, { color: colors.success }]}>✓ Username available</Text>
                    ) : status === "taken" ? (
                      <Text style={[styles.statusText, { color: colors.danger }]}>✕ Username already taken</Text>
                    ) : status === "invalid" ? (
                      <Text style={[styles.statusText, { color: colors.danger }]}>✕ 3-15 chars (alphanumeric & _)</Text>
                    ) : null}
                  </View>

                  <View style={styles.editActions}>
                    <TouchableOpacity
                      style={styles.cancelBtn}
                      onPress={() => {
                        setEditingUsername(false);
                        setNewUsername(profile.username ? normalizeUsername(profile.username) : "");
                      }}
                    >
                      <Text style={styles.cancelBtnText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.saveBtn, status !== "available" && styles.saveBtnDisabled]}
                      onPress={handleSaveUsername}
                      disabled={status !== "available" || busy}
                    >
                      <Text style={styles.saveBtnText}>Save</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.usernameRow}
                  onPress={() => setEditingUsername(true)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.rowLabel}>Username</Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Text style={styles.rowValue}>{profile.username || "—"}</Text>
                    <Edit2 size={14} color={colors.primary} />
                  </View>
                </TouchableOpacity>
              )}
            </View>
          </>
        )}

        {/* Preferences */}
        <Text style={styles.sectionLabel}>PREFERENCES</Text>
        <View style={styles.card}>
          <View style={styles.toggleRow}>
            <View style={styles.toggleLeft}>
              <Scale size={16} color={colors.primary} />
              <View>
                <Text style={styles.toggleLabel}>Metric Units</Text>
                <Text style={styles.toggleSub}>kg, cm, km</Text>
              </View>
            </View>
            <Switch
              value={useMetric}
              onValueChange={handleUnitsToggle}
              trackColor={{ false: colors.surfaceAlt, true: colors.primary + "80" }}
              thumbColor={useMetric ? colors.primary : colors.textMuted}
            />
          </View>
          <View style={[styles.toggleRow, { borderTopWidth: 1, borderTopColor: colors.border }]}>
            <View style={styles.toggleLeft}>
              <Bell size={16} color={colors.primary} />
              <View>
                <Text style={styles.toggleLabel}>Notifications</Text>
                <Text style={styles.toggleSub}>Friend requests, duo invites</Text>
              </View>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={handleNotificationsToggle}
              trackColor={{ false: colors.surfaceAlt, true: colors.primary + "80" }}
              thumbColor={notificationsEnabled ? colors.primary : colors.textMuted}
            />
          </View>
        </View>

        {/* Privacy */}
        <Text style={styles.sectionLabel}>PRIVACY</Text>
        <View style={styles.card}>
          <View style={styles.disabledRow}>
            <View style={styles.toggleLeft}>
              <Shield size={16} color={colors.textMuted} />
              <View>
                <Text style={[styles.toggleLabel, { color: colors.textMuted }]}>Privacy Settings</Text>
                <Text style={styles.toggleSub}>Coming soon</Text>
              </View>
            </View>
            <View style={styles.comingSoonBadge}>
              <Text style={styles.comingSoonText}>Soon</Text>
            </View>
          </View>
        </View>

        {/* About */}
        <Text style={styles.sectionLabel}>ABOUT</Text>
        <View style={styles.card}>
          <View style={styles.infoRow}>
            <View style={styles.toggleLeft}>
              <Info size={16} color={colors.textMuted} />
              <Text style={styles.toggleLabel}>App Version</Text>
            </View>
            <Text style={styles.infoValue}>1.0.0</Text>
          </View>
        </View>

        {/* Logout */}
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={() => {
            Alert.alert("Log out", "Are you sure you want to log out?", [
              { text: "Cancel", style: "cancel" },
              { text: "Log out", style: "destructive", onPress: signOutUser },
            ]);
          }}
          activeOpacity={0.8}
        >
          <Text style={styles.logoutText}>Log out</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function Row({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.rowItem, !last && styles.rowBorder]}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: { padding: 4 },
  backText: { color: colors.text, fontSize: 22, fontWeight: "300" },
  title: { color: colors.text, fontSize: 20, fontWeight: "800" },
  content: { padding: spacing.md, gap: spacing.sm, paddingBottom: 100 },
  sectionLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.5,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    overflow: "hidden",
  },
  rowItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 14,
  },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  rowLabel: { color: colors.textMuted, fontSize: 15 },
  rowValue: { color: colors.text, fontSize: 15, fontWeight: "600", maxWidth: "60%" },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
  },
  toggleLeft: { flexDirection: "row", alignItems: "center", gap: spacing.sm, flex: 1 },
  toggleLabel: { color: colors.text, fontSize: 15, fontWeight: "600" },
  toggleSub: { color: colors.textMuted, fontSize: 12, marginTop: 1 },
  disabledRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
  },
  comingSoonBadge: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: colors.border,
  },
  comingSoonText: { color: colors.textMuted, fontSize: 11, fontWeight: "700" },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
  },
  infoValue: { color: colors.textMuted, fontSize: 13 },
  logoutBtn: {
    marginTop: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingVertical: 14,
    alignItems: "center",
  },
  logoutText: { color: "#F87171", fontSize: 15, fontWeight: "700" },
  usernameRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 14,
  },
  editUsernameBox: {
    paddingVertical: 14,
    gap: spacing.sm,
  },
  editLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "700",
  },
  editRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    height: 44,
  },
  atPrefix: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: "700",
    marginRight: 4,
  },
  usernameInput: {
    flex: 1,
    color: colors.text,
    fontSize: 15,
    padding: 0,
  },
  inlineStatusBox: {
    height: 18,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  editActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceAlt,
  },
  cancelBtnText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "700",
  },
  saveBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radius.sm,
    backgroundColor: colors.primary,
  },
  saveBtnDisabled: {
    opacity: 0.5,
  },
  saveBtnText: {
    color: colors.primaryDark,
    fontSize: 13,
    fontWeight: "700",
  },
});
