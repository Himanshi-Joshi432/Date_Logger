import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Image,
  Alert,
  useWindowDimensions,
  FlatList,
} from 'react-native';
import { createAudioPlayer } from 'expo-audio';
import {
  Calendar,
  MapPin,
  Trash2,
  ArrowLeft,
  Music,
  Play,
  Pause,
  FileText,
  Sparkles,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { postAPI } from '../services/api';
import { colors } from '../theme/colors';

export function DateDetailsScreen({
  postId,
  initialPost = null,
  onNavigateBack,
  onDeleteSuccess,
}) {
  const { token } = useAuth();
  const { width } = useWindowDimensions();
  const carouselWidth = width - 32; // Account for container padding

  const [post, setPost] = useState(initialPost);
  const [isLoading, setIsLoading] = useState(!initialPost);
  const [isDeleting, setIsDeleting] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  // Audio state
  const [sound, setSound] = useState(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  const flatListRef = useRef(null);

  // Fetch full details if not provided or to ensure fresh data
  useEffect(() => {
    let isMounted = true;

    async function fetchDetails() {
      if (!postId) return;
      try {
        if (!initialPost) setIsLoading(true);
        const data = await postAPI.getPostById(postId, token);
        if (isMounted) {
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
      if (sound) {
        sound.pause();
        sound.release();
      }
    };
  }, [postId, token]);

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
            setIsDeleting(true);
            try {
              await postAPI.deletePost(postId, token);
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

  const handleToggleAudio = async () => {
    const audioUrl = post?.music?.audioUrl;
    if (!audioUrl) return;

    try {
      if (isPlayingAudio && sound) {
        sound.pause();
        setIsPlayingAudio(false);
        return;
      }

      if (sound) {
        sound.pause();
        sound.release();
      }

      const player = createAudioPlayer(audioUrl);
      player.play();
      setSound(player);
      setIsPlayingAudio(true);

      player.addListener('playbackStatusUpdate', (status) => {
        if (status.didJustFinish) {
          setIsPlayingAudio(false);
        }
      });
    } catch (err) {
      console.warn('Audio playback error', err);
    }
  };

  // Prepare images list
  const images = post?.images?.length
    ? post.images
    : post?.image
    ? [post.image]
    : [];

  const handleScroll = (event) => {
    const scrollOffset = event.nativeEvent.contentOffset.x;
    const index = Math.round(scrollOffset / carouselWidth);
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
        <Text style={styles.errorSubtitle}>
          The requested date log could not be loaded.
        </Text>
        <TouchableOpacity style={styles.backBtn} onPress={onNavigateBack}>
          <Text style={styles.backBtnText}>Back to Date History</Text>
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

  return (
    <View style={styles.screenWrapper}>
      {/* Top Navigation */}
      <View style={styles.topNav}>
        <TouchableOpacity
          style={styles.navBtn}
          onPress={onNavigateBack}
          activeOpacity={0.7}
        >
          <ArrowLeft size={18} color={colors.textDark} />
        </TouchableOpacity>
        <Text style={styles.navTitle}>Date Memory</Text>
        <TouchableOpacity
          style={[styles.navBtn, styles.deleteNavBtn]}
          onPress={handleDelete}
          disabled={isDeleting}
          activeOpacity={0.7}
        >
          {isDeleting ? (
            <ActivityIndicator size="small" color={colors.danger} />
          ) : (
            <Trash2 size={18} color={colors.danger} />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Scrapbook Details Card */}
        <View style={styles.detailsCard}>
          {/* 1. CAROUSEL OF MULTIPLE PHOTOS */}
          <View style={styles.carouselContainer}>
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
                    <View style={[styles.slideWrap, { width: carouselWidth - 36 }]}>
                      <Image
                        source={{ uri: item }}
                        style={styles.carouselImage}
                        resizeMode="cover"
                      />
                    </View>
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
          </View>

          {/* 2. TITLE (VENUE) */}
          <View style={styles.titleSection}>
            <MapPin size={22} color={colors.primary} style={{ marginTop: 2 }} />
            <Text style={styles.venueTitle}>
              {post.venue || 'Unnamed Venue'}
            </Text>
          </View>

          {/* 3. DATE */}
          <View style={styles.dateBadge}>
            <Calendar size={15} color={colors.primary} />
            <Text style={styles.dateText}>{formattedDate}</Text>
          </View>

          {/* 4. DESCRIPTION */}
          <View style={styles.descriptionSection}>
            <View style={styles.descHeader}>
              <FileText size={15} color={colors.primary} />
              <Text style={styles.descHeaderText}>Journal Notes & Memories</Text>
            </View>
            <View style={styles.notesBox}>
              <Text style={styles.notesText}>
                {post.description || 'No description recorded for this date.'}
              </Text>
            </View>
          </View>

          {/* Soundtrack Player */}
          {post.music?.audioUrl ? (
            <View style={styles.soundtrackBox}>
              <View style={styles.soundtrackHeader}>
                <Music size={16} color={colors.primary} />
                <Text style={styles.soundtrackTitle}>Date Soundtrack</Text>
              </View>
              <TouchableOpacity
                style={[
                  styles.audioControlBtn,
                  isPlayingAudio && styles.audioControlBtnPlaying,
                ]}
                onPress={handleToggleAudio}
                activeOpacity={0.8}
              >
                {isPlayingAudio ? (
                  <Pause size={16} color="#ffffff" />
                ) : (
                  <Play size={16} color={colors.primary} />
                )}
                <Text
                  style={[
                    styles.audioControlText,
                    isPlayingAudio && { color: '#ffffff' },
                  ]}
                >
                  {isPlayingAudio ? 'Pause Soundtrack' : 'Play Soundtrack'}
                </Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {/* Footer & Delete Memory */}
          <View style={styles.footerSection}>
            <Text style={styles.authorText}>
              Preserved by {post.createdBy?.email || 'You'}
            </Text>
            <TouchableOpacity
              style={styles.deleteBtn}
              onPress={handleDelete}
              disabled={isDeleting}
            >
              <Trash2 size={15} color={colors.danger} />
              <Text style={styles.deleteBtnText}>Delete Memory</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screenWrapper: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  topNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
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
  deleteNavBtn: {
    borderColor: 'rgba(156, 46, 36, 0.3)',
    backgroundColor: '#fff5f4',
  },
  navTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textDark,
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: colors.textSubtle,
  },
  errorContainer: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textDark,
    marginBottom: 8,
  },
  errorSubtitle: {
    fontSize: 14,
    color: colors.textSubtle,
    textAlign: 'center',
    marginBottom: 20,
  },
  backBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 999,
  },
  backBtnText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  detailsCard: {
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: colors.cardBorder,
    borderRadius: 20,
    padding: 18,
    shadowColor: colors.cardBorder,
    shadowOffset: { width: 3, height: 5 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
    marginTop: 6,
  },
  carouselContainer: {
    width: '100%',
    marginBottom: 16,
  },
  slideWrap: {
    aspectRatio: 4 / 3,
    maxHeight: 280,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 6,
    borderWidth: 1.5,
    borderColor: colors.borderSubtle,
    overflow: 'hidden',
  },
  carouselImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  counterBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(38, 31, 24, 0.82)',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  counterText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    gap: 6,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.borderActive,
  },
  activeDot: {
    width: 20,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  noPhotoWrap: {
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fbf7f0',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.borderSubtle,
    borderStyle: 'dashed',
    gap: 6,
  },
  noPhotoText: {
    fontSize: 13,
    color: colors.textSubtle,
  },
  titleSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    borderTopWidth: 1.5,
    borderTopColor: colors.borderSubtle,
    borderStyle: 'dashed',
    paddingTop: 14,
    marginBottom: 12,
  },
  venueTitle: {
    flex: 1,
    fontSize: 22,
    fontWeight: '800',
    color: colors.textDark,
    lineHeight: 28,
  },
  dateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.primaryLight,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 999,
    gap: 6,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(141, 61, 47, 0.2)',
  },
  dateText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
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
    fontSize: 11.5,
    fontWeight: '700',
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  notesBox: {
    backgroundColor: '#faf6ef',
    borderLeftWidth: 3,
    borderLeftColor: '#bda27e',
    borderRadius: 6,
    padding: 12,
  },
  notesText: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.textDark,
  },
  soundtrackBox: {
    backgroundColor: '#fbf7f0',
    borderWidth: 1.5,
    borderColor: colors.borderSubtle,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  soundtrackHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  soundtrackTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textDark,
  },
  audioControlBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: colors.primary,
    backgroundColor: '#ffffff',
  },
  audioControlBtnPlaying: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  audioControlText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  footerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
    borderStyle: 'dashed',
    paddingTop: 14,
  },
  authorText: {
    fontSize: 11.5,
    color: colors.textSubtle,
    fontStyle: 'italic',
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    backgroundColor: '#fbf0ee',
  },
  deleteBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.danger,
  },
});

