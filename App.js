import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, TouchableOpacity, Image, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';


const GOOGLE_CLOUD_VISION_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_CLOUD_VISION_API_KEY;




export default function App() {
  const [image, setImage] = useState(null);
  const [extractedText, setExtractedText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Funzione per scattare la foto
  const takePicture = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    
    if (permissionResult.granted === false) {
      Alert.alert('Permesso negato', 'Devi dare il permesso per usare la fotocamera!');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: false,
      quality: 0.8,
      base64: true, // IMPORTANTE: serve per Google Vision
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
      setExtractedText('');
      recognizeText(result.assets[0].base64);
    }
  };

  // Funzione OCR con Google Cloud Vision
  const recognizeText = async (base64Image) => {
    setIsProcessing(true);
    
    console.log('=== DEBUG OCR ===');
    console.log('1. Funzione recognizeText chiamata');
    console.log('2. API Key presente:', GOOGLE_CLOUD_VISION_API_KEY ? 'SI' : 'NO');
    console.log('3. API Key primi caratteri:', GOOGLE_CLOUD_VISION_API_KEY?.substring(0, 10));
    console.log('4. Immagine base64 ricevuta:', base64Image ? 'SI (lunghezza: ' + base64Image.length + ')' : 'NO');


    try {
    console.log('5. Invio immagine a Google Vision...');
    
    const response = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${GOOGLE_CLOUD_VISION_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requests: [
            {
              image: {
                content: base64Image,
              },
              features: [
                {
                  type: 'TEXT_DETECTION',
                  maxResults: 1,
                },
              ],
            },
          ],
        }),
      }
    );

    console.log('6. Risposta ricevuta, status:', response.status);
    const result = await response.json();
    console.log('7. Risposta Google Vision:', JSON.stringify(result, null, 2));



      // Estrae il testo dalla risposta
      if (result.responses && result.responses[0].textAnnotations) {
        const text = result.responses[0].textAnnotations[0].description;
        setExtractedText(text);
        console.log('Testo estratto:', text);
      } else {
        Alert.alert('Nessun testo trovato', 'Prova a scattare una foto più nitida');
        setExtractedText('Nessun testo riconosciuto');
      }

    } catch (error) {
      console.error('Errore OCR:', error);
      Alert.alert('Errore', 'Impossibile leggere il testo dall\'immagine');
    } finally {
      setIsProcessing(false);
    }
  };

  const resetImage = () => {
    setImage(null);
    setExtractedText('');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>ReceiptFlow 📸</Text>
      <Text style={styles.subtitle}>Gestisci i tuoi scontrini facilmente</Text>
      
      {!image ? (
        <TouchableOpacity style={styles.button} onPress={takePicture}>
          <Text style={styles.buttonText}>📸 Scatta Foto</Text>
        </TouchableOpacity>
      ) : (
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          <Image source={{ uri: image }} style={styles.image} />
          
          {isProcessing && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#007AFF" />
              <Text style={styles.loadingText}>Sto leggendo lo scontrino...</Text>
            </View>
          )}
          
          {extractedText !== '' && !isProcessing && (
            <View style={styles.textContainer}>
              <Text style={styles.textTitle}>📝 Testo Estratto:</Text>
              <View style={styles.textBox}>
                <Text style={styles.extractedText}>{extractedText}</Text>
              </View>
            </View>
          )}
          
          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.buttonSecondary} onPress={resetImage}>
              <Text style={styles.buttonText}>🗑️ Cancella</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.button} onPress={takePicture}>
              <Text style={styles.buttonText}>📸 Nuova Foto</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}
      
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingTop: 50,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
    width: '100%',
  },
  scrollContent: {
    alignItems: 'center',
    paddingBottom: 30,
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
  image: {
    width: 300,
    height: 400,
    borderRadius: 10,
    marginBottom: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  loadingContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  textContainer: {
    width: '100%',
    marginTop: 10,
  },
  textTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  textBox: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  extractedText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
});