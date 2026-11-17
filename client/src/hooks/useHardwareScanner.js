import { useEffect, useRef, useState, useCallback } from 'react';
import { playKeyTick } from '../utils/audio';

/**
 * Custom hook for capturing USB Hardware Tap Card / RFID / Barcode Scanner input.
 * USB readers emulate HID keyboards, sending rapid characters followed by 'Enter'.
 *
 * @param {Function} onScan - Callback when a full card UID is received
 * @param {Object} options - Configuration options
 */
export function useHardwareScanner(onScan, options = {}) {
  const {
    minChars = 3,
    maxTimeBetweenKeys = 250, // ms between keystrokes for hardware reader
    enabled = true,
    soundTick = true
  } = options;

  const [lastScannedUid, setLastScannedUid] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [hardwareDetected, setHardwareDetected] = useState(true);

  const bufferRef = useRef('');
  const lastKeyTimeRef = useRef(0);
  const isScanningTimeoutRef = useRef(null);

  const triggerScan = useCallback((uid) => {
    const cleanUid = uid.trim();
    if (cleanUid.length >= minChars) {
      setLastScannedUid(cleanUid);
      if (typeof onScan === 'function') {
        onScan(cleanUid);
      }
    }
  }, [minChars, onScan]);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e) => {
      // Ignore if user is currently interacting with an input/textarea UNLESS it has data-scanner-active="true"
      const target = e.target;
      const isInput = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
      const isScannerInput = target && target.getAttribute('data-scanner-input') === 'true';

      // If user is typing in a standard form input (e.g. search box), don't intercept unless it's designated
      if (isInput && !isScannerInput) {
        return;
      }

      const currentTime = Date.now();
      const timeDiff = currentTime - lastKeyTimeRef.current;
      lastKeyTimeRef.current = currentTime;

      // Handle Enter (end of card reader stream)
      if (e.key === 'Enter') {
        const buffered = bufferRef.current;
        bufferRef.current = '';

        if (buffered.length >= minChars) {
          e.preventDefault();
          e.stopPropagation();
          triggerScan(buffered);
        }
        return;
      }

      // Ignore non-character keys (Shift, Ctrl, Alt, Meta, CapsLock, Tab, etc.)
      if (e.key.length !== 1) {
        return;
      }

      // If time between keystrokes is too long (> maxTimeBetweenKeys), clear buffer and start fresh
      if (timeDiff > maxTimeBetweenKeys) {
        bufferRef.current = '';
      }

      // Append character to buffer
      bufferRef.current += e.key;

      if (soundTick) {
        playKeyTick();
      }

      // Visual flash indicator
      setIsScanning(true);
      if (isScanningTimeoutRef.current) {
        clearTimeout(isScanningTimeoutRef.current);
      }
      isScanningTimeoutRef.current = setTimeout(() => {
        setIsScanning(false);
      }, 400);
    };

    window.addEventListener('keydown', handleKeyDown, true);

    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      if (isScanningTimeoutRef.current) {
        clearTimeout(isScanningTimeoutRef.current);
      }
    };
  }, [enabled, maxTimeBetweenKeys, minChars, soundTick, triggerScan]);

  return {
    lastScannedUid,
    isScanning,
    hardwareDetected,
    manualScan: triggerScan
  };
}
