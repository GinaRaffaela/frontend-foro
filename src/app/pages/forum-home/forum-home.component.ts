import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Category, Topic, User } from '../../core/models/forum.models';
import { ForumStoreService } from '../../core/services/forum-store.service';

@Component({
  selector: 'app-forum-home',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <!-- Hero Banner Responsivo -->
    <section class="bg-forum-gradient text-white py-4 py-lg-5 mb-4">
      <div class="container">
        <div class="row align-items-center g-4">
          <div class="col-12 col-lg-8">
            <span class="badge bg-warning text-dark fw-semibold px-3 py-2 rounded-pill mb-2">
              <i class="bi bi-stars me-1"></i>Comunidad de Debate y Conocimiento
            </span>
            <h1 class="hero-title fw-bold mb-2">Sistema de Foros en Línea ForoDuoc</h1>
            <p class="text-white-50 mb-0">
              Explora nuestras {{ categories.length }} categorías temáticas, participa en discusiones técnicas y comparte con la comunidad.
            </p>
          </div>
          <div class="col-12 col-lg-4 text-lg-end">
            <div class="d-flex flex-wrap justify-content-lg-end gap-2 responsive-stack-actions">
              <a
                *ngIf="currentUser; else loginPromptBtn"
                routerLink="/foro/nuevo-tema"
                class="btn btn-warning text-dark fw-bold px-4 py-2 rounded-pill shadow-sm"
              >
                <i class="bi bi-plus-lg me-2"></i>Publicar Nuevo Tema
              </a>
              <ng-template #loginPromptBtn>
                <a routerLink="/login" class="btn btn-warning text-dark fw-bold px-4 py-2 rounded-pill">
                  <i class="bi bi-box-arrow-in-right me-2"></i>Inicia Sesión para Publicar
                </a>
              </ng-template>
            </div>
          </div>
        </div>
      </div>
    </section>

    <div class="container pb-5">
      <!-- Grilla de 12 Columnas: Tarjetas de Categorías (Móvil: col-12, Tablet: col-md-6/col-md-4, Desktop: col-lg) -->
      <div class="mb-4">
        <div class="d-flex justify-content-between align-items-center mb-3">
          <h5 class="fw-bold mb-0">
            <i class="bi bi-grid-fill text-primary me-2"></i>Categorías del Foro ({{ categories.length }})
          </h5>
          <button
            *ngIf="selectedCategoryId !== 0"
            type="button"
            class="btn btn-sm btn-outline-primary rounded-pill"
            (click)="selectCategory(0)"
          >
            Ver todas las categorías
          </button>
        </div>

        <div class="row g-3">
          <div
            class="col-12 col-sm-6 col-md-4 col-lg"
            *ngFor="let cat of categories"
          >
            <div
              class="category-pill p-3 h-100 d-flex flex-column justify-content-between"
              [class.active]="selectedCategoryId === cat.id"
              (click)="selectCategory(cat.id)"
            >
              <div>
                <div class="d-flex justify-content-between align-items-start mb-2">
                  <span class="fs-4 text-primary">
                    <i class="bi" [ngClass]="cat.icon"></i>
                  </span>
                  <span class="badge rounded-pill bg-primary bg-opacity-10 text-primary">
                    {{ getCategoryTopicCount(cat.id) }} temas
                  </span>
                </div>
                <h6 class="fw-bold mb-1">{{ cat.name }}</h6>
                <p class="text-muted small mb-0" style="font-size: 0.8rem;">
                  {{ cat.description }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Layout Principal en Grid de 12 Columnas: 8/9 cols contenido + 4/3 cols sidebar -->
      <div class="row g-4">
        <!-- Columna Principal de Temas -->
        <div class="col-12 col-lg-8 col-xl-9">
          <!-- Barra de búsqueda y filtros -->
          <div class="card-forum p-3 mb-4">
            <div class="row g-2 align-items-center">
              <div class="col-12 col-md-6">
                <div class="input-group">
                  <span class="input-group-text bg-light border-end-0">
                    <i class="bi bi-search text-muted"></i>
                  </span>
                  <input
                    type="text"
                    class="form-control border-start-0"
                    placeholder="Buscar temas por título, contenido o etiqueta..."
                    [(ngModel)]="searchQuery"
                  />
                  <button
                    *ngIf="searchQuery"
                    type="button"
                    class="btn btn-outline-secondary"
                    (click)="searchQuery = ''"
                  >
                    <i class="bi bi-x-lg"></i>
                  </button>
                </div>
              </div>

              <div class="col-6 col-md-3">
                <select class="form-select" [(ngModel)]="selectedCategoryId">
                  <option [ngValue]="0">Todas las categorías</option>
                  <option *ngFor="let cat of categories" [ngValue]="cat.id">
                    {{ cat.name }}
                  </option>
                </select>
              </div>

              <div class="col-6 col-md-3">
                <select class="form-select" [(ngModel)]="sortBy">
                  <option value="recent">Más recientes</option>
                  <option value="comments">Más comentados</option>
                  <option value="Pinned">Destacados primero</option>
                </select>
              </div>
            </div>
          </div>

          <!-- Listado de Temas -->
          <div class="d-flex justify-content-between align-items-center mb-3">
            <span class="text-muted small fw-semibold">
              Mostrando {{ filteredTopics.length }} tema(s) en la colección
            </span>
            <div class="form-check form-switch small" *ngIf="currentUser?.role === 'ADMIN'">
              <input
                id="toggleBannedView"
                class="form-check-input"
                type="checkbox"
                [(ngModel)]="showBannedTopics"
              />
              <label for="toggleBannedView" class="form-check-label text-danger fw-semibold">
                Mostrar temas baneados
              </label>
            </div>
          </div>

          <div *ngIf="filteredTopics.length === 0" class="card-forum p-5 text-center">
            <i class="bi bi-inbox fs-1 text-muted mb-2 d-block"></i>
            <h5 class="fw-bold">No se encontraron temas</h5>
            <p class="text-muted small mb-3">
              Prueba cambiando los filtros de búsqueda o sé el primero en publicar en esta categoría.
            </p>
            <a *ngIf="currentUser" routerLink="/foro/nuevo-tema" class="btn btn-primary btn-sm rounded-pill px-3">
              Publicar Tema Ahora
            </a>
          </div>

          <div class="d-flex flex-column gap-3">
            <div
              *ngFor="let topic of filteredTopics"
              class="card-forum card-forum-hover p-3 p-md-4"
              [class.banned-banner]="topic.banned"
            >
              <div class="d-flex flex-column flex-md-row justify-content-between gap-3">
                <div class="flex-grow-1">
                  <div class="d-flex flex-wrap align-items-center gap-2 mb-2">
                    <span *ngIf="topic.pinned" class="badge bg-warning text-dark">
                      <i class="bi bi-pin-angle-fill me-1"></i>Destacado
                    </span>
                    <span class="badge bg-primary bg-opacity-10 text-primary">
                      {{ getCategoryName(topic.categoryId) }}
                    </span>
                    <span *ngIf="topic.banned" class="badge bg-danger">
                      <i class="bi bi-slash-circle me-1"></i>Baneado por Moderación
                    </span>
                    <span class="text-muted small">
                      <i class="bi bi-clock me-1"></i>{{ topic.createdAt | date:'dd/MM/yyyy HH:mm' }}
                    </span>
                  </div>

                  <h5 class="fw-bold mb-2">
                    <a
                      [routerLink]="['/foro/tema', topic.id]"
                      class="text-decoration-none text-dark stretched-link-custom"
                    >
                      {{ topic.title }}
                    </a>
                  </h5>

                  <p class="text-secondary small mb-3">
                    {{ topic.content.length > 180 ? (topic.content | slice:0:180) + '...' : topic.content }}
                  </p>

                  <div *ngIf="topic.banned && topic.banReason" class="alert alert-danger py-1 px-2 small mb-2">
                    <strong>Motivo de moderación:</strong> {{ topic.banReason }}
                  </div>

                  <div class="d-flex flex-wrap align-items-center justify-content-between gap-2">
                    <div class="d-flex align-items-center gap-2">
                      <div class="avatar-circle bg-primary bg-opacity-10 text-primary" style="width: 30px; height: 30px; font-size: 0.8rem;">
                        {{ getAuthorName(topic.authorId).charAt(0).toUpperCase() }}
                      </div>
                      <span class="small fw-semibold">{{ getAuthorName(topic.authorId) }}</span>
                      <span
                        class="badge rounded-pill"
                        style="font-size: 0.65rem;"
                        [ngClass]="getAuthorRole(topic.authorId) === 'ADMIN' ? 'bg-warning text-dark' : 'bg-light text-secondary border'"
                      >
                        {{ getAuthorRole(topic.authorId) }}
                      </span>
                    </div>

                    <div class="d-flex flex-wrap gap-1">
                      <span
                        *ngFor="let tag of topic.tags"
                        class="badge bg-light text-secondary border fw-normal"
                      >
                        #{{ tag }}
                      </span>
                    </div>
                  </div>
                </div>

                <div class="d-flex flex-row flex-md-column justify-content-between align-items-center align-items-md-end border-top border-md-0 pt-2 pt-md-0 ms-md-3" style="min-width: 110px;">
                  <div class="text-md-end">
                    <span class="badge bg-light text-dark border px-3 py-2 rounded-pill">
                      <i class="bi bi-chat-dots text-primary me-1"></i>
                      {{ getCommentCount(topic.id) }} resp.
                    </span>
                  </div>
                  <a
                    [routerLink]="['/foro/tema', topic.id]"
                    class="btn btn-sm btn-outline-primary rounded-pill px-3 mt-md-3"
                  >
                    Ver debate <i class="bi bi-arrow-right ms-1"></i>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Barra Lateral Derecha (Grid 12: 12 en móvil, 4 en lg, 3 en xl) -->
        <div class="col-12 col-lg-4 col-xl-3">
          <div class="sticky-sidebar d-flex flex-column gap-4">
            <!-- Tarjeta de Estado de Sesión y Privilegios -->
            <div class="card-forum p-4">
              <h6 class="fw-bold text-uppercase small text-secondary mb-3">
                <i class="bi bi-person-badge me-1"></i>Tu Estado en el Foro
              </h6>

              <ng-container *ngIf="currentUser as user; else guestSidebar">
                <div class="d-flex align-items-center gap-3 mb-3">
                  <div class="avatar-circle bg-primary text-white">
                    {{ user.displayName.charAt(0).toUpperCase() }}
                  </div>
                  <div>
                    <div class="fw-bold">{{ user.displayName }}</div>
                    <span
                      class="badge rounded-pill"
                      [ngClass]="user.role === 'ADMIN' ? 'bg-warning text-dark' : 'bg-primary'"
                    >
                      Rol {{ user.role }}
                    </span>
                  </div>
                </div>
                <ul class="list-unstyled small text-secondary mb-3">
                  <li class="mb-1"><i class="bi bi-check2 text-success me-1"></i>Publicar y comentar temas</li>
                  <li class="mb-1"><i class="bi bi-check2 text-success me-1"></i>Editar tus publicaciones</li>
                  <li *ngIf="user.role === 'ADMIN'" class="mb-1 text-dark fw-semibold">
                    <i class="bi bi-shield-fill-check text-warning me-1"></i>Banear temas/comentarios y gestionar usuarios
                  </li>
                </ul>
                <div class="d-grid gap-2">
                  <a routerLink="/foro/nuevo-tema" class="btn btn-sm btn-primary rounded-pill">
                    <i class="bi bi-plus-circle me-1"></i>Crear Nuevo Tema
                  </a>
                  <a *ngIf="user.role === 'ADMIN'" routerLink="/admin" class="btn btn-sm btn-warning text-dark fw-semibold rounded-pill">
                    <i class="bi bi-sliders me-1"></i>Ir al Panel Admin
                  </a>
                </div>
              </ng-container>

              <ng-template #guestSidebar>
                <p class="small text-muted mb-3">
                  Actualmente navegas como <strong>Visitante</strong>. Inicia sesión o regístrate para publicar temas y comentar.
                </p>
                <div class="d-grid gap-2">
                  <a routerLink="/login" class="btn btn-sm btn-primary rounded-pill">Iniciar Sesión</a>
                  <a routerLink="/registro" class="btn btn-sm btn-outline-primary rounded-pill">Crear Cuenta</a>
                </div>
              </ng-template>
            </div>

            <!-- Estadísticas de las Colecciones Angular -->
            <div class="card-forum p-4">
              <h6 class="fw-bold text-uppercase small text-secondary mb-3">
                <i class="bi bi-bar-chart-fill me-1"></i>Estadísticas en Memoria
              </h6>
              <div class="row g-2 text-center">
                <div class="col-6">
                  <div class="p-2 bg-light rounded-3 border">
                    <div class="fw-bold fs-5 text-primary">{{ categories.length }}</div>
                    <div class="text-muted" style="font-size: 0.75rem;">Categorías</div>
                  </div>
                </div>
                <div class="col-6">
                  <div class="p-2 bg-light rounded-3 border">
                    <div class="fw-bold fs-5 text-primary">{{ topics.length }}</div>
                    <div class="text-muted" style="font-size: 0.75rem;">Temas</div>
                  </div>
                </div>
                <div class="col-6">
                  <div class="p-2 bg-light rounded-3 border">
                    <div class="fw-bold fs-5 text-primary">{{ totalComments }}</div>
                    <div class="text-muted" style="font-size: 0.75rem;">Comentarios</div>
                  </div>
                </div>
                <div class="col-6">
                  <div class="p-2 bg-light rounded-3 border">
                    <div class="fw-bold fs-5 text-primary">{{ users.length }}</div>
                    <div class="text-muted" style="font-size: 0.75rem;">Usuarios</div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Normas del Foro -->
            <div class="card-forum p-4">
              <h6 class="fw-bold text-uppercase small text-secondary mb-2">
                <i class="bi bi-journal-check me-1"></i>Normas de Convivencia
              </h6>
              <ol class="small text-muted ps-3 mb-0">
                <li class="mb-1">Mantener el respeto entre todos los miembros.</li>
                <li class="mb-1">Publicar cada tema en su categoría correspondiente.</li>
                <li class="mb-1">No compartir contraseñas, tokens ni datos sensibles.</li>
                <li>Los administradores podrán banear temas o comentarios que infrinjan estas normas.</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class ForumHomeComponent implements OnInit {
  private readonly store = inject(ForumStoreService);

  categories: Category[] = [];
  topics: Topic[] = [];
  users: User[] = [];
  currentUser: User | null = null;
  totalComments = 0;

  searchQuery = '';
  selectedCategoryId = 0;
  sortBy: 'recent' | 'comments' | 'Pinned' = 'Pinned';
  showBannedTopics = true;

  ngOnInit(): void {
    this.store.categories$.subscribe(c => (this.categories = c));
    this.store.topics$.subscribe(t => (this.topics = t));
    this.store.users$.subscribe(u => (this.users = u));
    this.store.currentUser$.subscribe(u => (this.currentUser = u));
    this.store.comments$.subscribe(c => (this.totalComments = c.length));
  }

  selectCategory(categoryId: number): void {
    this.selectedCategoryId = this.selectedCategoryId === categoryId ? 0 : categoryId;
  }

  get filteredTopics(): Topic[] {
    const q = this.searchQuery.trim().toLowerCase();

    return this.topics
      .filter(t => {
        if (t.banned && (!this.currentUser || this.currentUser.role !== 'ADMIN' || !this.showBannedTopics)) {
          return false;
        }
        if (this.selectedCategoryId !== 0 && t.categoryId !== Number(this.selectedCategoryId)) {
          return false;
        }
        if (!q) return true;
        const matchTitle = t.title.toLowerCase().includes(q);
        const matchContent = t.content.toLowerCase().includes(q);
        const matchTags = t.tags.some(tag => tag.toLowerCase().includes(q));
        return matchTitle || matchContent || matchTags;
      })
      .sort((a, b) => {
        if (this.sortBy === 'Pinned' && a.pinned !== b.pinned) {
          return a.pinned ? -1 : 1;
        }
        if (this.sortBy === 'comments') {
          return this.getCommentCount(b.id) - this.getCommentCount(a.id);
        }
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }

  getCategoryName(categoryId: number): string {
    return this.categories.find(c => c.id === categoryId)?.name ?? 'General';
  }

  getCategoryTopicCount(categoryId: number): number {
    return this.store.getTopicCountByCategory(categoryId);
  }

  getCommentCount(topicId: number): number {
    return this.store.getCommentCountByTopic(topicId);
  }

  getAuthorName(authorId: number): string {
    return this.users.find(u => u.id === authorId)?.displayName ?? `Usuario #${authorId}`;
  }

  getAuthorRole(authorId: number): string {
    return this.users.find(u => u.id === authorId)?.role ?? 'USER';
  }
}
