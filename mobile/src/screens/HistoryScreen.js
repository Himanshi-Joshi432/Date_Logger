import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  Image,
  Alert,
} from 'react-native';
import { Audio } from 'expo-av';
import {
  Calendar,
  Trash2,
  Search,
  Plus,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  X,
  History as HistoryIcon,
  Play,
  Pause,
  Music,
} from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { postAPI } from '../services/api';
import { colors } from '../theme/colors';

export function HistoryScreen({ onNavigateBack, onNavigateLog }) {
  const { token } = useAuth();
  const [posts, setPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  // Audio playback state
  const [sound, setSound] = useState(null);
  const [playingPostId, setPlayingPostId] = useState(null);

  const fetchPosts = async () => {
    try {
      setIsLoading(true);
      const data = await postAPI.getPosts(token);
      setPosts(data.posts || []);
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to load date history');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();

    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [token]);

  const toggleExpand = (id) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const handleDelete = (id, venueName) => {
    Alert.alert(
      'Delete Memory',
      `Are you sure you want to delete the log for "${venueName || 'this date'}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeletingId(id);
            try {
              await postAPI.deletePost(id, token);
              setPosts((prev) => prev.filter((p) => p._id !== id));
              if (expandedId === id) setExpandedId(null);
            } catch (err) {
              Alert.alert('Error', err.message || 'Failed to delete date log');
            } finally {
              setDeletingId(null);
            }
          },
        },
      ]
    );
  };

  // Play / pause soundtrack if post has audio
  const handleToggleAudio = async (postId, audioUrl) => {
    if (!audioUrl) return;

    try {
      if (playingPostId === postId && sound) {
        await sound.pauseAsync();
        setPlayingPostId(null);
        return;
      }

      if (sound) {
        await sound.unloadAsync();
      }

      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: audioUrl },
        { shouldPlay: true }
      );
      setSound(newSound);
      setPlayingPostId(postId);

      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.didJustFinish) {
          setPlayingPostId(null);
        }
      });
    } catch (err) {
      console.warn('Audio playback error', err);
    }
  };

  // Filter posts
  const filteredPosts = posts.filter((post) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    const venue = (post.venue || '').toLowerCase();
    const desc = (post.description || '').toLowerCase();
    return venue.includes(term) || desc.includes(term);
  });

  const renderPostItem = ({ item, index }) => {
    const isExpanded = expandedId === item._id;
    const isStaggerRight = index % 2 === 0;
    const isAudioPlaying = playingPostId === item._id;

    const formattedDate = item.date
      ? new Date(item.date).toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })
      : 'No date';

    return (
      <View
        style={[
          styles.postCard,
          isStaggerRight ? styles.staggerRight : styles.staggerLeft,
          isExpanded && styles.postCardExpanded,
        ]}
      >
        {/* Card Header clickable row */}
        <TouchableOpacity
          style={styles.cardHeaderRow}
          onPress={() => toggleExpand(item._id)}
          activeOpacity={0.85}
        >
          {/* Thumbnail */}
          <View style={styles.thumbnailWrap}>
            {item.image ? (
              <Image source={{ uri: item.image }} style={styles.thumbnail} />
            ) : (
              <View style={styles.noThumbnail}>
                <Text style={styles.noThumbnailText}>No photo</Text>
              </View>
            )}
          </View>

          {/* Details */}
          <View style={styles.cardHeaderDetails}>
            <Text style={styles.venueTitle} numberOfLines={1}>
              {item.venue || 'Unnamed Venue'}
            </Text>

            {item.description ? (
              <Text style={styles.descPreview} numberOfLines={isExpanded ? 0 : 2}>
                {item.description}
              </Text>
            ) : null}

            <View style={styles.tagsRow}>
              <View style={styles.dateTag}>
                <Calendar size={12} color={colors.textSubtle} />
                <Text style={styles.dateTagText}>{formattedDate}</Text>
              </View>

              {item.music?.audioUrl ? (
                <TouchableOpacity
                  style={[styles.audioTag, isAudioPlaying && styles.audioTagPlaying]}
                  onPress={(e) => {
                    e.stopPropagation();
                    handleToggleAudio(item._id, item.music.audioUrl);
                  }}
                >
                  {isAudioPlaying ? (
                    <Pause size={12} color="#ffffff" />
                  ) : (
                    <Play size={12} color={colors.primary} />
                  )}
                  <Text
                    style={[
                      styles.audioTagText,
                      isAudioPlaying && { color: '#ffffff' },
                    ]}
                  >
                    {isAudioPlaying ? 'Playing' : 'Audio'}
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>

          {/* Chevron */}
          <View style={styles.chevronWrap}>
            {isExpanded ? (
              <ChevronUp size={18} color={colors.textSubtle} />
            ) : (
              <ChevronDown size={18} color={colors.textSubtle} />
            )}
          </View>
        </TouchableOpacity>

        {/* Expanded View with Full Photo & Actions */}
        {isExpanded ? (
          <View style={styles.expandedContent}>
            {item.image ? (
              <Image source={{ uri: item.image }} style={styles.expandedImage} />
            ) : null}

            <View style={styles.cardActionsRow}>
              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={() => handleDelete(item._id, item.venue)}
                disabled={deletingId === item._id}
              >
                {deletingId === item._id ? (
                  <ActivityIndicator size="small" color={colors.danger} />
                ) : (
                  <>
                    <Trash2 size={16} color={colors.danger} />
                    <Text style={styles.deleteBtnText}>Delete Memory</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        ) : null}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Top Navigation */}
      <View style={styles.topNav}>
        <TouchableOpacity
          style={styles.navBtn}
          onPress={onNavigateBack}
          activeOpacity={0.7}
        >
          <ArrowLeft size={18} color={colors.textDark} />
        </TouchableOpacity>
        <Text style={styles.navTitle}>Date Memories</Text>
        <TouchableOpacity
          style={[styles.navBtn, { backgroundColor: colors.primary }]}
          onPress={onNavigateLog}
          activeOpacity={0.7}
        >
          <Plus size={18} color="#ffffff" />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchBar}>
        <Search size={16} color={colors.textSubtle} style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search venues or memories..."
          placeholderTextColor={colors.textMuted}
          value={searchTerm}
          onChangeText={setSearchTerm}
        />
        {searchTerm ? (
          <TouchableOpacity onPress={() => setSearchTerm('')}>
            <X size={16} color={colors.textSubtle} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* List or Loading / Empty */}
      {isLoading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Unrolling date memories...</Text>
        </View>
      ) : filteredPosts.length === 0 ? (
        <View style={styles.centerBox}>
          <View style={styles.emptyCircle}>
            <HistoryIcon size={32} color={colors.primary} />
          </View>
          <Text style={styles.emptyTitle}>
            {searchTerm ? 'No matching dates' : 'No date logs yet'}
          </Text>
          <Text style={styles.emptySubtitle}>
            {searchTerm
              ? `No memories found matching "${searchTerm}".`
              : 'Start documenting your favorite moments together in this journal!'}
          </Text>
          <TouchableOpacity
            style={styles.emptyBtn}
            onPress={onNavigateLog}
            activeOpacity={0.85}
          >
            <Plus size={18} color="#ffffff" style={{ marginRight: 6 }} />
            <Text style={styles.emptyBtnText}>Log Your First Date</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredPosts}
          keyExtractor={(item) => item._id}
          renderItem={renderPostItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onRefresh={fetchPosts}
          refreshing={isLoading}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  topNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  navBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textDark,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.borderSubtle,
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.textDark,
  },
  listContent: {
    paddingBottom: 40,
  },
  postCard: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    marginBottom: 14,
    overflow: 'hidden',
    shadowColor: colors.cardBorder,
    shadowOffset: { width: 2, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  staggerRight: {
    marginLeft: 6,
  },
  staggerLeft: {
    marginRight: 6,
  },
  postCardExpanded: {
    borderColor: colors.primary,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    padding: 12,
    alignItems: 'center',
  },
  thumbnailWrap: {
    width: 60,
    height: 60,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: colors.surfaceSubtle,
    marginRight: 12,
  },
  thumbnail: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  noThumbnail: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noThumbnailText: {
    fontSize: 10,
    color: colors.textMuted,
  },
  cardHeaderDetails: {
    flex: 1,
    marginRight: 8,
  },
  venueTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textDark,
    marginBottom: 2,
  },
  descPreview: {
    fontSize: 12,
    color: colors.textSubtle,
    lineHeight: 16,
    marginBottom: 6,
  },
  tagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSubtle,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  dateTagText: {
    fontSize: 11,
    color: colors.textSubtle,
    fontWeight: '600',
  },
  audioTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  audioTagPlaying: {
    backgroundColor: colors.primary,
  },
  audioTagText: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: '600',
  },
  chevronWrap: {
    padding: 4,
  },
  expandedContent: {
    padding: 12,
    paddingTop: 0,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
    marginTop: 6,
  },
  expandedImage: {
    width: '100%',
    height: 220,
    borderRadius: 12,
    marginTop: 10,
    resizeMode: 'cover',
  },
  cardActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: colors.dangerBg,
    gap: 6,
  },
  deleteBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.danger,
  },
  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: colors.textSubtle,
  },
  emptyCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textDark,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: colors.textSubtle,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 14,
  },
  emptyBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
});

