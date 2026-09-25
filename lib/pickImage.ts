import * as ImagePicker from 'expo-image-picker';

export interface PickedImage {
  uri: string;
  base64?: string | null;
  mimeType?: string | null;
}

/** Opens the camera or the library and returns a compressed photo (with base64 for Claude vision). */
export async function pickMealPhoto(source: 'camera' | 'library'): Promise<PickedImage | null> {
  const options: ImagePicker.ImagePickerOptions = {
    mediaTypes: ['images'],
    quality: 0.5,
    base64: true,
    allowsEditing: false,
  };
  let result: ImagePicker.ImagePickerResult;
  if (source === 'camera') {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return null;
    result = await ImagePicker.launchCameraAsync(options);
  } else {
    result = await ImagePicker.launchImageLibraryAsync(options);
  }
  if (result.canceled || !result.assets?.length) return null;
  const a = result.assets[0];
  return { uri: a.uri, base64: a.base64, mimeType: a.mimeType };
}
