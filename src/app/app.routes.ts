import { Routes } from '@angular/router';
import { adminGuard, authGuard } from './core/guards/auth.guard';
import { AdminPanelComponent } from './pages/admin-panel/admin-panel.component';
import { ForumHomeComponent } from './pages/forum-home/forum-home.component';
import { LoginComponent } from './pages/login/login.component';
import { ProfileComponent } from './pages/profile/profile.component';
import { RecoverPasswordComponent } from './pages/recover-password/recover-password.component';
import { RegisterComponent } from './pages/register/register.component';
import { TopicDetailComponent } from './pages/topic-detail/topic-detail.component';
import { TopicFormComponent } from './pages/topic-form/topic-form.component';

export const routes: Routes = [
  { path: '', redirectTo: 'foro', pathMatch: 'full' },
  { path: 'foro', component: ForumHomeComponent, title: 'ForoDuoc — Explorar Foros y Categorías' },
  {
    path: 'foro/nuevo-tema',
    component: TopicFormComponent,
    canActivate: [authGuard],
    title: 'ForoDuoc — Publicar Nuevo Tema'
  },
  {
    path: 'foro/editar-tema/:id',
    component: TopicFormComponent,
    canActivate: [authGuard],
    title: 'ForoDuoc — Editar Tema'
  },
  {
    path: 'foro/tema/:id',
    component: TopicDetailComponent,
    title: 'ForoDuoc — Detalle de Debate'
  },
  { path: 'login', component: LoginComponent, title: 'ForoDuoc — Iniciar Sesión' },
  { path: 'registro', component: RegisterComponent, title: 'ForoDuoc — Registro de Usuarios' },
  {
    path: 'recuperar-password',
    component: RecoverPasswordComponent,
    title: 'ForoDuoc — Recuperar Contraseña'
  },
  {
    path: 'perfil',
    component: ProfileComponent,
    canActivate: [authGuard],
    title: 'ForoDuoc — Modificación de Perfil'
  },
  {
    path: 'admin',
    component: AdminPanelComponent,
    canActivate: [adminGuard],
    title: 'ForoDuoc — Moderación y Administración'
  },
  { path: '**', redirectTo: 'foro' }
];
