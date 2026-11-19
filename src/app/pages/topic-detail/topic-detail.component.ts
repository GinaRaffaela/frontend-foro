import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Comment, Topic, User } from '../../core/models/forum.models';
import { ForumStoreService } from '../../core/services/forum-store.service';

@Component({
  selector: 'app-topic-detail',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterLink],
  template: `
    <div class="container py-4">
      <div class="mb-3">
        <a routerLink="/foro" class="btn btn-sm btn-outline-secondary rounded-pill px-3">
          <i class="bi bi-arrow-left me-1"></i>Volver al listado de temas
        </a>
      </div>

      <ng-container *ngIf="topic; else notFoundTpl">
        <div class="row g-4">
          <!-- Columna Principal del Debate (Grid 12: 12 móvil, 8 desktop) -->
          <div class="col-12 col-lg-8">
            <!-- Tarjeta del Tema Principal -->
            <div class="card-forum p-4 p-md-5 mb-4" [class.banned-banner]="topic.banned">
              <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
                <div class="d-flex flex-wrap align-items-center gap-2">
                  <span class="badge bg-primary">{{ getCategoryName(topic.categoryId) }}</span>
                  <span *ngIf="topic.pinned" class="badge bg-warning text-dark">
                    <i class="bi bi-pin-angle-fill me-1"></i>Destacado
                  </span>
                  <span *ngIf="topic.banned" class="badge bg-danger">
                    <i class="bi bi-slash-circle me-1"></i>Tema Baneado por Moderación
                  </span>
                </div>

                <!-- Botones de Autor o ADMIN -->
                <div class="d-flex flex-wrap gap-2" *ngIf="canModifyTopic()">
                  <a
                    [routerLink]="['/foro/editar-tema', topic.id]"
                    class="btn btn-sm btn-outline-primary rounded-pill"
                  >
                    <i class="bi bi-pencil-square me-1"></i>Editar
                  </a>
                  <button
                    *ngIf="currentUser?.role === 'ADMIN'"
                    type="button"
                    class="btn btn-sm rounded-pill"
                    [ngClass]="topic.banned ? 'btn-success' : 'btn-warning text-dark'"
                    (click)="onToggleBanTopic()"
                  >
                    <i class="bi" [ngClass]="topic.banned ? 'bi-check-circle me-1' : 'bi-shield-exclamation me-1'"></i>
                    {{ topic.banned ? 'Restaurar Tema' : 'Banear Tema' }}
                  </button>
                  <button
                    type="button"
                    class="btn btn-sm btn-outline-danger rounded-pill"
                    (click)="onDeleteTopic()"
                  >
                    <i class="bi bi-trash me-1"></i>Eliminar
                  </button>
                </div>
              </div>

              <h2 class="fw-bold mb-3">{{ topic.title }}</h2>

              <div *ngIf="topic.banned" class="alert alert-danger d-flex align-items-center gap-2">
                <i class="bi bi-exclamation-octagon-fill fs-5"></i>
                <div>
                  <strong>Publicación Baneada por un Administrador:</strong>
                  {{ topic.banReason || 'Incumplimiento de las normas del foro.' }}
                </div>
              </div>

              <p class="fs-6 text-dark mb-4" style="white-space: pre-line; line-height: 1.65;">
                {{ topic.content }}
              </p>

              <div class="d-flex flex-wrap gap-1 mb-4">
                <span *ngFor="let tag of topic.tags" class="badge bg-light text-secondary border">
                  #{{ tag }}
                </span>
              </div>

              <div class="d-flex align-items-center justify-content-between pt-3 border-top small text-muted">
                <div class="d-flex align-items-center gap-2">
                  <div class="avatar-circle bg-primary text-white" style="width: 34px; height: 34px; font-size: 0.85rem;">
                    {{ getAuthorName(topic.authorId).charAt(0).toUpperCase() }}
                  </div>
                  <div>
                    <div class="fw-semibold text-dark">{{ getAuthorName(topic.authorId) }}</div>
                    <div style="font-size: 0.75rem;">Publicado el {{ topic.createdAt | date:'dd/MM/yyyy HH:mm' }}</div>
                  </div>
                </div>
                <span *ngIf="topic.updatedAt">Editado el {{ topic.updatedAt | date:'dd/MM/yyyy HH:mm' }}</span>
              </div>
            </div>

            <!-- Avisos de acción -->
            <div *ngIf="actionNotice" class="alert alert-info py-2">{{ actionNotice }}</div>

            <!-- Sección de Comentarios -->
            <div class="card-forum p-4 mb-4">
              <h5 class="fw-bold mb-4">
                <i class="bi bi-chat-left-text text-primary me-2"></i>
                Comentarios ({{ comments.length }})
              </h5>

              <div *ngIf="comments.length === 0" class="text-center py-4 text-muted small">
                Todavía no hay comentarios en este tema. ¡Sé el primero en opinar!
              </div>

              <div class="d-flex flex-column gap-3">
                <div
                  *ngFor="let c of comments"
                  class="p-3 rounded-4 border"
                  [ngClass]="c.banned ? 'banned-banner' : 'bg-light'"
                >
                  <div class="d-flex justify-content-between align-items-start mb-2">
                    <div class="d-flex align-items-center gap-2">
                      <div class="avatar-circle bg-secondary text-white" style="width: 30px; height: 30px; font-size: 0.8rem;">
                        {{ getAuthorName(c.authorId).charAt(0).toUpperCase() }}
                      </div>
                      <span class="fw-bold small">{{ getAuthorName(c.authorId) }}</span>
                      <span
                        class="badge rounded-pill"
                        style="font-size: 0.65rem;"
                        [ngClass]="getAuthorRole(c.authorId) === 'ADMIN' ? 'bg-warning text-dark' : 'bg-white text-secondary border'"
                      >
                        {{ getAuthorRole(c.authorId) }}
                      </span>
                      <span class="text-muted" style="font-size: 0.75rem;">
                        {{ c.createdAt | date:'dd/MM/yyyy HH:mm' }}
                      </span>
                    </div>

                    <!-- Botones de edición / moderación de comentario -->
                    <div class="d-flex gap-1" *ngIf="canModifyComment(c)">
                      <button
                        *ngIf="!c.banned"
                        type="button"
                        class="btn btn-sm btn-outline-secondary py-0 px-2"
                        (click)="startEditComment(c)"
                        title="Editar comentario"
                      >
                        <i class="bi bi-pencil"></i>
                      </button>
                      <button
                        *ngIf="currentUser?.role === 'ADMIN'"
                        type="button"
                        class="btn btn-sm py-0 px-2"
                        [ngClass]="c.banned ? 'btn-success' : 'btn-warning text-dark'"
                        (click)="onToggleBanComment(c)"
                        title="Banear o restaurar comentario por moderación"
                      >
                        <i class="bi" [ngClass]="c.banned ? 'bi-eye' : 'bi-slash-circle'"></i>
                      </button>
                      <button
                        type="button"
                        class="btn btn-sm btn-outline-danger py-0 px-2"
                        (click)="onDeleteComment(c.id)"
                        title="Eliminar comentario"
                      >
                        <i class="bi bi-trash"></i>
                      </button>
                    </div>
                  </div>

                  <!-- Si está baneado -->
                  <div *ngIf="c.banned" class="text-danger small fst-italic">
                    <i class="bi bi-shield-fill-exclamation me-1"></i>
                    Comentario ocultado por moderación ({{ c.banReason || 'Incumplimiento de normas del foro' }}).
                    <div *ngIf="currentUser?.role === 'ADMIN'" class="text-muted mt-1">
                      <strong>Texto original (visible para ADMIN):</strong> {{ c.content }}
                    </div>
                  </div>

                  <!-- Modo edición de comentario -->
                  <div *ngIf="!c.banned && editingCommentId === c.id" class="mt-2">
                    <textarea
                      rows="2"
                      class="form-control form-control-sm mb-2"
                      [(ngModel)]="editingCommentText"
                    ></textarea>
                    <div class="d-flex gap-2">
                      <button type="button" class="btn btn-sm btn-primary" (click)="saveEditComment(c.id)">
                        Guardar
                      </button>
                      <button type="button" class="btn btn-sm btn-outline-secondary" (click)="editingCommentId = null">
                        Cancelar
                      </button>
                    </div>
                  </div>

                  <!-- Texto normal -->
                  <p *ngIf="!c.banned && editingCommentId !== c.id" class="small mb-0 text-dark">
                    {{ c.content }}
                  </p>
                </div>
              </div>
            </div>

            <!-- Formulario Validado para Publicar Comentario -->
            <div class="card-forum p-4">
              <h6 class="fw-bold mb-3">
                <i class="bi bi-reply-fill text-primary me-1"></i>Responder en este Tema
              </h6>

              <ng-container *ngIf="currentUser; else guestCommentPrompt">
                <div *ngIf="topic.banned" class="alert alert-warning small mb-0">
                  Este tema se encuentra baneado por moderación y no admite nuevos comentarios.
                </div>

                <form *ngIf="!topic.banned" [formGroup]="commentForm" (ngSubmit)="onAddComment()" novalidate>
                  <div class="mb-3">
                    <textarea
                      rows="3"
                      class="form-control"
                      formControlName="content"
                      placeholder="Escribe tu comentario respetando las normas de la comunidad (mínimo 5 caracteres)..."
                      [ngClass]="{
                        'is-invalid': commentSubmitted && commentForm.get('content')?.invalid
                      }"
                    ></textarea>
                    <div class="invalid-feedback">
                      <span *ngIf="commentForm.get('content')?.errors?.['required']">
                        El comentario no puede estar vacío.
                      </span>
                      <span *ngIf="commentForm.get('content')?.errors?.['minlength']">
                        El comentario debe tener al menos 5 caracteres.
                      </span>
                      <span *ngIf="commentForm.get('content')?.errors?.['maxlength']">
                        El comentario no puede superar los 1500 caracteres.
                      </span>
                    </div>
                  </div>
                  <button type="submit" class="btn btn-primary px-4 fw-semibold">
                    <i class="bi bi-send me-2"></i>Publicar Comentario
                  </button>
                </form>
              </ng-container>

              <ng-template #guestCommentPrompt>
                <p class="small text-muted mb-3">
                  Debes iniciar sesión con tu cuenta para comentar en este tema.
                </p>
                <a routerLink="/login" class="btn btn-sm btn-primary rounded-pill px-3">
                  Iniciar Sesión
                </a>
              </ng-template>
            </div>
          </div>

          <!-- Columna Lateral de Moderación y Detalles (Grid 12: 12 móvil, 4 desktop) -->
          <div class="col-12 col-lg-4">
            <div class="card-forum p-4 mb-4" *ngIf="currentUser?.role === 'ADMIN'">
              <h6 class="fw-bold text-uppercase small text-danger mb-2">
                <i class="bi bi-shield-shaded me-1"></i>Herramientas de Moderación (ADMIN)
              </h6>
              <p class="small text-muted mb-3">
                Como administrador puedes banear este tema o cualquiera de sus comentarios si incumplen las normas del foro.
              </p>
              <div class="mb-2">
                <label class="form-label small fw-semibold">Motivo de moderación / baneo:</label>
                <input
                  type="text"
                  class="form-control form-control-sm"
                  [(ngModel)]="moderationReason"
                  placeholder="Ej: Spam o lenguaje inapropiado"
                />
              </div>
              <button
                type="button"
                class="btn btn-sm w-100 fw-semibold mt-2"
                [ngClass]="topic.banned ? 'btn-success' : 'btn-danger'"
                (click)="onToggleBanTopic()"
              >
                <i class="bi" [ngClass]="topic.banned ? 'bi-check2-circle me-1' : 'bi-slash-circle me-1'"></i>
                {{ topic.banned ? 'Quitar Baneo al Tema' : 'Banear Tema por Infracción' }}
              </button>
            </div>

            <div class="card-forum p-4">
              <h6 class="fw-bold text-uppercase small text-secondary mb-3">
                Información del Debate
              </h6>
              <div class="small d-flex justify-content-between py-1 border-bottom">
                <span class="text-muted">ID del Tema:</span>
                <span class="fw-semibold">#{{ topic.id }}</span>
              </div>
              <div class="small d-flex justify-content-between py-1 border-bottom">
                <span class="text-muted">Categoría:</span>
                <span class="fw-semibold">{{ getCategoryName(topic.categoryId) }}</span>
              </div>
              <div class="small d-flex justify-content-between py-1 border-bottom">
                <span class="text-muted">Autor:</span>
                <span class="fw-semibold">{{ getAuthorName(topic.authorId) }}</span>
              </div>
              <div class="small d-flex justify-content-between py-1">
                <span class="text-muted">Estado:</span>
                <span class="badge" [ngClass]="topic.banned ? 'bg-danger' : 'bg-success'">
                  {{ topic.banned ? 'Baneado' : 'Activo' }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </ng-container>

      <ng-template #notFoundTpl>
        <div class="card-forum p-5 text-center">
          <h4 class="fw-bold">Tema no encontrado</h4>
          <p class="text-muted">El tema solicitado no existe o fue eliminado.</p>
          <a routerLink="/foro" class="btn btn-primary rounded-pill px-4">Volver al Foro</a>
        </div>
      </ng-template>
    </div>
  `
})
export class TopicDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly store = inject(ForumStoreService);

  topic: Topic | undefined;
  comments: Comment[] = [];
  users: User[] = [];
  currentUser: User | null = null;

  commentSubmitted = false;
  actionNotice = '';
  moderationReason = 'Incumplimiento de las normas del foro.';

  editingCommentId: number | null = null;
  editingCommentText = '';

  readonly commentForm = this.fb.nonNullable.group({
    content: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(1500)]]
  });

  ngOnInit(): void {
    this.store.users$.subscribe(u => (this.users = u));
    this.store.currentUser$.subscribe(u => (this.currentUser = u));
    this.loadTopicData();
  }

  loadTopicData(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.topic = this.store.getTopicById(id);
    if (this.topic) {
      this.comments = this.store.getCommentsByTopic(id);
    }
  }

  canModifyTopic(): boolean {
    if (!this.currentUser || !this.topic) return false;
    return this.currentUser.role === 'ADMIN' || this.currentUser.id === this.topic.authorId;
  }

  canModifyComment(c: Comment): boolean {
    if (!this.currentUser) return false;
    return this.currentUser.role === 'ADMIN' || this.currentUser.id === c.authorId;
  }

  onAddComment(): void {
    this.commentSubmitted = true;
    if (this.commentForm.invalid || !this.topic) {
      this.commentForm.markAllAsTouched();
      return;
    }

    const { content } = this.commentForm.getRawValue();
    const res = this.store.addComment(this.topic.id, content);
    if (res.ok) {
      this.commentForm.reset();
      this.commentSubmitted = false;
      this.actionNotice = res.message;
      this.loadTopicData();
    }
  }

  startEditComment(c: Comment): void {
    this.editingCommentId = c.id;
    this.editingCommentText = c.content;
  }

  saveEditComment(commentId: number): void {
    if (this.editingCommentText.trim().length < 5) return;
    const res = this.store.updateComment(commentId, this.editingCommentText);
    this.editingCommentId = null;
    this.actionNotice = res.message;
    this.loadTopicData();
  }

  onDeleteComment(commentId: number): void {
    const res = this.store.deleteComment(commentId);
    this.actionNotice = res.message;
    this.loadTopicData();
  }

  onToggleBanComment(c: Comment): void {
    const res = this.store.toggleBanComment(c.id, this.moderationReason);
    this.actionNotice = res.message;
    this.loadTopicData();
  }

  onToggleBanTopic(): void {
    if (!this.topic) return;
    const res = this.store.toggleBanTopic(this.topic.id, this.moderationReason);
    this.actionNotice = res.message;
    this.loadTopicData();
  }

  onDeleteTopic(): void {
    if (!this.topic) return;
    const res = this.store.deleteTopic(this.topic.id);
    if (res.ok) {
      this.router.navigate(['/foro']);
    }
  }

  getCategoryName(categoryId: number): string {
    return this.store.getCategoryById(categoryId)?.name ?? 'General';
  }

  getAuthorName(authorId: number): string {
    return this.users.find(u => u.id === authorId)?.displayName ?? `Usuario #${authorId}`;
  }

  getAuthorRole(authorId: number): string {
    return this.users.find(u => u.id === authorId)?.role ?? 'USER';
  }
}
