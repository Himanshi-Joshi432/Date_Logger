import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Alert,
  Vibration,
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

const IDEAS_STORAGE_KEY = 'date_logger_bucket_list';

const INITIAL_IDEAS = [
  { id: '1', title: 'Sunset picnic at the botanical garden', completed: false, category: 'Outdoor' },
  { id: '2', title: 'Pottery class & cozy coffee date', completed: false, category: 'Creative' },
  { id: '3', title: 'Late night drive with warm hot chocolate', completed: true, category: 'Cozy' },
];

export function DateIdeasScreen({ onLogIdeaAsDate }) {
  const { colors } = useTheme();
  const [ideas, setIdeas] = useState([]);
  const [newIdeaText, setNewIdeaText] = useState('');
  const [filter, setFilter] = useState('all'); // 'all' | 'pending' | 'completed'

  useEffect(() => {
    loadIdeas();
  }, []);

  const loadIdeas = async () => {
    try {
      const stored = await AsyncStorage.getItem(IDEAS_STORAGE_KEY);
      if (stored) {
        setIdeas(JSON.parse(stored));
      } else {
        setIdeas(INITIAL_IDEAS);
        await AsyncStorage.setItem(IDEAS_STORAGE_KEY, JSON.stringify(INITIAL_IDEAS));
      }
    } catch (e) {
      setIdeas(INITIAL_IDEAS);
    }
  };

  const saveIdeas = async (newIdeas) => {
    setIdeas(newIdeas);
    try {
      await AsyncStorage.setItem(IDEAS_STORAGE_KEY, JSON.stringify(newIdeas));
    } catch (e) {
      // ignore
    }
  };

  const handleAddIdea = () => {
    if (!newIdeaText.trim()) return;
    try {
      Vibration.vibrate(30);
    } catch (e) {}

    const newItem = {
      id: Date.now().toString(),
      title: newIdeaText.trim(),
      completed: false,
      createdAt: new Date().toISOString(),
    };

    const updated = [newItem, ...ideas];
    saveIdeas(updated);
    setNewIdeaText('');
  };

  const handleToggleComplete = (id) => {
    try {
      Vibration.vibrate(20);
    } catch (e) {}

    const updated = ideas.map((idea) =>
      idea.id === id ? { ...idea, completed: !idea.completed } : idea
    );
    saveIdeas(updated);
  };

  const handleDelete = (id, title) => {
    Alert.alert('Remove Idea', `Remove "${title}" from bucket list?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          const updated = ideas.filter((idea) => idea.id !== id);
          saveIdeas(updated);
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
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Sparkles size={20} color={colors.primary} />
          <Text style={styles.title}>Date Bucket List</Text>
        </View>
        <Text style={styles.subtitle}>Dream up future dates together & check them off ♡</Text>
      </View>

      {/* Add New Idea Input */}
      <View style={styles.addCard}>
        <TextInput
          style={styles.input}
          placeholder="New date idea (e.g. Star gazing picnic)..."
          placeholderTextColor={colors.textMuted}
          value={newIdeaText}
          onChangeText={setNewIdeaText}
          onSubmitEditing={handleAddIdea}
          returnKeyType="done"
        />
        <TouchableOpacity
          style={[styles.addBtn, !newIdeaText.trim() && styles.addBtnDisabled]}
          onPress={handleAddIdea}
          disabled={!newIdeaText.trim()}
          activeOpacity={0.8}
        >
          <Plus size={18} color="#ffffff" />
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        {['all', 'pending', 'completed'].map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.filterChip, filter === tab && styles.filterChipActive]}
            onPress={() => setFilter(tab)}
          >
            <Text style={[styles.filterChipText, filter === tab && styles.filterChipTextActive]}>
              {tab === 'all' ? `All (${ideas.length})` : tab === 'pending' ? 'To Do' : 'Done ✓'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Ideas List */}
      <FlatList
        data={filteredIdeas}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Lightbulb size={32} color={colors.primary} />
            <Text style={styles.emptyTitle}>No ideas yet</Text>
            <Text style={styles.emptySub}>Add places you want to visit and things you want to try together!</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={[styles.ideaCard, item.completed && styles.ideaCardCompleted]}>
            <TouchableOpacity
              style={styles.checkBtn}
              onPress={() => handleToggleComplete(item.id)}
              activeOpacity={0.7}
            >
              {item.completed ? (
                <CheckCircle2 size={22} color={colors.success} />
              ) : (
                <Circle size={22} color={colors.borderActive} />
              )}
            </TouchableOpacity>

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
                <TouchableOpacity
                  style={styles.logIdeaBtn}
                  onPress={() => onLogIdeaAsDate(item.title)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.logIdeaBtnText}>Log It</Text>
                  <ArrowRight size={12} color={colors.primary} />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={() => handleDelete(item.id, item.title)}
                activeOpacity={0.7}
              >
                <Trash2 size={15} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
          </View>
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
      fontSize: 22,
      fontWeight: '800',
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
      borderRadius: 14,
      borderWidth: 1.5,
      borderColor: colors.cardBorder,
      paddingHorizontal: 12,
      paddingVertical: 4,
      marginBottom: 14,
      elevation: 2,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 3,
    },
    input: {
      flex: 1,
      fontSize: 14,
      color: colors.textDark,
      paddingVertical: 10,
    },
    addBtn: {
      backgroundColor: colors.primary,
      width: 36,
      height: 36,
      borderRadius: 18,
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
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: colors.cardBorder,
      padding: 12,
      marginBottom: 10,
      elevation: 1,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 2,
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

