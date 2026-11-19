import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { PasswordSecurityStatus } from '../models/forum.models';

/**
 * Evalúa las 6 reglas de seguridad exigidas para contraseñas en el sistema:
 * 1. Longitud mínima de 8 caracteres.
 * 2. Longitud máxima de 20 caracteres.
 * 3. Al menos una letra mayúscula y una minúscula.
 * 4. Al menos un número.
 * 5. Al menos un carácter especial (!@#$%^&*...).
 * 6. Sin espacios en blanco.
 */
export function evaluatePasswordSecurity(value: string | null | undefined): PasswordSecurityStatus {
  const pwd = value ?? '';
  const minLength = pwd.length >= 8;
  const maxLength = pwd.length > 0 && pwd.length <= 20;
  const hasUpperAndLower = /[a-z]/.test(pwd) && /[A-Z]/.test(pwd);
  const hasNumber = /\d/.test(pwd);
  const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(pwd);
  const noSpaces = pwd.length > 0 && !/\s/.test(pwd);

  return {
    minLength,
    maxLength,
    hasUpperAndLower,
    hasNumber,
    hasSpecialChar,
    noSpaces,
    allValid: minLength && maxLength && hasUpperAndLower && hasNumber && hasSpecialChar && noSpaces
  };
}

/**
 * Validador personalizado de Angular para contraseñas seguras (cumple >4 validaciones de seguridad).
 */
export function strongPasswordValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const val = control.value as string;
    if (!val) {
      return null; // Validators.required se encarga de campo vacío
    }
    const status = evaluatePasswordSecurity(val);
    const errors: ValidationErrors = {};

    if (!status.minLength) errors['minLengthRule'] = true;
    if (!status.maxLength) errors['maxLengthRule'] = true;
    if (!status.hasUpperAndLower) errors['upperLowerRule'] = true;
    if (!status.hasNumber) errors['numberRule'] = true;
    if (!status.hasSpecialChar) errors['specialCharRule'] = true;
    if (!status.noSpaces) errors['noSpacesRule'] = true;

    return Object.keys(errors).length > 0 ? errors : null;
  };
}

/**
 * Validador a nivel de FormGroup para confirmar que password y confirmPassword coincidan.
 */
export function passwordMatchValidator(passwordField = 'password', confirmField = 'confirmPassword'): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    const password = group.get(passwordField)?.value;
    const confirm = group.get(confirmField)?.value;
    if (password && confirm && password !== confirm) {
      return { passwordMismatch: true };
    }
    return null;
  };
}
