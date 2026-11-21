import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Modal,
  Alert,
  Platform,
  KeyboardAvoidingView,
  LayoutAnimation,
  useWindowDimensions,
} from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  Calendar,
  Music,
  Cd,
  Add,
  Refresh2,
  GalleryAdd,
} from 'iconsax-react-native';
import { CloseIcon } from './CloseIcon';
import { useTheme } from '../context/ThemeContext';
import { postAPI } from '../services/api';
import { toSavedMusic } from '../services/musicService';
import { prepareImageForUpload } from '../services/imageUtils';
import { toLocalDateString } from '../utils/date';
import { haptics } from '../utils/haptics';
import { FadeInView, PressableScale, ProgressBar, staggerDelay } from './motion';
import { HeartRating, ChipSelect, MOOD_OPTIONS, CATEGORY_OPTIONS } from './MemoryFields';
import { MusicSearchModal } from './MusicSearchModal';
import { fonts, shadow } from '../theme/tokens';

const MAX_PHOTOS = 15;

function imagesOf(post) {
  if (post?.images?.length) return post.images;
  return post?.image ? [post.image] : [];
}

/**
 * Bottom sheet for editing a memory: details, rating, mood, kind of date,
 * soundtrack, and adding or removing photos. Calls onSaved(updatedPost).
 */
export function EditMemoryModal({ visible, post, token, onClose, onSaved }) {
  const { colors } = useTheme();
  const { height } = useWindowDimensions();
  const styles = getStyles(colors, height);

  const [venue, setVenue] = useState('');
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [description, setDescription] = useState('');
  const [rating, setRating] = useState(null);
  const [mood, setMood] = useState('');
  const [category, setCategory] = useState('');
  const [song, setSong] = useState(null); // saved-music shape, or null for none
  const [keptPhotos, setKeptPhotos] = useState([]); // URLs already on the memory
  const [newPhotos, setNewPhotos] = useState([]); // local files to upload
  const [isPreparingPhotos, setIsPreparingPhotos] = useState(false);
  const [musicModalVisible, setMusicModalVisible] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadPercent, setUploadPercent] = useState(0);

  // Load the memory into the form each time the sheet opens.
  useEffect(() => {
    if (!visible || !post) return;
    setVenue(post.venue || '');
    setDate(post.date ? new Date(post.date) : new Date());
    setDescription(post.description || '');
    setRating(post.rating ?? null);
    setMood(post.mood || '');
    setCategory(post.category || '');
    setSong(post.music?.audioUrl ? { ...post.music } : null);
    setKeptPhotos(imagesOf(post));
    setNewPhotos([]);
    setUploadPercent(0);
    setShowDatePicker(false);
  }, [visible]);

  const totalPhotos = keptPhotos.length + newPhotos.length;

  const animate = () => LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

  const addPhotos = async () => {
    const remaining = MAX_PHOTOS - totalPhotos;
    if (remaining <= 0) {
      Alert.alert('Photo limit reached', `A memory can hold up to ${MAX_PHOTOS} photos.`);
      return;
    }
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission Denied', 'Photo access is required to add photos.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        selectionLimit: remaining,
        quality: 1,
      });
      if (result.canceled || !result.assets?.length) return;

      setIsPreparingPhotos(true);
      const prepared = await Promise.all(result.assets.map((a, i) => prepareImageForUpload(a, i)));
      animate();
      setNewPhotos((prev) => [...prev, ...prepared].slice(0, remaining + prev.length));
    } catch (err) {
      Alert.alert('Could not add photos', 'Please try again.');
    } finally {
      setIsPreparingPhotos(false);
    }
  };

  const removeKept = (url) => {
    if (totalPhotos <= 1) {
      haptics.error();
      Alert.alert('Keep one photo', 'A memory needs at least one photo. Add another before removing this one.');
      return;
    }
    animate();
    setKeptPhotos((prev) => prev.filter((u) => u !== url));
  };

  const removeNew = (uri) => {
    if (totalPhotos <= 1) {
      haptics.error();
      return;
    }
    animate();
    setNewPhotos((prev) => prev.filter((p) => p.uri !== uri));
  };

  const handleSave = async () => {
    if (!venue.trim()) {
      Alert.alert('Venue Required', 'Please provide a venue name.');
      return;
    }
    if (isPreparingPhotos) return;

    const original = imagesOf(post);
    const removeImages = original.filter((url) => !keptPhotos.includes(url));
    const hadSong = !!post?.music?.audioUrl;

    const fields = {
      venue: venue.trim(),
      date: toLocalDateString(date),
      description: description.trim(),
      mood,
      category,
    };

    setIsSaving(true);
    setUploadPercent(0);
    try {
      let data;
      if (newPhotos.length > 0) {
        // New files have to go up as multipart form data.
        data = new FormData();
        Object.entries(fields).forEach(([k, v]) => data.append(k, v));
        data.append('rating', rating ? String(rating) : '');
        if (removeImages.length > 0) data.append('removeImages', JSON.stringify(removeImages));
        if (song) data.append('music', JSON.stringify(song));
        else if (hadSong) data.append('music', 'null');
        newPhotos.forEach((photo) => data.append('images', photo));
      } else {
        data = { ...fields, rating: rating || null };
        if (removeImages.length > 0) data.removeImages = removeImages;
        if (song) data.music = song;
        else if (hadSong) data.music = null;
      }

      const res = await postAPI.updatePost(post._id, data, token, setUploadPercent);
      haptics.success();
      onSaved(res.post);
      onClose();
    } catch (err) {
      haptics.error();
      Alert.alert('Save Failed', err.message || 'Could not update date memory.');
    } finally {
      setIsSaving(false);
    }
  };

  const close = () => {
    if (!isSaving) onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={close}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={styles.title}>Edit Date Memory</Text>
            <PressableScale onPress={close} style={styles.closeBtn} accessibilityLabel="Close">
              <CloseIcon size={20} color={colors.textDark} />
            </PressableScale>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <FadeInView delay={staggerDelay(1, 40, 50)} style={styles.group}>
              <Text style={styles.label}>Venue</Text>
              <TextInput style={styles.input} value={venue} onChangeText={setVenue} />
            </FadeInView>

            <FadeInView delay={staggerDelay(2, 40, 50)} style={styles.group}>
              <Text style={styles.label}>Date</Text>
              <PressableScale style={styles.dateBtn} onPress={() => setShowDatePicker(true)} haptic="select">
                <Text style={styles.dateText}>
                  {date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                </Text>
                <Calendar size={14} color={colors.primary} />
              </PressableScale>
              {showDatePicker && (
                <DateTimePicker
                  value={date}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  maximumDate={new Date()}
                  onChange={(_, d) => {
                    setShowDatePicker(Platform.OS === 'ios');
                    if (d) setDate(d);
                  }}
                />
              )}
            </FadeInView>

            <FadeInView delay={staggerDelay(3, 40, 50)} style={styles.group}>
              <Text style={styles.label}>How was it?</Text>
              <HeartRating value={rating} onChange={setRating} size={28} />
            </FadeInView>

            <FadeInView delay={staggerDelay(4, 40, 50)} style={styles.group}>
              <Text style={styles.label}>Mood</Text>
              <ChipSelect options={MOOD_OPTIONS} value={mood} onChange={setMood} />
            </FadeInView>

            <FadeInView delay={staggerDelay(5, 40, 50)} style={styles.group}>
              <Text style={styles.label}>Kind of date</Text>
              <ChipSelect options={CATEGORY_OPTIONS} value={category} onChange={setCategory} />
            </FadeInView>

            {/* Photos */}
            <FadeInView delay={staggerDelay(6, 40, 50)} style={styles.group}>
              <Text style={styles.label}>
                Photos ({totalPhotos}/{MAX_PHOTOS})
              </Text>
              <View style={styles.photoGrid}>
                {keptPhotos.map((url) => (
                  <View key={url} style={styles.photoWrap}>
                    <Image source={{ uri: url }} style={styles.photo} contentFit="cover" transition={150} />
                    <PressableScale
                      style={styles.photoRemove}
                      onPress={() => removeKept(url)}
                      scaleTo={0.8}
                      hitSlop={8}
                      accessibilityLabel="Remove photo"
                    >
                      <CloseIcon size={12} color="#ffffff" />
                    </PressableScale>
                  </View>
                ))}
                {newPhotos.map((photo) => (
                  <FadeInView key={photo.uri} from="scale" style={styles.photoWrap}>
                    <Image source={{ uri: photo.uri }} style={styles.photo} contentFit="cover" />
                    <View style={styles.newBadge}>
                      <Text style={styles.newBadgeText}>NEW</Text>
                    </View>
                    <PressableScale
                      style={styles.photoRemove}
                      onPress={() => removeNew(photo.uri)}
                      scaleTo={0.8}
                      hitSlop={8}
                      accessibilityLabel="Remove photo"
                    >
                      <CloseIcon size={12} color="#ffffff" />
                    </PressableScale>
                  </FadeInView>
                ))}
                {totalPhotos < MAX_PHOTOS && (
                  <PressableScale
                    style={[styles.photoWrap, styles.photoAdd]}
                    onPress={addPhotos}
                    disabled={isPreparingPhotos}
                    haptic="select"
                    accessibilityLabel="Add photos"
                  >
                    {isPreparingPhotos ? (
                      <ActivityIndicator size="small" color={colors.primary} />
                    ) : (
                      <GalleryAdd size={22} color={colors.primary} />
                    )}
                  </PressableScale>
                )}
              </View>
            </FadeInView>

            {/* Soundtrack */}
            <FadeInView delay={staggerDelay(7, 40, 50)} style={styles.group}>
              <Text style={styles.label}>Memory Soundtrack</Text>
              {song ? (
                <View style={styles.songCard}>
                  {song.albumCover ? (
                    <Image source={{ uri: song.albumCover }} style={styles.songCover} />
                  ) : (
                    <View style={[styles.songCover, styles.songCoverEmpty]}>
                      <Music size={18} color={colors.primary} />
                    </View>
                  )}
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.songTitle} numberOfLines={1}>
                      {song.title || 'Soundtrack'}
                    </Text>
                    {song.artist ? (
                      <Text style={styles.songArtist} numberOfLines={1}>
                        {song.artist}
                      </Text>
                    ) : null}
                  </View>
                  <PressableScale
                    style={styles.songIconBtn}
                    onPress={() => setMusicModalVisible(true)}
                    accessibilityLabel="Change song"
                  >
                    <Refresh2 size={14} color={colors.primary} />
                  </PressableScale>
                  <PressableScale
                    style={styles.songIconBtn}
                    onPress={() => setSong(null)}
                    accessibilityLabel="Remove song"
                  >
                    <CloseIcon size={16} color={colors.danger} />
                  </PressableScale>
                </View>
              ) : (
                <PressableScale style={styles.addSongBtn} onPress={() => setMusicModalVisible(true)}>
                  <View style={styles.addSongIcon}>
                    <Cd size={18} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.songTitle}>Add a Soundtrack</Text>
                    <Text style={styles.songArtist}>Search and attach 15 seconds of music</Text>
                  </View>
                  <Add size={16} color={colors.primary} />
                </PressableScale>
              )}
            </FadeInView>

            <FadeInView delay={staggerDelay(8, 40, 50)} style={styles.group}>
              <Text style={styles.label}>Journal Notes</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </FadeInView>
          </ScrollView>

          {isSaving && newPhotos.length > 0 ? (
            <View style={styles.progressWrap}>
              <ProgressBar percent={uploadPercent} trackStyle={styles.progressTrack} fillStyle={styles.progressFill} />
            </View>
          ) : null}

          <View style={styles.actions}>
            <PressableScale style={styles.cancelBtn} onPress={close} disabled={isSaving}>
              <Text style={styles.cancelText}>Cancel</Text>
            </PressableScale>
            <PressableScale style={styles.saveBtn} onPress={handleSave} disabled={isSaving} haptic="press">
              {isSaving ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.saveText}>Save Changes</Text>
              )}
            </PressableScale>
          </View>
        </View>
      </KeyboardAvoidingView>

      <MusicSearchModal
        visible={musicModalVisible}
        onClose={() => setMusicModalVisible(false)}
        onSelect={(track) => setSong(toSavedMusic(track))}
      />
    </Modal>
  );
}

const getStyles = (colors, height) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(20, 14, 10, 0.62)',
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 30,
      borderTopRightRadius: 30,
      paddingHorizontal: 20,
      paddingTop: 10,
      paddingBottom: 24,
      maxHeight: height * 0.9,
      ...shadow(3),
    },
    handle: {
      alignSelf: 'center',
      width: 42,
      height: 5,
      borderRadius: 3,
      backgroundColor: colors.borderSubtle,
      marginBottom: 14,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    title: {
      fontSize: 22,
      fontFamily: fonts.display,
      color: colors.textDark,
    },
    closeBtn: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: colors.surfaceSubtle,
      alignItems: 'center',
      justifyContent: 'center',
    },
    group: {
      marginBottom: 16,
    },
    label: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.textDark,
      marginBottom: 8,
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    },
    input: {
      backgroundColor: colors.surfaceSubtle,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      paddingHorizontal: 14,
      paddingVertical: 11,
      fontSize: 14,
      color: colors.textDark,
    },
    textArea: {
      minHeight: 96,
    },
    dateBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.surfaceSubtle,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    dateText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textDark,
    },
    photoGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    photoWrap: {
      width: 76,
      height: 76,
      borderRadius: 14,
    },
    photo: {
      width: '100%',
      height: '100%',
      borderRadius: 14,
      backgroundColor: colors.surfaceSubtle,
    },
    photoRemove: {
      position: 'absolute',
      top: -6,
      right: -6,
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: colors.danger,
      borderWidth: 2,
      borderColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    newBadge: {
      position: 'absolute',
      left: 5,
      bottom: 5,
      backgroundColor: colors.primary,
      borderRadius: 6,
      paddingHorizontal: 5,
      paddingVertical: 1,
    },
    newBadgeText: {
      fontSize: 8,
      fontWeight: '800',
      color: '#ffffff',
      letterSpacing: 0.5,
    },
    photoAdd: {
      borderWidth: 1.5,
      borderStyle: 'dashed',
      borderColor: colors.primary,
      backgroundColor: colors.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    songCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surfaceSubtle,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      padding: 10,
      gap: 4,
    },
    songCover: {
      width: 44,
      height: 44,
      borderRadius: 10,
      backgroundColor: colors.primaryLight,
    },
    songCoverEmpty: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    songTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.textDark,
    },
    songArtist: {
      fontSize: 12,
      color: colors.textSubtle,
      marginTop: 1,
    },
    songIconBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    addSongBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: colors.surfaceSubtle,
      borderRadius: 16,
      borderWidth: 1.5,
      borderStyle: 'dashed',
      borderColor: colors.borderActive,
      padding: 12,
    },
    addSongIcon: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: colors.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    progressWrap: {
      marginTop: 10,
    },
    progressTrack: {
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.surfaceSubtle,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      borderRadius: 3,
      backgroundColor: colors.primary,
    },
    actions: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 14,
    },
    cancelBtn: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 16,
      backgroundColor: colors.surfaceSubtle,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      alignItems: 'center',
    },
    cancelText: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.textDark,
    },
    saveBtn: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 16,
      backgroundColor: colors.primary,
      alignItems: 'center',
      ...shadow(2, colors.primary),
    },
    saveText: {
      fontSize: 13,
      fontWeight: '700',
      color: '#ffffff',
    },
  });
