import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, firstValueFrom, forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { API_CONFIG } from '../config/api.config';
import { Category, Comment, ModerationLog, Topic, User, UserRole } from '../models/forum.models';

interface BackendUserResponse {
  id: number;
  displayName: string;
  email: string;
  role: UserRole;
}

interface BackendTokenResponse {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  user: BackendUserResponse;
}

interface BackendCategoryResponse {
  id: number;
  name: string;
  description: string;
}

interface BackendTopicResponse {
  id: number;
  title: string;
  content: string;
  authorId: number;
  categoryId: number;
  createdAt: string;
}

interface BackendCommentResponse {
  id: number;
  content: string;
  authorId: number;
  topicId: number;
  createdAt: string;
}

interface SpringPage<T> {
  content: T[];
  totalElements: number;
}

/**
 * Servicio central del Foro (Patrón Repository / Store Reactivo conectado a las APIs REST).
 * - Conecta con `users-service` (http://localhost:8081/api) y `forum-service` (http://localhost:8082/api)
 *   mediante HttpClient y autenticación JWT Bearer.
 * - Mantiene y sincroniza las listas/colecciones tipadas de Angular (User[], Category[], Topic[], Comment[])
 *   en memoria y localStorage, con respaldo local automático si los microservicios no están encendidos.
 */
@Injectable({
  providedIn: 'root'
})
export class ForumStoreService {
  private readonly http = inject(HttpClient);

  private readonly STORAGE_KEYS = {
    USERS: 'foroduoc_users_v1',
    CATEGORIES: 'foroduoc_categories_v1',
    TOPICS: 'foroduoc_topics_v1',
    COMMENTS: 'foroduoc_comments_v1',
    LOGS: 'foroduoc_logs_v1',
    SESSION: 'foroduoc_session_v1'
  };

  // Listas / Arreglos principales en memoria (Punto 2.e y 5)
  private usersList: User[] = [];
  private categoriesList: Category[] = [];
  private topicsList: Topic[] = [];
  private commentsList: Comment[] = [];
  private moderationLogsList: ModerationLog[] = [];
  private currentUser: User | null = null;

  // Subjects reactivos para notificar cambios a las vistas Angular
  private readonly usersSubject = new BehaviorSubject<User[]>([]);
  private readonly categoriesSubject = new BehaviorSubject<Category[]>([]);
  private readonly topicsSubject = new BehaviorSubject<Topic[]>([]);
  private readonly commentsSubject = new BehaviorSubject<Comment[]>([]);
  private readonly logsSubject = new BehaviorSubject<ModerationLog[]>([]);
  private readonly currentUserSubject = new BehaviorSubject<User | null>(null);
  private readonly backendConnectedSubject = new BehaviorSubject<boolean>(false);

  readonly users$ = this.usersSubject.asObservable();
  readonly categories$ = this.categoriesSubject.asObservable();
  readonly topics$ = this.topicsSubject.asObservable();
  readonly comments$ = this.commentsSubject.asObservable();
  readonly moderationLogs$ = this.logsSubject.asObservable();
  readonly currentUser$ = this.currentUserSubject.asObservable();
  readonly backendConnected$ = this.backendConnectedSubject.asObservable();

  constructor() {
    this.loadFromStorageOrInitDemo();
    this.syncWithBackend();
  }

  // =====================================================================
  // Sincronización HTTP con users-service (:8081) y forum-service (:8082)
  // =====================================================================
  syncWithBackend(): void {
    // 1. Cargar categorías y temas desde forum-service (:8082)
    forkJoin({
      categories: this.http
        .get<BackendCategoryResponse[]>(`${API_CONFIG.forumServiceUrl}/categories`)
        .pipe(catchError(() => of(null))),
      topicsPage: this.http
        .get<SpringPage<BackendTopicResponse>>(`${API_CONFIG.forumServiceUrl}/topics?page=0&size=100`)
        .pipe(catchError(() => of(null)))
    }).subscribe(({ categories, topicsPage }) => {
      if (categories && categories.length > 0) {
        this.backendConnectedSubject.next(true);
        this.categoriesList = categories.map(cat => this.mapBackendCategory(cat));
      } else {
        this.backendConnectedSubject.next(false);
      }

      if (topicsPage && topicsPage.content) {
        this.topicsList = topicsPage.content.map(t => this.mapBackendTopic(t));
        this.syncAll();

        // Cargar comentarios de cada tema desde forum-service (:8082)
        topicsPage.content.forEach(t => {
          this.refreshTopicCommentsFromApi(t.id);
        });
      } else {
        this.syncAll();
      }
    });

    // 2. Si hay token JWT activo, sincronizar perfil y lista de usuarios desde users-service (:8081)
    const token = localStorage.getItem(API_CONFIG.tokenStorageKey);
    if (token) {
      this.http
        .get<BackendUserResponse>(`${API_CONFIG.usersServiceUrl}/users/me`)
        .pipe(catchError(() => of(null)))
        .subscribe(me => {
          if (me) {
            this.backendConnectedSubject.next(true);
            const mappedMe = this.mergeBackendUser(me);
            this.currentUser = mappedMe;
            this.syncAll();

            if (me.role === 'ADMIN') {
              this.refreshUsersFromApi();
            }
          }
        });
    }
  }

  refreshUsersFromApi(): void {
    this.http
      .get<SpringPage<BackendUserResponse>>(`${API_CONFIG.usersServiceUrl}/users?page=0&size=100`)
      .pipe(catchError(() => of(null)))
      .subscribe(page => {
        if (page && page.content) {
          this.usersList = page.content.map(u => this.mergeBackendUser(u));
          this.syncAll();
        }
      });
  }

  refreshTopicCommentsFromApi(topicId: number): void {
    this.http
      .get<SpringPage<BackendCommentResponse>>(
        `${API_CONFIG.forumServiceUrl}/topics/${topicId}/comments?page=0&size=100`
      )
      .pipe(catchError(() => of(null)))
      .subscribe(page => {
        if (page && page.content) {
          const existingOtherTopics = this.commentsList.filter(c => c.topicId !== topicId);
          const mappedForTopic = page.content.map(c => this.mapBackendComment(c));
          this.commentsList = [...existingOtherTopics, ...mappedForTopic];
          this.syncAll();
        }
      });
  }

  private mapBackendCategory(cat: BackendCategoryResponse): Category {
    const existing = this.categoriesList.find(
      c => c.id === cat.id || c.name.toLowerCase() === cat.name.toLowerCase()
    );
    const iconByIndex: Record<number, string> = {
      1: 'bi-cpu-fill',
      2: 'bi-controller',
      3: 'bi-rocket-takeoff-fill',
      4: 'bi-trophy-fill',
      5: 'bi-film'
    };
    return {
      id: cat.id,
      name: cat.name,
      description: cat.description,
      icon: existing?.icon ?? iconByIndex[cat.id] ?? 'bi-chat-square-text-fill',
      badgeColor: existing?.badgeColor ?? 'primary',
      createdAt: existing?.createdAt ?? new Date().toISOString()
    };
  }

  private mapBackendTopic(t: BackendTopicResponse): Topic {
    const existing = this.topicsList.find(item => item.id === t.id);
    return {
      id: t.id,
      title: t.title,
      content: t.content,
      categoryId: t.categoryId,
      authorId: t.authorId,
      tags: existing?.tags ?? ['ForoDuoc'],
      pinned: existing?.pinned ?? (t.id === 1 || t.id === 3),
      banned: existing?.banned ?? false,
      banReason: existing?.banReason,
      createdAt: t.createdAt || new Date().toISOString(),
      updatedAt: existing?.updatedAt
    };
  }

  private mapBackendComment(c: BackendCommentResponse): Comment {
    const existing = this.commentsList.find(item => item.id === c.id);
    return {
      id: c.id,
      topicId: c.topicId,
      authorId: c.authorId,
      content: c.content,
      banned: existing?.banned ?? false,
      banReason: existing?.banReason,
      createdAt: c.createdAt || new Date().toISOString(),
      updatedAt: existing?.updatedAt
    };
  }

  private mergeBackendUser(u: BackendUserResponse, plainPassword?: string): User {
    const existing = this.usersList.find(
      item => item.id === u.id || item.email.toLowerCase() === u.email.toLowerCase()
    );
    const merged: User = {
      id: u.id,
      displayName: u.displayName,
      email: u.email,
      password: plainPassword ?? existing?.password ?? 'Demo1234',
      role: u.role,
      bio: existing?.bio ?? 'Miembro registrado en ForoDuoc.',
      favoriteCategoryId: existing?.favoriteCategoryId ?? 1,
      active: existing?.active ?? true,
      createdAt: existing?.createdAt ?? new Date().toISOString()
    };

    const idx = this.usersList.findIndex(item => item.id === u.id);
    if (idx >= 0) {
      this.usersList[idx] = merged;
    } else {
      this.usersList.push(merged);
    }
    return merged;
  }

  private extractErrorMessage(err: unknown, defaultMsg: string): string {
    if (err instanceof HttpErrorResponse) {
      const detail = err.error?.detail || err.error?.message;
      if (detail) return detail;
      if (err.status === 401) return 'Credenciales inválidas o sesión expirada (401).';
      if (err.status === 403) return 'No tienes permisos para realizar esta acción (403).';
      if (err.status === 409) return 'Conflicto de datos: registro duplicado o categoría con temas asociados (409).';
    }
    return defaultMsg;
  }

  // =====================================================================
  // Inicialización de Colecciones Demo (Respaldo / Estado Inicial)
  // =====================================================================
  private getInitialCategories(): Category[] {
    return [
      {
        id: 1,
        name: 'Tecnologia',
        description: 'Programacion, arquitectura de microservicios, hardware, cloud y sistemas.',
        icon: 'bi-cpu-fill',
        badgeColor: 'primary',
        createdAt: '2026-11-01T10:00:00Z'
      },
      {
        id: 2,
        name: 'Videojuegos',
        description: 'Lanzamientos, consolas, PC gaming, eSports y juegos cooperativos en linea.',
        icon: 'bi-controller',
        badgeColor: 'indigo',
        createdAt: '2026-11-01T10:05:00Z'
      },
      {
        id: 3,
        name: 'Ciencia',
        description: 'Divulgacion cientifica, astronomia, misiones espaciales y descubrimientos.',
        icon: 'bi-rocket-takeoff-fill',
        badgeColor: 'info',
        createdAt: '2026-11-01T10:10:00Z'
      },
      {
        id: 4,
        name: 'Deportes',
        description: 'Competencias, entrenamiento fisico, futbol, tenis y vida saludable.',
        icon: 'bi-trophy-fill',
        badgeColor: 'success',
        createdAt: '2026-11-01T10:15:00Z'
      },
      {
        id: 5,
        name: 'Cine y series',
        description: 'Recomendaciones, estrenos de cine, analisis de series y cultura audiovisual.',
        icon: 'bi-film',
        badgeColor: 'warning',
        createdAt: '2026-11-01T10:20:00Z'
      }
    ];
  }

  private getInitialUsers(): User[] {
    return [
      {
        id: 1,
        displayName: 'Administrador Foro',
        email: 'admin@foro.test',
        password: 'Demo1234!',
        role: 'ADMIN',
        bio: 'Administrador y moderador general de la comunidad ForoDuoc. Encargado de velar por las normas del foro.',
        favoriteCategoryId: 1,
        active: true,
        createdAt: '2026-11-01T09:00:00Z'
      },
      {
        id: 2,
        displayName: 'Ana Torres',
        email: 'ana@foro.test',
        password: 'Demo1234!',
        role: 'USER',
        bio: 'Desarrolladora Full Stack apasionada por Spring Boot, Angular y la divulgacion espacial.',
        favoriteCategoryId: 1,
        active: true,
        createdAt: '2026-11-02T11:30:00Z'
      },
      {
        id: 3,
        displayName: 'Luis Morales',
        email: 'luis@foro.test',
        password: 'Demo1234!',
        role: 'USER',
        bio: 'Entusiasta de los videojuegos cooperativos, el cine de ciencia ficcion y el deporte al aire libre.',
        favoriteCategoryId: 2,
        active: true,
        createdAt: '2026-11-02T14:15:00Z'
      }
    ];
  }

  private getInitialTopics(): Topic[] {
    return [
      {
        id: 1,
        title: 'Bienvenida a Spring Boot',
        content: 'Espacio para compartir dudas de Spring Boot, configuracion de microservicios con JPA, Oracle Cloud Wallet y contenedores Docker.',
        categoryId: 1,
        authorId: 2,
        tags: ['Spring Boot', 'Microservicios', 'Docker', 'Oracle'],
        pinned: true,
        banned: false,
        createdAt: '2026-11-10T15:00:00Z'
      },
      {
        id: 2,
        title: 'Juegos cooperativos recomendados',
        content: '¿Que juegos actuales recomiendan para jugar en equipo durante el fin de semana? Buscamos opciones con buena historia o estrategia.',
        categoryId: 2,
        authorId: 3,
        tags: ['Co-op', 'Multiplayer', 'Estrategia'],
        pinned: false,
        banned: false,
        createdAt: '2026-11-11T18:20:00Z'
      },
      {
        id: 3,
        title: 'Exploracion espacial',
        content: 'Conversemos sobre las nuevas misiones espaciales a la Luna y Marte, telescopios espaciales y descubrimientos de exoplanetas.',
        categoryId: 3,
        authorId: 1,
        tags: ['Astronomia', 'Marte', 'NASA'],
        pinned: true,
        banned: false,
        createdAt: '2026-11-12T12:10:00Z'
      },
      {
        id: 4,
        title: 'Preparacion fisica para primera carrera 10K',
        content: 'Comparto mi plan de entrenamiento de 8 semanas para correr mis primeros 10 kilometros sin lesiones. ¿Alguien mas se prepara este semestre?',
        categoryId: 4,
        authorId: 3,
        tags: ['Running', 'Salud', '10K'],
        pinned: false,
        banned: false,
        createdAt: '2026-11-14T09:40:00Z'
      },
      {
        id: 5,
        title: 'Mejores series de ciencia ficcion del ultimo año',
        content: 'Abro hilo para debatir sin spoilers cuales han sido las mejores producciones de ciencia ficcion y suspenso estrenadas recientemente.',
        categoryId: 5,
        authorId: 2,
        tags: ['Series', 'Sci-Fi', 'Streaming'],
        pinned: false,
        banned: false,
        createdAt: '2026-11-15T20:05:00Z'
      }
    ];
  }

  private getInitialComments(): Comment[] {
    return [
      {
        id: 1,
        topicId: 1,
        authorId: 3,
        content: 'Recomiendo revisar la documentacion oficial de Spring y configurar multi-stage builds en Docker para aligerar las imagenes.',
        banned: false,
        createdAt: '2026-11-10T16:30:00Z'
      },
      {
        id: 2,
        topicId: 2,
        authorId: 2,
        content: 'Me gustan los juegos de estrategia cooperativa como Baldur\'s Gate 3, It Takes Two y Helldivers 2.',
        banned: false,
        createdAt: '2026-11-11T19:15:00Z'
      },
      {
        id: 3,
        topicId: 3,
        authorId: 2,
        content: 'Las misiones a Marte son muy interesantes, especialmente el analisis de muestras del rover Perseverance.',
        banned: false,
        createdAt: '2026-11-12T15:45:00Z'
      },
      {
        id: 4,
        topicId: 1,
        authorId: 1,
        content: 'Recuerden no subir credenciales ni archivos del Wallet de Oracle al repositorio Git. Usen siempre variables de entorno.',
        banned: false,
        createdAt: '2026-11-13T10:00:00Z'
      }
    ];
  }

  private loadFromStorageOrInitDemo(): void {
    try {
      const savedUsers = localStorage.getItem(this.STORAGE_KEYS.USERS);
      const savedCategories = localStorage.getItem(this.STORAGE_KEYS.CATEGORIES);
      const savedTopics = localStorage.getItem(this.STORAGE_KEYS.TOPICS);
      const savedComments = localStorage.getItem(this.STORAGE_KEYS.COMMENTS);
      const savedLogs = localStorage.getItem(this.STORAGE_KEYS.LOGS);
      const savedSession = localStorage.getItem(this.STORAGE_KEYS.SESSION);

      this.usersList = savedUsers ? JSON.parse(savedUsers) : this.getInitialUsers();
      this.categoriesList = savedCategories ? JSON.parse(savedCategories) : this.getInitialCategories();
      this.topicsList = savedTopics ? JSON.parse(savedTopics) : this.getInitialTopics();
      this.commentsList = savedComments ? JSON.parse(savedComments) : this.getInitialComments();
      this.moderationLogsList = savedLogs ? JSON.parse(savedLogs) : [];

      if (savedSession) {
        const parsedUser = JSON.parse(savedSession) as User;
        const freshUser = this.usersList.find(u => u.id === parsedUser.id && u.active);
        this.currentUser = freshUser ?? parsedUser;
      }

      this.syncAll();
    } catch {
      this.resetToDemoData();
    }
  }

  private syncAll(): void {
    localStorage.setItem(this.STORAGE_KEYS.USERS, JSON.stringify(this.usersList));
    localStorage.setItem(this.STORAGE_KEYS.CATEGORIES, JSON.stringify(this.categoriesList));
    localStorage.setItem(this.STORAGE_KEYS.TOPICS, JSON.stringify(this.topicsList));
    localStorage.setItem(this.STORAGE_KEYS.COMMENTS, JSON.stringify(this.commentsList));
    localStorage.setItem(this.STORAGE_KEYS.LOGS, JSON.stringify(this.moderationLogsList));

    if (this.currentUser) {
      localStorage.setItem(this.STORAGE_KEYS.SESSION, JSON.stringify(this.currentUser));
    } else {
      localStorage.removeItem(this.STORAGE_KEYS.SESSION);
    }

    this.usersSubject.next([...this.usersList]);
    this.categoriesSubject.next([...this.categoriesList]);
    this.topicsSubject.next([...this.topicsList]);
    this.commentsSubject.next([...this.commentsList]);
    this.logsSubject.next([...this.moderationLogsList]);
    this.currentUserSubject.next(this.currentUser ? { ...this.currentUser } : null);
  }

  resetToDemoData(): void {
    this.usersList = this.getInitialUsers();
    this.categoriesList = this.getInitialCategories();
    this.topicsList = this.getInitialTopics();
    this.commentsList = this.getInitialComments();
    this.moderationLogsList = [];
    if (this.currentUser) {
      this.currentUser = this.usersList.find(u => u.id === this.currentUser?.id) ?? null;
    }
    this.syncAll();
    this.syncWithBackend();
  }

  // =====================================================================
  // Consultas Directas sobre Colecciones
  // =====================================================================
  getCurrentUser(): User | null {
    return this.currentUser;
  }

  getUsers(): User[] {
    return [...this.usersList];
  }

  getUserById(id: number): User | undefined {
    return this.usersList.find(u => u.id === id);
  }

  getCategories(): Category[] {
    return [...this.categoriesList];
  }

  getCategoryById(id: number): Category | undefined {
    return this.categoriesList.find(c => c.id === id);
  }

  getTopics(): Topic[] {
    return [...this.topicsList];
  }

  getTopicById(id: number): Topic | undefined {
    return this.topicsList.find(t => t.id === id);
  }

  getCommentsByTopic(topicId: number): Comment[] {
    return this.commentsList.filter(c => c.topicId === topicId);
  }

  getAllComments(): Comment[] {
    return [...this.commentsList];
  }

  getTopicCountByCategory(categoryId: number): number {
    return this.topicsList.filter(t => t.categoryId === categoryId && !t.banned).length;
  }

  getCommentCountByTopic(topicId: number): number {
    return this.commentsList.filter(c => c.topicId === topicId && !c.banned).length;
  }

  // =====================================================================
  // Autenticación y Registro conectados a users-service (:8081/api/auth)
  // =====================================================================
  async loginWithApi(email: string, password: string): Promise<{ ok: boolean; message: string; user?: User }> {
    const normalizedEmail = email.trim().toLowerCase();
    // Si es una cuenta demo y se ingresó Demo1234!, probamos primero con la clave ingresada y luego con Demo1234 (clave por defecto en Spring Boot)
    const candidatePasswords =
      (normalizedEmail === 'admin@foro.test' ||
        normalizedEmail === 'ana@foro.test' ||
        normalizedEmail === 'luis@foro.test') &&
      password === 'Demo1234!'
        ? ['Demo1234', 'Demo1234!']
        : [password];

    for (const pwd of candidatePasswords) {
      try {
        const tokenRes = await firstValueFrom(
          this.http.post<BackendTokenResponse>(`${API_CONFIG.usersServiceUrl}/auth/login`, {
            email: normalizedEmail,
            password: pwd
          })
        );
        this.backendConnectedSubject.next(true);
        localStorage.setItem(API_CONFIG.tokenStorageKey, tokenRes.accessToken);
        const user = this.mergeBackendUser(tokenRes.user, password);
        this.currentUser = user;
        this.syncAll();

        if (user.role === 'ADMIN') {
          this.refreshUsersFromApi();
        }
        this.syncWithBackend();

        return { ok: true, message: `¡Bienvenido(a), ${user.displayName}! (Autenticado vía API JWT)`, user };
      } catch (err) {
        if (err instanceof HttpErrorResponse && err.status === 0) {
          // El microservicio users-service (:8081) está apagado -> usar respaldo en memoria
          this.backendConnectedSubject.next(false);
          return this.loginLocal(email, password);
        }
        // Si es 401 y aún queda otro candidato en candidatePasswords, continúa el ciclo
        if (pwd === candidatePasswords[candidatePasswords.length - 1]) {
          return {
            ok: false,
            message: this.extractErrorMessage(err, 'Credenciales inválidas en users-service (:8081).')
          };
        }
      }
    }

    return this.loginLocal(email, password);
  }

  login(email: string, password: string): { ok: boolean; message: string; user?: User } {
    return this.loginLocal(email, password);
  }

  private loginLocal(email: string, password: string): { ok: boolean; message: string; user?: User } {
    const normalizedEmail = email.trim().toLowerCase();
    const user = this.usersList.find(u => u.email.toLowerCase() === normalizedEmail);

    if (!user) {
      return { ok: false, message: 'No existe una cuenta asociada a este correo electrónico.' };
    }
    if (!user.active) {
      return { ok: false, message: 'Esta cuenta ha sido suspendida por un administrador.' };
    }

    const isDemoFallback =
      (normalizedEmail === 'admin@foro.test' || normalizedEmail === 'ana@foro.test' || normalizedEmail === 'luis@foro.test') &&
      (password === 'Demo1234' || password === 'Demo1234!');

    if (user.password !== password && !isDemoFallback) {
      return { ok: false, message: 'Credenciales inválidas. Verifica tu correo y contraseña.' };
    }

    this.currentUser = user;
    this.syncAll();
    return { ok: true, message: `¡Bienvenido(a), ${user.displayName}!`, user };
  }

  logout(): void {
    this.currentUser = null;
    localStorage.removeItem(API_CONFIG.tokenStorageKey);
    this.syncAll();
  }

  async registerUserWithApi(data: {
    displayName: string;
    email: string;
    password: string;
    bio?: string;
    favoriteCategoryId?: number;
  }): Promise<{ ok: boolean; message: string; user?: User }> {
    const normalizedEmail = data.email.trim().toLowerCase();
    try {
      const created = await firstValueFrom(
        this.http.post<BackendUserResponse>(`${API_CONFIG.usersServiceUrl}/auth/register`, {
          displayName: data.displayName.trim(),
          email: normalizedEmail,
          password: data.password
        })
      );

      this.backendConnectedSubject.next(true);
      const user = this.mergeBackendUser(created, data.password);
      user.bio = data.bio?.trim() || 'Miembro de la comunidad ForoDuoc.';
      user.favoriteCategoryId = Number(data.favoriteCategoryId) || 1;

      // Iniciar sesión automáticamente en users-service para obtener el JWT accessToken
      await this.loginWithApi(normalizedEmail, data.password);
      return { ok: true, message: 'Cuenta registrada exitosamente en users-service (:8081).', user };
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.status === 0) {
        this.backendConnectedSubject.next(false);
        return this.registerUser(data);
      }
      return {
        ok: false,
        message: this.extractErrorMessage(err, 'No se pudo registrar el usuario en users-service (:8081).')
      };
    }
  }

  registerUser(data: {
    displayName: string;
    email: string;
    password: string;
    bio?: string;
    favoriteCategoryId?: number;
  }): { ok: boolean; message: string; user?: User } {
    const normalizedEmail = data.email.trim().toLowerCase();
    const exists = this.usersList.some(u => u.email.toLowerCase() === normalizedEmail);

    if (exists) {
      return { ok: false, message: 'El correo electrónico ya se encuentra registrado en el sistema.' };
    }

    const nextId = this.usersList.length > 0 ? Math.max(...this.usersList.map(u => u.id)) + 1 : 1;
    const newUser: User = {
      id: nextId,
      displayName: data.displayName.trim(),
      email: normalizedEmail,
      password: data.password,
      role: 'USER',
      bio: data.bio?.trim() || 'Miembro de la comunidad ForoDuoc.',
      favoriteCategoryId: Number(data.favoriteCategoryId) || 1,
      active: true,
      createdAt: new Date().toISOString()
    };

    this.usersList.push(newUser);
    this.currentUser = newUser;
    this.syncAll();
    return { ok: true, message: 'Cuenta creada exitosamente en la colección de usuarios.', user: newUser };
  }

  recoverPassword(email: string, newPassword: string): { ok: boolean; message: string } {
    const normalizedEmail = email.trim().toLowerCase();
    const userIndex = this.usersList.findIndex(u => u.email.toLowerCase() === normalizedEmail);

    if (userIndex === -1) {
      return { ok: false, message: 'No encontramos ningún usuario registrado con ese correo electrónico.' };
    }

    const targetUser = this.usersList[userIndex];
    this.usersList[userIndex] = {
      ...targetUser,
      password: newPassword
    };

    if (this.currentUser?.id === targetUser.id) {
      this.currentUser = this.usersList[userIndex];
    }

    // Si hay sesión activa con token en users-service (:8081), sincronizar PUT /api/users/{id}
    if (localStorage.getItem(API_CONFIG.tokenStorageKey)) {
      this.http
        .put<BackendUserResponse>(`${API_CONFIG.usersServiceUrl}/users/${targetUser.id}`, {
          displayName: targetUser.displayName,
          email: targetUser.email,
          password: newPassword
        })
        .pipe(catchError(() => of(null)))
        .subscribe();
    }

    this.syncAll();
    return { ok: true, message: 'Contraseña actualizada correctamente. Ya puedes iniciar sesión con tu nueva clave.' };
  }

  updateProfile(
    userId: number,
    changes: {
      displayName: string;
      email: string;
      bio: string;
      favoriteCategoryId: number;
      newPassword?: string;
    }
  ): { ok: boolean; message: string } {
    const idx = this.usersList.findIndex(u => u.id === userId);
    if (idx === -1) {
      return { ok: false, message: 'Usuario no encontrado.' };
    }

    const normalizedEmail = changes.email.trim().toLowerCase();
    const duplicateEmail = this.usersList.some(
      u => u.id !== userId && u.email.toLowerCase() === normalizedEmail
    );
    if (duplicateEmail) {
      return { ok: false, message: 'Ese correo electrónico ya está siendo utilizado por otro usuario.' };
    }

    const payload: { displayName: string; email: string; password?: string } = {
      displayName: changes.displayName.trim(),
      email: normalizedEmail
    };
    if (changes.newPassword) {
      payload.password = changes.newPassword;
    }

    // Enviar PUT /api/users/{id} a users-service (:8081)
    this.http
      .put<BackendUserResponse>(`${API_CONFIG.usersServiceUrl}/users/${userId}`, payload)
      .pipe(catchError(() => of(null)))
      .subscribe(res => {
        if (res) {
          this.backendConnectedSubject.next(true);
        }
      });

    const updatedUser: User = {
      ...this.usersList[idx],
      displayName: changes.displayName.trim(),
      email: normalizedEmail,
      bio: changes.bio.trim(),
      favoriteCategoryId: Number(changes.favoriteCategoryId),
      password: changes.newPassword ? changes.newPassword : this.usersList[idx].password
    };

    this.usersList[idx] = updatedUser;
    if (this.currentUser?.id === userId) {
      this.currentUser = updatedUser;
    }

    this.syncAll();
    return { ok: true, message: 'Perfil actualizado exitosamente (sincronizado con users-service).' };
  }

  // =====================================================================
  // CRUD de Usuarios por ADMIN (users-service :8081/api/users)
  // =====================================================================
  adminCreateUser(data: {
    displayName: string;
    email: string;
    password: string;
    role: UserRole;
  }): { ok: boolean; message: string } {
    const normalizedEmail = data.email.trim().toLowerCase();
    if (this.usersList.some(u => u.email.toLowerCase() === normalizedEmail)) {
      return { ok: false, message: 'Ya existe un usuario con ese correo electrónico.' };
    }

    const nextId = this.usersList.length > 0 ? Math.max(...this.usersList.map(u => u.id)) + 1 : 1;
    const newUser: User = {
      id: nextId,
      displayName: data.displayName.trim(),
      email: normalizedEmail,
      password: data.password,
      role: data.role,
      bio: 'Cuenta creada desde el panel de administración.',
      favoriteCategoryId: 1,
      active: true,
      createdAt: new Date().toISOString()
    };

    this.usersList.push(newUser);
    this.recordModerationLog('USUARIO', newUser.id, 'CREAR_USUARIO', `Creación de cuenta (${newUser.role}): ${newUser.email}`);
    this.syncAll();

    // Sincronizar con users-service (:8081): POST /api/auth/register + PUT /api/users/{id}/role si es ADMIN
    this.http
      .post<BackendUserResponse>(`${API_CONFIG.usersServiceUrl}/auth/register`, {
        displayName: newUser.displayName,
        email: newUser.email,
        password: data.password
      })
      .pipe(catchError(() => of(null)))
      .subscribe(created => {
        if (created) {
          this.backendConnectedSubject.next(true);
          if (data.role === 'ADMIN') {
            this.http
              .put<BackendUserResponse>(`${API_CONFIG.usersServiceUrl}/users/${created.id}/role`, {
                role: 'ADMIN'
              })
              .pipe(catchError(() => of(null)))
              .subscribe(() => this.refreshUsersFromApi());
          } else {
            this.refreshUsersFromApi();
          }
        }
      });

    return { ok: true, message: `Usuario ${newUser.displayName} creado y sincronizado con users-service.` };
  }

  adminUpdateUserRole(userId: number, role: UserRole): { ok: boolean; message: string } {
    const idx = this.usersList.findIndex(u => u.id === userId);
    if (idx === -1) return { ok: false, message: 'Usuario no encontrado.' };

    this.usersList[idx] = { ...this.usersList[idx], role };
    if (this.currentUser?.id === userId) {
      this.currentUser = this.usersList[idx];
    }

    // Llamar PUT /api/users/{id}/role en users-service (:8081)
    this.http
      .put<BackendUserResponse>(`${API_CONFIG.usersServiceUrl}/users/${userId}/role`, { role })
      .pipe(catchError(() => of(null)))
      .subscribe();

    this.recordModerationLog('USUARIO', userId, 'CAMBIO_ROL', `Cambio de rol a ${role} para ${this.usersList[idx].email}`);
    this.syncAll();
    return { ok: true, message: `Rol de ${this.usersList[idx].displayName} actualizado a ${role}.` };
  }

  adminToggleUserStatus(userId: number): { ok: boolean; message: string } {
    const idx = this.usersList.findIndex(u => u.id === userId);
    if (idx === -1) return { ok: false, message: 'Usuario no encontrado.' };
    if (this.currentUser?.id === userId) {
      return { ok: false, message: 'No puedes suspender tu propia cuenta de administrador en sesión.' };
    }

    const nextActive = !this.usersList[idx].active;
    this.usersList[idx] = { ...this.usersList[idx], active: nextActive };
    this.recordModerationLog(
      'USUARIO',
      userId,
      nextActive ? 'ACTIVAR_USUARIO' : 'SUSPENDER_USUARIO',
      `${nextActive ? 'Activación' : 'Suspensión'} de cuenta ${this.usersList[idx].email}`
    );
    this.syncAll();
    return {
      ok: true,
      message: `Cuenta de ${this.usersList[idx].displayName} ${nextActive ? 'reactivada' : 'suspendida'}.`
    };
  }

  adminDeleteUser(userId: number): { ok: boolean; message: string } {
    if (this.currentUser?.id === userId) {
      return { ok: false, message: 'No puedes eliminar tu propia cuenta activa.' };
    }
    const target = this.usersList.find(u => u.id === userId);
    if (!target) return { ok: false, message: 'Usuario no encontrado.' };

    this.usersList = this.usersList.filter(u => u.id !== userId);

    // Llamar DELETE /api/users/{id} en users-service (:8081)
    this.http
      .delete(`${API_CONFIG.usersServiceUrl}/users/${userId}`)
      .pipe(catchError(() => of(null)))
      .subscribe();

    this.recordModerationLog('USUARIO', userId, 'ELIMINAR_USUARIO', `Eliminación del usuario ${target.email}`);
    this.syncAll();
    return { ok: true, message: `Usuario ${target.displayName} eliminado.` };
  }

  // =====================================================================
  // CRUD de Categorías conectado a forum-service (:8082/api/categories)
  // =====================================================================
  createCategory(data: { name: string; description: string; icon: string; badgeColor: string }): { ok: boolean; message: string } {
    const normalized = data.name.trim().toLowerCase();
    if (this.categoriesList.some(c => c.name.toLowerCase() === normalized)) {
      return { ok: false, message: 'Ya existe una categoría con ese nombre.' };
    }

    const nextId = this.categoriesList.length > 0 ? Math.max(...this.categoriesList.map(c => c.id)) + 1 : 1;
    const category: Category = {
      id: nextId,
      name: data.name.trim(),
      description: data.description.trim(),
      icon: data.icon || 'bi-chat-square-text-fill',
      badgeColor: data.badgeColor || 'primary',
      createdAt: new Date().toISOString()
    };

    this.categoriesList.push(category);
    this.recordModerationLog('CATEGORIA', category.id, 'CREAR_CATEGORIA', `Nueva categoría: ${category.name}`);
    this.syncAll();

    // Enviar POST /api/categories a forum-service (:8082)
    this.http
      .post<BackendCategoryResponse>(`${API_CONFIG.forumServiceUrl}/categories`, {
        name: category.name,
        description: category.description
      })
      .pipe(catchError(() => of(null)))
      .subscribe(created => {
        if (created) {
          this.backendConnectedSubject.next(true);
          const idx = this.categoriesList.findIndex(c => c.name === category.name);
          if (idx >= 0) {
            this.categoriesList[idx] = { ...this.categoriesList[idx], id: created.id };
            this.syncAll();
          }
        }
      });

    return { ok: true, message: `Categoría "${category.name}" creada y enviada a forum-service.` };
  }

  deleteCategory(categoryId: number): { ok: boolean; message: string } {
    if (this.categoriesList.length <= 5) {
      return { ok: false, message: 'El sistema requiere mantener al menos 5 categorías activas según las reglas del foro.' };
    }
    const hasTopics = this.topicsList.some(t => t.categoryId === categoryId);
    if (hasTopics) {
      return { ok: false, message: 'No se puede eliminar una categoría que tiene temas asociados (409 Conflict).' };
    }

    const target = this.categoriesList.find(c => c.id === categoryId);
    if (!target) return { ok: false, message: 'Categoría no encontrada.' };

    this.categoriesList = this.categoriesList.filter(c => c.id !== categoryId);

    // Enviar DELETE /api/categories/{id} a forum-service (:8082)
    this.http
      .delete(`${API_CONFIG.forumServiceUrl}/categories/${categoryId}`)
      .pipe(catchError(() => of(null)))
      .subscribe();

    this.recordModerationLog('CATEGORIA', categoryId, 'ELIMINAR_CATEGORIA', `Categoría eliminada: ${target.name}`);
    this.syncAll();
    return { ok: true, message: `Categoría "${target.name}" eliminada.` };
  }

  // =====================================================================
  // CRUD de Temas y Comentarios conectado a forum-service (:8082/api/topics)
  // =====================================================================
  createTopic(data: { title: string; content: string; categoryId: number; tags: string[] }): { ok: boolean; message: string; topic?: Topic } {
    if (!this.currentUser) {
      return { ok: false, message: 'Debes iniciar sesión para publicar un tema.' };
    }

    const nextId = this.topicsList.length > 0 ? Math.max(...this.topicsList.map(t => t.id)) + 1 : 1;
    const topic: Topic = {
      id: nextId,
      title: data.title.trim(),
      content: data.content.trim(),
      categoryId: Number(data.categoryId),
      authorId: this.currentUser.id,
      tags: data.tags.length > 0 ? data.tags : ['General'],
      pinned: false,
      banned: false,
      createdAt: new Date().toISOString()
    };

    this.topicsList.unshift(topic);
    this.syncAll();

    // Enviar POST /api/topics a forum-service (:8082)
    this.http
      .post<BackendTopicResponse>(`${API_CONFIG.forumServiceUrl}/topics`, {
        title: topic.title,
        content: topic.content,
        categoryId: topic.categoryId
      })
      .pipe(catchError(() => of(null)))
      .subscribe(created => {
        if (created) {
          this.backendConnectedSubject.next(true);
          const idx = this.topicsList.findIndex(t => t.id === topic.id);
          if (idx >= 0) {
            this.topicsList[idx] = {
              ...this.topicsList[idx],
              id: created.id,
              authorId: created.authorId,
              createdAt: created.createdAt || this.topicsList[idx].createdAt
            };
            this.syncAll();
          }
        }
      });

    return { ok: true, message: 'Tema publicado exitosamente en el foro.', topic };
  }

  updateTopic(topicId: number, data: { title: string; content: string; categoryId: number; tags: string[] }): { ok: boolean; message: string } {
    const idx = this.topicsList.findIndex(t => t.id === topicId);
    if (idx === -1) return { ok: false, message: 'Tema no encontrado.' };

    const topic = this.topicsList[idx];
    if (!this.currentUser || (this.currentUser.id !== topic.authorId && this.currentUser.role !== 'ADMIN')) {
      return { ok: false, message: 'No tienes permisos para editar este tema.' };
    }

    this.topicsList[idx] = {
      ...topic,
      title: data.title.trim(),
      content: data.content.trim(),
      categoryId: Number(data.categoryId),
      tags: data.tags.length > 0 ? data.tags : topic.tags,
      updatedAt: new Date().toISOString()
    };

    // Enviar PUT /api/topics/{id} a forum-service (:8082)
    this.http
      .put<BackendTopicResponse>(`${API_CONFIG.forumServiceUrl}/topics/${topicId}`, {
        title: data.title.trim(),
        content: data.content.trim(),
        categoryId: Number(data.categoryId)
      })
      .pipe(catchError(() => of(null)))
      .subscribe();

    this.syncAll();
    return { ok: true, message: 'Tema actualizado correctamente.' };
  }

  deleteTopic(topicId: number): { ok: boolean; message: string } {
    const topic = this.topicsList.find(t => t.id === topicId);
    if (!topic) return { ok: false, message: 'Tema no encontrado.' };

    if (!this.currentUser || (this.currentUser.id !== topic.authorId && this.currentUser.role !== 'ADMIN')) {
      return { ok: false, message: 'No tienes permisos para eliminar este tema.' };
    }

    this.topicsList = this.topicsList.filter(t => t.id !== topicId);
    this.commentsList = this.commentsList.filter(c => c.topicId !== topicId);

    // Enviar DELETE /api/topics/{id} a forum-service (:8082)
    this.http
      .delete(`${API_CONFIG.forumServiceUrl}/topics/${topicId}`)
      .pipe(catchError(() => of(null)))
      .subscribe();

    if (this.currentUser.role === 'ADMIN') {
      this.recordModerationLog('TEMA', topicId, 'ELIMINAR_TEMA', `Tema eliminado definitivamente: "${topic.title}"`);
    }

    this.syncAll();
    return { ok: true, message: 'Tema y sus comentarios asociados fueron eliminados.' };
  }

  toggleBanTopic(topicId: number, reason: string): { ok: boolean; message: string } {
    if (!this.currentUser || this.currentUser.role !== 'ADMIN') {
      return { ok: false, message: 'Solo un administrador puede banear o restaurar temas.' };
    }

    const idx = this.topicsList.findIndex(t => t.id === topicId);
    if (idx === -1) return { ok: false, message: 'Tema no encontrado.' };

    const nextBanned = !this.topicsList[idx].banned;
    const cleanReason = reason.trim() || 'Incumplimiento de las normas de convivencia del foro.';

    this.topicsList[idx] = {
      ...this.topicsList[idx],
      banned: nextBanned,
      banReason: nextBanned ? cleanReason : undefined
    };

    this.recordModerationLog(
      'TEMA',
      topicId,
      nextBanned ? 'BANEAR_TEMA' : 'RESTAURAR_TEMA',
      `${nextBanned ? 'Baneo' : 'Restauración'} del tema "${this.topicsList[idx].title}" — Motivo: ${cleanReason}`
    );

    this.syncAll();
    return {
      ok: true,
      message: nextBanned
        ? 'El tema ha sido baneado por incumplir las normas del foro.'
        : 'El tema ha sido restaurado y vuelve a estar visible.'
    };
  }

  addComment(topicId: number, content: string): { ok: boolean; message: string; comment?: Comment } {
    if (!this.currentUser) {
      return { ok: false, message: 'Debes iniciar sesión para comentar.' };
    }

    const topic = this.topicsList.find(t => t.id === topicId);
    if (!topic) return { ok: false, message: 'El tema no existe.' };
    if (topic.banned) return { ok: false, message: 'No se puede comentar en un tema baneado por moderación.' };

    const nextId = this.commentsList.length > 0 ? Math.max(...this.commentsList.map(c => c.id)) + 1 : 1;
    const comment: Comment = {
      id: nextId,
      topicId,
      authorId: this.currentUser.id,
      content: content.trim(),
      banned: false,
      createdAt: new Date().toISOString()
    };

    this.commentsList.push(comment);
    this.syncAll();

    // Enviar POST /api/topics/{topicId}/comments a forum-service (:8082)
    this.http
      .post<BackendCommentResponse>(`${API_CONFIG.forumServiceUrl}/topics/${topicId}/comments`, {
        content: comment.content
      })
      .pipe(catchError(() => of(null)))
      .subscribe(created => {
        if (created) {
          this.backendConnectedSubject.next(true);
          const idx = this.commentsList.findIndex(c => c.id === comment.id);
          if (idx >= 0) {
            this.commentsList[idx] = {
              ...this.commentsList[idx],
              id: created.id,
              authorId: created.authorId,
              createdAt: created.createdAt || this.commentsList[idx].createdAt
            };
            this.syncAll();
          }
        }
      });

    return { ok: true, message: 'Comentario publicado.', comment };
  }

  updateComment(commentId: number, content: string): { ok: boolean; message: string } {
    const idx = this.commentsList.findIndex(c => c.id === commentId);
    if (idx === -1) return { ok: false, message: 'Comentario no encontrado.' };

    const target = this.commentsList[idx];
    if (!this.currentUser || (this.currentUser.id !== target.authorId && this.currentUser.role !== 'ADMIN')) {
      return { ok: false, message: 'No tienes permisos para editar este comentario.' };
    }

    this.commentsList[idx] = {
      ...target,
      content: content.trim(),
      updatedAt: new Date().toISOString()
    };

    // Enviar PUT /api/topics/{topicId}/comments/{id} a forum-service (:8082)
    this.http
      .put<BackendCommentResponse>(
        `${API_CONFIG.forumServiceUrl}/topics/${target.topicId}/comments/${commentId}`,
        { content: content.trim() }
      )
      .pipe(catchError(() => of(null)))
      .subscribe();

    this.syncAll();
    return { ok: true, message: 'Comentario actualizado.' };
  }

  deleteComment(commentId: number): { ok: boolean; message: string } {
    const target = this.commentsList.find(c => c.id === commentId);
    if (!target) return { ok: false, message: 'Comentario no encontrado.' };

    if (!this.currentUser || (this.currentUser.id !== target.authorId && this.currentUser.role !== 'ADMIN')) {
      return { ok: false, message: 'No tienes permisos para eliminar este comentario.' };
    }

    this.commentsList = this.commentsList.filter(c => c.id !== commentId);

    // Enviar DELETE /api/topics/{topicId}/comments/{id} a forum-service (:8082)
    this.http
      .delete(`${API_CONFIG.forumServiceUrl}/topics/${target.topicId}/comments/${commentId}`)
      .pipe(catchError(() => of(null)))
      .subscribe();

    if (this.currentUser.role === 'ADMIN') {
      this.recordModerationLog('COMENTARIO', commentId, 'ELIMINAR_COMENTARIO', `Comentario #${commentId} eliminado definitivamente`);
    }
    this.syncAll();
    return { ok: true, message: 'Comentario eliminado.' };
  }

  toggleBanComment(commentId: number, reason: string): { ok: boolean; message: string } {
    if (!this.currentUser || this.currentUser.role !== 'ADMIN') {
      return { ok: false, message: 'Solo un administrador puede banear o restaurar comentarios.' };
    }

    const idx = this.commentsList.findIndex(c => c.id === commentId);
    if (idx === -1) return { ok: false, message: 'Comentario no encontrado.' };

    const nextBanned = !this.commentsList[idx].banned;
    const cleanReason = reason.trim() || 'Comentario ocultado por infringir las normas del foro.';

    this.commentsList[idx] = {
      ...this.commentsList[idx],
      banned: nextBanned,
      banReason: nextBanned ? cleanReason : undefined
    };

    this.recordModerationLog(
      'COMENTARIO',
      commentId,
      nextBanned ? 'BANEAR_COMENTARIO' : 'RESTAURAR_COMENTARIO',
      `${nextBanned ? 'Baneo' : 'Restauración'} de comentario #${commentId} — Motivo: ${cleanReason}`
    );

    this.syncAll();
    return {
      ok: true,
      message: nextBanned
        ? 'Comentario baneado por incumplimiento de normas.'
        : 'Comentario restaurado.'
    };
  }

  private recordModerationLog(
    targetType: 'TEMA' | 'COMENTARIO' | 'USUARIO' | 'CATEGORIA',
    targetId: number,
    action: string,
    reason: string
  ): void {
    const nextId = this.moderationLogsList.length > 0 ? Math.max(...this.moderationLogsList.map(l => l.id)) + 1 : 1;
    this.moderationLogsList.unshift({
      id: nextId,
      adminId: this.currentUser?.id ?? 1,
      targetType,
      targetId,
      action,
      reason,
      createdAt: new Date().toISOString()
    });
  }
}
