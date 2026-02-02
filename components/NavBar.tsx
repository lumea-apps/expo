import { View, Pressable } from 'react-native';
import { usePathname, router } from 'expo-router';
import { Home, Layout } from 'lucide-react-native';

type NavItem = {
  name: string;
  href: '/' | '/two';
  icon: typeof Home;
};

const navItems: NavItem[] = [
  { name: 'Home', href: '/', icon: Home },
  { name: 'Two', href: '/two', icon: Layout },
];

export function NavBar() {
  const pathname = usePathname();

  return (
    <View className="absolute bottom-0 left-0 right-0 pb-8 px-6">
      <View className="flex-row items-center justify-center gap-2 bg-black/90 rounded-full px-4 py-3 shadow-lg">
        {navItems.map((item) => {
          const isActive = pathname === item.href ||
            (item.href === '/' && pathname === '/index');
          const Icon = item.icon;

          return (
            <Pressable
              key={item.href}
              onPress={() => router.push(item.href)}
              className={`flex-row items-center px-4 py-2 rounded-full ${
                isActive ? 'bg-white' : ''
              }`}
            >
              <Icon
                size={20}
                color={isActive ? '#000' : '#fff'}
                strokeWidth={2}
              />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
