import { Tabs } from 'expo-router/tabs';

import { BottomNav } from '@/components/navigation/BottomNav';
import { TopHeader } from '@/components/navigation/TopHeader';

export default function TabsLayout() {
  return (
    <Tabs tabBar={(props) => <BottomNav {...props} />} screenOptions={{ header: () => <TopHeader /> }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="diary" />
      <Tabs.Screen name="recipes" />
      <Tabs.Screen name="evolution" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}
