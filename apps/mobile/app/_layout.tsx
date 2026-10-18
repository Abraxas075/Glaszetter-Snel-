import { Stack, usePathname } from 'expo-router';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '../src/contexts/AuthContext';
import { BottomNav, sapphirePaths } from '../src/components/BottomNav';
import { ThemeProvider, useAppTheme } from '../src/contexts/ThemeContext';
export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <ThemedApp />
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
function ThemedApp() {
  const { theme, palette: sapphire } = useAppTheme();
  const path = usePathname();
  const themed = sapphirePaths.includes(path) || path.startsWith('/spoed/') || /^\/jobs\/[^/]+\/meetbon$/.test(path);
  const dark = themed && theme === 'dark';
  return (
    <>
      <StatusBar
        style={dark ? 'light' : 'dark'}
        backgroundColor={themed ? sapphire.background : '#FFFFFF'}
      />
      <View style={{ flex: 1, backgroundColor: sapphire.background }}>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: sapphire.background },
          }}
        />
      </View>
      <BottomNav />
    </>
  );
}
