import { View } from 'react-native';

import { ScreenContent } from '~/components/ScreenContent';

export default function Home() {
  return (
    <View className="flex-1 p-6">
      <ScreenContent path="app/index.tsx" title="Home" />
    </View>
  );
}
