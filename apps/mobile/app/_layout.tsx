import { Stack, usePathname } from 'expo-router';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '../src/contexts/AuthContext';
import { BottomNav, sapphirePaths } from '../src/components/BottomNav';
import { sapphire } from '../src/constants/sapphire';
export default function RootLayout() {
  const dark = sapphirePaths.includes(usePathname());
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar
          style={dark ? 'light' : 'dark'}
          backgroundColor={dark ? sapphire.background : '#FFFFFF'}
        />
        <View style={{ flex: 1 }}>
          <Stack screenOptions={{ headerShown: false }} />
        </View>
        <BottomNav />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
