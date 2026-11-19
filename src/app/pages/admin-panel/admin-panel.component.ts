import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Category, Comment, ModerationLog, Topic, User, UserRole } from '../../core/models/forum.models';
import { ForumStoreService } from '../../core/services/forum-store.service';
import { strongPasswordValidator } from '../../core/validators/password.validators';

@Component({
  selector: 'app-admin-panel',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterLink],
  template: `
    <div class="container py-4">
      <!-- Encabezado del Panel Administrativo -->
      <div class="card-forum bg-forum-gradient text-white p-4 mb-4">
        <div class="row align-items-center g-3">
          <div class="col-12 col-md-8">
            <span class="badge bg-warning text-dark fw-bold mb-2">
              <i class="bi bi-shield-lock-fill me-1"></i>Panel Exclusivo Rol ADMIN
            </span>
            <h2 class="fw-bold mb-1">Centro de Moderación y Control del Foro</h2>
            <p class="text-white-50 small mb-0">
              Gestiona publicaciones, banea temas o comentarios que incumplan las normas, administra las {{ categories.length }} categorías y controla cuentas de usuarios.
            </p>
          </div>
          <div class="col-12 col-md-4 text-md-end">
            <a routerLink="/foro" class="btn btn-outline-light rounded-pill px-3">
              <i class="bi bi-arrow-left me-1"></i>Volver al Foro
            </a>
          </div>
        </div>
      </div>

      <div *ngIf="feedbackMessage" class="alert alert-info alert-dismissible fade show py-2" role="alert">
        <i class="bi bi-info-circle-fill me-2"></i>{{ feedbackMessage }}
        <button type="button" class="btn-close py-2" (click)="feedbackMessage = ''"></button>
      </div>

      <!-- Pestañas de Navegación del Admin (Grid 12) -->
      <div class="row g-2 mb-4">
        <div class="col-12 col-sm-6 col-lg-3">
          <button
            type="button"
            class="btn w-100 py-2 fw-semibold rounded-3"
            [ngClass]="activeTab === 'moderacion' ? 'btn-primary' : 'btn-white border bg-white'"
            (click)="activeTab = 'moderacion'"
          >
            <i class="bi bi-shield-exclamation me-1"></i>Moderación ({{ topics.length + comments.length }})
          </button>
        </div>
        <div class="col-12 col-sm-6 col-lg-3">
          <button
            type="button"
            class="btn w-100 py-2 fw-semibold rounded-3"
            [ngClass]="activeTab === 'usuarios' ? 'btn-primary' : 'btn-white border bg-white'"
            (click)="activeTab = 'usuarios'"
          >
            <i class="bi bi-people-fill me-1"></i>Usuarios ({{ users.length }})
          </button>
        </div>
        <div class="col-12 col-sm-6 col-lg-3">
          <button
            type="button"
            class="btn w-100 py-2 fw-semibold rounded-3"
            [ngClass]="activeTab === 'categorias' ? 'btn-primary' : 'btn-white border bg-white'"
            (click)="activeTab = 'categorias'"
          >
            <i class="bi bi-tags-fill me-1"></i>Categorías ({{ categories.length }})
          </button>
        </div>
        <div class="col-12 col-sm-6 col-lg-3">
          <button
            type="button"
            class="btn w-100 py-2 fw-semibold rounded-3"
            [ngClass]="activeTab === 'bitacora' ? 'btn-primary' : 'btn-white border bg-white'"
            (click)="activeTab = 'bitacora'"
          >
            <i class="bi bi-journal-code me-1"></i>Bitácora ({{ logs.length }})
          </button>
        </div>
      </div>

      <!-- PESTAÑA 1: MODERACIÓN DE TEMAS Y COMENTARIOS -->
      <div *ngIf="activeTab === 'moderacion'" class="row g-4">
        <div class="col-12">
          <div class="card-forum p-4">
            <div class="row align-items-center g-3 mb-3">
              <div class="col-12 col-md-6">
                <h5 class="fw-bold mb-0">
                  <i class="bi bi-megaphone-fill text-danger me-2"></i>Moderación de Temas Publicados
                </h5>
              </div>
              <div class="col-12 col-md-6">
                <input
                  type="text"
                  class="form-control form-control-sm"
                  [(ngModel)]="banReasonInput"
                  placeholder="Motivo de moderación / baneo por defecto..."
                />
              </div>
            </div>

            <div class="table-responsive">
              <table class="table table-hover align-middle mb-0">
                <thead class="table-light">
                  <tr>
                    <th>ID</th>
                    <th>Título del Tema</th>
                    <th>Categoría</th>
                    <th>Autor</th>
                    <th>Estado</th>
                    <th class="text-end">Acciones de Moderación</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let t of topics">
                    <td>#{{ t.id }}</td>
                    <td>
                      <a [routerLink]="['/foro/tema', t.id]" class="fw-semibold text-decoration-none">
                        {{ t.title }}
                      </a>
                      <div *ngIf="t.banned" class="text-danger small">Motivo: {{ t.banReason }}</div>
                    </td>
                    <td><span class="badge bg-secondary">{{ getCategoryName(t.categoryId) }}</span></td>
                    <td>{{ getAuthorName(t.authorId) }}</td>
                    <td>
                      <span class="badge" [ngClass]="t.banned ? 'bg-danger' : 'bg-success'">
                        {{ t.banned ? 'BANEADO' : 'ACTIVO' }}
                      </span>
                    </td>
                    <td class="text-end">
                      <div class="d-inline-flex gap-1">
                        <button
                          type="button"
                          class="btn btn-sm"
                          [ngClass]="t.banned ? 'btn-success' : 'btn-warning text-dark'"
                          (click)="onBanTopic(t.id)"
                        >
                          <i class="bi" [ngClass]="t.banned ? 'bi-check-circle me-1' : 'bi-slash-circle me-1'"></i>
                          {{ t.banned ? 'Restaurar' : 'Banear' }}
                        </button>
                        <button
                          type="button"
                          class="btn btn-sm btn-outline-danger"
                          (click)="onDeleteTopic(t.id)"
                        >
                          <i class="bi bi-trash"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div class="col-12">
          <div class="card-forum p-4">
            <h5 class="fw-bold mb-3">
              <i class="bi bi-chat-right-quote-fill text-primary me-2"></i>Moderación de Comentarios
            </h5>
            <div class="table-responsive">
              <table class="table table-hover align-middle mb-0">
                <thead class="table-light">
                  <tr>
                    <th>ID</th>
                    <th>Comentario</th>
                    <th>Autor</th>
                    <th>Estado</th>
                    <th class="text-end">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let c of comments">
                    <td>#{{ c.id }}</td>
                    <td style="max-width: 380px;">
                      <div class="small">{{ c.content }}</div>
                      <div *ngIf="c.banned" class="text-danger" style="font-size: 0.75rem;">
                        Motivo: {{ c.banReason }}
                      </div>
                    </td>
                    <td>{{ getAuthorName(c.authorId) }}</td>
                    <td>
                      <span class="badge" [ngClass]="c.banned ? 'bg-danger' : 'bg-success'">
                        {{ c.banned ? 'BANEADO' : 'VISIBLE' }}
                      </span>
                    </td>
                    <td class="text-end">
                      <div class="d-inline-flex gap-1">
                        <button
                          type="button"
                          class="btn btn-sm"
                          [ngClass]="c.banned ? 'btn-success' : 'btn-warning text-dark'"
                          (click)="onBanComment(c.id)"
                        >
                          {{ c.banned ? 'Restaurar' : 'Banear' }}
                        </button>
                        <button
                          type="button"
                          class="btn btn-sm btn-outline-danger"
                          (click)="onDeleteComment(c.id)"
                        >
                          <i class="bi bi-trash"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <!-- PESTAÑA 2: GESTIÓN DE USUARIOS -->
      <div *ngIf="activeTab === 'usuarios'" class="row g-4">
        <div class="col-12 col-lg-4">
          <div class="card-forum p-4">
            <h5 class="fw-bold mb-3">Crear Usuario</h5>
            <form [formGroup]="userForm" (ngSubmit)="onCreateUser()" novalidate>
              <div class="mb-3">
                <label class="form-label small fw-semibold">Nombre Visible *</label>
                <input
                  type="text"
                  class="form-control"
                  formControlName="displayName"
                  [ngClass]="{ 'is-invalid': userSubmitted && userForm.get('displayName')?.invalid }"
                />
                <div class="invalid-feedback">Mínimo 3 caracteres.</div>
              </div>
              <div class="mb-3">
                <label class="form-label small fw-semibold">Correo Electrónico *</label>
                <input
                  type="email"
                  class="form-control"
                  formControlName="email"
                  [ngClass]="{ 'is-invalid': userSubmitted && userForm.get('email')?.invalid }"
                />
                <div class="invalid-feedback">Ingresa un correo válido.</div>
              </div>
              <div class="mb-3">
                <label class="form-label small fw-semibold">Rol Inicial *</label>
                <select class="form-select" formControlName="role">
                  <option value="USER">USER (Usuario Estándar)</option>
                  <option value="ADMIN">ADMIN (Administrador)</option>
                </select>
              </div>
              <div class="mb-3">
                <label class="form-label small fw-semibold">Contraseña Segura *</label>
                <input
                  type="password"
                  class="form-control"
                  formControlName="password"
                  placeholder="Ej: ClaveSegura1!"
                  [ngClass]="{ 'is-invalid': userSubmitted && userForm.get('password')?.invalid }"
                />
                <div class="invalid-feedback">
                  Debe cumplir 8-20 caracteres, mayúscula, minúscula, número y símbolo.
                </div>
              </div>
              <button type="submit" class="btn btn-primary w-100 fw-semibold">
                <i class="bi bi-person-plus-fill me-1"></i>Agregar Usuario
              </button>
            </form>
          </div>
        </div>

        <div class="col-12 col-lg-8">
          <div class="card-forum p-4">
            <h5 class="fw-bold mb-3">Colección de Usuarios ({{ users.length }})</h5>
            <div class="table-responsive">
              <table class="table table-hover align-middle mb-0">
                <thead class="table-light">
                  <tr>
                    <th>ID</th>
                    <th>Usuario</th>
                    <th>Rol</th>
                    <th>Estado</th>
                    <th class="text-end">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let u of users">
                    <td>#{{ u.id }}</td>
                    <td>
                      <div class="fw-semibold">{{ u.displayName }}</div>
                      <div class="text-muted small">{{ u.email }}</div>
                    </td>
                    <td>
                      <select
                        class="form-select form-select-sm"
                        style="width: 110px;"
                        [ngModel]="u.role"
                        (ngModelChange)="onChangeRole(u.id, $event)"
                      >
                        <option value="USER">USER</option>
                        <option value="ADMIN">ADMIN</option>
                      </select>
                    </td>
                    <td>
                      <span class="badge" [ngClass]="u.active ? 'bg-success' : 'bg-danger'">
                        {{ u.active ? 'ACTIVO' : 'SUSPENDIDO' }}
                      </span>
                    </td>
                    <td class="text-end">
                      <div class="d-inline-flex gap-1">
                        <button
                          type="button"
                          class="btn btn-sm btn-outline-warning text-dark"
                          (click)="onToggleUserActive(u.id)"
                          title="Suspender o activar usuario"
                        >
                          <i class="bi" [ngClass]="u.active ? 'bi-pause-circle' : 'bi-play-circle'"></i>
                        </button>
                        <button
                          type="button"
                          class="btn btn-sm btn-outline-danger"
                          (click)="onDeleteUser(u.id)"
                          title="Eliminar usuario"
                        >
                          <i class="bi bi-trash"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <!-- PESTAÑA 3: GESTIÓN DE CATEGORÍAS -->
      <div *ngIf="activeTab === 'categorias'" class="row g-4">
        <div class="col-12 col-lg-4">
          <div class="card-forum p-4">
            <h5 class="fw-bold mb-3">Nueva Categoría</h5>
            <form [formGroup]="categoryForm" (ngSubmit)="onCreateCategory()" novalidate>
              <div class="mb-3">
                <label class="form-label small fw-semibold">Nombre de Categoría *</label>
                <input
                  type="text"
                  class="form-control"
                  formControlName="name"
                  placeholder="Ej: Inteligencia Artificial"
                  [ngClass]="{ 'is-invalid': catSubmitted && categoryForm.get('name')?.invalid }"
                />
                <div class="invalid-feedback">Nombre requerido (3 a 80 caracteres).</div>
              </div>
              <div class="mb-3">
                <label class="form-label small fw-semibold">Descripción *</label>
                <textarea
                  rows="3"
                  class="form-control"
                  formControlName="description"
                  placeholder="Descripción temática de la categoría..."
                  [ngClass]="{ 'is-invalid': catSubmitted && categoryForm.get('description')?.invalid }"
                ></textarea>
                <div class="invalid-feedback">Descripción obligatoria (mínimo 10 caracteres).</div>
              </div>
              <div class="mb-3">
                <label class="form-label small fw-semibold">Ícono Bootstrap</label>
                <select class="form-select" formControlName="icon">
                  <option value="bi-cpu-fill">Tecnología (bi-cpu-fill)</option>
                  <option value="bi-controller">Videojuegos (bi-controller)</option>
                  <option value="bi-rocket-takeoff-fill">Ciencia (bi-rocket-takeoff-fill)</option>
                  <option value="bi-trophy-fill">Deportes (bi-trophy-fill)</option>
                  <option value="bi-film">Cine y series (bi-film)</option>
                  <option value="bi-lightbulb-fill">Innovación (bi-lightbulb-fill)</option>
                </select>
              </div>
              <button type="submit" class="btn btn-primary w-100 fw-semibold">
                <i class="bi bi-plus-circle me-1"></i>Crear Categoría
              </button>
            </form>
          </div>
        </div>

        <div class="col-12 col-lg-8">
          <div class="card-forum p-4">
            <h5 class="fw-bold mb-3">Categorías Activas ({{ categories.length }})</h5>
            <div class="table-responsive">
              <table class="table table-hover align-middle mb-0">
                <thead class="table-light">
                  <tr>
                    <th>ID</th>
                    <th>Categoría</th>
                    <th>Descripción</th>
                    <th>Temas</th>
                    <th class="text-end">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let cat of categories">
                    <td>#{{ cat.id }}</td>
                    <td class="fw-semibold">
                      <i class="bi text-primary me-2" [ngClass]="cat.icon"></i>{{ cat.name }}
                    </td>
                    <td class="small text-muted">{{ cat.description }}</td>
                    <td><span class="badge bg-primary">{{ getCategoryTopicCount(cat.id) }}</span></td>
                    <td class="text-end">
                      <button
                        type="button"
                        class="btn btn-sm btn-outline-danger"
                        (click)="onDeleteCategory(cat.id)"
                      >
                        <i class="bi bi-trash"></i>
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <!-- PESTAÑA 4: BITÁCORA DE MODERACIÓN -->
      <div *ngIf="activeTab === 'bitacora'" class="card-forum p-4">
        <h5 class="fw-bold mb-3">Historial de Acciones de Moderación</h5>
        <div *ngIf="logs.length === 0" class="text-muted small py-3">
          No se han registrado acciones de moderación en esta sesión todavía.
        </div>
        <div class="table-responsive" *ngIf="logs.length > 0">
          <table class="table table-sm align-middle mb-0">
            <thead class="table-light">
              <tr>
                <th>Fecha</th>
                <th>Tipo</th>
                <th>Acción</th>
                <th>Detalle</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let log of logs">
                <td class="small text-muted">{{ log.createdAt | date:'dd/MM/yyyy HH:mm:ss' }}</td>
                <td><span class="badge bg-secondary">{{ log.targetType }}</span></td>
                <td class="fw-semibold small">{{ log.action }}</td>
                <td class="small">{{ log.reason }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `
})
export class AdminPanelComponent implements OnInit {
  private readonly store = inject(ForumStoreService);
  private readonly fb = inject(FormBuilder);

  activeTab: 'moderacion' | 'usuarios' | 'categorias' | 'bitacora' = 'moderacion';
  feedbackMessage = '';
  banReasonInput = 'Incumplimiento de las normas del foro.';

  users: User[] = [];
  categories: Category[] = [];
  topics: Topic[] = [];
  comments: Comment[] = [];
  logs: ModerationLog[] = [];

  userSubmitted = false;
  catSubmitted = false;

  readonly userForm = this.fb.nonNullable.group({
    displayName: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(60)]],
    email: ['', [Validators.required, Validators.email]],
    role: ['USER' as UserRole, [Validators.required]],
    password: ['', [Validators.required, strongPasswordValidator()]]
  });

  readonly categoryForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(80)]],
    description: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(255)]],
    icon: ['bi-lightbulb-fill'],
    badgeColor: ['primary']
  });

  ngOnInit(): void {
    this.store.users$.subscribe(u => (this.users = u));
    this.store.categories$.subscribe(c => (this.categories = c));
    this.store.topics$.subscribe(t => (this.topics = t));
    this.store.comments$.subscribe(c => (this.comments = c));
    this.store.moderationLogs$.subscribe(l => (this.logs = l));
  }

  onBanTopic(topicId: number): void {
    const res = this.store.toggleBanTopic(topicId, this.banReasonInput);
    this.feedbackMessage = res.message;
  }

  onDeleteTopic(topicId: number): void {
    const res = this.store.deleteTopic(topicId);
    this.feedbackMessage = res.message;
  }

  onBanComment(commentId: number): void {
    const res = this.store.toggleBanComment(commentId, this.banReasonInput);
    this.feedbackMessage = res.message;
  }

  onDeleteComment(commentId: number): void {
    const res = this.store.deleteComment(commentId);
    this.feedbackMessage = res.message;
  }

  onCreateUser(): void {
    this.userSubmitted = true;
    if (this.userForm.invalid) {
      this.userForm.markAllAsTouched();
      return;
    }
    const res = this.store.adminCreateUser(this.userForm.getRawValue());
    this.feedbackMessage = res.message;
    if (res.ok) {
      this.userForm.reset({ displayName: '', email: '', role: 'USER', password: '' });
      this.userSubmitted = false;
    }
  }

  onChangeRole(userId: number, role: UserRole): void {
    const res = this.store.adminUpdateUserRole(userId, role);
    this.feedbackMessage = res.message;
  }

  onToggleUserActive(userId: number): void {
    const res = this.store.adminToggleUserStatus(userId);
    this.feedbackMessage = res.message;
  }

  onDeleteUser(userId: number): void {
    const res = this.store.adminDeleteUser(userId);
    this.feedbackMessage = res.message;
  }

  onCreateCategory(): void {
    this.catSubmitted = true;
    if (this.categoryForm.invalid) {
      this.categoryForm.markAllAsTouched();
      return;
    }
    const res = this.store.createCategory(this.categoryForm.getRawValue());
    this.feedbackMessage = res.message;
    if (res.ok) {
      this.categoryForm.reset({ name: '', description: '', icon: 'bi-lightbulb-fill', badgeColor: 'primary' });
      this.catSubmitted = false;
    }
  }

  onDeleteCategory(categoryId: number): void {
    const res = this.store.deleteCategory(categoryId);
    this.feedbackMessage = res.message;
  }

  getCategoryName(categoryId: number): string {
    return this.categories.find(c => c.id === categoryId)?.name ?? 'General';
  }

  getCategoryTopicCount(categoryId: number): number {
    return this.store.getTopicCountByCategory(categoryId);
  }

  getAuthorName(authorId: number): string {
    return this.users.find(u => u.id === authorId)?.displayName ?? `Usuario #${authorId}`;
  }
}
