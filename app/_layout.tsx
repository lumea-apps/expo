import '../global.css';

import { View } from 'react-native';
import { Slot } from 'expo-router';

import { NavBar } from '~/components/NavBar';

export default function RootLayout() {
  return (
    <View className="flex-1 bg-white dark:bg-black">
      <Slot />
      <NavBar />
    </View>
  );
}
