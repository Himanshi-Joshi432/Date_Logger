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
  Modal,
  TextInput,
  Share,
  Vibration,
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
  Search,
} from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { postAPI } from '../services/api';
import { searchDeezerTracks } from '../services/musicService';

export function DateDetailsScreen({
  postId,
  initialPost = null,
  onNavigateBack,
  onDeleteSuccess,
}) {
  const { token } = useAuth();
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

  // Edit Modal state
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editVenue, setEditVenue] = useState('');
  const [editDate, setEditDate] = useState(new Date());
  const [editShowDatePicker, setEditShowDatePicker] = useState(false);
  const [editDescription, setEditDescription] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editMood, setEditMood] = useState('');
  const [editRating, setEditRating] = useState(5);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Edit Deezer Music Search
  const [editMusicQuery, setEditMusicQuery] = useState('');
  const [editMusicResults, setEditMusicResults] = useState([]);
  const [isSearchingEditMusic, setIsSearchingEditMusic] = useState(false);
  const [editSelectedSong, setEditSelectedSong] = useState(null);

  // 15-Second Audio Soundtrack Playback state
  const soundRef = useRef(null);
  const autoPlayTimerRef = useRef(null);
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

  // AUTO-PLAY 15 SECONDS OF MUSIC WHEN MEMORY IS OPEN
  useEffect(() => {
    const audioUrl = post?.music?.audioUrl;
    if (!audioUrl) return;

    let playerInstance = null;

    try {
      stopAudioPlayback();

      playerInstance = createAudioPlayer(audioUrl);
      soundRef.current = playerInstance;
      playerInstance.play();
      setIsPlayingAudio(true);
      setPlaybackSeconds(0);

      // Status listener tracking 0 to 15 seconds
      playerInstance.addListener('playbackStatusUpdate', (status) => {
        if (status.positionMillis) {
          const sec = Math.min(15, Math.floor(status.positionMillis / 1000));
          setPlaybackSeconds(sec);
          if (status.positionMillis >= 15000) {
            playerInstance.pause();
            setIsPlayingAudio(false);
          }
        }
        if (status.didJustFinish) {
          setIsPlayingAudio(false);
        }
      });

      // Strict 15-second cut-off timer
      autoPlayTimerRef.current = setTimeout(() => {
        if (playerInstance) {
          playerInstance.pause();
          setIsPlayingAudio(false);
        }
      }, 15000);
    } catch (e) {
      console.warn('Auto-play 15s soundtrack error', e);
    }

    return () => {
      stopAudioPlayback();
    };
  }, [post?.music?.audioUrl]);

  const stopAudioPlayback = () => {
    if (autoPlayTimerRef.current) {
      clearTimeout(autoPlayTimerRef.current);
      autoPlayTimerRef.current = null;
    }
    if (soundRef.current) {
      soundRef.current.pause();
      soundRef.current.release();
      soundRef.current = null;
    }
    setIsPlayingAudio(false);
  };

  // Toggle or replay the 15-second music preview
  const handleToggleAudio = async () => {
    const audioUrl = post?.music?.audioUrl;
    if (!audioUrl) return;

    try {
      if (isPlayingAudio && soundRef.current) {
        soundRef.current.pause();
        if (autoPlayTimerRef.current) clearTimeout(autoPlayTimerRef.current);
        setIsPlayingAudio(false);
        return;
      }

      stopAudioPlayback();

      const player = createAudioPlayer(audioUrl);
      soundRef.current = player;
      player.play();
      setIsPlayingAudio(true);
      setPlaybackSeconds(0);

      autoPlayTimerRef.current = setTimeout(() => {
        if (soundRef.current) {
          soundRef.current.pause();
          setIsPlayingAudio(false);
        }
      }, 15000);

      player.addListener('playbackStatusUpdate', (status) => {
        if (status.positionMillis) {
          const sec = Math.min(15, Math.floor(status.positionMillis / 1000));
          setPlaybackSeconds(sec);
          if (status.positionMillis >= 15000) {
            player.pause();
            setIsPlayingAudio(false);
          }
        }
        if (status.didJustFinish) {
          setIsPlayingAudio(false);
        }
      });
    } catch (err) {
      console.warn('Audio playback error', err);
    }
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
              try {
                Vibration.vibrate(30);
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
        Vibration.vibrate(20);
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
    setEditVenue(post.venue || '');
    setEditDate(post.date ? new Date(post.date) : new Date());
    setEditDescription(post.description || '');
    setEditCategory(post.category || '');
    setEditMood(post.mood || '');
    setEditRating(post.rating || 5);
    setEditSelectedSong(
      post.music?.audioUrl
        ? {
            preview: post.music.audioUrl,
            title: post.music.title || 'Soundtrack',
            artist: post.music.artist || '',
            albumCover: post.music.albumCover || null,
          }
        : null
    );
    setEditMusicResults([]);
    setEditMusicQuery('');
    setEditModalVisible(true);
  };

  const handleSearchEditMusic = async () => {
    if (!editMusicQuery.trim()) return;
    setIsSearchingEditMusic(true);
    try {
      const results = await searchDeezerTracks(editMusicQuery.trim());
      setEditMusicResults(results);
    } catch (e) {
      setEditMusicResults([]);
    } finally {
      setIsSearchingEditMusic(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editVenue.trim()) {
      Alert.alert('Venue Required', 'Please provide a venue name.');
      return;
    }

    setIsSavingEdit(true);
    try {
      const payload = {
        venue: editVenue.trim(),
        date: editDate.toISOString().split('T')[0],
        description: editDescription.trim(),
        category: editCategory,
        mood: editMood,
        rating: editRating,
      };

      if (editSelectedSong) {
        payload.music = {
          audioUrl: editSelectedSong.preview,
          title: editSelectedSong.title,
          artist: editSelectedSong.artist,
          albumCover: editSelectedSong.albumCover,
          duration: 15,
        };
      }

      const res = await postAPI.updatePost(postId, payload, token);
      if (res?.post) {
        setPost(res.post);
      } else {
        setPost((prev) => ({ ...prev, ...payload }));
      }
      try {
        Vibration.vibrate(25);
      } catch (e) {}
      setEditModalVisible(false);
    } catch (err) {
      Alert.alert('Save Failed', err.message || 'Could not update date memory.');
    } finally {
      setIsSavingEdit(false);
    }
  };

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
        </View>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Scrapbook Details Card */}
        <View style={styles.detailsCard}>
          {/* 1. CAROUSEL OF PHOTOS */}
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
                        resizeMode="cover"
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
          </View>

          {/* 2. TITLE (VENUE) */}
          <View style={styles.titleSection}>
            <MapPin size={22} color={colors.primary} style={{ marginTop: 2 }} />
            <Text style={styles.venueTitle}>{post.venue || 'Unnamed Venue'}</Text>
          </View>

          {/* 3. METADATA BADGES (DATE, CATEGORY, MOOD, RATING) */}
          <View style={styles.metaRow}>
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
          </View>

          {/* Heart Rating */}
          {post.rating ? (
            <View style={styles.ratingSection}>
              {[1, 2, 3, 4, 5].map((star) => (
                <Heart
                  key={star}
                  size={18}
                  color={colors.primary}
                  fill={star <= post.rating ? colors.primary : 'transparent'}
                />
              ))}
              <Text style={styles.ratingLabel}>{post.rating} / 5 Hearts</Text>
            </View>
          ) : null}

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

          {/* 5. 15-SECOND DEEZER SOUNDTRACK PLAYER */}
          {post.music?.audioUrl ? (
            <View style={styles.soundtrackBox}>
              <View style={styles.soundtrackHeaderRow}>
                {post.music?.albumCover ? (
                  <Image
                    source={{ uri: post.music.albumCover }}
                    style={styles.soundtrackCover}
                  />
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
                <TouchableOpacity
                  style={[
                    styles.soundtrackActionBtn,
                    isPlayingAudio && styles.soundtrackActionBtnActive,
                  ]}
                  onPress={handleToggleAudio}
                  activeOpacity={0.8}
                >
                  {isPlayingAudio ? (
                    <Pause size={18} color="#ffffff" />
                  ) : (
                    <Play size={18} color={colors.primary} />
                  )}
                </TouchableOpacity>
              </View>

              {/* 15-Second Progress Bar */}
              <View style={styles.soundtrackProgressTrack}>
                <View
                  style={[
                    styles.soundtrackProgressFill,
                    { width: `${progressPercent}%` },
                  ]}
                />
              </View>
            </View>
          ) : null}

          {/* Footer & Share CTA */}
          <View style={styles.footerSection}>
            <TouchableOpacity
              style={styles.shareMemoryBtn}
              onPress={handleShare}
              activeOpacity={0.85}
            >
              <Share2 size={14} color={colors.primary} />
              <Text style={styles.shareMemoryBtnText}>Share Date Recap ♡</Text>
            </TouchableOpacity>
            <Text style={styles.authorText}>
              Preserved by {post.createdBy?.email || 'You'}
            </Text>
          </View>
        </View>
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
            <TouchableOpacity
              style={styles.lightboxCloseBtn}
              onPress={() => setLightboxVisible(false)}
            >
              <X size={24} color="#ffffff" />
            </TouchableOpacity>
          </View>

          {images.length > 0 && (
            <Image
              source={{ uri: images[lightboxIndex] }}
              style={styles.lightboxImage}
              resizeMode="contain"
            />
          )}

          {images.length > 1 && (
            <View style={styles.lightboxBottomBar}>
              <TouchableOpacity
                style={styles.lightboxNavBtn}
                onPress={() =>
                  setLightboxIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1))
                }
              >
                <Text style={styles.lightboxNavText}>‹ Previous</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.lightboxNavBtn}
                onPress={() =>
                  setLightboxIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0))
                }
              >
                <Text style={styles.lightboxNavText}>Next ›</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Modal>

      {/* EDIT MEMORY MODAL */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Date Memory</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <X size={20} color={colors.textDark} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Venue */}
              <View style={styles.editInputGroup}>
                <Text style={styles.editLabel}>Venue</Text>
                <TextInput
                  style={styles.editInput}
                  value={editVenue}
                  onChangeText={setEditVenue}
                />
              </View>

              {/* Date */}
              <View style={styles.editInputGroup}>
                <Text style={styles.editLabel}>Date</Text>
                <TouchableOpacity
                  style={styles.editDateBtn}
                  onPress={() => setEditShowDatePicker(true)}
                >
                  <Text style={styles.editDateText}>
                    {editDate.toLocaleDateString()}
                  </Text>
                  <Calendar size={14} color={colors.primary} />
                </TouchableOpacity>
                {editShowDatePicker && (
                  <DateTimePicker
                    value={editDate}
                    mode="date"
                    display="default"
                    onChange={(_, d) => {
                      setEditShowDatePicker(false);
                      if (d) setEditDate(d);
                    }}
                  />
                )}
              </View>

              {/* Rating */}
              <View style={styles.editInputGroup}>
                <Text style={styles.editLabel}>Rating</Text>
                <View style={styles.ratingRow}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <TouchableOpacity
                      key={star}
                      onPress={() => setEditRating(star)}
                    >
                      <Heart
                        size={24}
                        color={colors.primary}
                        fill={star <= editRating ? colors.primary : 'transparent'}
                      />
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Soundtrack (Deezer) */}
              <View style={styles.editInputGroup}>
                <Text style={styles.editLabel}>Deezer Soundtrack</Text>
                {editSelectedSong ? (
                  <View style={styles.editSongCard}>
                    <Disc size={18} color={colors.primary} />
                    <View style={{ flex: 1, marginLeft: 8 }}>
                      <Text style={styles.editSongTitle} numberOfLines={1}>
                        {editSelectedSong.title}
                      </Text>
                      <Text style={styles.editSongArtist} numberOfLines={1}>
                        {editSelectedSong.artist}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => setEditSelectedSong(null)}
                      style={{ padding: 4 }}
                    >
                      <X size={16} color={colors.danger} />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View>
                    <View style={styles.editMusicSearchRow}>
                      <TextInput
                        style={styles.editMusicInput}
                        placeholder="Search Deezer song..."
                        placeholderTextColor={colors.textMuted}
                        value={editMusicQuery}
                        onChangeText={setEditMusicQuery}
                        onSubmitEditing={handleSearchEditMusic}
                      />
                      <TouchableOpacity
                        style={styles.editSearchBtn}
                        onPress={handleSearchEditMusic}
                      >
                        {isSearchingEditMusic ? (
                          <ActivityIndicator size="small" color="#ffffff" />
                        ) : (
                          <Search size={14} color="#ffffff" />
                        )}
                      </TouchableOpacity>
                    </View>

                    {editMusicResults.map((t) => (
                      <TouchableOpacity
                        key={t.id}
                        style={styles.editMusicItem}
                        onPress={() => {
                          setEditSelectedSong(t);
                          setEditMusicResults([]);
                          setEditMusicQuery('');
                        }}
                      >
                        <Text style={styles.editMusicItemText} numberOfLines={1}>
                          {t.title} • {t.artist}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              {/* Description */}
              <View style={styles.editInputGroup}>
                <Text style={styles.editLabel}>Journal Notes</Text>
                <TextInput
                  style={[styles.editInput, styles.editTextArea]}
                  value={editDescription}
                  onChangeText={setEditDescription}
                  multiline
                  numberOfLines={4}
                />
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelModalBtn}
                onPress={() => setEditModalVisible(false)}
              >
                <Text style={styles.cancelModalBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveModalBtn}
                onPress={handleSaveEdit}
                disabled={isSavingEdit}
              >
                {isSavingEdit ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.saveModalBtnText}>Save Changes</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
      borderRadius: 20,
      borderWidth: 2,
      borderColor: colors.cardBorder,
      padding: 16,
      elevation: 4,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 6,
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
      fontSize: 22,
      fontWeight: '800',
      color: colors.textDark,
      flex: 1,
      lineHeight: 28,
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
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
    },
    modalContent: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      padding: 20,
      maxHeight: height * 0.85,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: colors.textDark,
    },
    editInputGroup: {
      marginBottom: 14,
    },
    editLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.textDark,
      marginBottom: 6,
    },
    editInput: {
      backgroundColor: colors.surfaceSubtle,
      borderWidth: 1.5,
      borderColor: colors.cardBorder,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 14,
      color: colors.textDark,
    },
    editTextArea: {
      minHeight: 80,
      textAlignVertical: 'top',
    },
    editDateBtn: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: colors.surfaceSubtle,
      borderWidth: 1.5,
      borderColor: colors.cardBorder,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    editDateText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textDark,
    },
    editSongCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surfaceSubtle,
      borderWidth: 1,
      borderColor: colors.primary,
      borderRadius: 10,
      padding: 8,
    },
    editSongTitle: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.textDark,
    },
    editSongArtist: {
      fontSize: 10,
      color: colors.textSubtle,
    },
    editMusicSearchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surfaceSubtle,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      borderRadius: 10,
      paddingHorizontal: 8,
    },
    editMusicInput: {
      flex: 1,
      fontSize: 12,
      color: colors.textDark,
      paddingVertical: 6,
    },
    editSearchBtn: {
      backgroundColor: colors.primary,
      padding: 6,
      borderRadius: 6,
    },
    editMusicItem: {
      backgroundColor: colors.surfaceSubtle,
      padding: 8,
      borderRadius: 8,
      marginTop: 4,
    },
    editMusicItemText: {
      fontSize: 11,
      color: colors.textDark,
    },
    modalActions: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 16,
    },
    cancelModalBtn: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 12,
      backgroundColor: colors.surfaceSubtle,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.borderSubtle,
    },
    cancelModalBtnText: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.textSubtle,
    },
    saveModalBtn: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 12,
      backgroundColor: colors.primary,
      alignItems: 'center',
    },
    saveModalBtnText: {
      fontSize: 13,
      fontWeight: '700',
      color: '#ffffff',
    },
    ratingRow: {
      flexDirection: 'row',
      gap: 8,
    },
  });
