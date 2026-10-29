import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Image,
  Platform,
  Alert,
  Vibration,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { createAudioPlayer } from 'expo-audio';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  MapPin,
  Calendar as CalendarIcon,
  FileText,
  X,
  ArrowLeft,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Camera,
  Image as ImageIcon,
  Music,
  Play,
  Pause,
  Heart,
  Tag,
  Smile,
  Search,
  Check,
  Disc,
} from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { postAPI } from '../services/api';
import { searchDeezerTracks, POPULAR_DATE_SONGS } from '../services/musicService';

const DRAFT_STORAGE_KEY = 'date_logger_log_draft';

const CATEGORIES = [
  'Romantic Dinner',
  'Cozy Cafe',
  'Movie Night',
  'Road Trip',
  'Anniversary',
  'First Date',
  'Nature & Walks',
  'Special Celebration',
];

const MOODS = [
  { label: 'Romantic', icon: '🥰' },
  { label: 'Magical', icon: '✨' },
  { label: 'Fun & Laughs', icon: '😂' },
  { label: 'Cozy', icon: '☕' },
  { label: 'Fancy', icon: '🍷' },
];

export function LogDateScreen({ onNavigateBack, onLogSaved, initialVenue = '' }) {
  const { token } = useAuth();
  const { colors } = useTheme();

  const [venue, setVenue] = useState(initialVenue);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [description, setDescription] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedMood, setSelectedMood] = useState('');
  const [rating, setRating] = useState(5);

  const [imageFiles, setImageFiles] = useState([]);

  // Deezer Music Search State
  const [musicQuery, setMusicQuery] = useState('');
  const [isSearchingMusic, setIsSearchingMusic] = useState(false);
  const [musicResults, setMusicResults] = useState([]);
  const [selectedSong, setSelectedSong] = useState(null); // { id, title, artist, albumCover, preview, duration }
  const [showMusicSearch, setShowMusicSearch] = useState(false);

  // Audio preview state
  const [soundPlayer, setSoundPlayer] = useState(null);
  const [playingPreviewUrl, setPlayingPreviewUrl] = useState(null);
  const previewTimerRef = useRef(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadPercent, setUploadPercent] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [draftRestored, setDraftRestored] = useState(false);

  // Restore draft on mount
  useEffect(() => {
    async function restoreDraft() {
      if (initialVenue) return;
      try {
        const stored = await AsyncStorage.getItem(DRAFT_STORAGE_KEY);
        if (stored) {
          const draft = JSON.parse(stored);
          if (draft.venue) setVenue(draft.venue);
          if (draft.description) setDescription(draft.description);
          if (draft.category) setSelectedCategory(draft.category);
          if (draft.mood) setSelectedMood(draft.mood);
          if (draft.rating) setRating(draft.rating);
          if (draft.date) setSelectedDate(new Date(draft.date));
          if (draft.selectedSong) setSelectedSong(draft.selectedSong);
          setDraftRestored(true);
        }
      } catch (e) {}
    }
    restoreDraft();

    return () => {
      stopAudioPreview();
    };
  }, []);

  // Auto-save draft
  useEffect(() => {
    async function saveDraft() {
      if (venue || description || selectedCategory || selectedMood || selectedSong) {
        try {
          const draft = {
            venue,
            description,
            category: selectedCategory,
            mood: selectedMood,
            rating,
            selectedSong,
            date: selectedDate.toISOString(),
          };
          await AsyncStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
        } catch (e) {}
      }
    }
    const timeout = setTimeout(saveDraft, 800);
    return () => clearTimeout(timeout);
  }, [venue, description, selectedCategory, selectedMood, rating, selectedDate, selectedSong]);

  const clearDraft = async () => {
    try {
      await AsyncStorage.removeItem(DRAFT_STORAGE_KEY);
    } catch (e) {}
  };

  const stopAudioPreview = () => {
    if (previewTimerRef.current) {
      clearTimeout(previewTimerRef.current);
      previewTimerRef.current = null;
    }
    if (soundPlayer) {
      soundPlayer.pause();
      soundPlayer.release();
      setSoundPlayer(null);
    }
    setPlayingPreviewUrl(null);
  };

  const toggleSongPreview = async (previewUrl) => {
    if (!previewUrl) return;

    if (playingPreviewUrl === previewUrl && soundPlayer) {
      stopAudioPreview();
      return;
    }

    stopAudioPreview();

    try {
      const player = createAudioPlayer(previewUrl);
      player.play();
      setSoundPlayer(player);
      setPlayingPreviewUrl(previewUrl);

      // Stop after 15 seconds
      previewTimerRef.current = setTimeout(() => {
        stopAudioPreview();
      }, 15000);

      player.addListener('playbackStatusUpdate', (status) => {
        if (status.didJustFinish) {
          stopAudioPreview();
        }
      });
    } catch (e) {
      console.warn('Audio preview error', e);
      stopAudioPreview();
    }
  };

  const handleSearchMusic = async (queryText) => {
    const q = queryText !== undefined ? queryText : musicQuery;
    if (!q || !q.trim()) return;

    setIsSearchingMusic(true);
    setShowMusicSearch(true);
    try {
      const results = await searchDeezerTracks(q);
      setMusicResults(results);
    } catch (e) {
      setMusicResults([]);
    } finally {
      setIsSearchingMusic(false);
    }
  };

  const handleSelectSong = (song) => {
    try {
      Vibration.vibrate(20);
    } catch (e) {}
    stopAudioPreview();
    setSelectedSong(song);
    setShowMusicSearch(false);
    setMusicResults([]);
    setMusicQuery('');
  };

  const handleRemoveSong = () => {
    stopAudioPreview();
    setSelectedSong(null);
  };

  const onDateChange = (event, date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (date) {
      setSelectedDate(date);
    }
  };

  // Gallery image selection
  const pickFromGallery = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission Denied', 'Camera roll permission is required to select photos.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const newImages = result.assets.map((asset, idx) => ({
          uri: asset.uri,
          name: asset.fileName || `date-memory-${Date.now()}-${idx}.jpg`,
          type: asset.mimeType || 'image/jpeg',
        }));
        setImageFiles((prev) => [...prev, ...newImages]);
        setErrorMsg('');
      }
    } catch (err) {
      setErrorMsg('Failed to select photos from gallery');
    }
  };

  // Camera capture
  const takePhoto = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission Denied', 'Camera permission is required to take photos.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        setImageFiles((prev) => [
          ...prev,
          {
            uri: asset.uri,
            name: asset.fileName || `camera-${Date.now()}.jpg`,
            type: asset.mimeType || 'image/jpeg',
          },
        ]);
        setErrorMsg('');
      }
    } catch (err) {
      setErrorMsg('Failed to capture photo with camera');
    }
  };

  const handleRemoveImage = (indexToRemove) => {
    setImageFiles((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSelectRating = (val) => {
    try {
      Vibration.vibrate(15);
    } catch (e) {}
    setRating(val);
  };

  const handleSubmit = async () => {
    setErrorMsg('');
    setSuccessMsg('');

    if (!venue.trim()) {
      setErrorMsg('Please enter a venue or place name.');
      return;
    }

    if (imageFiles.length === 0) {
      setErrorMsg('Please upload at least one photo for this date memory.');
      return;
    }

    setIsSubmitting(true);
    setUploadPercent(0);

    try {
      const dateString = selectedDate.toISOString().split('T')[0];
      const formData = new FormData();
      formData.append('venue', venue.trim());
      formData.append('date', dateString);
      formData.append('description', description.trim());
      if (selectedCategory) formData.append('category', selectedCategory);
      if (selectedMood) formData.append('mood', selectedMood);
      if (rating) formData.append('rating', String(rating));

      // Append multiple images
      imageFiles.forEach((img, idx) => {
        formData.append('images', {
          uri: img.uri,
          name: img.name || `photo-${Date.now()}-${idx}.jpg`,
          type: img.type || 'image/jpeg',
        });
      });

      // Append Deezer soundtrack metadata
      if (selectedSong?.preview) {
        formData.append('audioUrl', selectedSong.preview);
        formData.append('songTitle', selectedSong.title || '');
        formData.append('songArtist', selectedSong.artist || '');
        if (selectedSong.albumCover) {
          formData.append('albumCover', selectedSong.albumCover);
        }
        formData.append(
          'music',
          JSON.stringify({
            audioUrl: selectedSong.preview,
            title: selectedSong.title,
            artist: selectedSong.artist,
            albumCover: selectedSong.albumCover,
            duration: 15,
          })
        );
      }

      await postAPI.createPost(formData, token, (percent) => {
        setUploadPercent(percent);
      });

      try {
        Vibration.vibrate([0, 50, 70, 50]);
      } catch (e) {}

      setSuccessMsg('Date memory saved successfully! ♡');
      await clearDraft();

      setVenue('');
      setDescription('');
      setSelectedCategory('');
      setSelectedMood('');
      setSelectedDate(new Date());
      setImageFiles([]);
      handleRemoveSong();

      if (onLogSaved) {
        setTimeout(() => {
          onLogSaved();
        }, 1100);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to save date memory. Check your connection.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formattedDate = selectedDate.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  const styles = getStyles(colors);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
    >
      {/* Top Header Navigation */}
      <View style={styles.topNav}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={onNavigateBack}
          activeOpacity={0.7}
        >
          <ArrowLeft size={18} color={colors.textDark} />
        </TouchableOpacity>
        <Text style={styles.navTitle}>New Date Memory</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Main Journal Card */}
      <View style={styles.card}>
        <View style={styles.header}>
          <View style={styles.sparkleBadge}>
            <Sparkles size={24} color={colors.primary} />
          </View>
          <Text style={styles.title}>Preserve a Date</Text>
          <Text style={styles.subtitle}>
            Capture the feelings, music & snapshots of your special moment
          </Text>
        </View>

        {/* Draft Restored Banner */}
        {draftRestored ? (
          <View style={styles.draftBox}>
            <Sparkles size={14} color={colors.primary} />
            <Text style={styles.draftText}>Restored your unsaved draft</Text>
          </View>
        ) : null}

        {/* Feedback Messages */}
        {errorMsg ? (
          <View style={styles.errorBox}>
            <AlertCircle size={16} color={colors.danger} />
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        ) : null}

        {successMsg ? (
          <View style={styles.successBox}>
            <CheckCircle2 size={16} color={colors.success} />
            <Text style={styles.successText}>{successMsg}</Text>
          </View>
        ) : null}

        {/* 1. Venue Input */}
        <View style={styles.inputGroup}>
          <View style={styles.labelRow}>
            <MapPin size={16} color={colors.primary} />
            <Text style={styles.label}>Venue / Place</Text>
            <Text style={styles.required}>*</Text>
          </View>
          <TextInput
            style={styles.input}
            placeholder="e.g. Luna Bistro, Skyline Lookout..."
            placeholderTextColor={colors.textMuted}
            value={venue}
            onChangeText={setVenue}
          />
        </View>

        {/* 2. Date Picker */}
        <View style={styles.inputGroup}>
          <View style={styles.labelRow}>
            <CalendarIcon size={16} color={colors.primary} />
            <Text style={styles.label}>Date of Outing</Text>
            <Text style={styles.required}>*</Text>
          </View>
          <TouchableOpacity
            style={styles.datePickerBtn}
            onPress={() => setShowDatePicker(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.datePickerText}>{formattedDate}</Text>
            <CalendarIcon size={16} color={colors.textSubtle} />
          </TouchableOpacity>

          {showDatePicker && (
            <DateTimePicker
              value={selectedDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={onDateChange}
              maximumDate={new Date()}
            />
          )}
        </View>

        {/* 3. Category Chips */}
        <View style={styles.inputGroup}>
          <View style={styles.labelRow}>
            <Tag size={16} color={colors.primary} />
            <Text style={styles.label}>Category</Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsScroll}
          >
            {CATEGORIES.map((cat) => {
              const isSelected = selectedCategory === cat;
              return (
                <TouchableOpacity
                  key={cat}
                  style={[styles.chip, isSelected && styles.chipActive]}
                  onPress={() => setSelectedCategory(isSelected ? '' : cat)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* 4. Mood Selector */}
        <View style={styles.inputGroup}>
          <View style={styles.labelRow}>
            <Smile size={16} color={colors.primary} />
            <Text style={styles.label}>Mood & Vibe</Text>
          </View>
          <View style={styles.moodRow}>
            {MOODS.map((m) => {
              const isSelected = selectedMood === m.label;
              return (
                <TouchableOpacity
                  key={m.label}
                  style={[styles.moodBtn, isSelected && styles.moodBtnActive]}
                  onPress={() => setSelectedMood(isSelected ? '' : m.label)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.moodEmoji}>{m.icon}</Text>
                  <Text style={[styles.moodLabel, isSelected && styles.moodLabelActive]}>
                    {m.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* 5. Heart Rating */}
        <View style={styles.inputGroup}>
          <View style={styles.labelRow}>
            <Heart size={16} color={colors.primary} />
            <Text style={styles.label}>Date Rating</Text>
          </View>
          <View style={styles.ratingRow}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity
                key={star}
                onPress={() => handleSelectRating(star)}
                activeOpacity={0.7}
                style={styles.ratingHeartBtn}
              >
                <Heart
                  size={28}
                  color={colors.primary}
                  fill={star <= rating ? colors.primary : 'transparent'}
                />
              </TouchableOpacity>
            ))}
            <Text style={styles.ratingScore}>{rating} / 5 Hearts</Text>
          </View>
        </View>

        {/* 6. Description / Journal Note */}
        <View style={styles.inputGroup}>
          <View style={styles.labelRow}>
            <FileText size={16} color={colors.primary} />
            <Text style={styles.label}>Journal Note</Text>
          </View>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="What made this moment unforgettable? The laughter, food, playlist..."
            placeholderTextColor={colors.textMuted}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* 7. DEEZER MUSIC SOUNDTRACK SEARCH & ATTACH */}
        <View style={styles.inputGroup}>
          <View style={styles.labelRow}>
            <Disc size={16} color={colors.primary} />
            <Text style={styles.label}>Memory Soundtrack (Deezer 15s)</Text>
          </View>

          {/* Selected Song Preview Card */}
          {selectedSong ? (
            <View style={styles.selectedSongCard}>
              {selectedSong.albumCover ? (
                <Image
                  source={{ uri: selectedSong.albumCover }}
                  style={styles.selectedSongCover}
                />
              ) : (
                <View style={styles.noCoverIcon}>
                  <Music size={20} color={colors.primary} />
                </View>
              )}

              <View style={styles.selectedSongInfo}>
                <Text style={styles.selectedSongTitle} numberOfLines={1}>
                  {selectedSong.title}
                </Text>
                <Text style={styles.selectedSongArtist} numberOfLines={1}>
                  {selectedSong.artist}
                </Text>
                <View style={styles.fifteenBadge}>
                  <Text style={styles.fifteenBadgeText}>15s Soundtrack Attached</Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.previewBtn}
                onPress={() => toggleSongPreview(selectedSong.preview)}
                activeOpacity={0.7}
              >
                {playingPreviewUrl === selectedSong.preview ? (
                  <Pause size={16} color="#ffffff" />
                ) : (
                  <Play size={16} color="#ffffff" />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.removeSongBtn}
                onPress={handleRemoveSong}
                activeOpacity={0.7}
              >
                <X size={18} color={colors.danger} />
              </TouchableOpacity>
            </View>
          ) : (
            <View>
              {/* Search input for Deezer */}
              <View style={styles.musicSearchRow}>
                <Search size={16} color={colors.textSubtle} style={{ marginRight: 8 }} />
                <TextInput
                  style={styles.musicInput}
                  placeholder="Search artist or song (e.g. Coldplay, Perfect)..."
                  placeholderTextColor={colors.textMuted}
                  value={musicQuery}
                  onChangeText={setMusicQuery}
                  onSubmitEditing={() => handleSearchMusic()}
                  returnKeyType="search"
                />
                {musicQuery ? (
                  <TouchableOpacity
                    onPress={() => setMusicQuery('')}
                    style={{ padding: 4 }}
                  >
                    <X size={16} color={colors.textSubtle} />
                  </TouchableOpacity>
                ) : null}
                <TouchableOpacity
                  style={styles.searchActionBtn}
                  onPress={() => handleSearchMusic()}
                  activeOpacity={0.7}
                >
                  <Text style={styles.searchActionBtnText}>Search</Text>
                </TouchableOpacity>
              </View>

              {/* Quick Popular Suggestions */}
              {!showMusicSearch && (
                <View style={styles.popularSongsWrap}>
                  <Text style={styles.popularLabel}>Popular Date Songs:</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ gap: 6 }}
                  >
                    {POPULAR_DATE_SONGS.map((songName) => (
                      <TouchableOpacity
                        key={songName}
                        style={styles.popularPill}
                        onPress={() => {
                          setMusicQuery(songName);
                          handleSearchMusic(songName);
                        }}
                      >
                        <Music size={11} color={colors.primary} />
                        <Text style={styles.popularPillText}>{songName}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              {/* Search Results List */}
              {isSearchingMusic ? (
                <View style={styles.musicLoadingWrap}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={styles.musicLoadingText}>Searching Deezer catalog...</Text>
                </View>
              ) : (
                showMusicSearch && (
                  <View style={styles.musicResultsList}>
                    {musicResults.length === 0 ? (
                      <Text style={styles.noMusicFound}>
                        No tracks found with preview. Try searching another song or artist.
                      </Text>
                    ) : (
                      musicResults.map((track) => {
                        const isPreviewPlaying = playingPreviewUrl === track.preview;
                        return (
                          <View key={track.id} style={styles.trackResultItem}>
                            {track.albumCover ? (
                              <Image
                                source={{ uri: track.albumCover }}
                                style={styles.trackThumb}
                              />
                            ) : (
                              <View style={styles.trackThumbPlaceholder}>
                                <Music size={16} color={colors.primary} />
                              </View>
                            )}

                            <View style={styles.trackDetails}>
                              <Text style={styles.trackTitle} numberOfLines={1}>
                                {track.title}
                              </Text>
                              <Text style={styles.trackArtist} numberOfLines={1}>
                                {track.artist}
                              </Text>
                            </View>

                            <TouchableOpacity
                              style={[
                                styles.trackPreviewBtn,
                                isPreviewPlaying && styles.trackPreviewBtnActive,
                              ]}
                              onPress={() => toggleSongPreview(track.preview)}
                              activeOpacity={0.7}
                            >
                              {isPreviewPlaying ? (
                                <Pause size={14} color="#ffffff" />
                              ) : (
                                <Play size={14} color={colors.primary} />
                              )}
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={styles.trackSelectBtn}
                              onPress={() => handleSelectSong(track)}
                              activeOpacity={0.8}
                            >
                              <Check size={14} color="#ffffff" />
                              <Text style={styles.trackSelectBtnText}>Attach</Text>
                            </TouchableOpacity>
                          </View>
                        );
                      })
                    )}
                  </View>
                )
              )}
            </View>
          )}
        </View>

        {/* 8. Photo Uploads */}
        <View style={styles.inputGroup}>
          <View style={styles.labelRow}>
            <ImageIcon size={16} color={colors.primary} />
            <Text style={styles.label}>Photo Memories</Text>
            <Text style={styles.required}>*</Text>
          </View>

          {/* Action buttons */}
          <View style={styles.imageActionButtons}>
            <TouchableOpacity
              style={styles.pickerBtn}
              onPress={pickFromGallery}
              activeOpacity={0.8}
            >
              <ImageIcon size={18} color={colors.primary} />
              <Text style={styles.pickerBtnText}>Choose Gallery Photos</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cameraBtn}
              onPress={takePhoto}
              activeOpacity={0.8}
            >
              <Camera size={18} color={colors.textDark} />
              <Text style={styles.cameraBtnText}>Take Photo</Text>
            </TouchableOpacity>
          </View>

          {/* Image Previews Grid */}
          {imageFiles.length > 0 && (
            <View style={styles.previewGrid}>
              {imageFiles.map((item, idx) => (
                <View key={idx} style={styles.thumbnailWrapper}>
                  <Image source={{ uri: item.uri }} style={styles.thumbnail} />
                  <TouchableOpacity
                    style={styles.removeImageBadge}
                    onPress={() => handleRemoveImage(idx)}
                    activeOpacity={0.7}
                  >
                    <X size={12} color="#ffffff" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Upload Progress Bar */}
        {isSubmitting && (
          <View style={styles.progressContainer}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressTitle}>Saving memory...</Text>
              <Text style={styles.progressPercent}>{uploadPercent}%</Text>
            </View>
            <View style={styles.progressBarTrack}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${Math.max(uploadPercent, 8)}%` },
                ]}
              />
            </View>
          </View>
        )}

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitBtn, isSubmitting && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={isSubmitting}
          activeOpacity={0.85}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Text style={styles.submitBtnText}>Preserve Memory ♡</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const getStyles = (colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.bg,
    },
    scrollContent: {
      paddingHorizontal: 16,
      paddingTop: 10,
      paddingBottom: 95,
    },
    topNav: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 14,
    },
    backBtn: {
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
    card: {
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
    header: {
      alignItems: 'center',
      marginBottom: 16,
    },
    sparkleBadge: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 8,
    },
    title: {
      fontSize: 20,
      fontWeight: '800',
      color: colors.textDark,
      marginBottom: 2,
    },
    subtitle: {
      fontSize: 12,
      color: colors.textSubtle,
      textAlign: 'center',
      paddingHorizontal: 12,
    },
    draftBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: colors.primaryLight,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 10,
      marginBottom: 12,
    },
    draftText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.primary,
    },
    errorBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: colors.dangerBg,
      borderWidth: 1,
      borderColor: colors.dangerBorder,
      padding: 10,
      borderRadius: 10,
      marginBottom: 12,
    },
    errorText: {
      fontSize: 12,
      color: colors.danger,
      flex: 1,
    },
    successBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: colors.successBg,
      borderWidth: 1,
      borderColor: colors.successBorder,
      padding: 10,
      borderRadius: 10,
      marginBottom: 12,
    },
    successText: {
      fontSize: 12,
      color: colors.success,
      flex: 1,
    },
    inputGroup: {
      marginBottom: 14,
    },
    labelRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 6,
    },
    label: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.textDark,
    },
    required: {
      color: colors.danger,
      fontWeight: 'bold',
    },
    input: {
      backgroundColor: colors.surfaceSubtle,
      borderWidth: 1.5,
      borderColor: colors.cardBorder,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 14,
      color: colors.textDark,
    },
    textArea: {
      minHeight: 80,
    },
    datePickerBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.surfaceSubtle,
      borderWidth: 1.5,
      borderColor: colors.cardBorder,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    datePickerText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textDark,
    },
    chipsScroll: {
      gap: 8,
      paddingVertical: 4,
    },
    chip: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 18,
      backgroundColor: colors.surfaceSubtle,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
    },
    chipActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    chipText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textSubtle,
    },
    chipTextActive: {
      color: '#ffffff',
    },
    moodRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 6,
    },
    moodBtn: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 8,
      borderRadius: 12,
      backgroundColor: colors.surfaceSubtle,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
    },
    moodBtnActive: {
      backgroundColor: colors.primaryLight,
      borderColor: colors.primary,
      borderWidth: 1.5,
    },
    moodEmoji: {
      fontSize: 18,
      marginBottom: 2,
    },
    moodLabel: {
      fontSize: 10,
      fontWeight: '600',
      color: colors.textSubtle,
    },
    moodLabelActive: {
      color: colors.primary,
      fontWeight: '700',
    },
    ratingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    ratingHeartBtn: {
      padding: 2,
    },
    ratingScore: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.textSubtle,
      marginLeft: 6,
    },

    // Deezer Music Styles
    selectedSongCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surfaceSubtle,
      borderRadius: 14,
      borderWidth: 1.5,
      borderColor: colors.cardBorder,
      padding: 10,
    },
    selectedSongCover: {
      width: 48,
      height: 48,
      borderRadius: 8,
      marginRight: 10,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
    },
    noCoverIcon: {
      width: 48,
      height: 48,
      borderRadius: 8,
      backgroundColor: colors.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 10,
    },
    selectedSongInfo: {
      flex: 1,
    },
    selectedSongTitle: {
      fontSize: 13,
      fontWeight: '800',
      color: colors.textDark,
    },
    selectedSongArtist: {
      fontSize: 11,
      color: colors.textSubtle,
      marginTop: 1,
    },
    fifteenBadge: {
      backgroundColor: colors.primaryLight,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 6,
      alignSelf: 'flex-start',
      marginTop: 4,
    },
    fifteenBadgeText: {
      fontSize: 9,
      fontWeight: '700',
      color: colors.primary,
    },
    previewBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 8,
    },
    removeSongBtn: {
      padding: 6,
    },
    musicSearchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surfaceSubtle,
      borderWidth: 1.5,
      borderColor: colors.cardBorder,
      borderRadius: 12,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    musicInput: {
      flex: 1,
      fontSize: 13,
      color: colors.textDark,
      paddingVertical: 8,
    },
    searchActionBtn: {
      backgroundColor: colors.primary,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
      marginLeft: 6,
    },
    searchActionBtnText: {
      color: '#ffffff',
      fontSize: 12,
      fontWeight: '700',
    },
    popularSongsWrap: {
      marginTop: 8,
    },
    popularLabel: {
      fontSize: 11,
      color: colors.textSubtle,
      fontWeight: '600',
      marginBottom: 6,
    },
    popularPill: {
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
    popularPillText: {
      fontSize: 11,
      color: colors.textDark,
      fontWeight: '500',
    },
    musicLoadingWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 14,
    },
    musicLoadingText: {
      fontSize: 12,
      color: colors.textSubtle,
      fontStyle: 'italic',
    },
    musicResultsList: {
      marginTop: 8,
      backgroundColor: colors.surfaceSubtle,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      padding: 6,
      maxHeight: 220,
    },
    noMusicFound: {
      fontSize: 12,
      color: colors.textSubtle,
      padding: 12,
      textAlign: 'center',
    },
    trackResultItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 6,
      paddingHorizontal: 6,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderSubtle,
    },
    trackThumb: {
      width: 36,
      height: 36,
      borderRadius: 6,
      marginRight: 8,
    },
    trackThumbPlaceholder: {
      width: 36,
      height: 36,
      borderRadius: 6,
      backgroundColor: colors.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 8,
    },
    trackDetails: {
      flex: 1,
    },
    trackTitle: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.textDark,
    },
    trackArtist: {
      fontSize: 10,
      color: colors.textSubtle,
    },
    trackPreviewBtn: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 6,
    },
    trackPreviewBtnActive: {
      backgroundColor: colors.primary,
    },
    trackSelectBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: colors.primary,
      paddingHorizontal: 8,
      paddingVertical: 5,
      borderRadius: 8,
    },
    trackSelectBtnText: {
      fontSize: 11,
      fontWeight: '700',
      color: '#ffffff',
    },

    imageActionButtons: {
      flexDirection: 'row',
      gap: 10,
      marginBottom: 10,
    },
    pickerBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 10,
      borderRadius: 12,
      backgroundColor: colors.primaryLight,
      borderWidth: 1,
      borderColor: colors.primary,
    },
    pickerBtnText: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.primary,
    },
    cameraBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderRadius: 12,
      backgroundColor: colors.surfaceSubtle,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
    },
    cameraBtnText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textDark,
    },
    previewGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 4,
    },
    thumbnailWrapper: {
      width: 72,
      height: 72,
      borderRadius: 10,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: colors.cardBorder,
      position: 'relative',
    },
    thumbnail: {
      width: '100%',
      height: '100%',
    },
    removeImageBadge: {
      position: 'absolute',
      top: 3,
      right: 3,
      backgroundColor: 'rgba(0,0,0,0.7)',
      borderRadius: 10,
      width: 20,
      height: 20,
      alignItems: 'center',
      justifyContent: 'center',
    },
    progressContainer: {
      marginBottom: 14,
    },
    progressHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 4,
    },
    progressTitle: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textSubtle,
    },
    progressPercent: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.primary,
    },
    progressBarTrack: {
      height: 8,
      backgroundColor: colors.surfaceSubtle,
      borderRadius: 4,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: colors.borderSubtle,
    },
    progressBarFill: {
      height: '100%',
      backgroundColor: colors.primary,
      borderRadius: 4,
    },
    submitBtn: {
      backgroundColor: colors.primary,
      borderRadius: 14,
      paddingVertical: 14,
      alignItems: 'center',
      justifyContent: 'center',
      elevation: 3,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      marginTop: 4,
    },
    submitBtnDisabled: {
      opacity: 0.6,
    },
    submitBtnText: {
      fontSize: 15,
      fontWeight: '800',
      color: '#ffffff',
    },
  });
