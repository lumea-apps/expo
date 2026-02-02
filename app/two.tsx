import { View } from 'react-native';

import { ScreenContent } from '~/components/ScreenContent';

export default function Two() {
  return (
    <View className="flex-1 p-6">
      <ScreenContent path="app/two.tsx" title="Two" />
    </View>
  );
}
