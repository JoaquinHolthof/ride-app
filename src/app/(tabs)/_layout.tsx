import { Tabs } from 'expo-router/js-tabs';
import { RideTabBar } from '@/components/RideTabBar';
export const unstable_settings = { initialRouteName: '(explore)' };
export default function TabLayout() {
  return <Tabs screenOptions={{ headerShown: false }} tabBar={props => <RideTabBar {...props} />}>
    <Tabs.Screen name="(explore)" options={{ title: 'Explore' }} />
    <Tabs.Screen name="(saved)" options={{ title: 'Saved' }} />
    <Tabs.Screen name="account" options={{ title: 'Account' }} />
  </Tabs>;
}
