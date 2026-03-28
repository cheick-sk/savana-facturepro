/**
 * Validation result type
 */
export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Email validation
 */
export const validateEmail = (email: string): ValidationResult => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!email) {
    return { isValid: false, error: 'L\'adresse email est requise' };
  }
  
  if (!emailRegex.test(email)) {
    return { isValid: false, error: 'Adresse email invalide' };
  }
  
  return { isValid: true };
};

/**
 * Password validation
 */
export const validatePassword = (password: string): ValidationResult => {
  if (!password) {
    return { isValid: false, error: 'Le mot de passe est requis' };
  }
  
  if (password.length < 8) {
    return { isValid: false, error: 'Le mot de passe doit contenir au moins 8 caractères' };
  }
  
  if (!/[A-Z]/.test(password)) {
    return { isValid: false, error: 'Le mot de passe doit contenir au moins une majuscule' };
  }
  
  if (!/[a-z]/.test(password)) {
    return { isValid: false, error: 'Le mot de passe doit contenir au moins une minuscule' };
  }
  
  if (!/[0-9]/.test(password)) {
    return { isValid: false, error: 'Le mot de passe doit contenir au moins un chiffre' };
  }
  
  return { isValid: true };
};

/**
 * Phone number validation (African formats)
 */
export const validatePhoneNumber = (phone: string): ValidationResult => {
  const cleanPhone = phone.replace(/\D/g, '');
  
  if (!cleanPhone) {
    return { isValid: false, error: 'Le numéro de téléphone est requis' };
  }
  
  // African phone numbers typically 8-12 digits
  if (cleanPhone.length < 8 || cleanPhone.length > 15) {
    return { isValid: false, error: 'Numéro de téléphone invalide' };
  }
  
  return { isValid: true };
};

/**
 * Name validation
 */
export const validateName = (name: string): ValidationResult => {
  if (!name || !name.trim()) {
    return { isValid: false, error: 'Le nom est requis' };
  }
  
  if (name.length < 2) {
    return { isValid: false, error: 'Le nom doit contenir au moins 2 caractères' };
  }
  
  if (name.length > 100) {
    return { isValid: false, error: 'Le nom est trop long' };
  }
  
  return { isValid: true };
};

/**
 * Required field validation
 */
export const validateRequired = (value: any, fieldName: string): ValidationResult => {
  if (value === null || value === undefined || value === '') {
    return { isValid: false, error: `${fieldName} est requis` };
  }
  
  if (Array.isArray(value) && value.length === 0) {
    return { isValid: false, error: `${fieldName} est requis` };
  }
  
  return { isValid: true };
};

/**
 * Number validation
 */
export const validateNumber = (
  value: string | number,
  options?: {
    min?: number;
    max?: number;
    integer?: boolean;
    required?: boolean;
  }
): ValidationResult => {
  const { min, max, integer = false, required = true } = options || {};
  
  if (value === '' || value === null || value === undefined) {
    if (required) {
      return { isValid: false, error: 'Ce champ est requis' };
    }
    return { isValid: true };
  }
  
  const num = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(num)) {
    return { isValid: false, error: 'Veuillez entrer un nombre valide' };
  }
  
  if (integer && !Number.isInteger(num)) {
    return { isValid: false, error: 'Veuillez entrer un nombre entier' };
  }
  
  if (min !== undefined && num < min) {
    return { isValid: false, error: `La valeur minimum est ${min}` };
  }
  
  if (max !== undefined && num > max) {
    return { isValid: false, error: `La valeur maximum est ${max}` };
  }
  
  return { isValid: true };
};

/**
 * Price validation
 */
export const validatePrice = (price: string | number): ValidationResult => {
  return validateNumber(price, {
    min: 0,
    required: true,
  });
};

/**
 * Quantity validation
 */
export const validateQuantity = (quantity: string | number): ValidationResult => {
  return validateNumber(quantity, {
    min: 1,
    integer: true,
    required: true,
  });
};

/**
 * Date validation
 */
export const validateDate = (date: string | Date): ValidationResult => {
  if (!date) {
    return { isValid: false, error: 'La date est requise' };
  }
  
  const d = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(d.getTime())) {
    return { isValid: false, error: 'Date invalide' };
  }
  
  return { isValid: true };
};

/**
 * Future date validation
 */
export const validateFutureDate = (date: string | Date): ValidationResult => {
  const dateResult = validateDate(date);
  if (!dateResult.isValid) return dateResult;
  
  const d = typeof date === 'string' ? new Date(date) : date;
  
  if (d <= new Date()) {
    return { isValid: false, error: 'La date doit être dans le futur' };
  }
  
  return { isValid: true };
};

/**
 * Form validation helper
 */
export const validateForm = <T extends Record<string, any>>(
  values: T,
  rules: Partial<Record<keyof T, (value: any) => ValidationResult>>
): { isValid: boolean; errors: Partial<Record<keyof T, string>> } => {
  const errors: Partial<Record<keyof T, string>> = {};
  let isValid = true;
  
  for (const field in rules) {
    const validator = rules[field];
    if (validator) {
      const result = validator(values[field]);
      if (!result.isValid) {
        errors[field] = result.error;
        isValid = false;
      }
    }
  }
  
  return { isValid, errors };
};

export default {
  validateEmail,
  validatePassword,
  validatePhoneNumber,
  validateName,
  validateRequired,
  validateNumber,
  validatePrice,
  validateQuantity,
  validateDate,
  validateFutureDate,
  validateForm,
};
