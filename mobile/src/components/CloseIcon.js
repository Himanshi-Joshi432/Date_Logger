import { Add } from 'iconsax-react-native';

/** Iconsax has no bare "x" glyph, so this is its plus sign turned 45°. */
export function CloseIcon({ style, ...props }) {
  return <Add {...props} style={[{ transform: [{ rotate: '45deg' }] }, style]} />;
}
