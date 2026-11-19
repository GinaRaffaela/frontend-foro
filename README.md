# FrontEnd Sistema de Foros en Línea (`frontend-foro`)

Aplicación FrontEnd construida en **Angular 18** con **Bootstrap 5.3** (basada en el sistema Grid de 12 columnas) para la evaluación sumativa de **Desarrollo Full Stack III**.

---

## Cumplimiento de Requerimientos

1. **Adaptabilidad a 3+ tamaños de pantalla (Grid de 12 columnas - Punto 2.a):**
   - **Móvil (`< 768px`, `col-12`):** Menú colapsable hamburguesa, tarjetas apiladas verticalmente y botones adaptados al ancho completo.
   - **Tablet (`768px - 991px`, `col-sm-6`, `col-md-4`, `col-md-6`, `col-md-10`):** Distribución intermedia a 2 y 3 columnas.
   - **Escritorio (`>= 992px` y `>= 1200px`, `col-lg-4`, `col-lg-8`, `col-xl-3`, `col-xl-9`):** Vista completa de foro con grilla de categorías superior, listado principal de debates y barra lateral fija (`sticky-sidebar`).

2. **Manipulación mediante variables, listas, arreglos o colecciones (Puntos 2.e y 5):**
   - Toda la información se administra en `ForumStoreService` (`src/app/core/services/forum-store.service.ts`) usando arreglos tipados (`User[]`, `Category[]`, `Topic[]`, `Comment[]`, `ModerationLog[]`).
   - Funciona de forma independiente del BackEnd (tal como indica el Punto 5) y sincroniza cambios en `localStorage` para conservar el estado al recargar el navegador, incluyendo un botón **"Restaurar Datos Demo"** en el pie de página.

3. **Patrón de Diseño FrontEnd (Punto 2.f):**
   - **Patrón Repository / Store Reactivo con Inyección de Dependencias Singleton (`@Injectable({ providedIn: 'root' })`) + Observer Pattern (`BehaviorSubject` / `Observable`)**, separado en capas (`core/models`, `core/services`, `core/validators`, `core/guards`, `shared`, `pages`).

4. **Roles, 5 Categorías, Pantallas Obligatorias y Validaciones (Punto 4):**
   - **2 Roles con distintos privilegios:**
     - `ADMIN`: `admin@foro.test` (clave demo: `Demo1234!` o `Demo1234`) — Puede banear/restaurar temas y comentarios, eliminar cualquier publicación, gestionar categorías y administrar usuarios/roles.
     - `USER`: `ana@foro.test` y `luis@foro.test` (clave demo: `Demo1234!` o `Demo1234`) — Pueden publicar temas, comentar, editar/eliminar sus propias publicaciones y modificar su perfil.
   - **5 Categorías iniciales:** *Tecnologia*, *Videojuegos*, *Ciencia*, *Deportes* y *Cine y series*.
   - **6 Validaciones de seguridad de contraseña en tiempo real (`strongPasswordValidator`):**
     1. Longitud mínima de 8 caracteres.
     2. Longitud máxima de 20 caracteres.
     3. Al menos una letra mayúscula y una minúscula.
     4. Al menos un número.
     5. Al menos un carácter especial (`!@#$%^&*...`).
     6. Sin espacios en blanco + validación de coincidencia con confirmación de contraseña.

---

## Ejecución Local

Con **Node.js 18+** o **20+** instalado:

```bash
cd frontend-foro
npm install
npm start
```

La aplicación estará disponible en `http://localhost:4200`.

## Ejecución con Docker

Desde la raíz `Sumativa/`:

```bash
docker compose up --build
```
