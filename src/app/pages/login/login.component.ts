import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ForumStoreService } from '../../core/services/forum-store.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="container py-4 py-lg-5">
      <div class="row justify-content-center align-items-stretch g-4">
        <!-- Columna informativa (Grid 12: 12 en móvil, 5 en desktop) -->
        <div class="col-12 col-lg-5 d-flex">
          <div class="card-forum bg-forum-gradient text-white p-4 p-xl-5 w-100 d-flex flex-column justify-content-between">
            <div>
              <span class="badge bg-warning text-dark fw-semibold mb-3 px-3 py-2 rounded-pill">
                <i class="bi bi-shield-check me-1"></i>Acceso al Sistema de Foros
              </span>
              <h2 class="fw-bold mb-3">Bienvenido a ForoDuoc</h2>
              <p class="text-white-50 mb-4">
                Participa en las 5 categorías temáticas de nuestra comunidad, publica debates, comenta y comparte conocimiento.
              </p>

              <div class="bg-white bg-opacity-10 rounded-4 p-3 mb-3">
                <h6 class="fw-bold text-warning mb-2">
                  <i class="bi bi-lightning-charge-fill me-1"></i>Cuentas Demo Precargadas
                </h6>
                <p class="small text-white-50 mb-3">
                  Haz clic en cualquiera de las cuentas de demostración para autocompletar credenciales (Roles <strong>ADMIN</strong> y <strong>USER</strong>):
                </p>
                <div class="d-grid gap-2">
                  <button
                    type="button"
                    class="btn btn-sm btn-warning text-dark fw-semibold text-start d-flex justify-content-between align-items-center"
                    (click)="fillDemo('admin@foro.test', 'Demo1234!')"
                  >
                    <span><i class="bi bi-shield-lock-fill me-2"></i>admin&#64;foro.test</span>
                    <span class="badge bg-dark">ADMIN</span>
                  </button>
                  <button
                    type="button"
                    class="btn btn-sm btn-light text-dark fw-semibold text-start d-flex justify-content-between align-items-center"
                    (click)="fillDemo('ana@foro.test', 'Demo1234!')"
                  >
                    <span><i class="bi bi-person-fill me-2"></i>ana&#64;foro.test (Ana Torres)</span>
                    <span class="badge bg-primary">USER</span>
                  </button>
                  <button
                    type="button"
                    class="btn btn-sm btn-light text-dark fw-semibold text-start d-flex justify-content-between align-items-center"
                    (click)="fillDemo('luis@foro.test', 'Demo1234!')"
                  >
                    <span><i class="bi bi-person-fill me-2"></i>luis&#64;foro.test (Luis Morales)</span>
                    <span class="badge bg-primary">USER</span>
                  </button>
                </div>
              </div>
            </div>

            <div class="small text-white-50 pt-3 border-top border-white border-opacity-10">
              <i class="bi bi-info-circle me-1"></i>
              Clave demo compatible con <code>Demo1234!</code> y <code>Demo1234</code>.
            </div>
          </div>
        </div>

        <!-- Columna formulario (Grid 12: 12 en móvil, 8 en tablet, 6 en desktop) -->
        <div class="col-12 col-md-10 col-lg-6 d-flex">
          <div class="card-forum p-4 p-xl-5 w-100">
            <div class="mb-4">
              <h3 class="fw-bold mb-1">Iniciar Sesión</h3>
              <p class="text-muted small mb-0">
                Ingresa tu correo electrónico y contraseña para acceder a tu cuenta.
              </p>
            </div>

            <div *ngIf="errorMessage" class="alert alert-danger d-flex align-items-center gap-2 py-2" role="alert">
              <i class="bi bi-exclamation-triangle-fill"></i>
              <div>{{ errorMessage }}</div>
            </div>

            <form [formGroup]="loginForm" (ngSubmit)="onSubmit()" novalidate>
              <!-- Campo Correo -->
              <div class="mb-3">
                <label for="loginEmail" class="form-label fw-semibold">Correo Electrónico *</label>
                <div class="input-group">
                  <span class="input-group-text bg-light"><i class="bi bi-envelope"></i></span>
                  <input
                    id="loginEmail"
                    type="email"
                    class="form-control"
                    formControlName="email"
                    placeholder="ejemplo@foro.test"
                    [ngClass]="{
                      'is-invalid': isFieldInvalid('email'),
                      'is-valid': isFieldValid('email')
                    }"
                  />
                  <div class="invalid-feedback">
                    <span *ngIf="loginForm.get('email')?.errors?.['required']">El correo electrónico es obligatorio.</span>
                    <span *ngIf="loginForm.get('email')?.errors?.['email'] || loginForm.get('email')?.errors?.['pattern']">
                      Ingresa un formato de correo electrónico válido (ej: usuario&#64;dominio.cl).
                    </span>
                  </div>
                </div>
              </div>

              <!-- Campo Contraseña -->
              <div class="mb-3">
                <div class="d-flex justify-content-between align-items-center">
                  <label for="loginPassword" class="form-label fw-semibold mb-1">Contraseña *</label>
                  <a routerLink="/recuperar-password" class="small text-decoration-none fw-semibold">
                    ¿Olvidaste tu contraseña?
                  </a>
                </div>
                <div class="input-group">
                  <span class="input-group-text bg-light"><i class="bi bi-lock"></i></span>
                  <input
                    id="loginPassword"
                    [type]="showPassword ? 'text' : 'password'"
                    class="form-control"
                    formControlName="password"
                    placeholder="Ingresa tu contraseña"
                    [ngClass]="{
                      'is-invalid': isFieldInvalid('password'),
                      'is-valid': isFieldValid('password')
                    }"
                  />
                  <button
                    type="button"
                    class="btn btn-outline-secondary"
                    (click)="showPassword = !showPassword"
                    title="Mostrar u ocultar contraseña"
                  >
                    <i class="bi" [ngClass]="showPassword ? 'bi-eye-slash' : 'bi-eye'"></i>
                  </button>
                  <div class="invalid-feedback">
                    <span *ngIf="loginForm.get('password')?.errors?.['required']">Debes ingresar tu contraseña.</span>
                    <span *ngIf="loginForm.get('password')?.errors?.['minlength']">
                      La contraseña debe tener al menos 8 caracteres.
                    </span>
                  </div>
                </div>
              </div>

              <!-- Recordar sesión -->
              <div class="form-check mb-4">
                <input
                  id="rememberSession"
                  type="checkbox"
                  class="form-check-input"
                  formControlName="rememberMe"
                />
                <label for="rememberSession" class="form-check-label small text-muted">
                  Mantener sesión iniciada en este navegador
                </label>
              </div>

              <button type="submit" class="btn btn-primary w-100 py-2 fw-semibold rounded-3 mb-3">
                <i class="bi bi-box-arrow-in-right me-2"></i>Ingresar al Foro
              </button>

              <div class="text-center small text-muted">
                ¿Aún no tienes cuenta en ForoDuoc?
                <a routerLink="/registro" class="fw-semibold text-decoration-none ms-1">Regístrate aquí</a>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  `
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly store = inject(ForumStoreService);
  private readonly router = inject(Router);

  showPassword = false;
  submitted = false;
  errorMessage = '';

  readonly loginForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email, Validators.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/)]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    rememberMe: [true]
  });

  fillDemo(email: string, password: string): void {
    this.errorMessage = '';
    this.loginForm.patchValue({ email, password });
    this.loginForm.markAllAsTouched();
  }

  isFieldInvalid(field: string): boolean {
    const control = this.loginForm.get(field);
    return !!(control && control.invalid && (control.dirty || control.touched || this.submitted));
  }

  isFieldValid(field: string): boolean {
    const control = this.loginForm.get(field);
    return !!(control && control.valid && (control.dirty || control.touched));
  }

  onSubmit(): void {
    this.submitted = true;
    this.errorMessage = '';

    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    const { email, password } = this.loginForm.getRawValue();
    const res = this.store.login(email, password);
    if (!res.ok) {
      this.errorMessage = res.message;
      return;
    }

    this.router.navigate(['/foro']);
  }
}
