import { useState, useEffect } from 'react';
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
  LayoutAnimation,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
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
  Smile,
  Tag,
  Disc,
  Plus,
  RefreshCw,
} from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { haptics } from '../utils/haptics';
import { LinearGradient } from 'expo-linear-gradient';
import {
  FadeInView,
  PressableScale,
  PulseView,
  ShakeView,
  ProgressBar,
  staggerDelay,
} from '../components/motion';
import { fonts, gradients, shadow } from '../theme/tokens';
import { postAPI } from '../services/api';
import { toSavedMusic } from '../services/musicService';
import { prepareImageForUpload, imageStillExists } from '../services/imageUtils';
import { MusicSearchModal } from '../components/MusicSearchModal';
import {
  HeartRating,
  ChipSelect,
  MOOD_OPTIONS,
  CATEGORY_OPTIONS,
} from '../components/MemoryFields';
import { useAudioPreview } from '../hooks/useAudioPreview';
import { toLocalDateString } from '../utils/date';

const DRAFT_STORAGE_KEY = 'date_logger_log_draft';
const MAX_PHOTOS = 15; // matches the server limit

export function LogDateScreen({ onNavigateBack, onLogSaved, initialVenue = '' }) {
  const { token } = useAuth();
  const { colors } = useTheme();

  const [venue, setVenue] = useState(initialVenue);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [description, setDescription] = useState('');
  const [rating, setRating] = useState(null);
  const [mood, setMood] = useState('');
  const [category, setCategory] = useState('');

  const [imageFiles, setImageFiles] = useState([]);
  const [isPreparingPhotos, setIsPreparingPhotos] = useState(false);

  const [musicModalVisible, setMusicModalVisible] = useState(false);
  const [selectedSong, setSelectedSong] = useState(null); // a music search result

  // Preview playback for the attached song
  const songPreview = useAudioPreview();
  const playingPreviewUrl = songPreview.playingKey;
  const stopAudioPreview = songPreview.stop;
  const toggleSongPreview = songPreview.toggle;

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
          if (draft.date) setSelectedDate(new Date(draft.date));
          if (draft.selectedSong) setSelectedSong(draft.selectedSong);
          if (draft.rating) setRating(draft.rating);
          if (draft.mood) setMood(draft.mood);
          if (draft.category) setCategory(draft.category);
          if (Array.isArray(draft.imageFiles) && draft.imageFiles.length > 0) {
            // Picked photos live in the app's cache; keep only the ones still there.
            const checks = await Promise.all(draft.imageFiles.map((img) => imageStillExists(img?.uri)));
            const surviving = draft.imageFiles.filter((_, i) => checks[i]);
            if (surviving.length > 0) setImageFiles(surviving);
          }
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
      if (venue || description || selectedSong || rating || mood || category || imageFiles.length > 0) {
        try {
          const draft = {
            venue,
            description,
            selectedSong,
            rating,
            mood,
            category,
            imageFiles,
            date: selectedDate.toISOString(),
          };
          await AsyncStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
        } catch (e) {}
      }
    }
    const timeout = setTimeout(saveDraft, 800);
    return () => clearTimeout(timeout);
  }, [venue, description, selectedDate, selectedSong, rating, mood, category, imageFiles]);

  const clearDraft = async () => {
    try {
      await AsyncStorage.removeItem(DRAFT_STORAGE_KEY);
    } catch (e) {}
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

  /** Shrinks picked photos before they are attached, so uploads are fast. */
  const addPickedAssets = async (assets) => {
    setIsPreparingPhotos(true);
    try {
      const prepared = await Promise.all(assets.map((asset, idx) => prepareImageForUpload(asset, idx)));
      setImageFiles((prev) => [...prev, ...prepared].slice(0, MAX_PHOTOS));
      setErrorMsg('');
    } finally {
      setIsPreparingPhotos(false);
    }
  };

  // Gallery image selection
  const pickFromGallery = async () => {
    const remaining = MAX_PHOTOS - imageFiles.length;
    if (remaining <= 0) {
      setErrorMsg(`A memory can hold up to ${MAX_PHOTOS} photos.`);
      return;
    }
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission Denied', 'Camera roll permission is required to select photos.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        selectionLimit: remaining,
        quality: 1,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        await addPickedAssets(result.assets);
      }
    } catch (err) {
      setErrorMsg('Failed to select photos from gallery');
    }
  };

  // Camera capture
  const takePhoto = async () => {
    if (imageFiles.length >= MAX_PHOTOS) {
      setErrorMsg(`A memory can hold up to ${MAX_PHOTOS} photos.`);
      return;
    }
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission Denied', 'Camera permission is required to take photos.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 1,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        await addPickedAssets([result.assets[0]]);
      }
    } catch (err) {
      setErrorMsg('Failed to capture photo with camera');
    }
  };

  const handleRemoveImage = (indexToRemove) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setImageFiles((prev) => prev.filter((_, idx) => idx !== indexToRemove));
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

    if (isPreparingPhotos) {
      setErrorMsg('Your photos are still being prepared. Try again in a moment.');
      return;
    }

    setIsSubmitting(true);
    setUploadPercent(0);

    try {
      const dateString = toLocalDateString(selectedDate);
      const formData = new FormData();
      formData.append('venue', venue.trim());
      formData.append('date', dateString);
      formData.append('description', description.trim());

      // Append multiple images
      imageFiles.forEach((img, idx) => {
        formData.append('images', {
          uri: img.uri,
          name: img.name || `photo-${Date.now()}-${idx}.jpg`,
          type: img.type || 'image/jpeg',
        });
      });

      if (rating) formData.append('rating', String(rating));
      if (mood) formData.append('mood', mood);
      if (category) formData.append('category', category);

      // Soundtrack, including the track id so its preview link can be refreshed later
      const music = toSavedMusic(selectedSong);
      if (music) {
        formData.append('music', JSON.stringify(music));
      }

      await postAPI.createPost(formData, token, (percent) => {
        setUploadPercent(percent);
      });

      try {
        haptics.success();
      } catch (e) {}

      setSuccessMsg('Date memory saved successfully! ♡');
      await clearDraft();

      setVenue('');
      setDescription('');
      setSelectedDate(new Date());
      setRating(null);
      setMood('');
      setCategory('');
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
    <View style={{ flex: 1 }}>
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
      <FadeInView distance={30} style={styles.card}>
        <View style={styles.header}>
          <PulseView style={styles.sparkleBadge}>
            <Sparkles size={24} color={colors.primary} />
          </PulseView>
          <Text style={styles.title}>Preserve a Date</Text>
          <Text style={styles.subtitle}>
            Capture the moments, photos & soundtrack of your special time together
          </Text>
        </View>

        {/* Draft Restored Banner */}
        {draftRestored ? (
          <FadeInView from="scale" delay={200} style={styles.draftBox}>
            <Sparkles size={14} color={colors.primary} />
            <Text style={styles.draftText}>Restored your unsaved draft</Text>
          </FadeInView>
        ) : null}

        {/* Feedback Messages */}
        {errorMsg ? (
          <ShakeView trigger={errorMsg}>
            <FadeInView key={errorMsg} from="scale" style={styles.errorBox}>
              <AlertCircle size={16} color={colors.danger} />
              <Text style={styles.errorText}>{errorMsg}</Text>
            </FadeInView>
          </ShakeView>
        ) : null}

        {successMsg ? (
          <FadeInView from="scale" style={styles.successBox}>
            <CheckCircle2 size={16} color={colors.success} />
            <Text style={styles.successText}>{successMsg}</Text>
          </FadeInView>
        ) : null}

        {/* 1. Venue Input */}
        <FadeInView delay={staggerDelay(1, 80, 70)} style={styles.inputGroup}>
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
        </FadeInView>

        {/* 2. Date Picker */}
        <FadeInView delay={staggerDelay(2, 80, 70)} style={styles.inputGroup}>
          <View style={styles.labelRow}>
            <CalendarIcon size={16} color={colors.primary} />
            <Text style={styles.label}>Date of Outing</Text>
            <Text style={styles.required}>*</Text>
          </View>
          <PressableScale
            style={styles.datePickerBtn}
            onPress={() => setShowDatePicker(true)}
            haptic="select"
          >
            <Text style={styles.datePickerText}>{formattedDate}</Text>
            <CalendarIcon size={16} color={colors.textSubtle} />
          </PressableScale>

          {showDatePicker && (
            <DateTimePicker
              value={selectedDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={onDateChange}
              maximumDate={new Date()}
            />
          )}
        </FadeInView>

        {/* 3. Description / Journal Note */}
        <FadeInView delay={staggerDelay(3, 80, 70)} style={styles.inputGroup}>
          <View style={styles.labelRow}>
            <FileText size={16} color={colors.primary} />
            <Text style={styles.label}>Journal Note</Text>
          </View>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="What made this moment unforgettable? The laughter, food, conversations..."
            placeholderTextColor={colors.textMuted}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </FadeInView>

        {/* How it felt: rating, mood, kind of date */}
        <FadeInView delay={staggerDelay(3, 80, 70)} style={styles.inputGroup}>
          <View style={styles.labelRow}>
            <Heart size={16} color={colors.primary} />
            <Text style={styles.label}>How was it?</Text>
          </View>
          <HeartRating value={rating} onChange={setRating} />
        </FadeInView>

        <FadeInView delay={staggerDelay(3, 80, 70)} style={styles.inputGroup}>
          <View style={styles.labelRow}>
            <Smile size={16} color={colors.primary} />
            <Text style={styles.label}>Mood</Text>
          </View>
          <ChipSelect options={MOOD_OPTIONS} value={mood} onChange={setMood} />
        </FadeInView>

        <FadeInView delay={staggerDelay(4, 80, 70)} style={styles.inputGroup}>
          <View style={styles.labelRow}>
            <Tag size={16} color={colors.primary} />
            <Text style={styles.label}>Kind of date</Text>
          </View>
          <ChipSelect options={CATEGORY_OPTIONS} value={category} onChange={setCategory} />
        </FadeInView>

        {/* 4. MEMORY SOUNDTRACK (DEEZER 15s) WITH POP-UP WINDOW */}
        <FadeInView delay={staggerDelay(4, 80, 70)} style={styles.inputGroup}>
          <View style={styles.labelRow}>
            <Disc size={16} color={colors.primary} />
            <Text style={styles.label}>Memory Soundtrack</Text>
          </View>

          {selectedSong ? (
            /* Selected Song Card */
            <FadeInView key={selectedSong.preview} from="scale" style={styles.selectedSongCard}>
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
                style={styles.changeSongBtn}
                onPress={() => {
                  stopAudioPreview();
                  setMusicModalVisible(true);
                }}
                activeOpacity={0.7}
              >
                <RefreshCw size={14} color={colors.primary} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.removeSongBtn}
                onPress={handleRemoveSong}
                activeOpacity={0.7}
              >
                <X size={16} color={colors.danger} />
              </TouchableOpacity>
            </FadeInView>
          ) : (
            /* Button that opens the Deezer Music Pop-up Window */
            <PressableScale
              style={styles.openMusicModalBtn}
              onPress={() => {
                stopAudioPreview();
                setMusicModalVisible(true);
              }}
              scaleTo={0.97}
            >
              <View style={styles.openMusicIconCircle}>
                <Disc size={20} color={colors.primary} />
              </View>
              <View style={styles.openMusicTextWrap}>
                <Text style={styles.openMusicTitle}>Add a Soundtrack</Text>
                <Text style={styles.openMusicSub}>
                  Search songs & attach a 15-second memory preview
                </Text>
              </View>
              <Plus size={18} color={colors.primary} />
            </PressableScale>
          )}
        </FadeInView>

        {/* 5. Photo Uploads */}
        <FadeInView delay={staggerDelay(5, 80, 70)} style={styles.inputGroup}>
          <View style={styles.labelRow}>
            <ImageIcon size={16} color={colors.primary} />
            <Text style={styles.label}>Photo Memories</Text>
            <Text style={styles.required}>*</Text>
          </View>

          {/* Action buttons */}
          <View style={styles.imageActionButtons}>
            <PressableScale
              style={styles.pickerBtn}
              onPress={pickFromGallery}
              haptic="select"
            >
              <ImageIcon size={18} color={colors.primary} />
              <Text style={styles.pickerBtnText}>Choose Gallery Photos</Text>
            </PressableScale>

            <PressableScale
              style={styles.cameraBtn}
              onPress={takePhoto}
              haptic="select"
            >
              <Camera size={18} color={colors.textDark} />
              <Text style={styles.cameraBtnText}>Take Photo</Text>
            </PressableScale>
          </View>

          {isPreparingPhotos ? (
            <FadeInView from="scale" style={styles.preparingRow}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.preparingText}>Preparing photos...</Text>
            </FadeInView>
          ) : null}

          {/* Image Previews Grid */}
          {imageFiles.length > 0 && (
            <View style={styles.previewGrid}>
              {imageFiles.map((item, idx) => (
                <FadeInView
                  key={item.uri}
                  from="scale"
                  delay={Math.min(idx, 6) * 40}
                  style={styles.thumbnailWrapper}
                >
                  <Image source={{ uri: item.uri }} style={styles.thumbnail} />
                  <PressableScale
                    style={styles.removeImageBadge}
                    onPress={() => handleRemoveImage(idx)}
                    scaleTo={0.8}
                    hitSlop={8}
                  >
                    <X size={12} color="#ffffff" />
                  </PressableScale>
                </FadeInView>
              ))}
            </View>
          )}
        </FadeInView>

        {/* Upload Progress Bar */}
        {isSubmitting && (
          <FadeInView from="scale" style={styles.progressContainer}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressTitle}>Saving memory...</Text>
              <Text style={styles.progressPercent}>{uploadPercent}%</Text>
            </View>
            <ProgressBar
              percent={uploadPercent}
              trackStyle={styles.progressBarTrack}
              fillStyle={styles.progressBarFill}
            />
          </FadeInView>
        )}

        {/* Submit Button */}
        <PressableScale
          style={[styles.submitShadow, isSubmitting && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={isSubmitting}
          haptic="press"
        >
          <LinearGradient
            colors={gradients(colors).primary}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.submitBtn}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text style={styles.submitBtnText}>Preserve Memory ♡</Text>
            )}
          </LinearGradient>
        </PressableScale>
      </FadeInView>

      <MusicSearchModal
        visible={musicModalVisible}
        onClose={() => setMusicModalVisible(false)}
        onSelect={(song) => {
          stopAudioPreview();
          setSelectedSong(song);
        }}
      />
    </ScrollView>

      {/* Saved! celebration */}
      {successMsg ? (
        <View pointerEvents="none" style={styles.celebrateOverlay}>
          <FadeInView from="scale" style={styles.celebrateCard}>
            <PulseView style={styles.celebrateHeart} scale={1.15} period={1000}>
              <CheckCircle2 size={38} color="#ffffff" strokeWidth={2.4} />
            </PulseView>
            <Text style={styles.celebrateTitle}>Memory preserved</Text>
            <Text style={styles.celebrateSub}>Added to your journal ♡</Text>
          </FadeInView>
        </View>
      ) : null}
    </View>
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
      borderRadius: 28,
      borderWidth: 1.5,
      borderColor: colors.cardBorder,
      padding: 18,
      ...shadow(2),
    },
    header: {
      alignItems: 'center',
      marginBottom: 16,
    },
    sparkleBadge: {
      width: 54,
      height: 54,
      borderRadius: 27,
      backgroundColor: colors.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 8,
    },
    title: {
      fontSize: 26,
      fontFamily: fonts.displayHeavy,
      fontWeight: 'normal',
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

    // Deezer Music In-Form Trigger
    openMusicModalBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surfaceSubtle,
      borderRadius: 14,
      borderWidth: 1.5,
      borderColor: colors.primary,
      borderStyle: 'dashed',
      padding: 12,
      gap: 10,
    },
    openMusicIconCircle: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: colors.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    openMusicTextWrap: {
      flex: 1,
    },
    openMusicTitle: {
      fontSize: 13,
      fontWeight: '800',
      color: colors.textDark,
    },
    openMusicSub: {
      fontSize: 11,
      color: colors.textSubtle,
      marginTop: 1,
    },

    // Selected Song Card
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
    changeSongBtn: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 6,
    },
    removeSongBtn: {
      padding: 6,
    },

    // POP-UP WINDOW (MODAL) STYLES - CENTERED IN THE MIDDLE

    // Photos
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
    preparingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginTop: 10,
    },
    preparingText: {
      fontSize: 12,
      color: colors.textSubtle,
      fontWeight: '600',
    },
    submitShadow: {
      borderRadius: 18,
      marginTop: 6,
      ...shadow(2, colors.primary),
    },
    submitBtn: {
      borderRadius: 18,
      paddingVertical: 17,
      alignItems: 'center',
      justifyContent: 'center',
    },
    celebrateOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(20, 14, 10, 0.35)',
    },
    celebrateCard: {
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: 28,
      borderWidth: 1.5,
      borderColor: colors.cardBorder,
      paddingVertical: 28,
      paddingHorizontal: 36,
      ...shadow(3),
    },
    celebrateHeart: {
      width: 76,
      height: 76,
      borderRadius: 38,
      backgroundColor: colors.success,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 14,
    },
    celebrateTitle: {
      fontSize: 24,
      fontFamily: fonts.display,
      color: colors.textDark,
    },
    celebrateSub: {
      fontSize: 13,
      color: colors.textSubtle,
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
