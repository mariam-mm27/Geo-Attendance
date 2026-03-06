import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { BarCodeScanner } from "expo-barcode-scanner";

type ScanResult = {
  type: string;
  data: string;
};

export default function ScanQRScreen() {

  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const [qrData, setQrData] = useState("");

  useEffect(() => {
    const getPermission = async () => {
      const { status } = await BarCodeScanner.requestPermissionsAsync();
      setHasPermission(status === "granted");
    };

    getPermission();
  }, []);

  const handleScan = ({ data }: ScanResult) => {
    setScanned(true);
    setQrData(data);
  };

  if (hasPermission === null) {
    return <Text>Requesting camera permission...</Text>;
  }

  if (hasPermission === false) {
    return <Text>No access to camera</Text>;
  }

  return (
    <View style={styles.container}>
      {!scanned ? (
        <BarCodeScanner
          onBarCodeScanned={handleScan}
          style={StyleSheet.absoluteFillObject}
        />
      ) : (
        <View style={styles.result}>
          <Text style={styles.success}>Attendance Scanned ✅</Text>
          <Text>{qrData}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  result: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  success: {
    fontSize: 22,
    fontWeight: "bold",
    color: "green",
  },
});