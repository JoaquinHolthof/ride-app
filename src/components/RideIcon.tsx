import { SymbolView } from 'expo-symbols';
import { Colors } from '@/constants/theme';
const icons = {
  explore: { ios: 'map', android: 'map', web: 'map' },
  saved: { ios: 'bookmark', android: 'bookmark_border', web: 'bookmark_border' },
  savedFilled: { ios: 'bookmark.fill', android: 'bookmark', web: 'bookmark' },
  account: { ios: 'person.crop.circle', android: 'account_circle', web: 'account_circle' },
} as const;
export function RideIcon({ name, color = Colors.textSecondary }: { name: keyof typeof icons; color?: string }) {
  return <SymbolView name={icons[name]} size={24} tintColor={color} style={{ width: 26, height: 26 }}
    accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" />;
}
