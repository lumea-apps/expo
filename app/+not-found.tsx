import { Link, Stack } from 'expo-router';
import { View } from 'react-native';

import { Aurora } from '@/components/ui/Aurora';
import { Mono, Serif } from '@/components/ui/Typography';
import { colors } from '@/constants/theme';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Oops!' }} />
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          backgroundColor: colors.bg,
        }}>
        <Aurora preset="calm" />
        <Serif size={40} center>
          Questa pagina{' '}
          <Serif size={40} italic color={colors.lime}>
            non esiste
          </Serif>
          .
        </Serif>
        <Link href="/" style={{ marginTop: 20 }}>
          <Mono upper size={12} color={colors.lime}>
            Torna da Nouri →
          </Mono>
        </Link>
      </View>
    </>
  );
}
