import * as ImagePicker from 'expo-image-picker';
import type { PickedPhoto } from '../api/photos';

const toPickedPhoto = (asset: ImagePicker.ImagePickerAsset): PickedPhoto => ({
  uri: asset.uri,
  fileName: asset.fileName ?? `photo-${Date.now()}.jpg`,
  mimeType: asset.mimeType ?? 'image/jpeg',
});

export const pickPhotoFromLibrary = async (): Promise<PickedPhoto | null> => {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) return null;

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 0.7,
  });

  if (result.canceled || result.assets.length === 0) return null;
  return toPickedPhoto(result.assets[0]);
};

export const takePhotoWithCamera = async (): Promise<PickedPhoto | null> => {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) return null;

  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 0.7,
  });

  if (result.canceled || result.assets.length === 0) return null;
  return toPickedPhoto(result.assets[0]);
};
