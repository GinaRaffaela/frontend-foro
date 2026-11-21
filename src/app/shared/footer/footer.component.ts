import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ForumStoreService } from '../../core/services/forum-store.service';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <footer class="bg-white border-top mt-auto py-4">
      <div class="container">
        <div class="row g-4 align-items-center">
          <div class="col-12 col-md-6 col-lg-5">
            <div class="d-flex align-items-center gap-2 mb-2">
              <span class="bg-primary text-white rounded-3 px-2 py-1">
                <i class="bi bi-chat-square-quote-fill"></i>
              </span>
              <span class="fw-bold fs-5">ForoDuoc</span>
            </div>
            <p class="text-muted small mb-0">
              Sistema de Foros en Línea desarrollado con Angular, Bootstrap 5 (Grid 12 columnas) y gestión reactiva de colecciones en memoria.
            </p>
          </div>

          <div class="col-12 col-md-6 col-lg-4">
            <h6 class="fw-bold text-uppercase small text-secondary mb-2">Accesos Rápidos</h6>
            <div class="d-flex flex-wrap gap-3 small">
              <a routerLink="/foro" class="text-decoration-none text-secondary">Explorar Foro</a>
              <a routerLink="/login" class="text-decoration-none text-secondary">Iniciar Sesión</a>
              <a routerLink="/registro" class="text-decoration-none text-secondary">Registro</a>
              <a routerLink="/recuperar-password" class="text-decoration-none text-secondary">Recuperar Clave</a>
              <a routerLink="/perfil" class="text-decoration-none text-secondary">Mi Perfil</a>
            </div>
          </div>

        </div>
      </div>
    </footer>
  `
})
export class FooterComponent {
  private readonly store = inject(ForumStoreService);
}
