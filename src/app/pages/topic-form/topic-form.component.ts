import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ForumStoreService } from '../../core/services/forum-store.service';

@Component({
  selector: 'app-topic-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="container py-4 py-lg-5">
      <div class="row justify-content-center">
        <div class="col-12 col-lg-8">
          <div class="card-forum p-4 p-md-5">
            <div class="d-flex justify-content-between align-items-center mb-4 pb-3 border-bottom">
              <div>
                <span class="badge bg-primary bg-opacity-10 text-primary fw-semibold mb-1">
                  {{ isEditMode ? 'Edición de Publicación' : 'Nueva Publicación' }}
                </span>
                <h3 class="fw-bold mb-0">
                  {{ isEditMode ? 'Editar Tema del Foro' : 'Publicar Nuevo Tema' }}
                </h3>
              </div>
              <a routerLink="/foro" class="btn btn-sm btn-outline-secondary rounded-pill">
                <i class="bi bi-arrow-left me-1"></i>Cancelar
              </a>
            </div>

            <div *ngIf="errorMessage" class="alert alert-danger py-2">{{ errorMessage }}</div>

            <form [formGroup]="topicForm" (ngSubmit)="onSubmit()" novalidate>
              <!-- Título del Tema -->
              <div class="mb-3">
                <label class="form-label fw-semibold">Título del Tema *</label>
                <input
                  type="text"
                  class="form-control"
                  formControlName="title"
                  placeholder="Ej: Consultas sobre configuración de Docker Compose con Oracle"
                  [ngClass]="{
                    'is-invalid': isInvalid('title'),
                    'is-valid': isValid('title')
                  }"
                />
                <div class="invalid-feedback">
                  <span *ngIf="topicForm.get('title')?.errors?.['required']">El título del tema es obligatorio.</span>
                  <span *ngIf="topicForm.get('title')?.errors?.['minlength']">El título debe tener al menos 5 caracteres.</span>
                  <span *ngIf="topicForm.get('title')?.errors?.['maxlength']">El título no puede exceder 180 caracteres.</span>
                </div>
              </div>

              <div class="row g-3 mb-3">
                <!-- Selección de Categoría -->
                <div class="col-12 col-md-6">
                  <label class="form-label fw-semibold">Categoría *</label>
                  <select
                    class="form-select"
                    formControlName="categoryId"
                    [ngClass]="{
                      'is-invalid': isInvalid('categoryId'),
                      'is-valid': isValid('categoryId')
                    }"
                  >
                    <option *ngFor="let cat of categories$ | async" [value]="cat.id">
                      {{ cat.name }}
                    </option>
                  </select>
                  <div class="invalid-feedback">Selecciona una categoría válida.</div>
                </div>

                <!-- Etiquetas -->
                <div class="col-12 col-md-6">
                  <label class="form-label fw-semibold">Etiquetas (separadas por coma) *</label>
                  <input
                    type="text"
                    class="form-control"
                    formControlName="tagsInput"
                    placeholder="Ej: Spring Boot, Angular, Docker"
                    [ngClass]="{
                      'is-invalid': isInvalid('tagsInput'),
                      'is-valid': isValid('tagsInput')
                    }"
                  />
                  <div class="invalid-feedback">
                    Ingresa al menos una etiqueta descriptiva (mínimo 2 caracteres).
                  </div>
                </div>
              </div>

              <!-- Contenido del Tema -->
              <div class="mb-4">
                <label class="form-label fw-semibold">Contenido del Debate *</label>
                <textarea
                  rows="6"
                  class="form-control"
                  formControlName="content"
                  placeholder="Desarrolla tu consulta, aporte o tema de conversación con claridad..."
                  [ngClass]="{
                    'is-invalid': isInvalid('content'),
                    'is-valid': isValid('content')
                  }"
                ></textarea>
                <div class="invalid-feedback">
                  <span *ngIf="topicForm.get('content')?.errors?.['required']">El contenido del tema es obligatorio.</span>
                  <span *ngIf="topicForm.get('content')?.errors?.['minlength']">
                    El contenido debe tener al menos 15 caracteres para aportar contexto.
                  </span>
                  <span *ngIf="topicForm.get('content')?.errors?.['maxlength']">
                    El contenido no puede superar los 4000 caracteres.
                  </span>
                </div>
              </div>

              <div class="d-flex flex-column flex-sm-row justify-content-end gap-2">
                <a routerLink="/foro" class="btn btn-outline-secondary px-4">Cancelar</a>
                <button type="submit" class="btn btn-primary px-4 fw-semibold">
                  <i class="bi bi-send-fill me-2"></i>
                  {{ isEditMode ? 'Guardar Cambios' : 'Publicar Tema en el Foro' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  `
})
export class TopicFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly store = inject(ForumStoreService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly categories$ = this.store.categories$;

  isEditMode = false;
  editingTopicId: number | null = null;
  submitted = false;
  errorMessage = '';

  readonly topicForm = this.fb.nonNullable.group({
    title: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(180)]],
    categoryId: [1, [Validators.required]],
    tagsInput: ['General', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
    content: ['', [Validators.required, Validators.minLength(15), Validators.maxLength(4000)]]
  });

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.isEditMode = true;
      this.editingTopicId = Number(idParam);
      const existing = this.store.getTopicById(this.editingTopicId);
      if (!existing) {
        this.router.navigate(['/foro']);
        return;
      }
      this.topicForm.patchValue({
        title: existing.title,
        categoryId: existing.categoryId,
        tagsInput: existing.tags.join(', '),
        content: existing.content
      });
    }
  }

  isInvalid(field: string): boolean {
    const control = this.topicForm.get(field);
    return !!(control && control.invalid && (control.dirty || control.touched || this.submitted));
  }

  isValid(field: string): boolean {
    const control = this.topicForm.get(field);
    return !!(control && control.valid && (control.dirty || control.touched));
  }

  onSubmit(): void {
    this.submitted = true;
    this.errorMessage = '';

    if (this.topicForm.invalid) {
      this.topicForm.markAllAsTouched();
      return;
    }

    const raw = this.topicForm.getRawValue();
    const tags = raw.tagsInput
      .split(',')
      .map(t => t.trim())
      .filter(Boolean);

    if (this.isEditMode && this.editingTopicId !== null) {
      const res = this.store.updateTopic(this.editingTopicId, {
        title: raw.title,
        categoryId: Number(raw.categoryId),
        content: raw.content,
        tags
      });
      if (!res.ok) {
        this.errorMessage = res.message;
        return;
      }
      this.router.navigate(['/foro/tema', this.editingTopicId]);
      return;
    }

    const res = this.store.createTopic({
      title: raw.title,
      categoryId: Number(raw.categoryId),
      content: raw.content,
      tags
    });

    if (!res.ok || !res.topic) {
      this.errorMessage = res.message;
      return;
    }

    this.router.navigate(['/foro/tema', res.topic.id]);
  }
}
