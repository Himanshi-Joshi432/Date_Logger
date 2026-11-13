import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  RefreshControl,
  Alert,
  LayoutAnimation,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Lightbulb,
  Plus,
  Trash2,
  CheckCircle2,
  Circle,
  ArrowRight,
  Heart,
  Sparkles,
} from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { ideasAPI } from '../services/api';
import { haptics } from '../utils/haptics';
import { FadeInView, PressableScale, PulseView, staggerDelay } from '../components/motion';
import { fonts, shadow } from '../theme/tokens';

const animateNextLayout = () =>
  LayoutAnimation.configureNext(LayoutAnimation.create(260, 'easeInEaseOut', 'opacity'));

const IDEAS_STORAGE_KEY = 'date_logger_bucket_list';
const MIGRATED_KEY_PREFIX = 'date_logger_ideas_migrated_';

// Sample ideas that older versions of the app seeded on first launch.
const LEGACY_SAMPLE_TITLES = new Set([
  'Sunset picnic at the botanical garden',
  'Pottery class & cozy coffee date',
  'Late night drive with warm hot chocolate',
]);

const isServerId = (id) => /^[a-f0-9]{24}$/i.test(String(id || ''));
const fromServer = (idea) => ({
  id: idea._id,
  title: idea.title,
  completed: !!idea.completed,
  createdAt: idea.createdAt,
});

export function DateIdeasScreen({ onLogIdeaAsDate }) {
  const { colors } = useTheme();
  const { token, user } = useAuth();
  const [ideas, setIdeas] = useState([]);
  const [newIdeaText, setNewIdeaText] = useState('');
  const [filter, setFilter] = useState('all'); // 'all' | 'pending' | 'completed'
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    loadIdeas();
  }, [token]);

  /** Updates the list on screen and the offline copy. */
  const applyIdeas = (next, { animate = true } = {}) => {
    if (animate) animateNextLayout();
    setIdeas(next);
    AsyncStorage.setItem(IDEAS_STORAGE_KEY, JSON.stringify(next)).catch(() => {});
  };

  const loadIdeas = async () => {
    // 1. Show the offline copy straight away.
    let local = [];
    try {
      const stored = await AsyncStorage.getItem(IDEAS_STORAGE_KEY);
      if (stored) local = JSON.parse(stored) || [];
      if (local.length > 0) setIdeas(local);
    } catch (e) {}

    try {
      // 2. One-time move of ideas that only ever lived on this phone up to the account.
      const migratedKey = MIGRATED_KEY_PREFIX + (user?.id || 'me');
      const alreadyMigrated = (await AsyncStorage.getItem(migratedKey)) === 'true';
      if (!alreadyMigrated) {
        const toImport = local
          .filter((i) => i?.title && !isServerId(i.id) && !LEGACY_SAMPLE_TITLES.has(i.title))
          .map((i) => ({ title: i.title, completed: !!i.completed }));
        if (toImport.length > 0) {
          await ideasAPI.importMany(toImport.reverse(), token);
        }
        await AsyncStorage.setItem(migratedKey, 'true');
      }

      // 3. The server list (yours plus your partner's) is the source of truth.
      const data = await ideasAPI.list(token);
      applyIdeas((data.ideas || []).map(fromServer), { animate: false });
    } catch (err) {
      // Offline: keep showing the local copy.
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadIdeas();
    setIsRefreshing(false);
  };

  const handleAddIdea = async () => {
    const title = newIdeaText.trim();
    if (!title) return;
    haptics.success();

    const tempId = `temp-${Date.now()}`;
    const optimistic = { id: tempId, title, completed: false, createdAt: new Date().toISOString() };
    const before = ideas;
    applyIdeas([optimistic, ...ideas]);
    setNewIdeaText('');

    try {
      const data = await ideasAPI.create(title, token);
      const saved = fromServer(data.ideas[0]);
      setIdeas((current) => {
        const next = current.map((i) => (i.id === tempId ? saved : i));
        AsyncStorage.setItem(IDEAS_STORAGE_KEY, JSON.stringify(next)).catch(() => {});
        return next;
      });
    } catch (err) {
      haptics.error();
      applyIdeas(before);
      setNewIdeaText(title);
      Alert.alert('Could not save idea', err.message || 'Please check your connection and try again.');
    }
  };

  const handleToggleComplete = async (id) => {
    const target = ideas.find((i) => i.id === id);
    if (!target || !isServerId(id)) return; // still saving
    haptics.select();

    const before = ideas;
    applyIdeas(ideas.map((i) => (i.id === id ? { ...i, completed: !i.completed } : i)));
    try {
      await ideasAPI.update(id, { completed: !target.completed }, token);
    } catch (err) {
      haptics.error();
      applyIdeas(before);
    }
  };

  const handleDelete = (id, title) => {
    Alert.alert('Remove Idea', `Remove "${title}" from bucket list?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          haptics.warning();
          const before = ideas;
          applyIdeas(ideas.filter((idea) => idea.id !== id));
          if (!isServerId(id)) return;
          try {
            await ideasAPI.remove(id, token);
          } catch (err) {
            applyIdeas(before);
            Alert.alert('Could not remove idea', err.message || 'Please try again.');
          }
        },
      },
    ]);
  };

  const filteredIdeas = ideas.filter((item) => {
    if (filter === 'pending') return !item.completed;
    if (filter === 'completed') return item.completed;
    return true;
  });

  const styles = getStyles(colors);

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <FadeInView from="top" distance={10} style={styles.header}>
        <View style={styles.titleRow}>
          <Sparkles size={20} color={colors.primary} />
          <Text style={styles.title}>Date Bucket List</Text>
        </View>
        <Text style={styles.subtitle}>
          {user?.partner?.email
            ? `Shared with ${user.partner.email.split('@')[0]} — dream up dates & check them off ♡`
            : 'Dream up future dates together & check them off ♡'}
        </Text>
      </FadeInView>

      {/* Add New Idea Input */}
      <FadeInView delay={80} style={styles.addCard}>
        <TextInput
          style={styles.input}
          placeholder="New date idea (e.g. Star gazing picnic)..."
          placeholderTextColor={colors.textMuted}
          value={newIdeaText}
          onChangeText={setNewIdeaText}
          onSubmitEditing={handleAddIdea}
          returnKeyType="done"
        />
        <PressableScale
          style={[styles.addBtn, !newIdeaText.trim() && styles.addBtnDisabled]}
          onPress={handleAddIdea}
          disabled={!newIdeaText.trim()}
          haptic={null}
          scaleTo={0.85}
        >
          <Plus size={18} color="#ffffff" />
        </PressableScale>
      </FadeInView>

      {/* Filter Tabs */}
      <FadeInView delay={140} style={styles.filterRow}>
        {['all', 'pending', 'completed'].map((tab) => (
          <PressableScale
            key={tab}
            style={[styles.filterChip, filter === tab && styles.filterChipActive]}
            onPress={() => {
              animateNextLayout();
              setFilter(tab);
            }}
            haptic="select"
            scaleTo={0.92}
          >
            <Text style={[styles.filterChipText, filter === tab && styles.filterChipTextActive]}>
              {tab === 'all' ? `All (${ideas.length})` : tab === 'pending' ? 'To Do' : 'Done ✓'}
            </Text>
          </PressableScale>
        ))}
      </FadeInView>

      {/* Ideas List */}
      <FlatList
        data={filteredIdeas}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          <FadeInView style={styles.emptyWrap}>
            <PulseView>
              <Lightbulb size={32} color={colors.primary} />
            </PulseView>
            <Text style={styles.emptyTitle}>No ideas yet</Text>
            <Text style={styles.emptySub}>Add places you want to visit and things you want to try together!</Text>
          </FadeInView>
        }
        renderItem={({ item, index }) => (
          <FadeInView
            delay={staggerDelay(index, 180, 50)}
            style={[styles.ideaCard, item.completed && styles.ideaCardCompleted]}
          >
            <PressableScale
              style={styles.checkBtn}
              onPress={() => handleToggleComplete(item.id)}
              haptic={null}
              scaleTo={0.8}
              hitSlop={6}
            >
              <FadeInView key={item.completed ? 'done' : 'todo'} from="scale">
                {item.completed ? (
                  <CheckCircle2 size={24} color={colors.success} />
                ) : (
                  <Circle size={24} color={colors.borderActive} />
                )}
              </FadeInView>
            </PressableScale>

            <View style={styles.ideaTextWrap}>
              <Text
                style={[
                  styles.ideaTitle,
                  item.completed && styles.ideaTitleCompleted,
                ]}
              >
                {item.title}
              </Text>
            </View>

            {/* Action buttons */}
            <View style={styles.actionsRow}>
              {!item.completed && onLogIdeaAsDate && (
                <PressableScale
                  style={styles.logIdeaBtn}
                  onPress={() => onLogIdeaAsDate(item.title)}
                  haptic="press"
                  scaleTo={0.9}
                >
                  <Text style={styles.logIdeaBtnText}>Log It</Text>
                  <ArrowRight size={12} color={colors.primary} />
                </PressableScale>
              )}
              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={() => handleDelete(item.id, item.title)}
                activeOpacity={0.7}
              >
                <Trash2 size={15} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
          </FadeInView>
        )}
      />
    </View>
  );
}

const getStyles = (colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.bg,
      paddingHorizontal: 16,
      paddingTop: 10,
    },
    header: {
      marginBottom: 14,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 4,
    },
    title: {
      fontSize: 26,
      fontFamily: fonts.displayHeavy,
      fontWeight: 'normal',
      color: colors.textDark,
    },
    subtitle: {
      fontSize: 13,
      color: colors.textSubtle,
    },
    addCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.borderActive,
      paddingHorizontal: 12,
      paddingVertical: 4,
      marginBottom: 14,
      ...shadow(2),
    },
    input: {
      flex: 1,
      fontSize: 14,
      color: colors.textDark,
      paddingVertical: 10,
    },
    addBtn: {
      backgroundColor: colors.primary,
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: 8,
    },
    addBtnDisabled: {
      opacity: 0.4,
    },
    filterRow: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 14,
    },
    filterChip: {
      paddingHorizontal: 14,
      paddingVertical: 6,
      borderRadius: 20,
      backgroundColor: colors.surfaceSubtle,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
    },
    filterChipActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    filterChipText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textSubtle,
    },
    filterChipTextActive: {
      color: '#ffffff',
    },
    listContent: {
      paddingBottom: 90,
    },
    ideaCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      paddingVertical: 14,
      paddingHorizontal: 12,
      marginBottom: 10,
      ...shadow(1),
    },
    ideaCardCompleted: {
      opacity: 0.7,
      backgroundColor: colors.surfaceSubtle,
    },
    checkBtn: {
      paddingRight: 10,
    },
    ideaTextWrap: {
      flex: 1,
    },
    ideaTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textDark,
      lineHeight: 19,
    },
    ideaTitleCompleted: {
      textDecorationLine: 'line-through',
      color: colors.textMuted,
    },
    actionsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginLeft: 6,
    },
    logIdeaBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: colors.primaryLight,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.primary,
    },
    logIdeaBtnText: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.primary,
    },
    deleteBtn: {
      padding: 6,
    },
    emptyWrap: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 40,
    },
    emptyTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.textDark,
      marginTop: 10,
      marginBottom: 4,
    },
    emptySub: {
      fontSize: 13,
      color: colors.textSubtle,
      textAlign: 'center',
      paddingHorizontal: 30,
    },
  });

