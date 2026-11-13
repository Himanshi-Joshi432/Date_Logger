import { useState, useEffect, useRef } from 'react';
import { Image } from 'expo-image';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Alert,
  useWindowDimensions,
  FlatList,
  Modal,
  Share,
} from 'react-native';
import { createAudioPlayer } from 'expo-audio';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Calendar,
  MapPin,
  Trash2,
  ArrowLeft,
  Music,
  Play,
  Pause,
  RotateCcw,
  FileText,
  Sparkles,
  Share2,
  Edit3,
  X,
  Heart,
  Tag,
  Smile,
  Maximize2,
  Disc,
} from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { haptics } from '../utils/haptics';
import { FadeInView, PressableScale, PulseView, ProgressBar } from '../components/motion';
import { EditMemoryModal } from '../components/EditMemoryModal';
import { fonts, shadow } from '../theme/tokens';
import { postAPI } from '../services/api';
import { resolvePreviewUrl } from '../services/musicService';

const CACHE_KEY_POSTS = 'date_logger_cached_posts';

/** Applies a change to the cached post list so History/Dashboard don't show stale data. */
async function updateCachedPosts(transform) {
  try {
    const cached = await AsyncStorage.getItem(CACHE_KEY_POSTS);
    if (!cached) return;
    await AsyncStorage.setItem(CACHE_KEY_POSTS, JSON.stringify(transform(JSON.parse(cached))));
  } catch (e) {}
}

export function DateDetailsScreen({
  postId,
  initialPost = null,
  onNavigateBack,
  onDeleteSuccess,
}) {
  const { token, user } = useAuth();
  const { colors } = useTheme();
  const { width, height } = useWindowDimensions();
  const carouselWidth = width - 32;

  const [post, setPost] = useState(initialPost);
  const [isLoading, setIsLoading] = useState(!initialPost);
  const [isDeleting, setIsDeleting] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  // Lightbox Modal state
  const [lightboxVisible, setLightboxVisible] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const [editModalVisible, setEditModalVisible] = useState(false);

  // 15-Second Audio Soundtrack Playback state
  const soundRef = useRef(null);
  const autoPlayTimerRef = useRef(null);
  const playbackTokenRef = useRef(0);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [playbackSeconds, setPlaybackSeconds] = useState(0);

  const flatListRef = useRef(null);

  // Fetch full details if needed
  useEffect(() => {
    let isMounted = true;

    async function fetchDetails() {
      if (!postId) return;
      try {
        if (!initialPost) setIsLoading(true);
        const data = await postAPI.getPostById(postId, token);
        if (isMounted && data.post) {
          setPost(data.post);
        }
      } catch (err) {
        if (isMounted && !post) {
          Alert.alert('Error', err.message || 'Failed to load date memory');
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    fetchDetails();

    return () => {
      isMounted = false;
      stopAudioPlayback();
    };
  }, [postId, token]);

  /**
   * Plays up to 15 seconds of the memory's soundtrack. Saved preview links can
   * expire, so a fresh one is fetched when needed (and once more if playback fails).
   */
  const startPlayback = async (music, { retry = true, force = false } = {}) => {
    stopAudioPlayback();
    const myToken = ++playbackTokenRef.current;

    const url = await resolvePreviewUrl(music, { force });
    // The screen closed, or another playback started, while the link was resolving.
    if (!url || myToken !== playbackTokenRef.current) return;

    try {
      const player = createAudioPlayer(url);
      soundRef.current = player;
      let started = false;

      player.addListener('playbackStatusUpdate', (status) => {
        try {
          if (soundRef.current !== player) return;
          const posMs =
            status.positionMillis !== undefined
              ? status.positionMillis
              : status.currentTime
              ? status.currentTime * 1000
              : 0;
          if (posMs) {
            started = true;
            setPlaybackSeconds(Math.min(15, Math.floor(posMs / 1000)));
            if (posMs >= 15000) stopAudioPlayback();
          }
          if (status.didJustFinish) stopAudioPlayback();
        } catch (e) {}
      });

      player.play();
      setIsPlayingAudio(true);
      setPlaybackSeconds(0);

      // Strict 15-second cut-off
      autoPlayTimerRef.current = setTimeout(() => stopAudioPlayback(), 15000);

      // If nothing has played after a few seconds the link is probably dead: refresh once.
      if (retry) {
        setTimeout(() => {
          if (soundRef.current === player && !started) {
            startPlayback(music, { retry: false, force: true });
          }
        }, 4000);
      }
    } catch (e) {
      console.warn('Soundtrack playback error', e);
      stopAudioPlayback();
    }
  };

  // Auto-play the soundtrack when the memory opens
  useEffect(() => {
    if (!post?.music?.audioUrl) return undefined;
    startPlayback(post.music);
    return () => {
      playbackTokenRef.current += 1;
      stopAudioPlayback();
    };
  }, [post?.music?.audioUrl]);

  const stopAudioPlayback = () => {
    if (autoPlayTimerRef.current) {
      clearTimeout(autoPlayTimerRef.current);
      autoPlayTimerRef.current = null;
    }
    if (soundRef.current) {
      try {
        soundRef.current.pause();
      } catch (e) {}
      try {
        soundRef.current.release();
      } catch (e) {}
      soundRef.current = null;
    }
    setIsPlayingAudio(false);
  };

  // Pause, or replay the 15-second preview from the start
  const handleToggleAudio = () => {
    if (!post?.music?.audioUrl) return;
    if (isPlayingAudio) {
      playbackTokenRef.current += 1;
      stopAudioPlayback();
      return;
    }
    startPlayback(post.music);
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Memory',
      `Are you sure you want to delete the log for "${post?.venue || 'this date'}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            stopAudioPlayback();
            setIsDeleting(true);
            try {
              await postAPI.deletePost(postId, token);
              await updateCachedPosts((posts) => posts.filter((p) => p._id !== postId));
              try {
                haptics.success();
              } catch (e) {}
              if (onDeleteSuccess) {
                onDeleteSuccess();
              } else if (onNavigateBack) {
                onNavigateBack();
              }
            } catch (err) {
              Alert.alert('Error', err.message || 'Failed to delete date log');
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  };

  const handleShare = async () => {
    try {
      try {
        haptics.select();
      } catch (e) {}

      const dateStr = post.date
        ? new Date(post.date).toLocaleDateString(undefined, {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            year: 'numeric',
          })
        : 'Our Special Day';

      const hearts = post.rating ? '♡'.repeat(post.rating) : '♡♡♡♡♡';
      const moodText = post.mood ? ` • Vibe: ${post.mood}` : '';
      const categoryText = post.category ? `[${post.category}] ` : '';
      const songText = post.music?.title
        ? `\n🎵 Soundtrack: ${post.music.title}${post.music.artist ? ` - ${post.music.artist}` : ''}`
        : '';

      const message = `✨ ${categoryText}Date Memory at ${post.venue}\n📅 ${dateStr}\nRating: ${hearts}${moodText}${songText}\n\n"${
        post.description || 'A memory worth remembering forever.'
      }"\n\nPreserved with Date Logger ♡`;

      await Share.share({
        message,
        title: `Date Memory: ${post.venue}`,
      });
    } catch (e) {
      console.warn('Share error', e);
    }
  };

  const openEditModal = () => {
    stopAudioPlayback();
    setEditModalVisible(true);
  };

  const handleEditSaved = (updatedPost) => {
    if (!updatedPost) return;
    setPost(updatedPost);
    setActiveImageIndex(0);
    flatListRef.current?.scrollToOffset?.({ offset: 0, animated: false });
    updateCachedPosts((posts) =>
      posts.map((p) => (p._id === postId ? { ...p, ...updatedPost } : p))
    );
  };

  // Either partner can edit a shared memory; only the one who created it can delete it.
  const creatorId = post?.createdBy?._id || post?.createdBy?.id || post?.createdBy;
  const canDelete = !creatorId || !user?.id || String(creatorId) === String(user.id);

  const images = post?.images?.length
    ? post.images
    : post?.image
    ? [post.image]
    : [];

  const handleScroll = (event) => {
    const scrollOffset = event.nativeEvent.contentOffset.x;
    const index = Math.round(scrollOffset / (carouselWidth - 36));
    if (index >= 0 && index < images.length && index !== activeImageIndex) {
      setActiveImageIndex(index);
    }
  };

  const scrollToIndex = (index) => {
    if (index >= 0 && index < images.length) {
      flatListRef.current?.scrollToIndex({ index, animated: true });
      setActiveImageIndex(index);
    }
  };

  const styles = getStyles(colors, width, height);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Unrolling date memory...</Text>
      </View>
    );
  }

  if (!post) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Memory Not Found</Text>
        <Text style={styles.errorSubtitle}>The requested date log could not be loaded.</Text>
        <TouchableOpacity style={styles.backBtnAction} onPress={onNavigateBack}>
          <Text style={styles.backBtnActionText}>Back to Date History</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const formattedDate = post.date
    ? new Date(post.date).toLocaleDateString(undefined, {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : 'Undated Memory';

  const progressPercent = Math.min(100, Math.round((playbackSeconds / 15) * 100));

  return (
    <View style={styles.screenWrapper}>
      {/* Top Navigation */}
      <View style={styles.topNav}>
        <TouchableOpacity
          style={styles.navBtn}
          onPress={() => {
            stopAudioPlayback();
            onNavigateBack();
          }}
          activeOpacity={0.7}
        >
          <ArrowLeft size={18} color={colors.textDark} />
        </TouchableOpacity>

        <Text style={styles.navTitle}>Date Memory</Text>

        <View style={styles.topNavActions}>
          <TouchableOpacity
            style={styles.navBtn}
            onPress={handleShare}
            activeOpacity={0.7}
          >
            <Share2 size={16} color={colors.textDark} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navBtn}
            onPress={openEditModal}
            activeOpacity={0.7}
          >
            <Edit3 size={16} color={colors.textDark} />
          </TouchableOpacity>

          {canDelete ? (
          <TouchableOpacity
            style={[styles.navBtn, styles.deleteNavBtn]}
            onPress={handleDelete}
            disabled={isDeleting}
            activeOpacity={0.7}
          >
            {isDeleting ? (
              <ActivityIndicator size="small" color={colors.danger} />
            ) : (
              <Trash2 size={16} color={colors.danger} />
            )}
          </TouchableOpacity>
          ) : null}
        </View>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Scrapbook Details Card */}
        <FadeInView distance={30} style={styles.detailsCard}>
          {/* 1. CAROUSEL OF PHOTOS */}
          <FadeInView from="scale" delay={60} style={styles.carouselContainer}>
            {images.length > 0 ? (
              <View>
                <FlatList
                  ref={flatListRef}
                  data={images}
                  keyExtractor={(_, index) => index.toString()}
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  onMomentumScrollEnd={handleScroll}
                  renderItem={({ item, index }) => (
                    <TouchableOpacity
                      activeOpacity={0.92}
                      onPress={() => {
                        setLightboxIndex(index);
                        setLightboxVisible(true);
                      }}
                      style={[styles.slideWrap, { width: carouselWidth - 36 }]}
                    >
                      <Image
                        source={{ uri: item }}
                        style={styles.carouselImage}
                        contentFit="cover"
                        transition={250}
                      />
                      <View style={styles.zoomHintPill}>
                        <Maximize2 size={12} color="#ffffff" />
                        <Text style={styles.zoomHintText}>Tap to zoom</Text>
                      </View>
                    </TouchableOpacity>
                  )}
                />

                {/* Counter Badge */}
                {images.length > 1 && (
                  <View style={styles.counterBadge}>
                    <Text style={styles.counterText}>
                      {activeImageIndex + 1} / {images.length}
                    </Text>
                  </View>
                )}

                {/* Dot Indicators */}
                {images.length > 1 && (
                  <View style={styles.dotsRow}>
                    {images.map((_, idx) => (
                      <TouchableOpacity
                        key={idx}
                        onPress={() => scrollToIndex(idx)}
                        style={[
                          styles.dot,
                          idx === activeImageIndex && styles.activeDot,
                        ]}
                      />
                    ))}
                  </View>
                )}
              </View>
            ) : (
              <View style={styles.noPhotoWrap}>
                <Sparkles size={24} color={colors.primary} />
                <Text style={styles.noPhotoText}>No photo attached</Text>
              </View>
            )}
          </FadeInView>

          {/* 2. TITLE (VENUE) */}
          <FadeInView delay={140} style={styles.titleSection}>
            <MapPin size={22} color={colors.primary} style={{ marginTop: 4 }} />
            <Text style={styles.venueTitle}>{post.venue || 'Unnamed Venue'}</Text>
          </FadeInView>

          {/* 3. METADATA BADGES (DATE, CATEGORY, MOOD, RATING) */}
          <FadeInView delay={190} style={styles.metaRow}>
            <View style={styles.dateBadge}>
              <Calendar size={13} color={colors.primary} />
              <Text style={styles.dateText}>{formattedDate}</Text>
            </View>

            {post.category ? (
              <View style={styles.categoryBadge}>
                <Tag size={12} color={colors.primary} />
                <Text style={styles.categoryBadgeText}>{post.category}</Text>
              </View>
            ) : null}

            {post.mood ? (
              <View style={styles.moodBadge}>
                <Smile size={12} color={colors.primary} />
                <Text style={styles.moodBadgeText}>{post.mood}</Text>
              </View>
            ) : null}
          </FadeInView>

          {/* Heart Rating */}
          {post.rating ? (
            <FadeInView delay={230} style={styles.ratingSection}>
              {[1, 2, 3, 4, 5].map((star) => (
                <FadeInView key={star} from="scale" delay={280 + star * 70}>
                  <Heart
                    size={18}
                    color={colors.primary}
                    fill={star <= post.rating ? colors.primary : 'transparent'}
                  />
                </FadeInView>
              ))}
              <Text style={styles.ratingLabel}>{post.rating} / 5 Hearts</Text>
            </FadeInView>
          ) : null}

          {/* 4. DESCRIPTION */}
          <FadeInView delay={270} style={styles.descriptionSection}>
            <View style={styles.descHeader}>
              <FileText size={15} color={colors.primary} />
              <Text style={styles.descHeaderText}>Journal Notes & Memories</Text>
            </View>
            <View style={styles.notesBox}>
              <Text style={styles.notesText}>
                {post.description || 'No description recorded for this date.'}
              </Text>
            </View>
          </FadeInView>

          {/* 5. 15-SECOND DEEZER SOUNDTRACK PLAYER */}
          {post.music?.audioUrl ? (
            <FadeInView delay={330} style={styles.soundtrackBox}>
              <View style={styles.soundtrackHeaderRow}>
                {post.music?.albumCover ? (
                  <PulseView active={isPlayingAudio} scale={1.05} period={1200}>
                    <Image
                      source={{ uri: post.music.albumCover }}
                      style={styles.soundtrackCover}
                    />
                  </PulseView>
                ) : (
                  <View style={styles.soundtrackCoverPlaceholder}>
                    <Disc size={22} color={colors.primary} />
                  </View>
                )}

                <View style={styles.soundtrackInfoWrap}>
                  <View style={styles.soundtrackBadgeRow}>
                    <View style={styles.playingPill}>
                      <Music size={11} color={colors.primary} />
                      <Text style={styles.playingPillText}>
                        {isPlayingAudio ? 'Playing Soundtrack' : 'Soundtrack (15s)'}
                      </Text>
                    </View>
                    <Text style={styles.soundtrackCounter}>
                      0:{playbackSeconds.toString().padStart(2, '0')} / 0:15
                    </Text>
                  </View>

                  <Text style={styles.soundtrackTitle} numberOfLines={1}>
                    {post.music?.title || 'Memory Soundtrack'}
                  </Text>
                  {post.music?.artist ? (
                    <Text style={styles.soundtrackArtist} numberOfLines={1}>
                      {post.music.artist}
                    </Text>
                  ) : null}
                </View>

                {/* Play / Pause Toggle Button */}
                <PressableScale
                  style={[
                    styles.soundtrackActionBtn,
                    isPlayingAudio && styles.soundtrackActionBtnActive,
                  ]}
                  onPress={handleToggleAudio}
                  haptic="select"
                  scaleTo={0.85}
                >
                  <FadeInView key={isPlayingAudio ? 'pause' : 'play'} from="scale">
                    {isPlayingAudio ? (
                      <Pause size={18} color="#ffffff" />
                    ) : (
                      <Play size={18} color={colors.primary} />
                    )}
                  </FadeInView>
                </PressableScale>
              </View>

              {/* 15-Second Progress Bar */}
              <ProgressBar
                percent={progressPercent}
                min={0}
                trackStyle={styles.soundtrackProgressTrack}
                fillStyle={styles.soundtrackProgressFill}
              />
            </FadeInView>
          ) : null}

          {/* Footer & Share CTA */}
          <FadeInView delay={380} style={styles.footerSection}>
            <PressableScale style={styles.shareMemoryBtn} onPress={handleShare} haptic={null}>
              <Share2 size={14} color={colors.primary} />
              <Text style={styles.shareMemoryBtnText}>Share Date Recap ♡</Text>
            </PressableScale>
            <Text style={styles.authorText}>
              Preserved by {post.createdBy?.email || 'You'}
            </Text>
          </FadeInView>
        </FadeInView>
      </ScrollView>

      {/* FULL-SCREEN LIGHTBOX MODAL */}
      <Modal
        visible={lightboxVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setLightboxVisible(false)}
      >
        <View style={styles.lightboxBackdrop}>
          <View style={styles.lightboxTopBar}>
            <Text style={styles.lightboxCounter}>
              {lightboxIndex + 1} of {images.length}
            </Text>
            <PressableScale
              style={styles.lightboxCloseBtn}
              onPress={() => setLightboxVisible(false)}
            >
              <X size={24} color="#ffffff" />
            </PressableScale>
          </View>

          {images.length > 0 && (
            <FadeInView key={lightboxIndex} from="scale" style={styles.lightboxImage}>
              <Image
                source={{ uri: images[lightboxIndex] }}
                style={{ width: '100%', height: '100%' }}
                contentFit="contain"
                transition={150}
              />
            </FadeInView>
          )}

          {images.length > 1 && (
            <View style={styles.lightboxBottomBar}>
              <PressableScale
                style={styles.lightboxNavBtn}
                onPress={() =>
                  setLightboxIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1))
                }
              >
                <Text style={styles.lightboxNavText}>‹ Previous</Text>
              </PressableScale>
              <PressableScale
                style={styles.lightboxNavBtn}
                onPress={() =>
                  setLightboxIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0))
                }
              >
                <Text style={styles.lightboxNavText}>Next ›</Text>
              </PressableScale>
            </View>
          )}
        </View>
      </Modal>

      <EditMemoryModal
        visible={editModalVisible}
        post={post}
        token={token}
        onClose={() => setEditModalVisible(false)}
        onSaved={handleEditSaved}
      />
    </View>
  );
}

const getStyles = (colors, width, height) =>
  StyleSheet.create({
    screenWrapper: {
      flex: 1,
      backgroundColor: colors.bg,
    },
    container: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: 16,
      paddingTop: 4,
      paddingBottom: 95,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.bg,
    },
    loadingText: {
      marginTop: 12,
      fontSize: 14,
      color: colors.textSubtle,
      fontStyle: 'italic',
    },
    errorContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.bg,
      padding: 24,
    },
    errorTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: colors.textDark,
      marginBottom: 6,
    },
    errorSubtitle: {
      fontSize: 13,
      color: colors.textSubtle,
      marginBottom: 16,
      textAlign: 'center',
    },
    backBtnAction: {
      backgroundColor: colors.primary,
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 12,
    },
    backBtnActionText: {
      color: '#ffffff',
      fontWeight: '700',
      fontSize: 13,
    },
    topNav: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 10,
    },
    topNavActions: {
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
    deleteNavBtn: {
      backgroundColor: colors.dangerBg,
      borderColor: colors.dangerBorder,
    },
    navTitle: {
      fontSize: 17,
      fontWeight: '800',
      color: colors.textDark,
    },
    detailsCard: {
      backgroundColor: colors.surface,
      borderRadius: 28,
      borderWidth: 1.5,
      borderColor: colors.cardBorder,
      padding: 16,
      ...shadow(2),
    },
    carouselContainer: {
      marginBottom: 16,
      position: 'relative',
    },
    slideWrap: {
      height: 260,
      borderRadius: 14,
      overflow: 'hidden',
      borderWidth: 1.5,
      borderColor: colors.cardBorder,
      position: 'relative',
    },
    carouselImage: {
      width: '100%',
      height: '100%',
    },
    zoomHintPill: {
      position: 'absolute',
      bottom: 8,
      right: 8,
      backgroundColor: 'rgba(0,0,0,0.65)',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
    },
    zoomHintText: {
      fontSize: 10,
      fontWeight: '600',
      color: '#ffffff',
    },
    counterBadge: {
      position: 'absolute',
      top: 10,
      right: 10,
      backgroundColor: 'rgba(0,0,0,0.65)',
      paddingHorizontal: 9,
      paddingVertical: 4,
      borderRadius: 12,
    },
    counterText: {
      fontSize: 11,
      fontWeight: '700',
      color: '#ffffff',
    },
    dotsRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 6,
      marginTop: 8,
    },
    dot: {
      width: 7,
      height: 7,
      borderRadius: 3.5,
      backgroundColor: colors.borderActive,
    },
    activeDot: {
      backgroundColor: colors.primary,
      width: 18,
    },
    noPhotoWrap: {
      height: 140,
      borderRadius: 14,
      backgroundColor: colors.surfaceSubtle,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      borderStyle: 'dashed',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    noPhotoText: {
      fontSize: 13,
      color: colors.textSubtle,
    },
    titleSection: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
      marginBottom: 10,
    },
    venueTitle: {
      fontSize: 27,
      fontFamily: fonts.displayHeavy,
      fontWeight: 'normal',
      color: colors.textDark,
      flex: 1,
      lineHeight: 35,
    },
    metaRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 12,
    },
    dateBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      backgroundColor: colors.surfaceSubtle,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
    },
    dateText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textSubtle,
    },
    categoryBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      backgroundColor: colors.primaryLight,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.primary,
    },
    categoryBadgeText: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.primary,
    },
    moodBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: colors.surfaceSubtle,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
    },
    moodBadgeText: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.textDark,
    },
    ratingSection: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginBottom: 14,
    },
    ratingLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.textSubtle,
      marginLeft: 8,
    },
    descriptionSection: {
      marginBottom: 16,
    },
    descHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 6,
    },
    descHeaderText: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.textDark,
    },
    notesBox: {
      backgroundColor: colors.surfaceSubtle,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: colors.cardBorder,
      padding: 12,
    },
    notesText: {
      fontSize: 14,
      color: colors.textDark,
      lineHeight: 22,
    },

    // 15-SECOND SOUNDTRACK BOX
    soundtrackBox: {
      backgroundColor: colors.surfaceSubtle,
      borderRadius: 16,
      borderWidth: 1.5,
      borderColor: colors.cardBorder,
      padding: 12,
      marginBottom: 16,
    },
    soundtrackHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 10,
    },
    soundtrackCover: {
      width: 48,
      height: 48,
      borderRadius: 10,
      marginRight: 10,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
    },
    soundtrackCoverPlaceholder: {
      width: 48,
      height: 48,
      borderRadius: 10,
      backgroundColor: colors.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 10,
    },
    soundtrackInfoWrap: {
      flex: 1,
      marginRight: 8,
    },
    soundtrackBadgeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 2,
    },
    playingPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: colors.primaryLight,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 6,
    },
    playingPillText: {
      fontSize: 9,
      fontWeight: '700',
      color: colors.primary,
    },
    soundtrackCounter: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.primary,
    },
    soundtrackTitle: {
      fontSize: 13,
      fontWeight: '800',
      color: colors.textDark,
    },
    soundtrackArtist: {
      fontSize: 11,
      color: colors.textSubtle,
    },
    soundtrackActionBtn: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: colors.surface,
      borderWidth: 1.5,
      borderColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    soundtrackActionBtnActive: {
      backgroundColor: colors.primary,
    },
    soundtrackProgressTrack: {
      height: 6,
      backgroundColor: colors.surface,
      borderRadius: 3,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: colors.borderSubtle,
    },
    soundtrackProgressFill: {
      height: '100%',
      backgroundColor: colors.primary,
      borderRadius: 3,
    },

    footerSection: {
      borderTopWidth: 1,
      borderTopColor: colors.borderSubtle,
      paddingTop: 14,
      alignItems: 'center',
      gap: 10,
    },
    shareMemoryBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: colors.primaryLight,
      borderWidth: 1,
      borderColor: colors.primary,
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 18,
    },
    shareMemoryBtnText: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.primary,
    },
    authorText: {
      fontSize: 11,
      color: colors.textMuted,
      fontStyle: 'italic',
    },
    // Lightbox modal styles
    lightboxBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.92)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    lightboxTopBar: {
      position: 'absolute',
      top: 40,
      left: 16,
      right: 16,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      zIndex: 20,
    },
    lightboxCounter: {
      fontSize: 14,
      fontWeight: '700',
      color: '#ffffff',
    },
    lightboxCloseBtn: {
      padding: 8,
    },
    lightboxImage: {
      width: width,
      height: height * 0.75,
    },
    lightboxBottomBar: {
      position: 'absolute',
      bottom: 40,
      flexDirection: 'row',
      gap: 20,
    },
    lightboxNavBtn: {
      backgroundColor: 'rgba(255,255,255,0.2)',
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 16,
    },
    lightboxNavText: {
      color: '#ffffff',
      fontWeight: '700',
      fontSize: 14,
    },
    // Edit Modal styles

    // CENTERED MODAL FOR EDIT DEEZER MUSIC
    centerSuggestionsTitle: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.textSubtle,
      marginBottom: 6,
    },
    centerSuggestionPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 12,
      backgroundColor: colors.surfaceSubtle,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
    },
    centerSuggestionPillText: {
      fontSize: 11,
      color: colors.textDark,
      fontWeight: '500',
    },
    ratingRow: {
      flexDirection: 'row',
      gap: 8,
    },
  });
