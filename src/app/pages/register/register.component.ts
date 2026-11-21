import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { PasswordSecurityStatus } from '../../core/models/forum.models';
import { ForumStoreService } from '../../core/services/forum-store.service';
import {
  evaluatePasswordSecurity,
  passwordMatchValidator,
  strongPasswordValidator
} from '../../core/validators/password.validators';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="container py-4 py-lg-5">
      <div class="row justify-content-center">
        <div class="col-12 col-md-11 col-lg-9 col-xl-8">
          <div class="card-forum p-4 p-md-5">
            <div class="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 pb-3 border-bottom">
              <div>
                <span class="badge bg-primary bg-opacity-10 text-primary fw-semibold mb-2">
                  Nuevo Miembro de la Comunidad
                </span>
                <h2 class="fw-bold mb-1">Registro de Usuario</h2>
                <p class="text-muted small mb-0">
                  Completa todos los campos requeridos. Tu cuenta será añadida inmediatamente a la colección de usuarios.
                </p>
              </div>
              <a routerLink="/login" class="btn btn-sm btn-outline-secondary rounded-pill mt-3 mt-md-0">
                <i class="bi bi-arrow-left me-1"></i>Ya tengo cuenta
              </a>
            </div>

            <div *ngIf="errorMessage" class="alert alert-danger d-flex align-items-center gap-2" role="alert">
              <i class="bi bi-exclamation-octagon-fill"></i>
              <div>{{ errorMessage }}</div>
            </div>

            <form [formGroup]="registerForm" (ngSubmit)="onSubmit()" novalidate>
              <div class="row g-3">
                <!-- Nombre visible / Nickname -->
                <div class="col-12 col-md-6">
                  <label for="regName" class="form-label fw-semibold">Nombre Visible / Nickname *</label>
                  <input
                    id="regName"
                    type="text"
                    class="form-control"
                    formControlName="displayName"
                    placeholder="Ej: Carolina Vega"
                    [ngClass]="{
                      'is-invalid': isInvalid('displayName'),
                      'is-valid': isValid('displayName')
                    }"
                  />
                  <div class="invalid-feedback">
                    <span *ngIf="registerForm.get('displayName')?.errors?.['required']">El nombre es obligatorio.</span>
                    <span *ngIf="registerForm.get('displayName')?.errors?.['minlength']">Debe tener al menos 3 caracteres.</span>
                    <span *ngIf="registerForm.get('displayName')?.errors?.['maxlength']">No puede superar los 60 caracteres.</span>
                    <span *ngIf="registerForm.get('displayName')?.errors?.['pattern']">
                      Solo se permiten letras, números y espacios.
                    </span>
                  </div>
                </div>

                <!-- Correo electrónico -->
                <div class="col-12 col-md-6">
                  <label for="regEmail" class="form-label fw-semibold">Correo Electrónico *</label>
                  <input
                    id="regEmail"
                    type="email"
                    class="form-control"
                    formControlName="email"
                    placeholder="carolina@duoc.cl"
                    [ngClass]="{
                      'is-invalid': isInvalid('email'),
                      'is-valid': isValid('email')
                    }"
                  />
                  <div class="invalid-feedback">
                    <span *ngIf="registerForm.get('email')?.errors?.['required']">El correo electrónico es obligatorio.</span>
                    <span *ngIf="registerForm.get('email')?.errors?.['email'] || registerForm.get('email')?.errors?.['pattern']">
                      Ingresa un correo electrónico válido (ej: nombre&#64;dominio.cl).
                    </span>
                  </div>
                </div>

                <!-- Categoría Favorita -->
                <div class="col-12 col-md-6">
                  <label for="regCategory" class="form-label fw-semibold">Categoría de Interés Principal *</label>
                  <select
                    id="regCategory"
                    class="form-select"
                    formControlName="favoriteCategoryId"
                    [ngClass]="{
                      'is-invalid': isInvalid('favoriteCategoryId'),
                      'is-valid': isValid('favoriteCategoryId')
                    }"
                  >
                    <option *ngFor="let cat of categories$ | async" [value]="cat.id">
                      {{ cat.name }}
                    </option>
                  </select>
                </div>

                <!-- Biografía corta -->
                <div class="col-12 col-md-6">
                  <label for="regBio" class="form-label fw-semibold">Presentación / Biografía *</label>
                  <input
                    id="regBio"
                    type="text"
                    class="form-control"
                    formControlName="bio"
                    placeholder="Ej: Estudiante de Ingeniería en Informática..."
                    [ngClass]="{
                      'is-invalid': isInvalid('bio'),
                      'is-valid': isValid('bio')
                    }"
                  />
                  <div class="invalid-feedback">
                    Escribe una breve presentación (entre 10 y 160 caracteres).
                  </div>
                </div>

                <!-- Contraseña con validaciones de seguridad -->
                <div class="col-12 col-md-6">
                  <label for="regPassword" class="form-label fw-semibold">Contraseña Segura *</label>
                  <div class="input-group">
                    <input
                      id="regPassword"
                      [type]="showPassword ? 'text' : 'password'"
                      class="form-control"
                      formControlName="password"
                      placeholder="Mínimo 8 caracteres"
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
                      La contraseña debe cumplir todas las validaciones de seguridad listadas abajo.
                    </div>
                  </div>
                </div>

                <!-- Confirmar Contraseña -->
                <div class="col-12 col-md-6">
                  <label for="regConfirm" class="form-label fw-semibold">Confirmar Contraseña *</label>
                  <input
                    id="regConfirm"
                    [type]="showPassword ? 'text' : 'password'"
                    class="form-control"
                    formControlName="confirmPassword"
                    placeholder="Repite tu contraseña"
                    [ngClass]="{
                      'is-invalid': isInvalid('confirmPassword') || (registerForm.errors?.['passwordMismatch'] && (registerForm.get('confirmPassword')?.touched || submitted)),
                      'is-valid': isValid('confirmPassword') && !registerForm.errors?.['passwordMismatch']
                    }"
                  />
                  <div class="invalid-feedback">
                    <span *ngIf="registerForm.get('confirmPassword')?.errors?.['required']">Debes confirmar tu contraseña.</span>
                    <span *ngIf="registerForm.errors?.['passwordMismatch']">Las contraseñas no coinciden.</span>
                  </div>
                </div>

                <!-- Panel interactivo de las 6 validaciones de seguridad de contraseña -->
                <div class="col-12">
                  <div class="bg-light border rounded-4 p-3">
                    <h6 class="fw-bold small text-uppercase text-secondary mb-2">
                      <i class="bi bi-shield-lock me-1"></i>Requisitos de Seguridad de la Contraseña (6 Validaciones)
                    </h6>
                    <div class="row g-2">
                      <div class="col-12 col-sm-6">
                        <div class="password-rule-item" [ngClass]="pwdStatus.minLength ? 'rule-ok' : 'rule-pending'">
                          <i class="bi" [ngClass]="pwdStatus.minLength ? 'bi-check-circle-fill' : 'bi-circle'"></i>
                          <span>1. Longitud mínima de 8 caracteres</span>
                        </div>
                        <div class="password-rule-item" [ngClass]="pwdStatus.maxLength ? 'rule-ok' : 'rule-pending'">
                          <i class="bi" [ngClass]="pwdStatus.maxLength ? 'bi-check-circle-fill' : 'bi-circle'"></i>
                          <span>2. Longitud máxima de 20 caracteres</span>
                        </div>
                        <div class="password-rule-item" [ngClass]="pwdStatus.hasUpperAndLower ? 'rule-ok' : 'rule-pending'">
                          <i class="bi" [ngClass]="pwdStatus.hasUpperAndLower ? 'bi-check-circle-fill' : 'bi-circle'"></i>
                          <span>3. Letras mayúsculas (A-Z) y minúsculas (a-z)</span>
                        </div>
                      </div>
                      <div class="col-12 col-sm-6">
                        <div class="password-rule-item" [ngClass]="pwdStatus.hasNumber ? 'rule-ok' : 'rule-pending'">
                          <i class="bi" [ngClass]="pwdStatus.hasNumber ? 'bi-check-circle-fill' : 'bi-circle'"></i>
                          <span>4. Al menos un número (0-9)</span>
                        </div>
                        <div class="password-rule-item" [ngClass]="pwdStatus.hasSpecialChar ? 'rule-ok' : 'rule-pending'">
                          <i class="bi" [ngClass]="pwdStatus.hasSpecialChar ? 'bi-check-circle-fill' : 'bi-circle'"></i>
                          <span>5. Al menos un carácter especial (!&#64;#$%^&amp;*...)</span>
                        </div>
                        <div class="password-rule-item" [ngClass]="pwdStatus.noSpaces ? 'rule-ok' : 'rule-pending'">
                          <i class="bi" [ngClass]="pwdStatus.noSpaces ? 'bi-check-circle-fill' : 'bi-circle'"></i>
                          <span>6. Sin espacios en blanco</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Aceptación de normas del foro -->
                <div class="col-12">
                  <div class="form-check">
                    <input
                      id="regTerms"
                      type="checkbox"
                      class="form-check-input"
                      formControlName="acceptTerms"
                      [ngClass]="{ 'is-invalid': isInvalid('acceptTerms') }"
                    />
                    <label for="regTerms" class="form-check-label small">
                      Acepto las normas de convivencia del foro y autorizo que los administradores moderen publicaciones que incumplan el reglamento. *
                    </label>
                    <div class="invalid-feedback">
                      Debes aceptar las normas de convivencia para registrarte.
                    </div>
                  </div>
                </div>

                <div class="col-12 pt-2">
                  <button type="submit" class="btn btn-primary w-100 py-2 fw-semibold rounded-3">
                    <i class="bi bi-person-check-fill me-2"></i>Crear Cuenta e Ingresar al Foro
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  `
})
export class RegisterComponent {
  private readonly fb = inject(FormBuilder);
  private readonly store = inject(ForumStoreService);
  private readonly router = inject(Router);

  readonly categories$ = this.store.categories$;

  showPassword = false;
  submitted = false;
  errorMessage = '';

  readonly registerForm = this.fb.nonNullable.group(
    {
      displayName: [
        '',
        [
          Validators.required,
          Validators.minLength(3),
          Validators.maxLength(60),
          Validators.pattern(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ0-9 ]+$/)
        ]
      ],
      email: [
        '',
        [Validators.required, Validators.email, Validators.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/)]
      ],
      favoriteCategoryId: [1, [Validators.required]],
      bio: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(160)]],
      password: ['', [Validators.required, strongPasswordValidator()]],
      confirmPassword: ['', [Validators.required]],
      acceptTerms: [false, [Validators.requiredTrue]]
    },
    { validators: passwordMatchValidator('password', 'confirmPassword') }
  );

  get pwdStatus(): PasswordSecurityStatus {
    return evaluatePasswordSecurity(this.registerForm.get('password')?.value);
  }

  isInvalid(field: string): boolean {
    const control = this.registerForm.get(field);
    return !!(control && control.invalid && (control.dirty || control.touched || this.submitted));
  }

  isValid(field: string): boolean {
    const control = this.registerForm.get(field);
    return !!(control && control.valid && (control.dirty || control.touched));
  }

  async onSubmit(): Promise<void> {
    this.submitted = true;
    this.errorMessage = '';

    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    const raw = this.registerForm.getRawValue();
    const res = await this.store.registerUserWithApi({
      displayName: raw.displayName,
      email: raw.email,
      password: raw.password,
      bio: raw.bio,
      favoriteCategoryId: Number(raw.favoriteCategoryId)
    });

    if (!res.ok) {
      this.errorMessage = res.message;
      return;
    }

    this.router.navigate(['/foro']);
  }
}
