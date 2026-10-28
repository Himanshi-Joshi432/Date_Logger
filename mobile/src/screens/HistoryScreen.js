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
import { createAudioPlayer } from 'expo-audio';
import {
  Calendar,
  Trash2,
  Search,
  Plus,
  ArrowLeft,
  ArrowRight,
  X,
  History as HistoryIcon,
  Play,
  Pause,
  Music,
  Eye,
} from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { postAPI } from '../services/api';
import { colors } from '../theme/colors';

export function HistoryScreen({ onNavigateBack, onNavigateLog, onViewDetails }) {
  const { token } = useAuth();
  const [posts, setPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
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
        sound.pause();
        sound.release();
      }
    };
  }, [token]);

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
        sound.pause();
        setPlayingPostId(null);
        return;
      }

      if (sound) {
        sound.pause();
        sound.release();
      }

      const player = createAudioPlayer(audioUrl);
      player.play();
      setSound(player);
      setPlayingPostId(postId);

      player.addListener('playbackStatusUpdate', (status) => {
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
    const isStaggerRight = index % 2 === 0;
    const isAudioPlaying = playingPostId === item._id;
    const thumbnail =
      (item.images && item.images.length > 0 ? item.images[0] : item.image) || null;
    const photoCount =
      (item.images && item.images.length > 0 ? item.images.length : item.image ? 1 : 0);

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
        ]}
      >
        {/* Card Header clickable row -> expands to full page details */}
        <TouchableOpacity
          style={styles.cardHeaderRow}
          onPress={() => onViewDetails && onViewDetails(item)}
          activeOpacity={0.8}
        >
          {/* Thumbnail */}
          <View style={styles.thumbnailWrap}>
            {thumbnail ? (
              <Image source={{ uri: thumbnail }} style={styles.thumbnail} />
            ) : (
              <View style={styles.noThumbnail}>
                <Text style={styles.noThumbnailText}>No photo</Text>
              </View>
            )}
            {photoCount > 1 && (
              <View style={styles.photoCountBadge}>
                <Text style={styles.photoCountText}>+{photoCount}</Text>
              </View>
            )}
          </View>

          {/* Details */}
          <View style={styles.cardHeaderDetails}>
            <Text style={styles.venueTitle} numberOfLines={1}>
              {item.venue || 'Unnamed Venue'}
            </Text>

            {item.description ? (
              <Text style={styles.descPreview} numberOfLines={2}>
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
        </TouchableOpacity>

        {/* Card Footer: View Details Action & Quick Delete */}
        <View style={styles.cardFooterRow}>
          <TouchableOpacity
            style={styles.viewDetailsBtn}
            onPress={() => onViewDetails && onViewDetails(item)}
            activeOpacity={0.8}
          >
            <Text style={styles.viewDetailsBtnText}>View Details</Text>
            <ArrowRight size={13} color="#ffffff" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickDeleteBtn}
            onPress={() => handleDelete(item._id, item.venue)}
            disabled={deletingId === item._id}
          >
            {deletingId === item._id ? (
              <ActivityIndicator size="small" color={colors.danger} />
            ) : (
              <Trash2 size={15} color={colors.danger} />
            )}
          </TouchableOpacity>
        </View>
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
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textDark,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.borderSubtle,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.textDark,
    padding: 0,
  },
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    marginTop: 60,
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
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textDark,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13.5,
    color: colors.textSubtle,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 999,
  },
  emptyBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  listContent: {
    paddingBottom: 40,
  },
  postCard: {
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: colors.cardBorder,
    borderRadius: 16,
    marginBottom: 14,
    overflow: 'hidden',
    shadowColor: colors.cardBorder,
    shadowOffset: { width: 2, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius: 6,
    elevation: 3,
  },
  staggerRight: {
    marginLeft: 10,
    marginRight: 2,
    transform: [{ rotate: '0.6deg' }],
  },
  staggerLeft: {
    marginLeft: 2,
    marginRight: 10,
    transform: [{ rotate: '-0.6deg' }],
  },
  cardHeaderRow: {
    flexDirection: 'row',
    padding: 12,
    alignItems: 'flex-start',
  },
  thumbnailWrap: {
    width: 72,
    height: 72,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.borderSubtle,
    overflow: 'hidden',
    backgroundColor: '#f7f2eb',
    position: 'relative',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  noThumbnail: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noThumbnailText: {
    fontSize: 10,
    color: colors.textSubtle,
  },
  photoCountBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(38, 31, 24, 0.82)',
    paddingVertical: 2,
    paddingHorizontal: 5,
    borderRadius: 10,
  },
  photoCountText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '700',
  },
  cardHeaderDetails: {
    flex: 1,
    marginLeft: 12,
  },
  venueTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textDark,
    marginBottom: 4,
  },
  descPreview: {
    fontSize: 12.5,
    color: colors.textSubtle,
    lineHeight: 16,
    marginBottom: 6,
  },
  tagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  dateTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSubtle,
    paddingVertical: 3,
    paddingHorizontal: 8,
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
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
    gap: 4,
  },
  audioTagPlaying: {
    backgroundColor: colors.primary,
  },
  audioTagText: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: '700',
  },
  cardFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
    borderStyle: 'dashed',
    backgroundColor: '#faf6ef',
  },
  viewDetailsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 999,
    gap: 4,
  },
  viewDetailsBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  quickDeleteBtn: {
    padding: 6,
    borderRadius: 999,
  },
});
