import { View, Text, Pressable, StyleSheet } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { sapphire } from '../constants/sapphire';
import { MenuIcon, type MenuIconName } from './MenuIcon';
const tabs: { label: string; path: '/' | '/my-jobs' | '/chat' | '/profile'; icon: MenuIconName }[] =
  [
    { label: 'Menu', path: '/', icon: 'grid' },
    { label: 'Klussen', path: '/my-jobs', icon: 'clipboard' },
    { label: 'Chat', path: '/chat', icon: 'message-square' },
    { label: 'Profiel', path: '/profile', icon: 'user' },
  ];
export const sapphirePaths = [
  '/',
  '/my-jobs',
  '/agenda',
  '/kaart',
  '/customers',
  '/chat',
  '/profile',
];
export function BottomNav() {
  const path = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  // Editors keep their original navigation so tabs cannot discard an open form.
  if (!user || !sapphirePaths.includes(path)) return null;
  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      {tabs.map((tab) => {
        const selected = path === tab.path;
        return (
          <Pressable
            key={tab.path}
            accessibilityRole="tab"
            accessibilityLabel={tab.label}
            accessibilityState={{ selected }}
            onPress={() => {
              if (!selected) router.replace(tab.path);
            }}
            style={({ pressed }) => [styles.tab, pressed && { backgroundColor: sapphire.glass }]}
          >
            <MenuIcon name={tab.icon} size={24} active={selected} accent={selected} />
            <Text style={[styles.label, selected && { color: sapphire.blue }]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: sapphire.background,
    borderTopWidth: 1,
    borderTopColor: sapphire.inner,
  },
  tab: {
    flex: 1,
    minHeight: 68,
    paddingTop: 10,
    gap: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { color: sapphire.muted, fontSize: 12 },
});
