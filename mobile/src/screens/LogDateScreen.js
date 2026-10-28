import React, { useState } from 'react';
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
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import {
  MapPin,
  Calendar as CalendarIcon,
  FileText,
  UploadCloud,
  X,
  ArrowLeft,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Camera,
  Image as ImageIcon,
  Plus,
} from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { postAPI } from '../services/api';
import { colors } from '../theme/colors';

export function LogDateScreen({ onNavigateBack, onLogSaved }) {
  const { token } = useAuth();

  const [venue, setVenue] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [description, setDescription] = useState('');
  const [imageFiles, setImageFiles] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Handle Date picker change
  const onDateChange = (event, date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (date) {
      setSelectedDate(date);
    }
  };

  // Launch gallery picker with multiple selection
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
        quality: 0.85,
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
      setErrorMsg('Failed to select photo from gallery');
    }
  };

  // Launch camera
  const takePhoto = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission Denied', 'Camera permission is required to take photos.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.85,
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

    try {
      const dateString = selectedDate.toISOString().split('T')[0];
      const formData = new FormData();
      formData.append('venue', venue.trim());
      formData.append('date', dateString);
      formData.append('description', description.trim());

      // Append multiple images
      imageFiles.forEach((img) => {
        formData.append('images', {
          uri: img.uri,
          name: img.name || 'photo.jpg',
          type: img.type || 'image/jpeg',
        });
      });

      // Backward compatible primary image
      if (imageFiles[0]) {
        formData.append('image', {
          uri: imageFiles[0].uri,
          name: imageFiles[0].name || 'photo.jpg',
          type: imageFiles[0].type || 'image/jpeg',
        });
      }

      await postAPI.createPost(formData, token);

      setSuccessMsg('Date memory saved successfully! ♡');
      setVenue('');
      setDescription('');
      setSelectedDate(new Date());
      setImageFiles([]);

      if (onLogSaved) {
        setTimeout(() => {
          onLogSaved();
        }, 1200);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to save date. Check your connection.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formattedDate = selectedDate.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

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
          <Text style={styles.title}>Document a Moment</Text>
          <Text style={styles.subtitle}>
            Preserve multiple photos and notes of your favorite times
          </Text>
        </View>

        {/* Feedback Alerts */}
        {errorMsg ? (
          <View style={styles.alertError}>
            <AlertCircle size={16} color={colors.danger} />
            <Text style={styles.alertErrorText}>{errorMsg}</Text>
          </View>
        ) : null}

        {successMsg ? (
          <View style={styles.alertSuccess}>
            <CheckCircle2 size={16} color={colors.success} />
            <Text style={styles.alertSuccessText}>{successMsg}</Text>
          </View>
        ) : null}

        {/* Venue Field */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Venue / Place</Text>
          <View style={styles.inputWrap}>
            <MapPin size={18} color={colors.primary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="e.g. Skyline Rooftop Cafe"
              placeholderTextColor={colors.textMuted}
              value={venue}
              onChangeText={setVenue}
            />
          </View>
        </View>

        {/* Date Field */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Date</Text>
          <TouchableOpacity
            style={styles.inputWrap}
            onPress={() => setShowDatePicker(true)}
            activeOpacity={0.7}
          >
            <CalendarIcon size={18} color={colors.primary} style={styles.inputIcon} />
            <Text style={styles.dateValueText}>{formattedDate}</Text>
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

        {/* Description Field */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Description / Notes</Text>
          <View style={[styles.inputWrap, styles.textAreaWrap]}>
            <FileText
              size={18}
              color={colors.primary}
              style={[styles.inputIcon, { marginTop: 4 }]}
            />
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="What made this date special? Favorite food, funny moments..."
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              value={description}
              onChangeText={setDescription}
            />
          </View>
        </View>

        {/* Multiple Photos Upload Field */}
        <View style={styles.fieldGroup}>
          <View style={styles.labelRow}>
            <Text style={styles.label}>Memory Photos ({imageFiles.length})</Text>
            {imageFiles.length > 0 && (
              <TouchableOpacity onPress={() => setImageFiles([])}>
                <Text style={styles.clearAllText}>Clear all</Text>
              </TouchableOpacity>
            )}
          </View>

          {imageFiles.length > 0 ? (
            <View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.previewsRow}
              >
                {imageFiles.map((img, idx) => (
                  <View key={idx} style={styles.previewThumbWrap}>
                    <Image source={{ uri: img.uri }} style={styles.previewThumb} />
                    <TouchableOpacity
                      style={styles.removeImageBtn}
                      onPress={() => handleRemoveImage(idx)}
                      activeOpacity={0.8}
                    >
                      <X size={12} color="#ffffff" />
                    </TouchableOpacity>
                    {idx === 0 && (
                      <View style={styles.coverBadge}>
                        <Text style={styles.coverBadgeText}>Cover</Text>
                      </View>
                    )}
                  </View>
                ))}

                {/* Add more button */}
                <TouchableOpacity
                  style={styles.addMoreBtn}
                  onPress={pickFromGallery}
                  activeOpacity={0.8}
                >
                  <Plus size={20} color={colors.primary} />
                  <Text style={styles.addMoreText}>Add</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          ) : (
            <View style={styles.uploadOptions}>
              <TouchableOpacity
                style={styles.uploadOptionBtn}
                onPress={pickFromGallery}
                activeOpacity={0.8}
              >
                <ImageIcon size={22} color={colors.primary} />
                <Text style={styles.uploadOptionText}>Photo Gallery</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.uploadOptionBtn}
                onPress={takePhoto}
                activeOpacity={0.8}
              >
                <Camera size={22} color={colors.primary} />
                <Text style={styles.uploadOptionText}>Take Photo</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitBtn, isSubmitting && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={isSubmitting}
          activeOpacity={0.85}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <>
              <UploadCloud size={20} color="#ffffff" style={{ marginRight: 8 }} />
              <Text style={styles.submitBtnText}>Save Date Memory</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scrollContent: {
    padding: 18,
    paddingTop: 10,
    paddingBottom: 40,
  },
  topNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
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
  card: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.cardBorder,
    borderRadius: 20,
    padding: 20,
    shadowColor: colors.cardBorder,
    shadowOffset: { width: 3, height: 5 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  header: {
    alignItems: 'center',
    marginBottom: 18,
  },
  sparkleBadge: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.primaryLight,
    borderWidth: 1.5,
    borderColor: 'rgba(141, 61, 47, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textDark,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12.5,
    color: colors.textSubtle,
    textAlign: 'center',
    lineHeight: 17,
  },
  alertError: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff5f4',
    borderWidth: 1,
    borderColor: 'rgba(156, 46, 36, 0.3)',
    borderRadius: 8,
    padding: 10,
    marginBottom: 14,
    gap: 8,
  },
  alertErrorText: {
    flex: 1,
    fontSize: 12.5,
    color: colors.danger,
    fontWeight: '500',
  },
  alertSuccess: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f2f7f3',
    borderWidth: 1,
    borderColor: 'rgba(55, 99, 66, 0.3)',
    borderRadius: 8,
    padding: 10,
    marginBottom: 14,
    gap: 8,
  },
  alertSuccessText: {
    flex: 1,
    fontSize: 12.5,
    color: colors.success,
    fontWeight: '600',
  },
  fieldGroup: {
    marginBottom: 16,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textDark,
    marginBottom: 6,
  },
  clearAllText: {
    fontSize: 11.5,
    color: colors.danger,
    textDecorationLine: 'underline',
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fdfbf7',
    borderWidth: 1.5,
    borderColor: colors.borderSubtle,
    borderRadius: 12,
    paddingHorizontal: 12,
    minHeight: 46,
  },
  textAreaWrap: {
    alignItems: 'flex-start',
    paddingVertical: 10,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: colors.textDark,
    padding: 0,
  },
  textArea: {
    height: 72,
  },
  dateValueText: {
    fontSize: 14,
    color: colors.textDark,
    fontWeight: '500',
  },
  uploadOptions: {
    flexDirection: 'row',
    gap: 10,
  },
  uploadOptionBtn: {
    flex: 1,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1.5,
    borderColor: colors.borderActive,
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  uploadOptionText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: colors.primary,
  },
  previewsRow: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 4,
  },
  previewThumbWrap: {
    width: 80,
    height: 80,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.borderSubtle,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#f7f2eb',
  },
  previewThumb: {
    width: '100%',
    height: '100%',
  },
  removeImageBtn: {
    position: 'absolute',
    top: 3,
    right: 3,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(38, 31, 24, 0.82)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverBadge: {
    position: 'absolute',
    bottom: 3,
    left: 3,
    backgroundColor: colors.primary,
    paddingVertical: 1,
    paddingHorizontal: 4,
    borderRadius: 3,
  },
  coverBadgeText: {
    color: '#ffffff',
    fontSize: 8,
    fontWeight: '700',
  },
  addMoreBtn: {
    width: 80,
    height: 80,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderStyle: 'dashed',
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  addMoreText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 6,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  submitBtnDisabled: {
    opacity: 0.7,
  },
  submitBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
});
