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
  const [imageFile, setImageFile] = useState(null);
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

  // Launch gallery picker
  const pickFromGallery = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission Denied', 'Camera roll permission is required to select photos.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.85,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        setImageFile({
          uri: asset.uri,
          name: asset.fileName || 'date-memory.jpg',
          type: asset.mimeType || 'image/jpeg',
        });
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
        setImageFile({
          uri: asset.uri,
          name: asset.fileName || 'camera-capture.jpg',
          type: asset.mimeType || 'image/jpeg',
        });
        setErrorMsg('');
      }
    } catch (err) {
      setErrorMsg('Failed to capture photo with camera');
    }
  };

  const handleRemoveImage = () => {
    setImageFile(null);
  };

  const handleSubmit = async () => {
    setErrorMsg('');
    setSuccessMsg('');

    if (!venue.trim()) {
      setErrorMsg('Please enter a venue or place name.');
      return;
    }

    if (!imageFile) {
      setErrorMsg('Please upload a photo for this date memory.');
      return;
    }

    setIsSubmitting(true);

    try {
      const dateString = selectedDate.toISOString().split('T')[0];
      const formData = new FormData();
      formData.append('venue', venue.trim());
      formData.append('date', dateString);
      formData.append('description', description.trim());

      formData.append('image', {
        uri: imageFile.uri,
        name: imageFile.name || 'photo.jpg',
        type: imageFile.type || 'image/jpeg',
      });

      await postAPI.createPost(formData, token);

      setSuccessMsg('Date memory saved successfully! ♡');
      setVenue('');
      setDescription('');
      setSelectedDate(new Date());
      setImageFile(null);

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
      showsVerticalScrollIndicator={false}
    >
      {/* Top Nav Row */}
      <View style={styles.topNav}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={onNavigateBack}
          activeOpacity={0.7}
        >
          <ArrowLeft size={18} color={colors.textDark} />
        </TouchableOpacity>
        <Text style={styles.navTitle}>New Memory</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Main Deckle Form Card */}
      <View style={styles.card}>
        {/* Paperclip top decoration */}
        <View style={styles.paperclipWrapper}>
          <View style={styles.paperclipInner} />
        </View>

        {/* Washi tape decoration */}
        <View style={styles.washiTape} />

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.iconBadge}>
            <Sparkles size={20} color={colors.primary} />
          </View>
          <Text style={styles.title}>Log a New Date</Text>
          <Text style={styles.subtitle}>
            Record the special details of your time together
          </Text>
        </View>

        {/* Alerts */}
        {errorMsg ? (
          <View style={styles.alertError}>
            <AlertCircle size={18} color={colors.danger} />
            <Text style={styles.alertErrorText}>{errorMsg}</Text>
          </View>
        ) : null}

        {successMsg ? (
          <View style={styles.alertSuccess}>
            <CheckCircle2 size={18} color={colors.success} />
            <Text style={styles.alertSuccessText}>{successMsg}</Text>
          </View>
        ) : null}

        {/* Venue Field */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Venue / Place</Text>
          <View style={styles.inputRow}>
            <MapPin size={18} color={colors.textSubtle} style={styles.inputIcon} />
            <TextInput
              style={styles.textInput}
              placeholder="e.g. Little Italy Cafe, Central Park..."
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
            style={styles.inputRow}
            onPress={() => setShowDatePicker(true)}
            activeOpacity={0.8}
          >
            <CalendarIcon size={18} color={colors.textSubtle} style={styles.inputIcon} />
            <Text style={styles.datePickerText}>{formattedDate}</Text>
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
          <Text style={styles.label}>Description / Memory Notes</Text>
          <View style={[styles.inputRow, styles.textAreaRow]}>
            <FileText
              size={18}
              color={colors.textSubtle}
              style={[styles.inputIcon, { alignSelf: 'flex-start', marginTop: 12 }]}
            />
            <TextInput
              style={[styles.textInput, styles.textArea]}
              placeholder="What made this date unforgettable? Favorite moments, funny talks, food you tried..."
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              value={description}
              onChangeText={setDescription}
            />
          </View>
        </View>

        {/* Photo Upload Field */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Memory Photo</Text>

          {imageFile ? (
            <View style={styles.previewContainer}>
              <Image source={{ uri: imageFile.uri }} style={styles.previewImage} />
              <TouchableOpacity
                style={styles.removeImageBtn}
                onPress={handleRemoveImage}
                activeOpacity={0.8}
              >
                <X size={16} color="#ffffff" />
              </TouchableOpacity>
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
    fontSize: 17,
    fontWeight: '700',
    color: colors.textDark,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    padding: 22,
    paddingTop: 26,
    shadowColor: colors.cardBorder,
    shadowOffset: { width: 3, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
    position: 'relative',
  },
  paperclipWrapper: {
    position: 'absolute',
    top: -12,
    right: 28,
    width: 20,
    height: 42,
    borderRadius: 10,
    borderWidth: 2.5,
    borderColor: colors.antiqueBrass,
    backgroundColor: 'transparent',
    zIndex: 10,
  },
  paperclipInner: {
    position: 'absolute',
    top: 5,
    left: 3,
    width: 10,
    height: 26,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: colors.antiqueBrass,
  },
  washiTape: {
    position: 'absolute',
    top: -8,
    left: '28%',
    width: 85,
    height: 18,
    backgroundColor: colors.washiTape,
    borderRadius: 2,
    transform: [{ rotate: '-2deg' }],
    borderWidth: 1,
    borderColor: 'rgba(216, 190, 155, 0.4)',
    zIndex: 5,
  },
  header: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 20,
  },
  iconBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primaryLight,
    borderWidth: 1.5,
    borderColor: 'rgba(141, 61, 47, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textDark,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textSubtle,
    textAlign: 'center',
  },
  alertError: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.dangerBg,
    borderColor: colors.dangerBorder,
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    gap: 8,
  },
  alertErrorText: {
    color: colors.danger,
    fontSize: 13,
    flex: 1,
  },
  alertSuccess: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.successBg,
    borderColor: colors.successBorder,
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    gap: 8,
  },
  alertSuccessText: {
    color: colors.success,
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  fieldGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMedium,
    marginBottom: 7,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSubtle,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.borderSubtle,
    paddingHorizontal: 12,
    height: 48,
  },
  inputIcon: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    color: colors.textDark,
  },
  datePickerText: {
    fontSize: 14,
    color: colors.textDark,
  },
  textAreaRow: {
    height: 100,
    alignItems: 'flex-start',
    paddingVertical: 4,
  },
  textArea: {
    height: '100%',
    paddingTop: 8,
  },
  uploadOptions: {
    flexDirection: 'row',
    gap: 12,
  },
  uploadOptionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.borderActive,
    borderRadius: 12,
    paddingVertical: 16,
    gap: 8,
  },
  uploadOptionText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  previewContainer: {
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    overflow: 'hidden',
    position: 'relative',
    height: 200,
    backgroundColor: '#000',
  },
  previewImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  removeImageBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitBtn: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  submitBtnDisabled: {
    opacity: 0.65,
  },
  submitBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});

