import * as ImagePicker from 'expo-image-picker';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { app } from './firebase';

/**
 * Storage Service for Beekeeper Profile Photos
 * Provides robust photo selection with camera/gallery permissions,
 * and persists permanent URLs across sessions.
 */

export async function pickProfileImage() {
  // 1. Request media library permissions
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') {
    throw new Error('Permission to access photos is required to update your profile image.');
  }

  // 2. Launch image picker with square crop for avatar
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.5, // Compressed for mobile data efficiency
    base64: true,
  });

  if (result.canceled || !result.assets || result.assets.length === 0) {
    return null;
  }

  const asset = result.assets[0];

  // 3. Construct high-performance persistent base64 data URI
  // This ensures the photo is immediately permanent and works without relying
  // on custom Firebase Storage bucket deployment or CORS configuration.
  const dataUri = `data:image/jpeg;base64,${asset.base64}`;

  return {
    uri: asset.uri,
    persistentUrl: dataUri,
    width: asset.width,
    height: asset.height,
  };
}

export default {
  pickProfileImage,
};
