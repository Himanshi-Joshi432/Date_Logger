import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import {
  Cd,
  Music,
  Play,
  Pause,
  SearchNormal1,
  TickCircle,
} from 'iconsax-react-native';
import { CloseIcon } from './CloseIcon';
import { useTheme } from '../context/ThemeContext';
import { searchDeezerTracks, POPULAR_DATE_SONGS } from '../services/musicService';
import { useAudioPreview } from '../hooks/useAudioPreview';
import { haptics } from '../utils/haptics';
import { FadeInView, PressableScale, PulseView, staggerDelay } from './motion';
import { fonts, shadow } from '../theme/tokens';

/**
 * Pop-up for finding a song and attaching a 15-second preview to a memory.
 * Calls onSelect(song) with a search result, then closes.
 */
export function MusicSearchModal({ visible, onClose, onSelect }) {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const preview = useAudioPreview();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Start fresh each time the pop-up opens.
  useEffect(() => {
    if (visible) {
      setQuery('');
      setResults([]);
      setHasSearched(false);
    } else {
      preview.stop();
    }
  }, [visible]);

  const close = () => {
    preview.stop();
    onClose();
  };

  const search = async (text) => {
    const q = text !== undefined ? text : query;
    if (!q || !q.trim()) return;
    setIsSearching(true);
    setHasSearched(true);
    try {
      setResults(await searchDeezerTracks(q));
    } catch (e) {
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const choose = (track) => {
    haptics.success();
    preview.stop();
    onSelect(track);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={close}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <FadeInView from="scale" style={styles.window}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.headerBadge}>
                <Cd size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>Choose Soundtrack</Text>
                <Text style={styles.subtitle}>Attach 15 seconds of a song to this memory</Text>
              </View>
            </View>
            <PressableScale style={styles.closeBtn} onPress={close} accessibilityLabel="Close">
              <CloseIcon size={20} color={colors.textDark} />
            </PressableScale>
          </View>

          {/* Search bar stays pinned above the keyboard */}
          <View style={styles.searchBar}>
            <SearchNormal1 size={16} color={colors.textSubtle} style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search song or artist..."
              placeholderTextColor={colors.textMuted}
              value={query}
              onChangeText={setQuery}
              onSubmitEditing={() => search()}
              returnKeyType="search"
              autoFocus
            />
            {query ? (
              <PressableScale onPress={() => setQuery('')} style={{ padding: 4 }} haptic={null}>
                <CloseIcon size={15} color={colors.textSubtle} />
              </PressableScale>
            ) : null}
            <PressableScale style={styles.searchBtn} onPress={() => search()}>
              <Text style={styles.searchBtnText}>Search</Text>
            </PressableScale>
          </View>

          {/* Suggestions */}
          <View style={styles.suggestions}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 6 }}
              keyboardShouldPersistTaps="handled"
            >
              {POPULAR_DATE_SONGS.map((name) => (
                <PressableScale
                  key={name}
                  style={styles.suggestionPill}
                  haptic="select"
                  onPress={() => {
                    setQuery(name);
                    search(name);
                  }}
                >
                  <Music size={11} color={colors.primary} />
                  <Text style={styles.suggestionText}>{name}</Text>
                </PressableScale>
              ))}
            </ScrollView>
          </View>

          {/* Results */}
          {isSearching ? (
            <View style={styles.centerBox}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.centerText}>Searching...</Text>
            </View>
          ) : (
            <ScrollView
              style={styles.results}
              contentContainerStyle={{ paddingBottom: 20 }}
              keyboardShouldPersistTaps="handled"
            >
              {results.length > 0 ? (
                results.map((track, index) => {
                  const isPlaying = preview.playingKey === track.preview;
                  return (
                    <FadeInView
                      key={track.id}
                      from="right"
                      distance={14}
                      delay={staggerDelay(index, 0, 40)}
                      style={styles.trackRow}
                    >
                      {track.albumCover ? (
                        <Image source={{ uri: track.albumCover }} style={styles.trackCover} transition={150} />
                      ) : (
                        <View style={[styles.trackCover, styles.trackCoverEmpty]}>
                          <Music size={16} color={colors.primary} />
                        </View>
                      )}

                      <View style={styles.trackText}>
                        <Text style={styles.trackTitle} numberOfLines={1}>
                          {track.title}
                        </Text>
                        <Text style={styles.trackArtist} numberOfLines={1}>
                          {track.artist}
                        </Text>
                      </View>

                      <PressableScale
                        style={[styles.previewBtn, isPlaying && styles.previewBtnActive]}
                        onPress={() => preview.toggle(track.preview)}
                        haptic="select"
                        accessibilityLabel={isPlaying ? 'Stop preview' : 'Play preview'}
                      >
                        {isPlaying ? (
                          <Pause size={14} color="#ffffff" />
                        ) : (
                          <Play size={14} color={colors.primary} />
                        )}
                      </PressableScale>

                      <PressableScale style={styles.addBtn} onPress={() => choose(track)} haptic={null}>
                        <TickCircle size={13} color="#ffffff" />
                        <Text style={styles.addBtnText}>Add</Text>
                      </PressableScale>
                    </FadeInView>
                  );
                })
              ) : hasSearched ? (
                <View style={styles.centerBox}>
                  <Text style={styles.centerText}>
                    No tracks found. Try another song title or artist name.
                  </Text>
                </View>
              ) : (
                <View style={styles.centerBox}>
                  <PulseView>
                    <Cd size={36} color={colors.borderActive} />
                  </PulseView>
                  <Text style={styles.emptyTitle}>Find your soundtrack</Text>
                  <Text style={styles.centerText}>
                    Type any song above or tap one of the suggestions.
                  </Text>
                </View>
              )}
            </ScrollView>
          )}
        </FadeInView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const getStyles = (colors) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(20, 14, 10, 0.62)',
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 20,
    },
    window: {
      width: '100%',
      maxWidth: 440,
      maxHeight: '80%',
      backgroundColor: colors.surface,
      borderRadius: 28,
      borderWidth: 1.5,
      borderColor: colors.cardBorder,
      paddingTop: 18,
      paddingHorizontal: 16,
      paddingBottom: 16,
      ...shadow(3),
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 14,
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      flex: 1,
    },
    headerBadge: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: {
      fontSize: 21,
      fontFamily: fonts.display,
      color: colors.textDark,
    },
    subtitle: {
      fontSize: 11,
      color: colors.textSubtle,
    },
    closeBtn: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: colors.surfaceSubtle,
      alignItems: 'center',
      justifyContent: 'center',
    },
    searchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surfaceSubtle,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      paddingLeft: 12,
      paddingRight: 5,
      paddingVertical: 4,
      marginBottom: 10,
    },
    searchInput: {
      flex: 1,
      fontSize: 14,
      color: colors.textDark,
      paddingVertical: 8,
    },
    searchBtn: {
      backgroundColor: colors.primary,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 9,
      marginLeft: 4,
    },
    searchBtnText: {
      fontSize: 12,
      fontWeight: '700',
      color: '#ffffff',
    },
    suggestions: {
      marginBottom: 10,
    },
    suggestionPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      backgroundColor: colors.primaryLight,
      borderRadius: 14,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    suggestionText: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.primary,
    },
    results: {
      flexGrow: 0,
    },
    centerBox: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 28,
      paddingHorizontal: 16,
      gap: 8,
    },
    centerText: {
      fontSize: 12,
      color: colors.textSubtle,
      textAlign: 'center',
    },
    emptyTitle: {
      fontSize: 17,
      fontFamily: fonts.display,
      color: colors.textDark,
      marginTop: 4,
    },
    trackRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 9,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.borderSubtle,
    },
    trackCover: {
      width: 44,
      height: 44,
      borderRadius: 10,
      backgroundColor: colors.surfaceSubtle,
    },
    trackCoverEmpty: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    trackText: {
      flex: 1,
    },
    trackTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.textDark,
    },
    trackArtist: {
      fontSize: 12,
      color: colors.textSubtle,
      marginTop: 1,
    },
    previewBtn: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: colors.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    previewBtnActive: {
      backgroundColor: colors.primary,
    },
    addBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: colors.primary,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    addBtnText: {
      fontSize: 12,
      fontWeight: '700',
      color: '#ffffff',
    },
  });
