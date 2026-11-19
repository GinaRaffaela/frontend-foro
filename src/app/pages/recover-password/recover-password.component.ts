import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { PasswordSecurityStatus } from '../../core/models/forum.models';
import { ForumStoreService } from '../../core/services/forum-store.service';
import {
  evaluatePasswordSecurity,
  passwordMatchValidator,
  strongPasswordValidator
} from '../../core/validators/password.validators';

@Component({
  selector: 'app-recover-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="container py-4 py-lg-5">
      <div class="row justify-content-center">
        <div class="col-12 col-md-10 col-lg-7 col-xl-6">
          <div class="card-forum p-4 p-md-5">
            <div class="mb-4 pb-3 border-bottom d-flex justify-content-between align-items-center">
              <div>
                <span class="badge bg-warning text-dark fw-semibold mb-2">
                  <i class="bi bi-key-fill me-1"></i>Seguridad de Cuenta
                </span>
                <h3 class="fw-bold mb-1">Recuperar Contraseña</h3>
                <p class="text-muted small mb-0">
                  Verifica tu correo registrado y establece una nueva contraseña segura.
                </p>
              </div>
              <a routerLink="/login" class="btn btn-sm btn-outline-secondary rounded-pill">
                <i class="bi bi-arrow-left me-1"></i>Volver
              </a>
            </div>

            <div *ngIf="errorMessage" class="alert alert-danger d-flex align-items-center gap-2" role="alert">
              <i class="bi bi-exclamation-triangle-fill"></i>
              <div>{{ errorMessage }}</div>
            </div>

            <div *ngIf="successMessage" class="alert alert-success" role="alert">
              <div class="d-flex align-items-center gap-2 fw-semibold mb-2">
                <i class="bi bi-check-circle-fill fs-5"></i>
                <span>{{ successMessage }}</span>
              </div>
              <a routerLink="/login" class="btn btn-sm btn-success rounded-pill px-3">
                Ir a Iniciar Sesión ahora
              </a>
            </div>

            <form [formGroup]="recoverForm" (ngSubmit)="onSubmit()" novalidate>
              <!-- Correo registrado -->
              <div class="mb-3">
                <label for="recEmail" class="form-label fw-semibold">Correo Electrónico Registrado *</label>
                <input
                  id="recEmail"
                  type="email"
                  class="form-control"
                  formControlName="email"
                  placeholder="Ej: ana@foro.test"
                  [ngClass]="{
                    'is-invalid': isInvalid('email'),
                    'is-valid': isValid('email')
                  }"
                />
                <div class="invalid-feedback">
                  Ingresa un correo electrónico válido registrado en el foro.
                </div>
                <div class="form-text small">
                  Cuentas demo disponibles: <code>admin&#64;foro.test</code>, <code>ana&#64;foro.test</code>, <code>luis&#64;foro.test</code>
                </div>
              </div>

              <!-- Código de verificación simulado -->
              <div class="mb-3">
                <label for="recCode" class="form-label fw-semibold">Código de Seguridad (6 dígitos) *</label>
                <div class="input-group">
                  <input
                    id="recCode"
                    type="text"
                    maxlength="6"
                    class="form-control"
                    formControlName="verificationCode"
                    placeholder="Ej: 123456"
                    [ngClass]="{
                      'is-invalid': isInvalid('verificationCode'),
                      'is-valid': isValid('verificationCode')
                    }"
                  />
                  <button
                    type="button"
                    class="btn btn-outline-primary"
                    (click)="generateDemoCode()"
                  >
                    <i class="bi bi-send me-1"></i>Generar Código
                  </button>
                  <div class="invalid-feedback">
                    El código de verificación debe contener exactamente 6 dígitos numéricos.
                  </div>
                </div>
              </div>

              <!-- Nueva Contraseña -->
              <div class="mb-3">
                <label for="recNewPwd" class="form-label fw-semibold">Nueva Contraseña *</label>
                <div class="input-group">
                  <input
                    id="recNewPwd"
                    [type]="showPassword ? 'text' : 'password'"
                    class="form-control"
                    formControlName="password"
                    placeholder="Ingresa tu nueva contraseña"
                    [ngClass]="{
                      'is-invalid': isInvalid('password'),
                      'is-valid': isValid('password')
                    }"
                  />
                  <button
                    type="button"
                    class="btn btn-outline-secondary"
                    (click)="showPassword = !showPassword"
                  >
                    <i class="bi" [ngClass]="showPassword ? 'bi-eye-slash' : 'bi-eye'"></i>
                  </button>
                  <div class="invalid-feedback">
                    La nueva contraseña no cumple con todas las validaciones de seguridad.
                  </div>
                </div>
              </div>

              <!-- Confirmar Nueva Contraseña -->
              <div class="mb-3">
                <label for="recConfirmPwd" class="form-label fw-semibold">Confirmar Nueva Contraseña *</label>
                <input
                  id="recConfirmPwd"
                  [type]="showPassword ? 'text' : 'password'"
                  class="form-control"
                  formControlName="confirmPassword"
                  placeholder="Repite la nueva contraseña"
                  [ngClass]="{
                    'is-invalid': isInvalid('confirmPassword') || (recoverForm.errors?.['passwordMismatch'] && (recoverForm.get('confirmPassword')?.touched || submitted)),
                    'is-valid': isValid('confirmPassword') && !recoverForm.errors?.['passwordMismatch']
                  }"
                />
                <div class="invalid-feedback">
                  Las contraseñas deben coincidir exactamente.
                </div>
              </div>

              <!-- Checklist de validaciones de seguridad -->
              <div class="bg-light border rounded-4 p-3 mb-4">
                <h6 class="fw-bold small text-uppercase text-secondary mb-2">
                  <i class="bi bi-shield-check me-1"></i>Validaciones de Seguridad de Contraseña
                </h6>
                <ul class="password-rule-list">
                  <li class="password-rule-item" [ngClass]="pwdStatus.minLength ? 'rule-ok' : 'rule-pending'">
                    <i class="bi" [ngClass]="pwdStatus.minLength ? 'bi-check-circle-fill' : 'bi-circle'"></i>
                    <span>Mínimo 8 caracteres de longitud</span>
                  </li>
                  <li class="password-rule-item" [ngClass]="pwdStatus.maxLength ? 'rule-ok' : 'rule-pending'">
                    <i class="bi" [ngClass]="pwdStatus.maxLength ? 'bi-check-circle-fill' : 'bi-circle'"></i>
                    <span>Máximo 20 caracteres de longitud</span>
                  </li>
                  <li class="password-rule-item" [ngClass]="pwdStatus.hasUpperAndLower ? 'rule-ok' : 'rule-pending'">
                    <i class="bi" [ngClass]="pwdStatus.hasUpperAndLower ? 'bi-check-circle-fill' : 'bi-circle'"></i>
                    <span>Combinación de letras mayúsculas y minúsculas</span>
                  </li>
                  <li class="password-rule-item" [ngClass]="pwdStatus.hasNumber ? 'rule-ok' : 'rule-pending'">
                    <i class="bi" [ngClass]="pwdStatus.hasNumber ? 'bi-check-circle-fill' : 'bi-circle'"></i>
                    <span>Al menos un número (0-9)</span>
                  </li>
                  <li class="password-rule-item" [ngClass]="pwdStatus.hasSpecialChar ? 'rule-ok' : 'rule-pending'">
                    <i class="bi" [ngClass]="pwdStatus.hasSpecialChar ? 'bi-check-circle-fill' : 'bi-circle'"></i>
                    <span>Al menos un carácter especial (!&#64;#$%^&amp;*...)</span>
                  </li>
                  <li class="password-rule-item" [ngClass]="pwdStatus.noSpaces ? 'rule-ok' : 'rule-pending'">
                    <i class="bi" [ngClass]="pwdStatus.noSpaces ? 'bi-check-circle-fill' : 'bi-circle'"></i>
                    <span>Sin espacios en blanco</span>
                  </li>
                </ul>
              </div>

              <button type="submit" class="btn btn-primary w-100 py-2 fw-semibold rounded-3">
                <i class="bi bi-check2-circle me-2"></i>Restablecer Contraseña
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  `
})
export class RecoverPasswordComponent {
  private readonly fb = inject(FormBuilder);
  private readonly store = inject(ForumStoreService);

  showPassword = false;
  submitted = false;
  errorMessage = '';
  successMessage = '';

  readonly recoverForm = this.fb.nonNullable.group(
    {
      email: [
        '',
        [Validators.required, Validators.email, Validators.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/)]
      ],
      verificationCode: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
      password: ['', [Validators.required, strongPasswordValidator()]],
      confirmPassword: ['', [Validators.required]]
    },
    { validators: passwordMatchValidator('password', 'confirmPassword') }
  );

  get pwdStatus(): PasswordSecurityStatus {
    return evaluatePasswordSecurity(this.recoverForm.get('password')?.value);
  }

  generateDemoCode(): void {
    const randomSix = Math.floor(100000 + Math.random() * 900000).toString();
    this.recoverForm.patchValue({ verificationCode: randomSix });
    this.recoverForm.get('verificationCode')?.markAsTouched();
  }

  isInvalid(field: string): boolean {
    const control = this.recoverForm.get(field);
    return !!(control && control.invalid && (control.dirty || control.touched || this.submitted));
  }

  isValid(field: string): boolean {
    const control = this.recoverForm.get(field);
    return !!(control && control.valid && (control.dirty || control.touched));
  }

  onSubmit(): void {
    this.submitted = true;
    this.errorMessage = '';
    this.successMessage = '';

    if (this.recoverForm.invalid) {
      this.recoverForm.markAllAsTouched();
      return;
    }

    const { email, password } = this.recoverForm.getRawValue();
    const res = this.store.recoverPassword(email, password);
    if (!res.ok) {
      this.errorMessage = res.message;
      return;
    }

    this.successMessage = res.message;
  }
}
