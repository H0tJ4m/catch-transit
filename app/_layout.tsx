import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { colors } from '@/ui/theme';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.bg }}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: colors.bg },
            headerTintColor: colors.text,
            headerTitleStyle: { fontWeight: '700' },
            contentStyle: { backgroundColor: colors.bg },
          }}
        >
          <Stack.Screen name="index" options={{ title: 'Catch Transit' }} />
          <Stack.Screen
            name="play/map"
            options={{ title: 'Live Game', headerBackTitle: 'Quit' }}
          />
          <Stack.Screen
            name="play/summary"
            options={{ title: 'Session Summary', headerBackVisible: false }}
          />
          <Stack.Screen name="station/[id]" options={{ title: 'Station' }} />
          <Stack.Screen name="tag/index" options={{ title: 'Tag' }} />
          <Stack.Screen name="tag/[code]" options={{ title: 'Lobby' }} />
          <Stack.Screen
            name="tag/play/[code]"
            options={{ title: 'Tag', headerBackTitle: 'Quit' }}
          />
          <Stack.Screen
            name="tag/summary/[code]"
            options={{ title: 'Round summary', headerBackVisible: false }}
          />
          <Stack.Screen name="hideseek/index" options={{ title: 'Hide & Seek' }} />
          <Stack.Screen name="hideseek/[code]" options={{ title: 'Lobby' }} />
          <Stack.Screen
            name="hideseek/play/[code]"
            options={{ title: 'Hide & Seek', headerBackTitle: 'Quit' }}
          />
          <Stack.Screen
            name="hideseek/summary/[code]"
            options={{ title: 'Round summary', headerBackVisible: false }}
          />
          <Stack.Screen name="race/index" options={{ title: 'Train Rush' }} />
          <Stack.Screen name="race/[code]" options={{ title: 'Lobby' }} />
          <Stack.Screen
            name="race/play/[code]"
            options={{ title: 'Train Rush', headerBackTitle: 'Quit' }}
          />
          <Stack.Screen
            name="race/summary/[code]"
            options={{ title: 'Round summary', headerBackVisible: false }}
          />
          <Stack.Screen name="settings" options={{ title: 'Settings' }} />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
