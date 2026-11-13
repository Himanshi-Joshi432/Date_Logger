import { View, Text, StyleSheet } from 'react-native';
import { Heart } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { FadeInView, PressableScale } from './motion';

export const MOOD_OPTIONS = ['Romantic', 'Fun', 'Cozy', 'Adventurous', 'Relaxed', 'Fancy'];
export const CATEGORY_OPTIONS = ['Dinner', 'Cafe', 'Movie', 'Outdoors', 'Travel', 'At Home', 'Activity'];

/** Five tappable hearts. Tapping the current rating again clears it. */
export function HeartRating({ value, onChange, size = 30 }) {
  const { colors } = useTheme();
  const rating = value || 0;

  return (
    <View style={styles.heartsRow} accessibilityRole="adjustable" accessibilityLabel={`Rating: ${rating} of 5 hearts`}>
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = n <= rating;
        return (
          <PressableScale
            key={n}
            onPress={() => onChange(n === rating ? null : n)}
            haptic="select"
            scaleTo={0.75}
            hitSlop={6}
            style={styles.heartBtn}
            accessibilityLabel={`${n} ${n === 1 ? 'heart' : 'hearts'}`}
          >
            <FadeInView key={filled ? 'on' : 'off'} from="scale">
              <Heart
                size={size}
                color={filled ? colors.primary : colors.borderActive}
                fill={filled ? colors.primary : 'transparent'}
                strokeWidth={1.8}
              />
            </FadeInView>
          </PressableScale>
        );
      })}
      <Text style={[styles.heartsLabel, { color: colors.textSubtle }]}>
        {rating ? `${rating} / 5` : 'Tap to rate'}
      </Text>
    </View>
  );
}

/** A wrapping row of pills where one (or none) is selected. */
export function ChipSelect({ options, value, onChange }) {
  const { colors } = useTheme();
  // Keep a custom value saved by another client visible and selectable.
  const all = value && !options.includes(value) ? [value, ...options] : options;

  return (
    <View style={styles.chipsRow}>
      {all.map((option) => {
        const selected = option === value;
        return (
          <PressableScale
            key={option}
            onPress={() => onChange(selected ? '' : option)}
            haptic="select"
            scaleTo={0.92}
            style={[
              styles.chip,
              {
                backgroundColor: selected ? colors.primary : colors.surfaceSubtle,
                borderColor: selected ? colors.primary : colors.borderSubtle,
              },
            ]}
            accessibilityRole="button"
            accessibilityState={{ selected }}
          >
            <Text style={[styles.chipText, { color: selected ? '#ffffff' : colors.textMedium }]}>
              {option}
            </Text>
          </PressableScale>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  heartsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heartBtn: {
    padding: 2,
  },
  heartsLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 8,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
