import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { ForumStoreService } from '../../core/services/forum-store.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  template: `
    <nav class="navbar navbar-expand-lg navbar-dark bg-forum-gradient sticky-top shadow-sm py-2">
      <div class="container">
        <a class="navbar-brand d-flex align-items-center gap-2 fw-bold" routerLink="/foro">
          <span class="bg-warning text-dark rounded-3 px-2 py-1 d-inline-flex align-items-center">
            <i class="bi bi-chat-square-quote-fill"></i>
          </span>
          <span>ForoDuoc</span>
          <span class="badge bg-light text-primary fw-semibold d-none d-sm-inline-block" style="font-size: 0.7rem;">
            Full Stack III
          </span>
        </a>

        <button
          class="navbar-toggler border-0"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#mainForumNavbar"
          aria-controls="mainForumNavbar"
          aria-expanded="false"
          aria-label="Alternar navegación"
        >
          <span class="navbar-toggler-icon"></span>
        </button>

        <div class="collapse navbar-collapse" id="mainForumNavbar">
          <ul class="navbar-nav me-auto mb-2 mb-lg-0 ms-lg-3 gap-lg-1">
            <li class="nav-item">
              <a
                class="nav-link px-3 rounded-pill"
                routerLink="/foro"
                routerLinkActive="active bg-white bg-opacity-10 fw-semibold"
                [routerLinkActiveOptions]="{ exact: true }"
              >
                <i class="bi bi-compass me-1"></i>Explorar Foro
              </a>
            </li>

            <li class="nav-item" *ngIf="currentUser$ | async">
              <a
                class="nav-link px-3 rounded-pill"
                routerLink="/foro/nuevo-tema"
                routerLinkActive="active bg-white bg-opacity-10 fw-semibold"
              >
                <i class="bi bi-plus-circle me-1"></i>Publicar Tema
              </a>
            </li>

            <li class="nav-item" *ngIf="(currentUser$ | async)?.role === 'ADMIN'">
              <a
                class="nav-link px-3 rounded-pill text-warning"
                routerLink="/admin"
                routerLinkActive="active bg-white bg-opacity-10 fw-semibold"
              >
                <i class="bi bi-shield-lock-fill me-1"></i>Moderación y Admin
              </a>
            </li>
          </ul>

          <div class="d-flex flex-column flex-lg-row align-items-stretch align-items-lg-center gap-2 mt-2 mt-lg-0">
            <ng-container *ngIf="currentUser$ | async as user; else guestButtons">
              <a
                routerLink="/perfil"
                class="btn btn-sm btn-outline-light d-flex align-items-center justify-content-center gap-2 rounded-pill px-3 py-1"
              >
                <i class="bi bi-person-circle"></i>
                <span class="text-truncate" style="max-width: 150px;">{{ user.displayName }}</span>
                <span
                  class="badge rounded-pill"
                  [ngClass]="user.role === 'ADMIN' ? 'bg-warning text-dark' : 'bg-info text-dark'"
                >
                  {{ user.role }}
                </span>
              </a>
              <button
                type="button"
                class="btn btn-sm btn-danger rounded-pill px-3"
                (click)="onLogout()"
              >
                <i class="bi bi-box-arrow-right me-1"></i>Salir
              </button>
            </ng-container>

            <ng-template #guestButtons>
              <a routerLink="/login" class="btn btn-sm btn-outline-light rounded-pill px-3">
                <i class="bi bi-box-arrow-in-right me-1"></i>Iniciar Sesión
              </a>
              <a routerLink="/registro" class="btn btn-sm btn-warning text-dark fw-semibold rounded-pill px-3">
                <i class="bi bi-person-plus-fill me-1"></i>Registrarse
              </a>
            </ng-template>
          </div>
        </div>
      </div>
    </nav>
  `
})
export class NavbarComponent {
  private readonly store = inject(ForumStoreService);
  private readonly router = inject(Router);

  readonly currentUser$ = this.store.currentUser$;

  onLogout(): void {
    this.store.logout();
    this.router.navigate(['/login']);
  }
}
