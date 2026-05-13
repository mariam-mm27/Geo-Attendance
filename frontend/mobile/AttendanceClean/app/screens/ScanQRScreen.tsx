import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { recordAttendance } from "../services/attendanceService";
import { useAuth } from "../context/AuthContext";

type AttendanceStatus = "success" | "already_recorded" | "expired" | "error" | null;

export default function ScanQRScreen({ navigation }: any) {
  const { user } = useAuth();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<AttendanceStatus>(null);
  const [message, setMessage] = useState("");
  const [isCameraActive, setIsCameraActive] = useState(true);

  useEffect(() => {
    if (!permission) {
      requestPermission();
    }
    setIsCameraActive(permission?.granted || false);

    return () => {
      setIsCameraActive(false);
      setScanned(false);
      setStatus(null);
      setMessage("");
    };
  }, [permission]);

  useEffect(() => {
    const unsubscribe = navigation.addListener("beforeRemove", () => {
      setIsCameraActive(false);
      setScanned(false);
    });
    return unsubscribe;
  }, [navigation]);

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    if (scanned) return;

    setScanned(true);
    setLoading(true);

    try {
      // Extract base session ID from dynamic QR (format: SESSION-XXXXX-N)
      const baseSessionId = data.split("-").slice(0, 2).join("-");
      const result = await recordAttendance(baseSessionId);

      if (result.success) {
        setStatus("success");
        setMessage(result.message);
      } else {
        if (result.message === "Already Recorded") {
          setStatus("already_recorded");
        } else if (result.message === "Session Expired") {
          setStatus("expired");
        } else {
          setStatus("error");
        }
        setMessage(result.message);
      }
    } catch (error) {
      console.error("Attendance error:", error);
      setStatus("error");
      setMessage("Failed to record attendance");
    } finally {
      setLoading(false);
    }
  };

  const handleScanAgain = () => {
    setScanned(false);
    setStatus(null);
    setMessage("");
    setIsCameraActive(true);
  };

  const handleGoBack = () => {
    setIsCameraActive(false);
    setScanned(false);
    setStatus(null);
    setMessage("");
    setTimeout(() => navigation.goBack(), 100);
  };

  if (!permission) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.permissionText}>Requesting camera permission...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>No access to camera</Text>
        <Text style={styles.subText}>Please enable camera permissions in settings</Text>
        <TouchableOpacity style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
        <Text style={styles.backButtonText}>← Back</Text>
      </TouchableOpacity>

      {!scanned && isCameraActive ? (
        <>
          <CameraView
            style={StyleSheet.absoluteFillObject}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
            onBarcodeScanned={handleBarCodeScanned}
          />
          <View style={styles.overlay}>
            <View style={styles.scanArea} />
            <Text style={styles.instructionText}>Scan QR Code for Attendance</Text>
          </View>
        </>
      ) : scanned ? (
        <View style={styles.resultContainer}>
          {loading ? (
            <>
              <ActivityIndicator size="large" color="#173B66" />
              <Text style={styles.loadingText}>Verifying attendance...</Text>
            </>
          ) : (
            <>
              {status === "success" && (
                <>
                  <Text style={styles.successIcon}>✔</Text>
                  <Text style={styles.successText}>Attendance Successful</Text>
                  <Text style={styles.subText}>{message}</Text>
                </>
              )}
              {status === "already_recorded" && (
                <>
                  <Text style={styles.warningIcon}>⚠</Text>
                  <Text style={styles.warningText}>Already Recorded</Text>
                  <Text style={styles.subText}>{message}</Text>
                </>
              )}
              {status === "expired" && (
                <>
                  <Text style={styles.errorIcon}>✖</Text>
                  <Text style={styles.errorText}>Session Expired</Text>
                  <Text style={styles.subText}>{message}</Text>
                </>
              )}
              {status === "error" && (
                <>
                  <Text style={styles.errorIcon}>✖</Text>
                  <Text style={styles.errorText}>Error</Text>
                  <Text style={styles.subText}>{message}</Text>
                </>
              )}

              <TouchableOpacity style={styles.scanAgainButton} onPress={handleScanAgain}>
                <Text style={styles.scanAgainText}>Scan Again</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  backButton: {
    position: "absolute",
    top: 50,
    left: 20,
    zIndex: 10,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 8,
  },
  backButtonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  centerContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#F8FAFC", padding: 20 },
  overlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, justifyContent: "center", alignItems: "center" },
  scanArea: { width: 250, height: 250, borderWidth: 2, borderColor: "#fff", borderRadius: 12, backgroundColor: "transparent" },
  instructionText: { marginTop: 30, fontSize: 18, fontWeight: "600", color: "#fff", textAlign: "center", backgroundColor: "rgba(0,0,0,0.6)", paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  resultContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#F8FAFC", padding: 30 },
  loadingText: { marginTop: 20, fontSize: 16, color: "#64748B" },
  successIcon: { fontSize: 80, color: "#10B981", marginBottom: 20 },
  successText: { fontSize: 28, fontWeight: "bold", color: "#10B981", marginBottom: 10 },
  warningIcon: { fontSize: 80, color: "#F59E0B", marginBottom: 20 },
  warningText: { fontSize: 28, fontWeight: "bold", color: "#F59E0B", marginBottom: 10 },
  errorIcon: { fontSize: 80, color: "#EF4444", marginBottom: 20 },
  errorText: { fontSize: 28, fontWeight: "bold", color: "#EF4444", marginBottom: 10 },
  subText: { fontSize: 16, color: "#64748B", textAlign: "center", marginBottom: 30 },
  permissionText: { fontSize: 18, color: "#64748B" },
  button: { backgroundColor: "#173B66", paddingHorizontal: 30, paddingVertical: 12, borderRadius: 8, marginTop: 20 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  scanAgainButton: { backgroundColor: "#173B66", paddingHorizontal: 40, paddingVertical: 15, borderRadius: 10, marginTop: 20 },
  scanAgainText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
});
