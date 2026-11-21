import { HttpInterceptorFn } from '@angular/common/http';
import { API_CONFIG } from '../config/api.config';

/**
 * Interceptor HTTP que adjunta automáticamente el encabezado
 * Authorization: Bearer <accessToken> en todas las peticiones hacia
 * users-service (:8081) y forum-service (:8082).
 */
export const jwtAuthInterceptor: HttpInterceptorFn = (req, next) => {
  const token = localStorage.getItem(API_CONFIG.tokenStorageKey);
  if (token && (req.url.startsWith(API_CONFIG.usersServiceUrl) || req.url.startsWith(API_CONFIG.forumServiceUrl))) {
    const authReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
    return next(authReq);
  }
  return next(req);
};
