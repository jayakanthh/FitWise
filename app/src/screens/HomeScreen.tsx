import { useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import {
  Sparkles,
  Flame,
  Clock,
  Play,
  ChevronRight,
  Dumbbell,
  Footprints,
  Activity,
  Heart,
  Zap,
} from 'lucide-react-native';
import { colors, spacing } from '../theme/colors';
import type { UserProfile, TrainingBuddy } from '../types/ironsync';

interface HomeScreenProps {
  user: UserProfile;
  buddies: TrainingBuddy[];
  onFindMatchClick: () => void;
  onStartTodayPlan: () => void;
  onSelectBuddyWorkout: (buddy: TrainingBuddy) => void;
  onCategorySelect?: (category: string) => void;
}

const CATEGORIES = [
  { id: 'Gym', label: 'Gym', Icon: Dumbbell },
  { id: 'Yoga', label: 'Yoga', Icon: Heart },
  { id: 'Fitness', label: 'Fitness', Icon: Activity },
  { id: 'Cardio', label: 'Cardio', Icon: Zap },
];

/** Ported from iron-sync web (HomeScreen.tsx). Ring progress via react-native-svg. */
export default function HomeScreen({
  user,
  buddies,
  onFindMatchClick,
  onStartTodayPlan,
  onSelectBuddyWorkout,
  onCategorySelect,
}: HomeScreenProps) {
  const [selectedCategory, setSelectedCategory] = useState('Gym');

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {/* Welcome Greeting */}
      <View>
        <Text style={styles.h1}>Welcome back, {user.name}</Text>
        <Text style={styles.subtext}>Ready to crush your goals today?</Text>
      </View>

      {/* AI Recommendation Match Card */}
      <View style={styles.matchCard}>
        <View style={styles.matchIconWrap}>
          <Sparkles size={20} color={colors.primary} />
        </View>
        <Text style={styles.matchTitle}>Not sure what to train today?</Text>
        <Text style={styles.matchDesc}>
          Tell us how you feel, and we'll craft the perfect session.
        </Text>
        <TouchableOpacity style={styles.matchBtn} onPress={onFindMatchClick} activeOpacity={0.85}>
          <Text style={styles.matchBtnText}>FIND MY MATCH</Text>
          <ChevronRight size={16} color={colors.primaryDark} strokeWidth={3} />
        </TouchableOpacity>
      </View>

      {/* Workout Category Pills */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillRow}>
        {CATEGORIES.map(({ id, label, Icon }) => {
          const isActive = selectedCategory === id;
          return (
            <TouchableOpacity
              key={id}
              onPress={() => {
                setSelectedCategory(id);
                onCategorySelect?.(id);
              }}
              style={[styles.pill, isActive && styles.pillActive]}
              activeOpacity={0.85}
            >
              <Icon size={14} color={isActive ? colors.primaryDark : colors.textMuted} />
              <Text style={[styles.pillText, isActive && styles.pillTextActive]}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* YOUR PROGRESS Section */}
      <View style={styles.section}>
        <Text style={styles.sectionHeader}>YOUR PROGRESS</Text>

        {/* Steps Card */}
        <View style={styles.statCardRow}>
          <View>
            <Text style={styles.statLabel}>STEPS</Text>
            <Text style={styles.statValueLg}>{user.stepsToday.toLocaleString()}</Text>
          </View>
          <View style={styles.ringWrap}>
            <Svg width={44} height={44} viewBox="0 0 36 36" style={StyleSheet.absoluteFill}>
              <Path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                stroke={colors.border}
                strokeWidth={2.5}
                fill="none"
              />
              <Path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                stroke={colors.primary}
                strokeWidth={2.5}
                strokeDasharray="45, 100"
                strokeLinecap="round"
                fill="none"
                rotation={-90}
                origin="18, 18"
              />
            </Svg>
            <Footprints size={16} color={colors.primary} />
          </View>
        </View>

        {/* Calories & Activity Grid */}
        <View style={styles.gridRow}>
          <View style={[styles.statCard, styles.gridCell]}>
            <View style={styles.statCardHeader}>
              <Flame size={14} color={colors.textMuted} />
              <Text style={styles.statLabel}>CALORIES</Text>
            </View>
            <View style={styles.baselineRow}>
              <Text style={styles.statValueMd}>{user.caloriesToday}</Text>
              <Text style={styles.statUnit}>kcal</Text>
            </View>
          </View>
          <View style={[styles.statCard, styles.gridCell]}>
            <View style={styles.statCardHeader}>
              <Clock size={14} color={colors.textMuted} />
              <Text style={styles.statLabel}>ACTIVITY</Text>
            </View>
            <Text style={styles.statValueMd}>1h 5m</Text>
          </View>
        </View>
      </View>

      {/* TODAY'S PLAN Section */}
      <View style={styles.section}>
        <Text style={styles.sectionHeader}>TODAY'S PLAN</Text>
        <TouchableOpacity style={styles.planCard} onPress={onStartTodayPlan} activeOpacity={0.9}>
          <View style={styles.planImageWrap}>
            <Image
              source={{ uri: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=800&auto=format&fit=crop&q=80' }}
              style={styles.planImage}
            />
            <View style={styles.planBadge}>
              <Text style={styles.planBadgeText}>Strength</Text>
            </View>
          </View>
          <View style={styles.planFooter}>
            <View>
              <Text style={styles.planTitle}>Upper Body</Text>
              <Text style={styles.planMeta}>5 exercises • 52 min</Text>
            </View>
            <TouchableOpacity style={styles.playBtn} onPress={onStartTodayPlan} activeOpacity={0.85}>
              <Play size={16} color={colors.primaryDark} fill={colors.primaryDark} />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </View>

      {/* TRAINING NOW Section */}
      <View style={[styles.section, { marginBottom: spacing.xl }]}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeader}>TRAINING NOW</Text>
          <Text style={styles.dots}>•••</Text>
        </View>

        <View style={{ gap: spacing.sm }}>
          {buddies.map((buddy) => (
            <TouchableOpacity
              key={buddy.id}
              style={styles.buddyRow}
              onPress={() => onSelectBuddyWorkout(buddy)}
              activeOpacity={0.9}
            >
              <View style={styles.buddyLeft}>
                <View>
                  <Image source={{ uri: buddy.avatar }} style={styles.buddyAvatar} />
                  <View style={styles.onlineDot} />
                </View>
                <View>
                  <Text style={styles.buddyName}>{buddy.name}</Text>
                  <Text style={styles.buddyActivity}>{buddy.activityTitle}</Text>
                </View>
              </View>
              <View style={styles.buddyRight}>
                {buddy.id === 'buddy-aryan' && (
                  <View style={styles.liveDuoBadge}>
                    <Text style={styles.liveDuoText}>LIVE DUO</Text>
                  </View>
                )}
                <ChevronRight size={16} color={colors.textMuted} />
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.md, paddingTop: spacing.lg, gap: spacing.lg },
  h1: { color: colors.text, fontSize: 22, fontWeight: '800' },
  subtext: { color: colors.textMuted, fontSize: 13, marginTop: 2 },

  matchCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: spacing.md,
    gap: spacing.sm,
  },
  matchIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.primary + '4D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  matchTitle: { color: colors.text, fontSize: 16, fontWeight: '700' },
  matchDesc: { color: colors.textMuted, fontSize: 12, marginTop: 2, lineHeight: 17 },
  matchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.xs,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: 999,
    marginTop: spacing.xs,
  },
  matchBtnText: { color: colors.primaryDark, fontSize: 11, fontWeight: '800', letterSpacing: 1 },

  pillRow: { flexGrow: 0 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: spacing.xs,
  },
  pillActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  pillText: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },
  pillTextActive: { color: colors.primaryDark },

  section: { gap: spacing.sm },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionHeader: { color: colors.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 1.5 },
  dots: { color: colors.textMuted, fontSize: 12, letterSpacing: 1.5 },

  statCardRow: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statLabel: { color: colors.textMuted, fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  statValueLg: { color: colors.text, fontSize: 24, fontWeight: '800', marginTop: 2 },
  statValueMd: { color: colors.text, fontSize: 20, fontWeight: '800' },
  statUnit: { color: colors.textMuted, fontSize: 12 },
  baselineRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4, marginTop: 4 },

  ringWrap: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },

  gridRow: { flexDirection: 'row', gap: spacing.sm },
  gridCell: { flex: 1 },
  statCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: spacing.md,
  },
  statCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },

  planCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
    overflow: 'hidden',
  },
  planImageWrap: { height: 112, width: '100%' },
  planImage: { width: '100%', height: '100%' },
  planBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: 'rgba(16,19,21,0.8)',
    borderWidth: 1,
    borderColor: '#3f3f3f99',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 2,
  },
  planBadgeText: { color: '#e5e5e5', fontSize: 11, fontWeight: '500' },
  planFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    backgroundColor: colors.surface,
  },
  planTitle: { color: colors.text, fontSize: 17, fontWeight: '700' },
  planMeta: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  playBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  buddyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  buddyLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  buddyAvatar: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: colors.border },
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.surface,
  },
  buddyName: { color: colors.text, fontSize: 13, fontWeight: '700' },
  buddyActivity: { color: colors.textMuted, fontSize: 12 },
  buddyRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  liveDuoBadge: {
    backgroundColor: colors.primary + '26',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  liveDuoText: { color: colors.primary, fontSize: 10, fontWeight: '800', letterSpacing: 1 },
});
