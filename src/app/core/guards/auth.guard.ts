import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { ForumStoreService } from '../services/forum-store.service';

export const authGuard: CanActivateFn = () => {
  const store = inject(ForumStoreService);
  const router = inject(Router);

  if (store.getCurrentUser()) {
    return true;
  }
  return router.createUrlTree(['/login']);
};

export const adminGuard: CanActivateFn = () => {
  const store = inject(ForumStoreService);
  const router = inject(Router);
  const user = store.getCurrentUser();

  if (user && user.role === 'ADMIN') {
    return true;
  }
  return router.createUrlTree(['/foro']);
};
