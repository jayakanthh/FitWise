import React, { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Card } from '../ui/Card';
import { Typography } from '../ui/Typography';
import { colors, spacing, radius } from '../../theme/colors';
import { ChevronRight } from 'lucide-react-native';

import type { Community, CommunityMember, CommunityChallenge, CommunityAchievement } from '../../models/index';
import { 
  getTrainingNowMembers, 
  getCommunityChallenge, 
  getCommunityAchievements,
  getCommunityWorkouts
} from '../../services/community/community';
import { getWorkoutById } from '../../services/workouts/workouts';
import { getExercisesByIds } from '../../services/exercises/exercises';
import { getAvatarBg } from '../../utils/formatting/avatarColors';

interface Props {
  community: Community;
  onTabChange: (tab: string) => void;
}

export default function OverviewTab({ community, onTabChange }: Props) {
  const navigation = useNavigation<any>();
  const [loading, setLoading] = useState(true);
  const [trainingNow, setTrainingNow] = useState<CommunityMember[]>([]);
  const [activeChallenge, setActiveChallenge] = useState<CommunityChallenge | null>(null);
  const [achievements, setAchievements] = useState<CommunityAchievement[]>([]);
  
  // Insights state
  const [insightsLoading, setInsightsLoading] = useState(true);
  const [peakTime, setPeakTime] = useState<string | null>(null);
  const [topEquipment, setTopEquipment] = useState<{name: string, pct: number}[]>([]);
  const [topBodyParts, setTopBodyParts] = useState<string[]>([]);

  useEffect(() => {
    async function load() {
      try {
        const [members, challenges, achs] = await Promise.all([
          getTrainingNowMembers(community.id),
          getCommunityChallenge(community.id),
          getCommunityAchievements(community.id, 3)
        ]);
        setTrainingNow(members);
        setActiveChallenge(challenges.length > 0 ? challenges[0] : null);
        setAchievements(achs);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [community.id]);

  useEffect(() => {
    async function loadInsights() {
      try {
        const posts = await getCommunityWorkouts(community.id, 20);
        if (posts.length < 3) {
          setInsightsLoading(false);
          return;
        }

        const workouts = [];
        for (const post of posts) {
          const w = await getWorkoutById(post.authorId, post.workoutId);
          if (w) workouts.push(w);
        }

        if (workouts.length < 3) {
          setInsightsLoading(false);
          return;
        }

        // Peak Time
        const hours = new Array(24).fill(0);
        workouts.forEach(w => {
          // Fallback to simple randomish if we only have date string
          const date = new Date(w.date || Date.now());
          hours[date.getHours()]++;
        });
        const peakHour = hours.indexOf(Math.max(...hours));
        const endHour = (peakHour + 2) % 24;
        const formatHour = (h: number) => {
          const ampm = h >= 12 ? 'PM' : 'AM';
          const hr = h % 12 || 12;
          return `${hr} ${ampm}`;
        };
        setPeakTime(`${formatHour(peakHour)} — ${formatHour(endHour)}`);

        // Equipment & Muscles
        const uniqueExIds = new Set<string>();
        workouts.forEach(w => w.entries.forEach(e => uniqueExIds.add(e.exerciseId)));
        
        const exList = await getExercisesByIds(Array.from(uniqueExIds));
        const exMap = new Map(exList.map(e => [e.id, e]));

        const eqCounts: Record<string, number> = {};
        const muscleCounts: Record<string, number> = {};
        let totalEx = 0;

        workouts.forEach(w => {
          w.entries.forEach(e => {
            const exercise = exMap.get(e.exerciseId);
            if (exercise) {
              totalEx++;
              if (exercise.equipment) {
                eqCounts[exercise.equipment] = (eqCounts[exercise.equipment] || 0) + 1;
              }
              if (exercise.muscleGroup) {
                muscleCounts[exercise.muscleGroup] = (muscleCounts[exercise.muscleGroup] || 0) + 1;
              }
            }
          });
        });

        const sortedEq = Object.entries(eqCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([name, count]) => ({
            name: name.charAt(0).toUpperCase() + name.slice(1),
            pct: Math.round((count / Math.max(1, totalEx)) * 100)
          }));
        setTopEquipment(sortedEq);

        const sortedMuscles = Object.entries(muscleCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([name]) => name.charAt(0).toUpperCase() + name.slice(1));
        setTopBodyParts(sortedMuscles);

      } catch (err) {
        console.error(err);
      } finally {
        setInsightsLoading(false);
      }
    }
    loadInsights();
  }, [community.id]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      
      {/* TRAINING NOW */}
      <Card style={styles.card}>
        <View style={styles.cardHeader}>
          <Typography variant="bodyBold" style={styles.cardTitle}>TRAINING NOW</Typography>
        </View>
        <Typography variant="body" color={colors.textMuted} style={styles.subtitle}>
          {trainingNow.length} people are training
        </Typography>

        {trainingNow.length === 0 ? (
          <Typography variant="caption" color={colors.textMuted} style={styles.empty}>
            No one is training right now.
          </Typography>
        ) : (
          <View style={styles.list}>
            {trainingNow.slice(0, 3).map(m => (
              <TouchableOpacity 
                key={m.userId} 
                style={styles.row}
                onPress={() => navigation.navigate('UserProfile', { userId: m.userId })}
              >
                <View style={[styles.avatar, { backgroundColor: getAvatarBg(m.displayName) }]}>
                  <Typography style={styles.avatarText}>{m.displayName.slice(0, 2).toUpperCase()}</Typography>
                </View>
                <View style={styles.rowContent}>
                  <Typography variant="bodyBold">{m.displayName}</Typography>
                  <Typography variant="caption" color={colors.textMuted}>
                    {m.currentActivity || 'Working out'}
                  </Typography>
                </View>
                <View style={styles.dot} />
              </TouchableOpacity>
            ))}
          </View>
        )}
        
        <TouchableOpacity style={styles.viewAll} onPress={() => onTabChange('people')}>
          <Typography variant="caption" color={colors.primary}>View all</Typography>
          <ChevronRight size={14} color={colors.primary} />
        </TouchableOpacity>
      </Card>

      {/* COMMUNITY INSIGHTS */}
      <Card style={styles.card}>
        <View style={styles.cardHeader}>
          <Typography variant="bodyBold" style={styles.cardTitle}>COMMUNITY INSIGHTS</Typography>
        </View>
        <Typography variant="caption" color={colors.textMuted} style={styles.subtitle}>
          Based on recent community activity
        </Typography>
        
        {insightsLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.sm }} />
        ) : !peakTime ? (
          <Typography variant="caption" color={colors.textMuted} style={styles.empty}>
            Not enough activity yet.
          </Typography>
        ) : (
          <View style={styles.insights}>
            <View style={styles.insightBlock}>
              <Typography variant="caption" color={colors.textMuted}>Peak Training Time</Typography>
              <Typography variant="bodyBold">{peakTime}</Typography>
            </View>

            <View style={styles.insightBlock}>
              <Typography variant="caption" color={colors.textMuted}>Most Used Equipment</Typography>
              {topEquipment.length > 0 ? topEquipment.map((eq, i) => (
                <View key={i} style={styles.eqRow}>
                  <Typography variant="caption" style={styles.eqName}>{eq.name}</Typography>
                  <View style={styles.eqBarBg}>
                    <View style={[styles.eqBarFill, { width: `${eq.pct}%` }]} />
                  </View>
                </View>
              )) : (
                <Typography variant="caption" color={colors.textMuted}>No equipment data</Typography>
              )}
            </View>

            <View style={styles.insightBlock}>
              <Typography variant="caption" color={colors.textMuted}>Most Trained Body Parts</Typography>
              <Typography variant="bodyBold">
                {topBodyParts.join(' · ') || 'Not enough data'}
              </Typography>
            </View>
          </View>
        )}
      </Card>

      {/* ACTIVE CHALLENGE */}
      <Card style={styles.card}>
        <Typography variant="bodyBold" style={styles.cardTitle}>ACTIVE CHALLENGE</Typography>
        
        {!activeChallenge ? (
          <Typography variant="caption" color={colors.textMuted} style={styles.empty}>
            No active challenges.
          </Typography>
        ) : (
          <View style={styles.challengeBlock}>
            <Typography variant="bodyBold" style={{ textTransform: 'uppercase' }}>
              {activeChallenge.name}
            </Typography>
            <View style={styles.challengeMeta}>
              <Typography variant="caption" color={colors.textMuted}>
                {activeChallenge.participantIds.length} participants
              </Typography>
            </View>
          </View>
        )}
        
        <TouchableOpacity style={styles.viewAll} onPress={() => onTabChange('challenges')}>
          <Typography variant="caption" color={colors.primary}>View Challenge</Typography>
          <ChevronRight size={14} color={colors.primary} />
        </TouchableOpacity>
      </Card>

      {/* RECENT ACHIEVEMENTS */}
      <Card style={styles.card}>
        <Typography variant="bodyBold" style={styles.cardTitle}>RECENT ACHIEVEMENTS</Typography>
        
        {achievements.length === 0 ? (
          <Typography variant="caption" color={colors.textMuted} style={styles.empty}>
            No achievements yet.
          </Typography>
        ) : (
          <View style={styles.list}>
            {achievements.map(ach => (
              <View key={ach.id} style={styles.achRow}>
                <Typography variant="bodyBold" style={{ width: 80 }} numberOfLines={1}>
                  {ach.displayName}
                </Typography>
                <Typography variant="caption" style={{ flex: 1 }} color={colors.textMuted}>
                  {ach.type.replace('_', ' ').toUpperCase()}
                </Typography>
                <Typography variant="bodyBold">
                  {ach.value} {ach.type.includes('pr') ? 'kg' : ''}
                </Typography>
              </View>
            ))}
          </View>
        )}
        
        <TouchableOpacity style={styles.viewAll} onPress={() => onTabChange('achievements')}>
          <Typography variant="caption" color={colors.primary}>View all</Typography>
          <ChevronRight size={14} color={colors.primary} />
        </TouchableOpacity>
      </Card>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.md,
    gap: spacing.md,
  },
  card: {
    padding: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    color: colors.textMuted,
    fontSize: 12,
    letterSpacing: 1,
    marginBottom: spacing.xs,
  },
  subtitle: {
    marginBottom: spacing.sm,
  },
  empty: {
    fontStyle: 'italic',
    marginTop: spacing.xs,
  },
  list: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  rowContent: {
    flex: 1,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  viewAll: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  insights: {
    marginTop: spacing.sm,
    gap: spacing.md,
  },
  insightBlock: {
    gap: 4,
  },
  eqRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: 4,
  },
  eqName: {
    width: 90,
  },
  eqBarBg: {
    flex: 1,
    height: 8,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 4,
    overflow: 'hidden',
  },
  eqBarFill: {
    height: '100%',
    backgroundColor: colors.primary,
  },
  challengeBlock: {
    marginTop: spacing.sm,
  },
  challengeMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  achRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  }
});
