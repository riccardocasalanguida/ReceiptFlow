import { StatusBar } from "expo-status-bar";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Image,
  Alert,
  ScrollView,
  ActivityIndicator,
  TextInput,
} from "react-native";
import { useState } from "react";
import * as ImagePicker from "expo-image-picker";
import * as Clipboard from "expo-clipboard";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  groupReceiptsByClient,
  calculateClientStats,
  generateClientReport,
} from "./receiptParser";

const GOOGLE_CLOUD_VISION_API_KEY =
  process.env.EXPO_PUBLIC_GOOGLE_CLOUD_VISION_API_KEY;

export default function App() {
  const [image, setImage] = useState(null);
  const [extractedText, setExtractedText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [receipts, setReceipts] = useState([]);
  const [showReceiptsList, setShowReceiptsList] = useState(false);
  const [showReport, setShowReport] = useState(false);

  // Funzione per scattare la foto
  const takePicture = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();

    if (permissionResult.granted === false) {
      Alert.alert(
        "Permesso negato",
        "Devi dare il permesso per usare la fotocamera!"
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: false,
      quality: 0.8,
      base64: true, // IMPORTANTE: serve per Google Vision
    });

    if (!result.canceled) {
      const imageUri = result.assets[0].uri;
      setImage(imageUri);
      setExtractedText("");
      recognizeText(result.assets[0].base64, imageUri);
    }
  };

  // Funzione OCR con Google Cloud Vision
  const recognizeText = async (base64Image, imageUri) => {
    setIsProcessing(true);

    console.log("=== DEBUG OCR ===");
    console.log("1. Funzione recognizeText chiamata");
    console.log(
      "2. API Key presente:",
      GOOGLE_CLOUD_VISION_API_KEY ? "SI" : "NO"
    );
    console.log(
      "3. API Key primi caratteri:",
      GOOGLE_CLOUD_VISION_API_KEY?.substring(0, 10)
    );
    console.log(
      "4. Immagine base64 ricevuta:",
      base64Image ? "SI (lunghezza: " + base64Image.length + ")" : "NO"
    );

    try {
      console.log("5. Invio immagine a Google Vision...");

      const response = await fetch(
        `https://vision.googleapis.com/v1/images:annotate?key=${GOOGLE_CLOUD_VISION_API_KEY}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            requests: [
              {
                image: {
                  content: base64Image,
                },
                features: [
                  {
                    type: "TEXT_DETECTION",
                    maxResults: 1,
                  },
                ],
              },
            ],
          }),
        }
      );

      console.log("6. Risposta ricevuta, status:", response.status);
      const result = await response.json();
      console.log(
        "7. Risposta Google Vision:",
        JSON.stringify(result, null, 2)
      );

      if (result.responses && result.responses[0].textAnnotations) {
        const text = result.responses[0].textAnnotations[0].description;
        setExtractedText(text);
        console.log("7. Testo estratto:", text);

        //Salva lo scontrino nella lista
        const newReceipt = {
          id: Date.now(), // ID univoco basato sul timestamp
          image: imageUri, // URI dell'immagine
          text: text, // Testo estratto
          date: new Date().toLocaleString("it-IT"), // Data e ora
        };

        setReceipts((prevReceipts) => [...prevReceipts, newReceipt]);
        console.log("Scontrino salvato! Totale:", receipts.length + 1);
      } else {
        Alert.alert(
          "Nessun testo trovato",
          "Prova a scattare una foto più nitida"
        );
        setExtractedText("Nessun testo riconosciuto");
      }
    } catch (error) {
      console.error("Errore OCR:", error);
      Alert.alert("Errore", "Impossibile leggere il testo dall'immagine");
    } finally {
      setIsProcessing(false);
    }
  };

  const resetImage = () => {
    setImage(null);
    setExtractedText("");
  };

  const copyToClipboard = async () => {
    await Clipboard.setStringAsync(extractedText);
    Alert.alert("Copiato! ✅", "Il testo è stato copiato negli appunti");
  };

  const copyAllToClipboard = async () => {
    // Genera report con statistiche
    const grouped = groupReceiptsByClient(receipts);
    const stats = calculateClientStats(grouped);
    const report = generateClientReport(stats);

    // Testo completo scontrini
    const allText = receipts
      .map(
        (receipt, index) =>
          `──── SCONTRINO #${index + 1} ────\n${receipt.date}\n\n${
            receipt.text
          }\n\n`
      )
      .join("");

    // Combina report + testo completo
    const fullText = report + "\n\n" + allText;

    await Clipboard.setStringAsync(fullText);
    Alert.alert(
      "Copiato! ✅",
      `Report e testo di ${receipts.length} scontrini copiati negli appunti`
    );
  };

  const copyReportOnly = async () => {
    const grouped = groupReceiptsByClient(receipts);
    const stats = calculateClientStats(grouped);
    const report = generateClientReport(stats);

    await Clipboard.setStringAsync(report);
    Alert.alert("Report Copiato! ✅", "Il report clienti è stato copiato");
  };

  const clearAllReceipts = () => {
    Alert.alert(
      "Conferma",
      `Vuoi cancellare tutti i ${receipts.length} scontrini?`,
      [
        {
          text: "Annulla",
          style: "cancel",
        },
        {
          text: "Cancella",
          style: "destructive",
          onPress: () => {
            setReceipts([]);
            setShowReceiptsList(false);
            Alert.alert(
              "Cancellato! ✅",
              "Tutti gli scontrini sono stati eliminati"
            );
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>ReceiptFlow 📸</Text>
      <Text style={styles.subtitle}>Gestisci i tuoi scontrini facilmente</Text>

      {receipts.length > 0 && !showReceiptsList && (
        <TouchableOpacity
          style={styles.viewAllButton}
          onPress={() => setShowReceiptsList(true)}
        >
          <Text style={styles.viewAllButtonText}>
            📋 Vedi Tutti ({receipts.length})
          </Text>
        </TouchableOpacity>
      )}

      {/* SCHERMATA: Lista Scontrini */}
      {showReceiptsList ? (
        <View style={styles.listContainer}>
          <ScrollView style={styles.scrollView}>
            {/* SEZIONE: Testo Completo di Tutti gli Scontrini */}
            <View style={styles.allTextContainer}>
              {/* Toggle Report / Testo Completo */}
              <View style={styles.toggleButtons}>
                <TouchableOpacity
                  style={[
                    styles.toggleButton,
                    !showReport && styles.toggleButtonActive,
                  ]}
                  onPress={() => setShowReport(false)}
                >
                  <Text
                    style={[
                      styles.toggleButtonText,
                      !showReport && styles.toggleButtonTextActive,
                    ]}
                  >
                    📄 Testo Completo
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.toggleButton,
                    showReport && styles.toggleButtonActive,
                  ]}
                  onPress={() => setShowReport(true)}
                >
                  <Text
                    style={[
                      styles.toggleButtonText,
                      showReport && styles.toggleButtonTextActive,
                    ]}
                  >
                    📊 Report Clienti
                  </Text>
                </TouchableOpacity>
              </View>

              {showReport ? (
                <TextInput
                  style={styles.allTextInput}
                  value={(() => {
                    const grouped = groupReceiptsByClient(receipts);
                    const stats = calculateClientStats(grouped);
                    return generateClientReport(stats);
                  })()}
                  multiline
                  editable={false}
                  selectTextOnFocus={true}
                />
              ) : (
                /* Visualizzazione TESTO COMPLETO */
                <TextInput
                  style={styles.allTextInput}
                  value={receipts
                    .map(
                      (receipt, index) =>
                        `──── SCONTRINO #${index + 1} ────\n${
                          receipt.date
                        }\n\n${receipt.text}\n\n`
                    )
                    .join("")}
                  multiline
                  editable={false}
                  selectTextOnFocus={true}
                />
              )}

              <View style={styles.copyButtonRow}>
                <TouchableOpacity
                  style={styles.copyButton}
                  onPress={showReport ? copyReportOnly : copyAllToClipboard}
                >
                  <Text style={styles.buttonText}>
                    {showReport ? "📊 Copia Report" : "📋 Copia Tutto"}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.clearButton}
                  onPress={() => clearAllReceipts()}
                >
                  <Text style={styles.buttonText}>🗑️ Cancella Tutto</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* SEZIONE: Card Singoli Scontrini */}
            <Text style={styles.sectionTitle}>Dettaglio Scontrini</Text>

            {receipts.map((receipt, index) => (
              <View key={receipt.id} style={styles.receiptCard}>
                <Text style={styles.receiptNumber}>Scontrino #{index + 1}</Text>
                <Text style={styles.receiptDate}>{receipt.date}</Text>
                <Image
                  source={{ uri: receipt.image }}
                  style={styles.thumbnailImage}
                />
                <Text style={styles.receiptPreview} numberOfLines={3}>
                  {receipt.text}
                </Text>
              </View>
            ))}
          </ScrollView>

          <View style={styles.listButtonRow}>
            <TouchableOpacity
              style={styles.buttonSecondary}
              onPress={() => setShowReceiptsList(false)}
            >
              <Text style={styles.buttonText}>← Indietro</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.button}
              onPress={() => {
                setShowReceiptsList(false);
                takePicture();
              }}
            >
              <Text style={styles.buttonText}>➕ Aggiungi</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : !image ? (
        // SCHERMATA: Bottone Scatta
        <TouchableOpacity style={styles.button} onPress={takePicture}>
          <Text style={styles.buttonText}>📸 Scatta Foto</Text>
        </TouchableOpacity>
      ) : (
        // SCHERMATA: Foto Singola
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
        >
          <Image source={{ uri: image }} style={styles.image} />

          {isProcessing && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#007AFF" />
              <Text style={styles.loadingText}>
                Sto leggendo lo scontrino...
              </Text>
            </View>
          )}

          {extractedText !== "" && !isProcessing && (
            <View style={styles.textContainer}>
              <Text style={styles.textTitle}>📝 Testo Estratto:</Text>

              <TextInput
                style={styles.textInput}
                value={extractedText}
                multiline
                editable={false}
                selectTextOnFocus={true}
              />

              <TouchableOpacity
                style={styles.copyButton}
                onPress={copyToClipboard}
              >
                <Text style={styles.buttonText}>📋 Copia Testo</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.buttonSecondary}
              onPress={resetImage}
            >
              <Text style={styles.buttonText}>🗑️ Cancella</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.button} onPress={takePicture}>
              <Text style={styles.buttonText}>➕ Altro Scontrino</Text>
            </TouchableOpacity>
          </View>

          {receipts.length > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                📄 {receipts.length} scontrino{receipts.length > 1 ? "i" : ""}{" "}
                salvat{receipts.length > 1 ? "i" : "o"}
              </Text>
            </View>
          )}
        </ScrollView>
      )}

      <StatusBar style="auto" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    paddingTop: 50,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 10,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    marginBottom: 20,
    textAlign: "center",
  },
  scrollView: {
    flex: 1,
    width: "100%",
  },
  scrollContent: {
    alignItems: "center",
    paddingBottom: 30,
  },
  button: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 10,
    marginHorizontal: 5,
  },
  buttonSecondary: {
    backgroundColor: "#FF3B30",
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 10,
    marginHorizontal: 5,
  },
  buttonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  image: {
    width: 300,
    height: 400,
    borderRadius: 10,
    marginBottom: 20,
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 20,
    marginBottom: 20,
  },
  loadingContainer: {
    alignItems: "center",
    marginVertical: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#666",
  },
  textContainer: {
    width: "100%",
    marginTop: 10,
  },
  textTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 10,
  },
  textBox: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  extractedText: {
    fontSize: 14,
    color: "#333",
    lineHeight: 20,
  },
  textInput: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#ddd",
    fontSize: 14,
    color: "#333",
    lineHeight: 20,
    minHeight: 150,
    maxHeight: 300,
    textAlignVertical: "top",
  },
  copyButton: {
    backgroundColor: "#34C759",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 10,
    alignSelf: "center",
  },
  badge: {
    backgroundColor: "#34C759",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 15,
    alignSelf: "center",
  },
  badgeText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  viewAllButton: {
    backgroundColor: "#5856D6",
    paddingHorizontal: 25,
    paddingVertical: 12,
    borderRadius: 10,
    marginBottom: 20,
  },
  viewAllButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  listContainer: {
    flex: 1,
    width: "100%",
  },
  receiptCard: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  receiptNumber: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 5,
  },
  receiptDate: {
    fontSize: 14,
    color: "#666",
    marginBottom: 10,
  },
  thumbnailImage: {
    width: "100%",
    height: 150,
    borderRadius: 8,
    marginBottom: 10,
  },
  receiptPreview: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
  },
  listButtonRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 20,
    paddingBottom: 25,
    backgroundColor: "#f5f5f5",
  },
  allTextContainer: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  allTextTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 15,
    textAlign: "center",
  },
  allTextInput: {
    backgroundColor: "#f9f9f9",
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    fontSize: 13,
    color: "#333",
    lineHeight: 18,
    minHeight: 200,
    maxHeight: 400,
    textAlignVertical: "top",
    fontFamily: "monospace", // Font monospace per migliore leggibilità
  },
  copyButtonRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 15,
  },
  clearButton: {
    backgroundColor: "#FF3B30",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 15,
    marginTop: 10,
  },
  toggleButtons: {
    flexDirection: "row",
    marginBottom: 15,
    borderRadius: 8,
    backgroundColor: "#f0f0f0",
    padding: 3,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 6,
    alignItems: "center",
  },
  toggleButtonActive: {
    backgroundColor: "#007AFF",
  },
  toggleButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
  },
  toggleButtonTextActive: {
    color: "#fff",
  },
});
