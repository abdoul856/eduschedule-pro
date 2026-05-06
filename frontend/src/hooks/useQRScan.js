// src/hooks/useQRScan.js
import { useState, useEffect, useRef } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";

/**
 * Hook personnalisé pour le scan QR-Code
 * @param {string} elementId — ID de l'élément HTML du scanner
 * @param {function} onScan — callback appelé quand un QR est scanné
 */
export function useQRScan(elementId = "qr-reader", onScan = null) {
  const [scanning, setScanning]   = useState(false);
  const [erreur, setErreur]       = useState(null);
  const [resultat, setResultat]   = useState(null);
  const scannerRef                = useRef(null);

  const demarrer = () => {
    if (scannerRef.current) return;

    const scanner = new Html5QrcodeScanner(elementId, {
      fps:                    10,
      qrbox:                  { width: 250, height: 250 },
      rememberLastUsedCamera: true,
    });

    scanner.render(
      (decodedText) => {
        setResultat(decodedText);
        setScanning(false);
        if (onScan) onScan(decodedText);
        scanner.clear().catch(() => {});
        scannerRef.current = null;
      },
      (error) => {
        console.warn("QR scan error:", error);
      }
    );

    scannerRef.current = scanner;
    setScanning(true);
    setErreur(null);
  };

  const arreter = () => {
    if (scannerRef.current) {
      scannerRef.current.clear().catch(() => {});
      scannerRef.current = null;
    }
    setScanning(false);
  };

  const reinitialiser = () => {
    arreter();
    setResultat(null);
    setErreur(null);
  };

  // Nettoyer au démontage
  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(() => {});
      }
    };
  }, []);

  return {
    scanning,
    erreur,
    resultat,
    demarrer,
    arreter,
    reinitialiser,
  };
}