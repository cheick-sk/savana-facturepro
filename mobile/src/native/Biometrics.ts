import { Platform, Alert } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';

type BiometricType = 'fingerprint' | 'facial' | 'none';

class BiometricsService {
  private isAvailable: boolean = false;
  private biometricType: BiometricType = 'none';

  async checkAvailability(): Promise<{
    available: boolean;
    type: BiometricType;
    enrolled: boolean;
  }> {
    try {
      // Check if device supports biometrics
      const compatible = await LocalAuthentication.hasHardwareAsync();
      
      if (!compatible) {
        this.isAvailable = false;
        this.biometricType = 'none';
        return { available: false, type: 'none', enrolled: false };
      }

      // Check what type of biometrics
      const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
      
      if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
        this.biometricType = 'facial';
      } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
        this.biometricType = 'fingerprint';
      }

      // Check if user has enrolled biometrics
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      
      this.isAvailable = enrolled;
      
      return {
        available: enrolled,
        type: this.biometricType,
        enrolled,
      };
    } catch (error) {
      console.error('Biometrics check error:', error);
      return { available: false, type: 'none', enrolled: false };
    }
  }

  async authenticate(promptMessage?: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    if (!this.isAvailable) {
      const check = await this.checkAvailability();
      if (!check.available) {
        return {
          success: false,
          error: 'Biometrics not available on this device',
        };
      }
    }

    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: promptMessage || 'Authenticate to continue',
        fallbackLabel: 'Use passcode',
        cancelLabel: 'Cancel',
        disableDeviceFallback: false,
      });

      if (result.success) {
        return { success: true };
      }

      return {
        success: false,
        error: result.error || 'Authentication failed',
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Authentication error',
      };
    }
  }

  getBiometricType(): BiometricType {
    return this.biometricType;
  }

  getBiometricIcon(): string {
    switch (this.biometricType) {
      case 'fingerprint':
        return '📱'; // Use fingerprint icon
      case 'facial':
        return '😊'; // Use face icon
      default:
        return '🔒';
    }
  }

  getBiometricName(): string {
    switch (this.biometricType) {
      case 'fingerprint':
        return Platform.OS === 'ios' ? 'Touch ID' : 'Fingerprint';
      case 'facial':
        return Platform.OS === 'ios' ? 'Face ID' : 'Face Recognition';
      default:
        return 'Biometric';
    }
  }
}

export const biometrics = new BiometricsService();

// Hook for biometric authentication
import { useState, useEffect } from 'react';

export function useBiometrics() {
  const [isAvailable, setIsAvailable] = useState(false);
  const [biometricType, setBiometricType] = useState<BiometricType>('none');
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  useEffect(() => {
    checkAvailability();
  }, []);

  const checkAvailability = async () => {
    const result = await biometrics.checkAvailability();
    setIsAvailable(result.available);
    setBiometricType(result.type);
  };

  const authenticate = async (promptMessage?: string) => {
    setIsAuthenticating(true);
    try {
      const result = await biometrics.authenticate(promptMessage);
      return result;
    } finally {
      setIsAuthenticating(false);
    }
  };

  return {
    isAvailable,
    biometricType,
    isAuthenticating,
    authenticate,
    biometricName: biometrics.getBiometricName(),
  };
}
