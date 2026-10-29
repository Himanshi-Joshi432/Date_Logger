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
  Share,
  Vibration,
  useWindowDimensions,
} from 'react-native';
import { createAudioPlayer } from 'expo-audio';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
  Share2,
  LayoutGrid,
  List,
  Heart,
  Tag,
  Smile,
} from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { postAPI } from '../services/api';

const CACHE_KEY_POSTS = 'date_logger_cached_posts';

export function HistoryScreen({ onNavigateBack, onNavigateLog, onViewDetails }) {
  const { token } = useAuth();
  const { colors } = useTheme();
  const { width } = useWindowDimensions();

  const [posts, setPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedYear, setSelectedYear] = useState('all');
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'grid'
  const [deletingId, setDeletingId] = useState(null);

  // Audio playback state
  const [sound, setSound] = useState(null);
  const [playingPostId, setPlayingPostId] = useState(null);
  const timerRef = React.useRef(null);

  // Load cached posts first for immediate response
  useEffect(() => {
    async function loadCache() {
      try {
        const cached = await AsyncStorage.getItem(CACHE_KEY_POSTS);
        if (cached) {
          setPosts(JSON.parse(cached));
          setIsLoading(false);
        }
      } catch (e) {}
      fetchPosts();
    }
    loadCache();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (sound) {
        sound.pause();
        sound.release();
      }
    };
  }, [token]);

  const fetchPosts = async () => {
    try {
      const data = await postAPI.getPosts(token);
      const fetched = data.posts || [];
      setPosts(fetched);
      await AsyncStorage.setItem(CACHE_KEY_POSTS, JSON.stringify(fetched));
    } catch (err) {
      if (posts.length === 0) {
        Alert.alert('Error', err.message || 'Failed to load date history');
      }
    } finally {
      setIsLoading(false);
    }
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
              const updated = posts.filter((p) => p._id !== id);
              setPosts(updated);
              await AsyncStorage.setItem(CACHE_KEY_POSTS, JSON.stringify(updated));
              try {
                Vibration.vibrate(25);
              } catch (e) {}
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

  const handleShare = async (item) => {
    try {
      try {
        Vibration.vibrate(15);
      } catch (e) {}
      const dateStr = item.date
        ? new Date(item.date).toLocaleDateString()
        : 'Our Special Date';
      const hearts = item.rating ? '♡'.repeat(item.rating) : '♡♡♡♡♡';
      const text = `💕 Date Memory: ${item.venue || 'Our Date'}\n📅 ${dateStr}\nRating: ${hearts}\n\n"${
        item.description || ''
      }"\n\nPreserved with Date Logger ♡`;
      await Share.share({ message: text });
    } catch (e) {}
  };

  const handleToggleAudio = async (postId, audioUrl) => {
    if (!audioUrl) return;

    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

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

      // Play 15 seconds maximum
      timerRef.current = setTimeout(() => {
        if (player) player.pause();
        setPlayingPostId(null);
      }, 15000);

      player.addListener('playbackStatusUpdate', (status) => {
        if (status.didJustFinish) {
          if (timerRef.current) clearTimeout(timerRef.current);
          setPlayingPostId(null);
        }
      });
    } catch (err) {
      console.warn('Audio playback error', err);
    }
  };

  // Derive unique years from posts for filter pills
  const availableYears = Array.from(
    new Set(
      posts
        .filter((p) => p.date)
        .map((p) => new Date(p.date).getFullYear().toString())
    )
  ).sort((a, b) => b - a);

  // Filter posts by search and year
  const filteredPosts = posts.filter((post) => {
    if (selectedYear !== 'all' && post.date) {
      const year = new Date(post.date).getFullYear().toString();
      if (year !== selectedYear) return false;
    }

    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    const venue = (post.venue || '').toLowerCase();
    const desc = (post.description || '').toLowerCase();
    const category = (post.category || '').toLowerCase();
    return venue.includes(term) || desc.includes(term) || category.includes(term);
  });

  const styles = getStyles(colors, width);

  // Render Staggered List item
  const renderListItem = ({ item, index }) => {
    const isStaggerRight = index % 2 === 0;
    const isAudioPlaying = playingPostId === item._id;
    const thumbnail =
      (item.images && item.images.length > 0 ? item.images[0] : item.image) || null;
    const photoCount =
      item.images && item.images.length > 0 ? item.images.length : item.image ? 1 : 0;

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
                <Calendar size={11} color={colors.textSubtle} />
                <Text style={styles.dateTagText}>{formattedDate}</Text>
              </View>

              {item.rating ? (
                <View style={styles.ratingTag}>
                  <Heart size={10} color={colors.primary} fill={colors.primary} />
                  <Text style={styles.ratingTagText}>{item.rating}★</Text>
                </View>
              ) : null}

              {item.music?.audioUrl ? (
                <TouchableOpacity
                  style={[styles.audioTag, isAudioPlaying && styles.audioTagPlaying]}
                  onPress={() => handleToggleAudio(item._id, item.music.audioUrl)}
                >
                  {isAudioPlaying ? (
                    <Pause size={10} color="#ffffff" />
                  ) : (
                    <Play size={10} color={colors.primary} />
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

        {/* Card Footer */}
        <View style={styles.cardFooterRow}>
          <TouchableOpacity
            style={styles.viewDetailsBtn}
            onPress={() => onViewDetails && onViewDetails(item)}
            activeOpacity={0.8}
          >
            <Text style={styles.viewDetailsBtnText}>View Details</Text>
            <ArrowRight size={13} color="#ffffff" />
          </TouchableOpacity>

          <View style={styles.footerActions}>
            <TouchableOpacity
              style={styles.actionIconBtn}
              onPress={() => handleShare(item)}
            >
              <Share2 size={14} color={colors.textDark} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionIconBtn, styles.deleteBtn]}
              onPress={() => handleDelete(item._id, item.venue)}
              disabled={deletingId === item._id}
            >
              {deletingId === item._id ? (
                <ActivityIndicator size="small" color={colors.danger} />
              ) : (
                <Trash2 size={14} color={colors.danger} />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  // Render Polaroid Grid item
  const renderGridItem = ({ item }) => {
    const thumbnail =
      (item.images && item.images.length > 0 ? item.images[0] : item.image) || null;
    const formattedDate = item.date
      ? new Date(item.date).toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
        })
      : '';

    return (
      <TouchableOpacity
        style={styles.gridCard}
        onPress={() => onViewDetails && onViewDetails(item)}
        activeOpacity={0.85}
      >
        <View style={styles.polaroidFrame}>
          {thumbnail ? (
            <Image source={{ uri: thumbnail }} style={styles.gridImage} />
          ) : (
            <View style={styles.noGridImage}>
              <Heart size={20} color={colors.borderActive} />
            </View>
          )}
          <View style={styles.polaroidCaption}>
            <Text style={styles.gridVenue} numberOfLines={1}>
              {item.venue || 'Date'}
            </Text>
            <Text style={styles.gridDate}>{formattedDate}</Text>
          </View>
        </View>
      </TouchableOpacity>
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

        <View style={styles.topRightActions}>
          {/* View Mode Toggle: List vs Grid */}
          <TouchableOpacity
            style={styles.modeToggleBtn}
            onPress={() => {
              try {
                Vibration.vibrate(15);
              } catch (e) {}
              setViewMode(viewMode === 'list' ? 'grid' : 'list');
            }}
            activeOpacity={0.7}
          >
            {viewMode === 'list' ? (
              <LayoutGrid size={16} color={colors.textDark} />
            ) : (
              <List size={16} color={colors.textDark} />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.navBtn, { backgroundColor: colors.primary }]}
            onPress={onNavigateLog}
            activeOpacity={0.7}
          >
            <Plus size={18} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchBar}>
        <Search size={16} color={colors.textSubtle} style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search venues, notes, or vibes..."
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

      {/* Year Filter Pills (if multiple years exist) */}
      {availableYears.length > 0 && (
        <View style={styles.yearsRow}>
          <TouchableOpacity
            style={[
              styles.yearPill,
              selectedYear === 'all' && styles.yearPillActive,
            ]}
            onPress={() => setSelectedYear('all')}
          >
            <Text
              style={[
                styles.yearPillText,
                selectedYear === 'all' && styles.yearPillTextActive,
              ]}
            >
              All Years
            </Text>
          </TouchableOpacity>
          {availableYears.map((yr) => (
            <TouchableOpacity
              key={yr}
              style={[
                styles.yearPill,
                selectedYear === yr && styles.yearPillActive,
              ]}
              onPress={() => setSelectedYear(yr)}
            >
              <Text
                style={[
                  styles.yearPillText,
                  selectedYear === yr && styles.yearPillTextActive,
                ]}
              >
                {yr}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* List / Loading / Empty */}
      {isLoading && posts.length === 0 ? (
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
          key={viewMode}
          data={filteredPosts}
          keyExtractor={(item) => item._id}
          renderItem={viewMode === 'grid' ? renderGridItem : renderListItem}
          numColumns={viewMode === 'grid' ? 2 : 1}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onRefresh={fetchPosts}
          refreshing={isLoading}
        />
      )}
    </View>
  );
}

const getStyles = (colors, width) =>
  StyleSheet.create({
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
      marginBottom: 12,
    },
    topRightActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    navBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      alignItems: 'center',
      justifyContent: 'center',
    },
    modeToggleBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
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
      borderColor: colors.cardBorder,
      borderRadius: 14,
      paddingHorizontal: 12,
      paddingVertical: 8,
      marginBottom: 10,
    },
    searchInput: {
      flex: 1,
      fontSize: 14,
      color: colors.textDark,
    },
    yearsRow: {
      flexDirection: 'row',
      gap: 6,
      marginBottom: 12,
    },
    yearPill: {
      paddingHorizontal: 12,
      paddingVertical: 4,
      borderRadius: 14,
      backgroundColor: colors.surfaceSubtle,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
    },
    yearPillActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    yearPillText: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.textSubtle,
    },
    yearPillTextActive: {
      color: '#ffffff',
    },
    listContent: {
      paddingBottom: 95,
    },
    postCard: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      borderWidth: 1.5,
      borderColor: colors.cardBorder,
      padding: 12,
      marginBottom: 12,
      elevation: 3,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 4,
    },
    staggerLeft: {
      transform: [{ rotate: '-0.3deg' }],
    },
    staggerRight: {
      transform: [{ rotate: '0.3deg' }],
    },
    cardHeaderRow: {
      flexDirection: 'row',
      gap: 12,
    },
    thumbnailWrap: {
      width: 82,
      height: 82,
      borderRadius: 12,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: colors.cardBorder,
      position: 'relative',
    },
    thumbnail: {
      width: '100%',
      height: '100%',
    },
    noThumbnail: {
      width: '100%',
      height: '100%',
      backgroundColor: colors.surfaceSubtle,
      alignItems: 'center',
      justifyContent: 'center',
    },
    noThumbnailText: {
      fontSize: 10,
      color: colors.textMuted,
    },
    photoCountBadge: {
      position: 'absolute',
      bottom: 4,
      right: 4,
      backgroundColor: 'rgba(0,0,0,0.65)',
      paddingHorizontal: 5,
      paddingVertical: 2,
      borderRadius: 8,
    },
    photoCountText: {
      fontSize: 9,
      fontWeight: '700',
      color: '#ffffff',
    },
    cardHeaderDetails: {
      flex: 1,
      justifyContent: 'center',
    },
    venueTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: colors.textDark,
      marginBottom: 3,
    },
    descPreview: {
      fontSize: 12,
      color: colors.textSubtle,
      lineHeight: 16,
      marginBottom: 6,
    },
    tagsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
      alignItems: 'center',
    },
    dateTag: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: colors.surfaceSubtle,
      paddingHorizontal: 7,
      paddingVertical: 3,
      borderRadius: 8,
    },
    dateTagText: {
      fontSize: 10,
      fontWeight: '600',
      color: colors.textSubtle,
    },
    ratingTag: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      backgroundColor: colors.primaryLight,
      paddingHorizontal: 7,
      paddingVertical: 3,
      borderRadius: 8,
    },
    ratingTagText: {
      fontSize: 10,
      fontWeight: '700',
      color: colors.primary,
    },
    audioTag: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: colors.primaryLight,
      paddingHorizontal: 7,
      paddingVertical: 3,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.primary,
    },
    audioTagPlaying: {
      backgroundColor: colors.primary,
    },
    audioTagText: {
      fontSize: 10,
      fontWeight: '700',
      color: colors.primary,
    },
    cardFooterRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 10,
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: colors.borderSubtle,
    },
    viewDetailsBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: colors.primary,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 12,
    },
    viewDetailsBtnText: {
      fontSize: 11,
      fontWeight: '700',
      color: '#ffffff',
    },
    footerActions: {
      flexDirection: 'row',
      gap: 8,
    },
    actionIconBtn: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: colors.surfaceSubtle,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      alignItems: 'center',
      justifyContent: 'center',
    },
    deleteBtn: {
      backgroundColor: colors.dangerBg,
      borderColor: colors.dangerBorder,
    },
    // Polaroid Grid styles
    gridCard: {
      width: (width - 44) / 2,
      margin: 5,
    },
    polaroidFrame: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: colors.cardBorder,
      padding: 8,
      paddingBottom: 12,
      elevation: 2,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 3,
    },
    gridImage: {
      width: '100%',
      height: 120,
      borderRadius: 8,
    },
    noGridImage: {
      width: '100%',
      height: 120,
      borderRadius: 8,
      backgroundColor: colors.surfaceSubtle,
      alignItems: 'center',
      justifyContent: 'center',
    },
    polaroidCaption: {
      marginTop: 8,
    },
    gridVenue: {
      fontSize: 13,
      fontWeight: '800',
      color: colors.textDark,
    },
    gridDate: {
      fontSize: 10,
      color: colors.textSubtle,
      marginTop: 2,
    },
    centerBox: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 50,
    },
    loadingText: {
      marginTop: 10,
      fontSize: 13,
      color: colors.textSubtle,
    },
    emptyCircle: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: colors.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 12,
    },
    emptyTitle: {
      fontSize: 17,
      fontWeight: '800',
      color: colors.textDark,
      marginBottom: 4,
    },
    emptySubtitle: {
      fontSize: 13,
      color: colors.textSubtle,
      textAlign: 'center',
      paddingHorizontal: 24,
      marginBottom: 16,
    },
    emptyBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.primary,
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 16,
    },
    emptyBtnText: {
      color: '#ffffff',
      fontWeight: '700',
      fontSize: 13,
    },
  });
