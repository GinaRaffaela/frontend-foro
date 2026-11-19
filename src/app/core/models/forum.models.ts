export type UserRole = 'USER' | 'ADMIN';

export interface User {
  id: number;
  displayName: string;
  email: string;
  password: string;
  role: UserRole;
  bio: string;
  favoriteCategoryId: number;
  active: boolean;
  createdAt: string;
}

export interface Category {
  id: number;
  name: string;
  description: string;
  icon: string;
  badgeColor: string;
  createdAt: string;
}

export interface Topic {
  id: number;
  title: string;
  content: string;
  categoryId: number;
  authorId: number;
  tags: string[];
  pinned: boolean;
  banned: boolean;
  banReason?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Comment {
  id: number;
  topicId: number;
  authorId: number;
  content: string;
  banned: boolean;
  banReason?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface ModerationLog {
  id: number;
  adminId: number;
  targetType: 'TEMA' | 'COMENTARIO' | 'USUARIO' | 'CATEGORIA';
  targetId: number;
  action: string;
  reason: string;
  createdAt: string;
}

export interface PasswordSecurityStatus {
  minLength: boolean;
  maxLength: boolean;
  hasUpperAndLower: boolean;
  hasNumber: boolean;
  hasSpecialChar: boolean;
  noSpaces: boolean;
  allValid: boolean;
}
