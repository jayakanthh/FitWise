import React from 'react';
import { View, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Bell, Utensils, Award } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';
import { Typography } from '../ui/Typography';
import { UserProfile } from '../../types/ironsync';

interface TopHeaderProps {
  user: UserProfile;
  onAvatarPress: () => void;
  onNotificationPress: () => void;
  unreadNotifsCount?: number;
  onOpenNutrition?: () => void;
  onOpenStrengthPR?: () => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  user,
  onAvatarPress,
  onNotificationPress,
  unreadNotifsCount = 2,
  onOpenNutrition,
  onOpenStrengthPR,
}) => {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 12) + 6 }]}>
      <View style={styles.leftSection}>
        <TouchableOpacity onPress={onAvatarPress} style={styles.avatarContainer}>
          <Image source={{ uri: user.avatar }} style={styles.avatar} />
        </TouchableOpacity>
        
        <View style={styles.logoContainer}>
          <Image
            source={require('../../../assets/icon.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
          <Typography variant="h1" color={colors.text} style={styles.logoText}>
            Iron<Typography variant="h1" color={colors.primary}>Sync</Typography>
          </Typography>
        </View>
      </View>

      <View style={styles.rightSection}>
        {onOpenNutrition && (
          <TouchableOpacity onPress={onOpenNutrition} style={styles.iconBtn}>
            <Utensils size={20} color={colors.warning} />
          </TouchableOpacity>
        )}

        {onOpenStrengthPR && (
          <TouchableOpacity onPress={onOpenStrengthPR} style={styles.iconBtn}>
            <Award size={20} color={colors.milestone} />
          </TouchableOpacity>
        )}

        <TouchableOpacity onPress={onNotificationPress} style={styles.iconBtn}>
          <Bell size={22} color={colors.textMuted} />
          {unreadNotifsCount > 0 && <View style={styles.badge} />}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0B0D0F',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#1A1E21',
    zIndex: 40,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    padding: 2,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: 'rgba(255, 107, 0, 0.3)',
    marginRight: 10,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoImage: {
    width: 32,
    height: 32,
    marginRight: 6,
  },
  logoText: {
    letterSpacing: -0.5,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  iconBtn: {
    padding: 8,
    borderRadius: 999,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 6,
    right: 8,
    width: 10,
    height: 10,
    backgroundColor: colors.primary,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: colors.bg,
  },
});
