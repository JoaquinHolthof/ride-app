import * as SecureStore from 'expo-secure-store';
import { createSecureSessionStorage } from './secure-storage';

const options = { keychainService: 'ride.auth', keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY };
export const sessionStorage = createSecureSessionStorage({
  getItem: key => SecureStore.getItemAsync(key, options),
  setItem: (key, value) => SecureStore.setItemAsync(key, value, options),
  removeItem: key => SecureStore.deleteItemAsync(key, options),
});
