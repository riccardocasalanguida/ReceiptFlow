import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, TouchableOpacity, Image, Alert } from 'react-native';
import { useState } from 'react';
import * as ImagePicker from 'expo-image-picker';

export default function App() {
  // State per memorizzare l'immagine scattata
  const [image, setImage] = useState(null);

  // Funzione per scattare la foto
  const takePicture = async () => {
    // 1. Chiedi il permesso per usare la fotocamera
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    
    if (permissionResult.granted === false) {
      Alert.alert('Permesso negato', 'Devi dare il permesso per usare la fotocamera!');
      return;
    }

    // 2. Apri la fotocamera
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: false,
      quality: 0.8, // Qualità immagine (0-1)
    });

    // 3. Se l'utente ha scattato una foto (non ha annullato)
    if (!result.canceled) {
      setImage(result.assets[0].uri);
      console.log('Foto scattata:', result.assets[0].uri);
    }
  };

  // Funzione per resettare (cancellare la foto)
  const resetImage = () => {
    setImage(null);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>ReceiptFlow 📸</Text>
      <Text style={styles.subtitle}>Gestisci i tuoi scontrini facilmente</Text>
      
      {/* Mostra l'immagine SE esiste */}
      {image ? (
        <View style={styles.imageContainer}>
          <Image source={{ uri: image }} style={styles.image} />
          
          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.buttonSecondary} onPress={resetImage}>
              <Text style={styles.buttonText}>🗑️ Cancella</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.button} onPress={takePicture}>
              <Text style={styles.buttonText}>📸 Nuova Foto</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        // Altrimenti mostra il bottone per scattare
        <TouchableOpacity style={styles.button} onPress={takePicture}>
          <Text style={styles.buttonText}>📸 Scatta Foto</Text>
        </TouchableOpacity>
      )}
      
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 40,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 10,
    marginHorizontal: 5,
  },
  buttonSecondary: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 10,
    marginHorizontal: 5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  imageContainer: {
    width: '100%',
    alignItems: 'center',
  },
  image: {
    width: 300,
    height: 400,
    borderRadius: 10,
    marginBottom: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
});