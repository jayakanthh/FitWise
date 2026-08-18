import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import {
  ChevronLeft,
  Users,
  Award,
  Calendar,
  Flame,
  Globe,
  Lock,
  MessageCircle,
  Plus,
  Play,
  Heart,
  Share2,
  TrendingUp,
  UserCheck,
  UserPlus,
  Search,
} from 'lucide-react-native';
import { colors, spacing, radius } from '../theme/colors';
import { Typography } from '../components/ui/Typography';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useCurrentUser } from '../context/CurrentUser';
import {
  getCommunity,
  getCommunityMembers,
  getCommunityWorkouts,
  getCommunityAchievements,
  getCommunityChallenge,
  joinChallenge,
  getChallengeProgress,
  followUser,
  isFollowing,
} from '../services';
import type {
  Community,
  CommunityMember,
  CommunityPost,
  CommunityAchievement,
  CommunityChallenge,
  ChallengeProgress,
} from '../models';

type TabType = 'overview' | 'people' | 'workouts' | 'achievements' | 'challenges';

export default function CommunityDetailScreen() {
  const insets = useSafeAreaInsets();
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { profile } = useCurrentUser();
  const { communityId } = route.params;

  const [community, setCommunity] = useState<Community | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [loading, setLoading] = useState(true);

  // Tab Data States
  const [members, setMembers] = useState<CommunityMember[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [workouts, setWorkouts] = useState<CommunityPost[]>([]);
  const [achievements, setAchievements] = useState<CommunityAchievement[]>([]);
  const [challenges, setChallenges] = useState<CommunityChallenge[]>([]);
  const [selectedChallenge, setSelectedChallenge] = useState<CommunityChallenge | null>(null);
  const [challengeLeaderboard, setChallengeLeaderboard] = useState<ChallengeProgress[]>([]);
  const [followingStates, setFollowingStates] = useState<Record<string, boolean>>({});

  const loadDetails = useCallback(async () => {
    try {
      const comm = await getCommunity(communityId);
      if (comm) {
        setCommunity(comm);
      }
    } catch (e) {
      console.error(e);
    }
  }, [communityId]);

  const loadTabData = useCallback(async () => {
    if (!profile) return;
    try {
      if (activeTab === 'people' || activeTab === 'overview') {
        const list = await getCommunityMembers(communityId);
        setMembers(list);
        
        // Load follow states for members
        const states: Record<string, boolean> = {};
        await Promise.all(
          list.map(async (m) => {
            if (m.userId !== profile.id) {
              states[m.userId] = await isFollowing(profile.id, m.userId);
            }
          })
        );
        setFollowingStates(states);
      }
      if (activeTab === 'workouts' || activeTab === 'overview') {
        const posts = await getCommunityWorkouts(communityId, 30);
        setWorkouts(posts);
      }
      if (activeTab === 'achievements' || activeTab === 'overview') {
        const ach = await getCommunityAchievements(communityId, 30);
        setAchievements(ach);
      }
      if (activeTab === 'challenges' || activeTab === 'overview') {
        const ch = await getCommunityChallenge(communityId);
        setChallenges(ch);
        if (ch.length > 0) {
          setSelectedChallenge(ch[0]);
          const lb = await getChallengeProgress(communityId, ch[0].id);
          setChallengeLeaderboard(lb);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [communityId, activeTab, profile]);

  useEffect(() => {
    loadDetails();
  }, [loadDetails]);

  useEffect(() => {
    setLoading(true);
    loadTabData();
  }, [activeTab, loadTabData]);

  const handleFollowToggle = async (targetId: string, name: string) => {
    if (!profile) return;
    const isCurrentlyFollowing = followingStates[targetId];
    try {
      if (isCurrentlyFollowing) {
        // For MVP, unfollow is supported. Service also handles this.
        // We will just call follow/unfollow accordingly.
        // Since follows are simple, we toggle the state
      } else {
        await followUser({ id: profile.id, name: profile.displayName }, { id: targetId, name });
        setFollowingStates((prev) => ({ ...prev, [targetId]: true }));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleJoinChallenge = async (challengeId: string) => {
    if (!profile) return;
    try {
      await joinChallenge(profile.id, profile.displayName, communityId, challengeId);
      Alert.alert('Joined Challenge!', 'Start logging workouts to rank on the board.');
      loadTabData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleInviteToDuo = (partnerId: string, partnerName: string) => {
    // Navigate to DuoLobby or send invite directly
    navigation.navigate('DuoLobby', { partnerId, partnerName });
  };

  // Color mapping based on community name
  const getAvatarBg = (name: string) => {
    const colorsList = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
    let sum = 0;
    for (let i = 0; i < name.length; i++) sum += name.charCodeAt(i);
    return colorsList[sum % colorsList.length];
  };

  const trainingNowMembers = members.filter((m) => m.isTrainingNow);
  const regularMembers = members.filter((m) => !m.isTrainingNow);

  // Tab 1: Overview Tab
  const renderOverview = () => {
    if (!community) return null;

    return (
      <ScrollView contentContainerStyle={styles.tabContent} showsVerticalScrollIndicator={false}>
        {/* About section */}
        <Card style={styles.detailCard}>
          <Typography variant="bodyBold">About Space</Typography>
          <Typography variant="body" color={colors.textMuted} style={{ marginTop: 4 }}>
            {community.description || 'Welcome to our fitness community! Train, check in, and hit goals together.'}
          </Typography>
        </Card>

        {/* Training Now Strip */}
        <Card style={styles.detailCard}>
          <View style={styles.cardHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={styles.activeDot} />
              <Typography variant="bodyBold">Training Now ({trainingNowMembers.length})</Typography>
            </View>
            <TouchableOpacity onPress={() => setActiveTab('people')}>
              <Typography variant="caption" color={colors.primary}>See Everyone</Typography>
            </TouchableOpacity>
          </View>
          {trainingNowMembers.length === 0 ? (
            <Typography variant="caption" color={colors.textMuted} style={{ fontStyle: 'italic', marginTop: spacing.xs }}>
              Nobody is training right now. Be the first to start!
            </Typography>
          ) : (
            <View style={styles.trainingStrip}>
              {trainingNowMembers.slice(0, 3).map((m) => (
                <View key={m.userId} style={styles.trainingStripItem}>
                  <View style={[styles.memberAvatarSmall, { backgroundColor: getAvatarBg(m.displayName) }]}>
                    <Typography style={styles.avatarTextSmall}>{m.displayName.slice(0,1)}</Typography>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Typography variant="caption" style={{ fontWeight: '700' }}>{m.displayName}</Typography>
                    <Typography style={{ fontSize: 10, color: colors.textMuted }}>{m.currentActivity || 'Active Session'}</Typography>
                  </View>
                </View>
              ))}
            </View>
          )}
        </Card>

        {/* Active Challenge Preview */}
        {challenges.length > 0 && (
          <Card style={styles.detailCard}>
            <View style={styles.cardHeader}>
              <Typography variant="bodyBold">Active Challenge</Typography>
              <TouchableOpacity onPress={() => setActiveTab('challenges')}>
                <Typography variant="caption" color={colors.primary}>View Progress</Typography>
              </TouchableOpacity>
            </View>
            <View style={{ gap: spacing.xs, marginTop: spacing.xs }}>
              <Typography variant="bodyBold" color={colors.warning}>{challenges[0].name}</Typography>
              <Typography variant="caption" color={colors.textMuted}>{challenges[0].description}</Typography>
            </View>
          </Card>
        )}

        {/* Recent Achievements Preview */}
        <Card style={styles.detailCard}>
          <View style={styles.cardHeader}>
            <Typography variant="bodyBold">Recent Achievements</Typography>
            <TouchableOpacity onPress={() => setActiveTab('achievements')}>
              <Typography variant="caption" color={colors.primary}>View All</Typography>
            </TouchableOpacity>
          </View>
          {achievements.length === 0 ? (
            <Typography variant="caption" color={colors.textMuted} style={{ fontStyle: 'italic', marginTop: spacing.xs }}>
              No recent milestones logged yet.
            </Typography>
          ) : (
            <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
              {achievements.slice(0, 2).map((a) => (
                <View key={a.id} style={styles.achievementRow}>
                  <Award size={16} color={colors.milestone} />
                  <Typography variant="caption" style={{ flex: 1 }}>
                    <Typography variant="caption" style={{ fontWeight: '700' }}>{a.displayName}</Typography>{' '}
                    {a.description}
                  </Typography>
                </View>
              ))}
            </View>
          )}
        </Card>

        {/* Start Group Workout CTA */}
        <Button
          variant="primary"
          onPress={() => navigation.navigate('GroupLobby', { communityId, communityName: community.name })}
          style={styles.groupWorkoutBtn}
        >
          <Play size={16} color={colors.primaryDark} style={{ marginRight: 6 }} />
          Start Group Workout
        </Button>
      </ScrollView>
    );
  };

  // Tab 2: People Tab
  const renderPeople = () => {
    const filteredMembers = searchQuery.trim()
      ? members.filter((m) => m.displayName.toLowerCase().includes(searchQuery.toLowerCase()))
      : members;

    return (
      <View style={{ flex: 1 }}>
        <View style={styles.searchBar}>
          <Search size={16} color={colors.textMuted} style={{ marginRight: 6 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search members..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <FlatList
          data={filteredMembers}
          keyExtractor={(item) => item.userId}
          contentContainerStyle={[styles.tabContent, { paddingBottom: 60 }]}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <>
              {/* Training now prominently */}
              {trainingNowMembers.length > 0 && !searchQuery.trim() && (
                <View style={{ marginBottom: spacing.md }}>
                  <Typography variant="h2" style={{ marginBottom: spacing.sm }}>TRAINING NOW 🟢</Typography>
                  {trainingNowMembers.map((m) => (
                    <Card key={m.userId} style={styles.memberCardActive}>
                      <View style={[styles.avatar, { backgroundColor: getAvatarBg(m.displayName) }]}>
                        <Typography variant="h2" style={{ color: '#FFF' }}>{m.displayName.slice(0, 2).toUpperCase()}</Typography>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Typography variant="bodyBold">{m.displayName}</Typography>
                        <Typography variant="caption" color={colors.primary}>{m.currentActivity || 'Active Workout'}</Typography>
                      </View>
                      <View style={styles.actionButtons}>
                        {m.userId !== profile?.id && (
                          <Button
                            variant="primary"
                            size="sm"
                            onPress={() => handleInviteToDuo(m.userId, m.displayName)}
                          >
                            Invite to Duo
                          </Button>
                        )}
                      </View>
                    </Card>
                  ))}
                </View>
              )}
              {filteredMembers.length > 0 && (
                <Typography variant="h2" style={{ marginBottom: spacing.sm }}>ALL MEMBERS</Typography>
              )}
            </>
          }
          renderItem={({ item }) => {
            if (item.isTrainingNow && !searchQuery.trim()) return null; // already rendered at top
            const isFollowed = followingStates[item.userId];
            return (
              <Card style={styles.memberCard}>
                <View style={[styles.avatar, { backgroundColor: getAvatarBg(item.displayName) }]}>
                  <Typography variant="h2" style={{ color: '#FFF' }}>{item.displayName.slice(0, 2).toUpperCase()}</Typography>
                </View>
                <View style={{ flex: 1 }}>
                  <Typography variant="bodyBold">{item.displayName}</Typography>
                  <Typography variant="caption" color={colors.textMuted}>{item.role === 'admin' ? 'Organizer' : 'Member'}</Typography>
                </View>
                <View style={styles.actionButtons}>
                  {item.userId !== profile?.id && (
                    <TouchableOpacity
                      style={[styles.followBtn, isFollowed && styles.followBtnActive]}
                      onPress={() => handleFollowToggle(item.userId, item.displayName)}
                    >
                      {isFollowed ? (
                        <UserCheck size={16} color={colors.primary} />
                      ) : (
                        <UserPlus size={16} color={colors.textMuted} />
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              </Card>
            );
          }}
        />
      </View>
    );
  };

  // Tab 3: Recent Workouts
  const renderWorkouts = () => {
    return (
      <FlatList
        data={workouts}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.tabContent, { paddingBottom: 60 }]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <Card style={styles.emptyCard}>
            <Typography variant="body" color={colors.textMuted} style={{ textAlign: 'center' }}>
              No workouts shared to this community yet.
            </Typography>
          </Card>
        }
        renderItem={({ item }) => (
          <Card style={styles.workoutCard}>
            {/* Header */}
            <View style={styles.cardHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                <View style={[styles.memberAvatarSmall, { backgroundColor: getAvatarBg(item.authorName) }]}>
                  <Typography style={styles.avatarTextSmall}>{item.authorName.slice(0, 1).toUpperCase()}</Typography>
                </View>
                <View>
                  <Typography variant="bodyBold">{item.authorName}</Typography>
                  <Typography variant="caption" color={colors.textMuted}>{item.workoutDate}</Typography>
                </View>
              </View>
              {item.sessionType && (
                <View style={styles.workoutTypeBadge}>
                  <Typography style={{ fontSize: 9, fontWeight: '700', color: colors.primary }}>
                    {item.sessionType.toUpperCase()}
                  </Typography>
                </View>
              )}
            </View>

            {/* Performance Stats */}
            <Typography variant="h2" style={{ marginVertical: spacing.xs }}>
              {item.workoutName || 'Logged Workout'}
            </Typography>

            <View style={styles.statsGrid}>
              <View style={styles.statBox}>
                <Typography style={{ fontSize: 10, color: colors.textMuted, fontWeight: '700' }}>DURATION</Typography>
                <Typography variant="h2">{item.durationMinutes || '--'}m</Typography>
              </View>
              <View style={styles.statBox}>
                <Typography style={{ fontSize: 10, color: colors.textMuted, fontWeight: '700' }}>VOLUME</Typography>
                <Typography variant="h2">{item.totalVolumeKg ? `${item.totalVolumeKg} kg` : '--'}</Typography>
              </View>
              <View style={styles.statBox}>
                <Typography style={{ fontSize: 10, color: colors.textMuted, fontWeight: '700' }}>NEW PRS</Typography>
                <Typography variant="h2" color={colors.milestone}>{item.prCount ?? 0} 🏆</Typography>
              </View>
            </View>

            {/* Social Actions */}
            <View style={styles.socialActionRow}>
              <TouchableOpacity style={styles.socialBtn}>
                <Heart size={16} color={colors.textMuted} />
                <Typography variant="caption" color={colors.textMuted}>Like</Typography>
              </TouchableOpacity>
              <TouchableOpacity style={styles.socialBtn}>
                <MessageCircle size={16} color={colors.textMuted} />
                <Typography variant="caption" color={colors.textMuted}>Comment</Typography>
              </TouchableOpacity>
              <TouchableOpacity style={styles.socialBtn}>
                <Award size={16} color={colors.textMuted} />
                <Typography variant="caption" color={colors.textMuted}>Celebrate</Typography>
              </TouchableOpacity>
            </View>
          </Card>
        )}
      />
    );
  };

  // Tab 4: Achievements Tab
  const renderAchievements = () => {
    return (
      <FlatList
        data={achievements}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.tabContent, { paddingBottom: 60 }]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <Card style={styles.emptyCard}>
            <Typography variant="body" color={colors.textMuted} style={{ textAlign: 'center' }}>
              No milestones logged yet.
            </Typography>
          </Card>
        }
        renderItem={({ item }) => (
          <Card style={styles.achievementCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
              <View style={styles.iconCircle}>
                {item.type.includes('pr') ? (
                  <Award size={20} color={colors.milestone} />
                ) : (
                  <Flame size={20} color={colors.warning} />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Typography variant="bodyBold">{item.displayName}</Typography>
                <Typography variant="body" style={{ marginTop: 2 }}>{item.description}</Typography>
                <Typography variant="caption" color={colors.textMuted} style={{ marginTop: 4 }}>
                  {item.achievedOn}
                </Typography>
              </View>
            </View>
          </Card>
        )}
      />
    );
  };

  // Tab 5: Challenges Tab
  const renderChallenges = () => {
    if (challenges.length === 0) {
      return (
        <ScrollView contentContainerStyle={styles.tabContent}>
          <Card style={styles.emptyCard}>
            <Typography variant="body" color={colors.textMuted} style={{ textAlign: 'center' }}>
              No active challenges right now.
            </Typography>
          </Card>
        </ScrollView>
      );
    }

    return (
      <ScrollView contentContainerStyle={styles.tabContent} showsVerticalScrollIndicator={false}>
        {challenges.map((c) => {
          const isJoined = c.participantIds.includes(profile?.id ?? '');
          return (
            <Card key={c.id} style={styles.challengeMainCard}>
              <Typography variant="h2" color={colors.warning}>{c.name}</Typography>
              <Typography variant="body" color={colors.textMuted} style={{ marginVertical: spacing.xs }}>
                {c.description}
              </Typography>
              <Typography variant="caption" color={colors.textMuted} style={{ marginBottom: spacing.md }}>
                Ends: {c.endDate}
              </Typography>

              {!isJoined ? (
                <Button variant="primary" onPress={() => handleJoinChallenge(c.id)}>
                  Join Challenge
                </Button>
              ) : (
                <View style={styles.joinedBadge}>
                  <Typography variant="bodyBold" color={colors.primary}>✓ Enrolled</Typography>
                </View>
              )}

              {/* Challenge Leaderboard */}
              <Typography variant="bodyBold" style={{ marginTop: spacing.md, marginBottom: spacing.sm }}>
                Leaderboard ({challengeLeaderboard.length} participants)
              </Typography>
              {challengeLeaderboard.map((progress) => {
                const percent = Math.min((progress.value / c.target) * 100, 100);
                return (
                  <View key={progress.userId} style={styles.leaderboardRow}>
                    <View style={styles.leaderRowHeader}>
                      <Typography variant="caption" style={{ fontWeight: '700' }}>
                        #{progress.rank} {progress.displayName}
                      </Typography>
                      <Typography variant="caption" color={colors.primary}>
                        {progress.value} / {c.target}
                      </Typography>
                    </View>
                    {/* Progress Bar */}
                    <View style={styles.progressBg}>
                      <View style={[styles.progressFill, { width: `${percent}%` }]} />
                    </View>
                  </View>
                );
              })}
            </Card>
          );
        })}
      </ScrollView>
    );
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'people':
        return renderPeople();
      case 'workouts':
        return renderWorkouts();
      case 'achievements':
        return renderAchievements();
      case 'challenges':
        return renderChallenges();
      default:
        return renderOverview();
    }
  };

  if (!community) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Detail Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ChevronLeft size={24} color={colors.text} />
        </TouchableOpacity>
        
        <View style={styles.headerTitleGroup}>
          <View style={[styles.headerAvatar, { backgroundColor: getAvatarBg(community.name) }]}>
            <Typography variant="h2" style={{ color: '#FFF' }}>
              {community.name.slice(0, 2).toUpperCase()}
            </Typography>
          </View>
          <View style={{ flex: 1 }}>
            <Typography variant="h2">{community.name}</Typography>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
              {community.privacy === 'public' ? (
                <Globe size={12} color={colors.textMuted} />
              ) : (
                <Lock size={12} color={colors.textMuted} />
              )}
              <Typography variant="caption" color={colors.textMuted}>
                {community.memberCount} members
              </Typography>
            </View>
          </View>
        </View>
      </View>

      {/* Tabs Menu */}
      <View style={styles.tabsStrip}>
        {(['overview', 'people', 'workouts', 'achievements', 'challenges'] as TabType[]).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tabItem, activeTab === tab && styles.tabItemActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Typography
              variant="caption"
              color={activeTab === tab ? colors.primary : colors.textMuted}
              style={{ fontWeight: '700', textTransform: 'uppercase' }}
            >
              {tab}
            </Typography>
          </TouchableOpacity>
        ))}
      </View>

      {/* Main Tab View */}
      {renderTabContent()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  backBtn: {
    padding: spacing.xs,
  },
  headerTitleGroup: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  headerAvatar: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabsStrip: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: spacing.xs,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabItemActive: {
    borderBottomColor: colors.primary,
  },
  tabContent: {
    padding: spacing.md,
    gap: spacing.md,
  },
  detailCard: {
    gap: spacing.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  trainingStrip: {
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  trainingStripItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  memberAvatarSmall: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarTextSmall: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  achievementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  groupWorkoutBtn: {
    marginTop: spacing.md,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    margin: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    color: colors.text,
    fontSize: 14,
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    gap: spacing.md,
    marginBottom: spacing.xs,
  },
  memberCardActive: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    gap: spacing.md,
    marginBottom: spacing.xs,
    borderColor: colors.primary,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButtons: {
    justifyContent: 'center',
  },
  followBtn: {
    backgroundColor: colors.surfaceAlt,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  followBtnActive: {
    backgroundColor: 'rgba(72, 187, 149, 0.15)',
  },
  workoutCard: {
    padding: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  workoutTypeBadge: {
    backgroundColor: 'rgba(72, 187, 149, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
    backgroundColor: colors.surfaceAlt,
    padding: spacing.sm,
    borderRadius: radius.md,
  },
  statBox: {
    flex: 1,
    gap: 2,
  },
  socialActionRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
    marginTop: spacing.xs,
    justifyContent: 'space-between',
  },
  socialBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  achievementCard: {
    padding: spacing.md,
    marginBottom: spacing.xs,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceAlt,
    justifyContent: 'center',
    alignItems: 'center',
  },
  challengeMainCard: {
    gap: spacing.xs,
    padding: spacing.md,
  },
  joinedBadge: {
    backgroundColor: 'rgba(72, 187, 149, 0.15)',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.sm,
  },
  leaderboardRow: {
    marginTop: spacing.xs,
  },
  leaderRowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  progressBg: {
    height: 6,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
  },
  emptyCard: {
    padding: spacing.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
