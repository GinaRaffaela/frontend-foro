import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Comment, PasswordSecurityStatus, Topic, User } from '../../core/models/forum.models';
import { ForumStoreService } from '../../core/services/forum-store.service';
import {
  evaluatePasswordSecurity,
  passwordMatchValidator,
  strongPasswordValidator
} from '../../core/validators/password.validators';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="container py-4" *ngIf="currentUser as user">
      <div class="row g-4">
        <!-- Columna izquierda: Resumen de usuario (Grid 12: 12 móvil, 4 desktop) -->
        <div class="col-12 col-lg-4">
          <div class="card-forum p-4 mb-4">
            <div class="d-flex align-items-center gap-3 mb-3">
              <div class="avatar-circle bg-primary text-white fs-4" style="width: 60px; height: 60px;">
                {{ user.displayName.charAt(0).toUpperCase() }}
              </div>
              <div>
                <h5 class="fw-bold mb-1">{{ user.displayName }}</h5>
                <div class="text-muted small mb-1">{{ user.email }}</div>
                <span
                  class="badge rounded-pill"
                  [ngClass]="user.role === 'ADMIN' ? 'bg-warning text-dark' : 'bg-primary'"
                >
                  Rol: {{ user.role }}
                </span>
              </div>
            </div>

            <p class="small text-secondary mb-3">{{ user.bio }}</p>

            <div class="border-top pt-3 small">
              <div class="d-flex justify-content-between py-1">
                <span class="text-muted">Categoría favorita:</span>
                <span class="fw-semibold">{{ getCategoryName(user.favoriteCategoryId) }}</span>
              </div>
              <div class="d-flex justify-content-between py-1">
                <span class="text-muted">Temas publicados:</span>
                <span class="fw-semibold">{{ userTopics.length }}</span>
              </div>
              <div class="d-flex justify-content-between py-1">
                <span class="text-muted">Comentarios realizados:</span>
                <span class="fw-semibold">{{ userComments.length }}</span>
              </div>
            </div>
          </div>

          <!-- Mis Temas Publicados -->
          <div class="card-forum p-4">
            <h6 class="fw-bold mb-3">
              <i class="bi bi-journal-text text-primary me-2"></i>Mis Temas Publicados ({{ userTopics.length }})
            </h6>
            <div *ngIf="userTopics.length === 0" class="text-muted small">
              Aún no has publicado temas en el foro.
            </div>
            <div class="d-flex flex-column gap-2">
              <a
                *ngFor="let t of userTopics"
                [routerLink]="['/foro/tema', t.id]"
                class="text-decoration-none p-2 rounded-3 border bg-light hover-shadow"
              >
                <div class="fw-semibold text-dark small text-truncate">{{ t.title }}</div>
                <div class="d-flex justify-content-between align-items-center mt-1" style="font-size: 0.75rem;">
                  <span class="badge bg-secondary">{{ getCategoryName(t.categoryId) }}</span>
                  <span class="text-muted">{{ t.createdAt | date:'dd/MM/yyyy' }}</span>
                </div>
              </a>
            </div>
          </div>
        </div>

        <!-- Columna derecha: Formulario de Modificación de Perfil y Clave (Grid 12: 12 móvil, 8 desktop) -->
        <div class="col-12 col-lg-8">
          <div class="card-forum p-4 p-md-5 mb-4">
            <h4 class="fw-bold mb-1">Modificación de Perfil</h4>
            <p class="text-muted small mb-4">
              Actualiza tus datos personales y preferencias en la colección de usuarios del sistema.
            </p>

            <div *ngIf="profileSuccess" class="alert alert-success py-2">{{ profileSuccess }}</div>
            <div *ngIf="profileError" class="alert alert-danger py-2">{{ profileError }}</div>

            <form [formGroup]="profileForm" (ngSubmit)="onSaveProfile()" novalidate>
              <div class="row g-3">
                <div class="col-12 col-md-6">
                  <label class="form-label fw-semibold">Nombre Visible *</label>
                  <input
                    type="text"
                    class="form-control"
                    formControlName="displayName"
                    [ngClass]="{ 'is-invalid': isProfileInvalid('displayName') }"
                  />
                  <div class="invalid-feedback">
                    Ingresa un nombre válido (entre 3 y 60 caracteres, sin símbolos especiales).
                  </div>
                </div>

                <div class="col-12 col-md-6">
                  <label class="form-label fw-semibold">Correo Electrónico *</label>
                  <input
                    type="email"
                    class="form-control"
                    formControlName="email"
                    [ngClass]="{ 'is-invalid': isProfileInvalid('email') }"
                  />
                  <div class="invalid-feedback">Ingresa un correo electrónico válido.</div>
                </div>

                <div class="col-12 col-md-6">
                  <label class="form-label fw-semibold">Categoría Favorita *</label>
                  <select class="form-select" formControlName="favoriteCategoryId">
                    <option *ngFor="let c of categories$ | async" [value]="c.id">{{ c.name }}</option>
                  </select>
                </div>

                <div class="col-12">
                  <label class="form-label fw-semibold">Biografía / Presentación *</label>
                  <textarea
                    rows="3"
                    class="form-control"
                    formControlName="bio"
                    [ngClass]="{ 'is-invalid': isProfileInvalid('bio') }"
                  ></textarea>
                  <div class="invalid-feedback">
                    La biografía es obligatoria (mínimo 10 y máximo 200 caracteres).
                  </div>
                </div>

                <div class="col-12">
                  <button type="submit" class="btn btn-primary px-4 fw-semibold">
                    <i class="bi bi-save me-2"></i>Guardar Cambios del Perfil
                  </button>
                </div>
              </div>
            </form>
          </div>

          <!-- Cambio de Contraseña con las 6 validaciones de seguridad -->
          <div class="card-forum p-4 p-md-5">
            <h5 class="fw-bold mb-1">Actualizar Contraseña</h5>
            <p class="text-muted small mb-4">
              Si deseas cambiar tu clave de acceso, debe cumplir con las validaciones de seguridad del sistema.
            </p>

            <div *ngIf="pwdSuccess" class="alert alert-success py-2">{{ pwdSuccess }}</div>
            <div *ngIf="pwdError" class="alert alert-danger py-2">{{ pwdError }}</div>

            <form [formGroup]="passwordForm" (ngSubmit)="onChangePassword()" novalidate>
              <div class="row g-3">
                <div class="col-12 col-md-6">
                  <label class="form-label fw-semibold">Nueva Contraseña *</label>
                  <input
                    type="password"
                    class="form-control"
                    formControlName="password"
                    placeholder="Nueva clave segura"
                    [ngClass]="{ 'is-invalid': isPwdInvalid('password') }"
                  />
                  <div class="invalid-feedback">Debe cumplir todas las reglas de seguridad.</div>
                </div>

                <div class="col-12 col-md-6">
                  <label class="form-label fw-semibold">Confirmar Nueva Contraseña *</label>
                  <input
                    type="password"
                    class="form-control"
                    formControlName="confirmPassword"
                    placeholder="Repite la nueva clave"
                    [ngClass]="{
                      'is-invalid': isPwdInvalid('confirmPassword') || (passwordForm.errors?.['passwordMismatch'] && pwdSubmitted)
                    }"
                  />
                  <div class="invalid-feedback">Las contraseñas deben coincidir.</div>
                </div>

                <div class="col-12">
                  <div class="bg-light border rounded-4 p-3">
                    <div class="row g-2">
                      <div class="col-12 col-sm-6">
                        <div class="password-rule-item" [ngClass]="pwdStatus.minLength ? 'rule-ok' : 'rule-pending'">
                          <i class="bi" [ngClass]="pwdStatus.minLength ? 'bi-check-circle-fill' : 'bi-circle'"></i>
                          <span>Mínimo 8 caracteres</span>
                        </div>
                        <div class="password-rule-item" [ngClass]="pwdStatus.maxLength ? 'rule-ok' : 'rule-pending'">
                          <i class="bi" [ngClass]="pwdStatus.maxLength ? 'bi-check-circle-fill' : 'bi-circle'"></i>
                          <span>Máximo 20 caracteres</span>
                        </div>
                        <div class="password-rule-item" [ngClass]="pwdStatus.hasUpperAndLower ? 'rule-ok' : 'rule-pending'">
                          <i class="bi" [ngClass]="pwdStatus.hasUpperAndLower ? 'bi-check-circle-fill' : 'bi-circle'"></i>
                          <span>Mayúsculas y minúsculas</span>
                        </div>
                      </div>
                      <div class="col-12 col-sm-6">
                        <div class="password-rule-item" [ngClass]="pwdStatus.hasNumber ? 'rule-ok' : 'rule-pending'">
                          <i class="bi" [ngClass]="pwdStatus.hasNumber ? 'bi-check-circle-fill' : 'bi-circle'"></i>
                          <span>Al menos un número</span>
                        </div>
                        <div class="password-rule-item" [ngClass]="pwdStatus.hasSpecialChar ? 'rule-ok' : 'rule-pending'">
                          <i class="bi" [ngClass]="pwdStatus.hasSpecialChar ? 'bi-check-circle-fill' : 'bi-circle'"></i>
                          <span>Carácter especial (!&#64;#$%^&amp;*...)</span>
                        </div>
                        <div class="password-rule-item" [ngClass]="pwdStatus.noSpaces ? 'rule-ok' : 'rule-pending'">
                          <i class="bi" [ngClass]="pwdStatus.noSpaces ? 'bi-check-circle-fill' : 'bi-circle'"></i>
                          <span>Sin espacios en blanco</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="col-12">
                  <button type="submit" class="btn btn-outline-primary px-4 fw-semibold">
                    <i class="bi bi-shield-lock me-2"></i>Actualizar Contraseña
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
export class ProfileComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly store = inject(ForumStoreService);

  readonly categories$ = this.store.categories$;

  currentUser: User | null = null;
  userTopics: Topic[] = [];
  userComments: Comment[] = [];

  profileSubmitted = false;
  profileSuccess = '';
  profileError = '';

  pwdSubmitted = false;
  pwdSuccess = '';
  pwdError = '';

  readonly profileForm = this.fb.nonNullable.group({
    displayName: [
      '',
      [
        Validators.required,
        Validators.minLength(3),
        Validators.maxLength(60),
        Validators.pattern(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ0-9 ]+$/)
      ]
    ],
    email: ['', [Validators.required, Validators.email]],
    favoriteCategoryId: [1, [Validators.required]],
    bio: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(200)]]
  });

  readonly passwordForm = this.fb.nonNullable.group(
    {
      password: ['', [Validators.required, strongPasswordValidator()]],
      confirmPassword: ['', [Validators.required]]
    },
    { validators: passwordMatchValidator('password', 'confirmPassword') }
  );

  ngOnInit(): void {
    this.refreshData();
  }

  refreshData(): void {
    this.currentUser = this.store.getCurrentUser();
    if (this.currentUser) {
      this.profileForm.patchValue({
        displayName: this.currentUser.displayName,
        email: this.currentUser.email,
        favoriteCategoryId: this.currentUser.favoriteCategoryId,
        bio: this.currentUser.bio
      });
      this.userTopics = this.store.getTopics().filter(t => t.authorId === this.currentUser?.id);
      this.userComments = this.store.getAllComments().filter(c => c.authorId === this.currentUser?.id);
    }
  }

  get pwdStatus(): PasswordSecurityStatus {
    return evaluatePasswordSecurity(this.passwordForm.get('password')?.value);
  }

  getCategoryName(categoryId: number): string {
    return this.store.getCategoryById(Number(categoryId))?.name ?? 'General';
  }

  isProfileInvalid(field: string): boolean {
    const c = this.profileForm.get(field);
    return !!(c && c.invalid && (c.dirty || c.touched || this.profileSubmitted));
  }

  isPwdInvalid(field: string): boolean {
    const c = this.passwordForm.get(field);
    return !!(c && c.invalid && (c.dirty || c.touched || this.pwdSubmitted));
  }

  onSaveProfile(): void {
    this.profileSubmitted = true;
    this.profileSuccess = '';
    this.profileError = '';

    if (this.profileForm.invalid || !this.currentUser) {
      this.profileForm.markAllAsTouched();
      return;
    }

    const raw = this.profileForm.getRawValue();
    const res = this.store.updateProfile(this.currentUser.id, {
      displayName: raw.displayName,
      email: raw.email,
      bio: raw.bio,
      favoriteCategoryId: Number(raw.favoriteCategoryId)
    });

    if (!res.ok) {
      this.profileError = res.message;
      return;
    }

    this.profileSuccess = res.message;
    this.refreshData();
  }

  onChangePassword(): void {
    this.pwdSubmitted = true;
    this.pwdSuccess = '';
    this.pwdError = '';

    if (this.passwordForm.invalid || !this.currentUser) {
      this.passwordForm.markAllAsTouched();
      return;
    }

    const { password } = this.passwordForm.getRawValue();
    const res = this.store.updateProfile(this.currentUser.id, {
      displayName: this.currentUser.displayName,
      email: this.currentUser.email,
      bio: this.currentUser.bio,
      favoriteCategoryId: this.currentUser.favoriteCategoryId,
      newPassword: password
    });

    if (!res.ok) {
      this.pwdError = res.message;
      return;
    }

    this.pwdSuccess = 'Contraseña actualizada correctamente con todas las validaciones de seguridad.';
    this.passwordForm.reset();
    this.pwdSubmitted = false;
    this.refreshData();
  }
}
