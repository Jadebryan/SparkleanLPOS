# Expo Image Picker Usage Guide

## Installation ✅
Package installed: `expo-image-picker@~17.0.8`

## Basic Usage

### Import
```typescript
import * as ImagePicker from 'expo-image-picker';
```

### Request Permissions
```typescript
// Request camera roll permissions
const [status, requestPermission] = ImagePicker.useMediaLibraryPermissions();

// Or request camera permissions
const [cameraStatus, requestCameraPermission] = ImagePicker.useCameraPermissions();
```

### Pick Image from Gallery
```typescript
const pickImage = async () => {
  // Request permission first
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  
  if (status !== 'granted') {
    alert('Sorry, we need camera roll permissions!');
    return;
  }

  // Pick image
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    aspect: [4, 3],
    quality: 1,
  });

  if (!result.canceled) {
    console.log(result.assets[0].uri);
    // Use the image URI
  }
};
```

### Take Photo with Camera
```typescript
const takePhoto = async () => {
  // Request permission first
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  
  if (status !== 'granted') {
    alert('Sorry, we need camera permissions!');
    return;
  }

  // Take photo
  const result = await ImagePicker.launchCameraAsync({
    allowsEditing: true,
    aspect: [4, 3],
    quality: 1,
  });

  if (!result.canceled) {
    console.log(result.assets[0].uri);
    // Use the image URI
  }
};
```

## Complete Example Component

```typescript
import React, { useState } from 'react';
import { Button, Image, View, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

export default function ImagePickerExample() {
  const [image, setImage] = useState<string | null>(null);

  const pickImage = async () => {
    // Request permission
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'We need camera roll permissions!');
      return;
    }

    // Pick image
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      {image && (
        <Image source={{ uri: image }} style={{ width: 200, height: 200 }} />
      )}
      <Button title="Pick an image from camera roll" onPress={pickImage} />
    </View>
  );
}
```

## Configuration Options

### launchImageLibraryAsync Options
- `mediaTypes`: `MediaTypeOptions.Images | MediaTypeOptions.Videos | MediaTypeOptions.All`
- `allowsEditing`: `boolean` - Allow user to crop/edit image
- `aspect`: `[number, number]` - Aspect ratio for editing (e.g., `[4, 3]`)
- `quality`: `number` - Image quality (0-1, where 1 is highest)
- `allowsMultipleSelection`: `boolean` - Allow multiple images
- `base64`: `boolean` - Return base64 encoded image

### launchCameraAsync Options
- Same as above, but for camera

## Permissions Setup

### iOS (app.json)
Already configured in your `app.json`:
```json
"ios": {
  "infoPlist": {
    "NSPhotoLibraryUsageDescription": "We need access to your photos to upload images.",
    "NSCameraUsageDescription": "We need access to your camera to take photos."
  }
}
```

### Android (app.json)
Already configured:
```json
"android": {
  "permissions": [
    "CAMERA",
    "READ_EXTERNAL_STORAGE",
    "WRITE_EXTERNAL_STORAGE"
  ]
}
```

## Next Steps

1. **Rebuild the app** if you're using a development build:
   ```bash
   npx expo prebuild
   npx expo run:android
   # or
   npx expo run:ios
   ```

2. **For Expo Go**: Permissions are handled automatically, but you may need to restart the app.

3. **Test the image picker** in your component!

## Common Use Cases

- **Profile Pictures**: Allow users to set profile images
- **Receipt Uploads**: For expense tracking
- **Order Photos**: Attach photos to orders
- **Document Scanning**: Take photos of documents

