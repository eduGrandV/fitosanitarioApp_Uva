import React, { useState, useEffect, useRef } from "react";
import {
  View,
  StyleSheet,
  Modal,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import WebView from "react-native-webview";
import * as Location from "expo-location";

const { height: screenHeight } = Dimensions.get("window");

interface LocationModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (location: Location.LocationObject) => void;
  initialLocation: Location.LocationObject | null;
}

export default function LocationModal({
  visible,
  onClose,
  onConfirm,
  initialLocation,
}: LocationModalProps) {
  const [currentPosition, setCurrentPosition] = useState({
    latitude: -9.2874536,
    longitude: -40.8784941,
  });
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const webviewRef = useRef<WebView>(null);

  // MANTIDO EXATAMENTE COMO ESTAVA
  const ESRI_SAT_TILES = "http://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}";

  // MANTIDO EXATAMENTE COMO ESTAVA
  const MAP_HTML = (lat: number, lon: number) => `
    <!DOCTYPE html>
    <html>
    <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <title>OSM Picker</title>
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <style>
            body { margin: 0; padding: 0; overflow: hidden; height: 100vh; width: 100vw; }
            #map { height: 100%; width: 100%; }
            #center-pin { 
                position: absolute; 
                top: 50%; 
                left: 50%; 
                transform: translate(-50%, -100%); 
                font-size: 30px; 
                color: red; 
                text-shadow: 0 0 5px white;
                z-index: 9999;
            }
        </style>
    </head>
    <body>
        <div id="map"></div>
        <div id="center-pin"></div>
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <script>
            let map = null;
            let initialZoom = 17;
            let currentLat = ${lat};
            let currentLon = ${lon};
            
            function initMap() {
                map = L.map('map', { 
                    zoomControl: false,
                    attributionControl: false,
                    scrollWheelZoom: true,
                }).setView([currentLat, currentLon], initialZoom);

                // 2. ATENÇÃO: USANDO O PROVEDOR DE SATÉLITE DA ESRI
                L.tileLayer('${ESRI_SAT_TILES}', {
                    maxZoom: 20,
                    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, swisstopo, and the GIS User Community'
                }).addTo(map);
                
                map.on('moveend', function() {
                    const center = map.getCenter();
                    window.ReactNativeWebView.postMessage(
                        JSON.stringify({
                            latitude: center.lat,
                            longitude: center.lng,
                            type: 'location_update'
                        })
                    );
                });
                
                map.fire('moveend');
                window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'map_ready' }));
            }
            
            setTimeout(initMap, 100);
        </script>
    </body>
    </html>
  `;

  // MANTIDO EXATAMENTE COMO ESTAVA
  useEffect(() => {
    if (visible && initialLocation) {
      setCurrentPosition({
        latitude: initialLocation.coords.latitude,
        longitude: initialLocation.coords.longitude,
      });
      setIsLoading(false);
      setIsMapLoaded(false);
    } else if (visible && !initialLocation) {
      setIsLoading(false);
    }

    if (visible && !isMapLoaded) {
      const timer = setTimeout(() => {
        setIsMapLoaded(true);
      }, 300);
      return () => clearTimeout(timer);
    }

    if (!visible) {
      setIsMapLoaded(false);
    }
  }, [initialLocation, visible]);

  // MANTIDO EXATAMENTE COMO ESTAVA
  const handleWebViewMessage = (event: any) => {
    const data = JSON.parse(event.nativeEvent.data);

    if (data.type === "map_ready") {
      setIsMapLoaded(true);
    }

    if (data.type === "location_update") {
      setCurrentPosition({
        latitude: data.latitude,
        longitude: data.longitude,
      });
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* HEADER MELHORADO */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={styles.title}>Selecionar Localização no Mapa</Text>
            <Text style={styles.subtitle}>
              Arraste o mapa para posicionar o marcador com precisão
            </Text>
          </View>
        </View>

        {/* MAPA MANTIDO EXATAMENTE COMO ESTAVA */}
        <View style={styles.mapContainer}>
          <WebView
            ref={webviewRef}
            style={styles.map}
            source={{
              html: MAP_HTML(
                currentPosition.latitude,
                currentPosition.longitude
              ),
            }}
            onMessage={handleWebViewMessage}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            startInLoadingState={true}
            renderLoading={() => (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator size="large" color="#1A4D2E" />
                <Text style={styles.loadingText}>Carregando mapa...</Text>
              </View>
            )}
          />

          {/* PINO MANTIDO EXATAMENTE COMO ESTAVA */}
          <View style={styles.markerFixed}>
            <Text style={styles.markerIcon}>📍</Text>
          </View>
        </View>

        {/* FOOTER MELHORADO */}
        <View style={styles.footer}>
          <View style={styles.coordinatesCard}>
            <Text style={styles.coordinatesTitle}>Coordenadas Atuais</Text>
            <View style={styles.coordinatesRow}>
              <View style={styles.coordinateItem}>
                <Text style={styles.coordinateLabel}>Latitude</Text>
                <Text style={styles.coordinateValue}>
                  {currentPosition.latitude.toFixed(7)}
                </Text>
              </View>
              <View style={styles.coordinateSeparator} />
              <View style={styles.coordinateItem}>
                <Text style={styles.coordinateLabel}>Longitude</Text>
                <Text style={styles.coordinateValue}>
                  {currentPosition.longitude.toFixed(7)}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={onClose}
            >
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.button, 
                styles.confirmButton,
                !isMapLoaded && styles.buttonDisabled
              ]}
              onPress={() => {
                const newLocation: Location.LocationObject = {
                  coords: {
                    latitude: currentPosition.latitude,
                    longitude: currentPosition.longitude,
                    altitude: initialLocation?.coords.altitude || 0,
                    accuracy: 5,
                    altitudeAccuracy: 0,
                    heading: 0,
                    speed: 0,
                  },
                  timestamp: Date.now(),
                };
                onConfirm(newLocation);
              }}
              disabled={!isMapLoaded}
            >
              <Text style={styles.confirmButtonText}>
                {isMapLoaded ? "Confirmar Localização" : "Carregando..."}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: "#FFFFFF" 
  },
  header: {
    backgroundColor: "#1A4D2E",
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  headerContent: {
    alignItems: "center",
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "#E5E7EB",
    textAlign: "center",
    opacity: 0.9,
    lineHeight: 18,
  },
  mapContainer: {
    flex: 1,
    position: "relative",
    backgroundColor: "#E8F4F8",
  },
  map: {
    flex: 1,
    width: "100%",
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#1A4D2E",
    fontWeight: "500",
  },
  markerFixed: {
    position: "absolute",
    top: "50%",
    left: "50%",
    marginLeft: -20,
    marginTop: -40,
    zIndex: 9000,
  },
  markerIcon: { 
    fontSize: 40,
  },
  footer: {
    padding: 20,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  coordinatesCard: {
    backgroundColor: "#F8FAFC",
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  coordinatesTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1A4D2E",
    marginBottom: 12,
    textAlign: "center",
  },
  coordinatesRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  coordinateItem: {
    flex: 1,
    alignItems: "center",
  },
  coordinateLabel: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 4,
    fontWeight: "500",
  },
  coordinateValue: {
    fontSize: 14,
    color: "#1A4D2E",
    fontWeight: "bold",
    fontFamily: "monospace",
  },
  coordinateSeparator: {
    width: 1,
    height: 30,
    backgroundColor: "#E5E7EB",
    marginHorizontal: 16,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 12,
  },
  button: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 52,
  },
  cancelButton: {
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#D1D5DB",
  },
  confirmButton: {
    backgroundColor: "#1A4D2E",
    shadowColor: "#1A4D2E",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    backgroundColor: "#9CA3AF",
    opacity: 0.6,
  },
  cancelButtonText: {
    color: "#374151",
    fontSize: 16,
    fontWeight: "600",
  },
  confirmButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});