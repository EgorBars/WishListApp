const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const MSG = {
  emailRequired: 'Email обязателен',
  emailInvalid: 'Введите корректный email адрес',
  emailLength: 'Введите email адрес корректной длины',
  passwordRequired: 'Пароль обязателен',
  passwordLength: 'Пароль должен содержать от 8 до 50 символов',
  passwordMismatch: 'Пароли не совпадают',
} as const;

export function validateEmailRequired(value: string): string | null {
  const v = value.trim();
  if (!v) return MSG.emailRequired;
  if (!EMAIL_PATTERN.test(v)) return MSG.emailInvalid;
  if (v.length > 255) return MSG.emailLength;
  return null;
}

/** Для модалки восстановления пароля (1–256 символов по ТЗ). */
export function validateForgotEmail(value: string): string | null {
  const v = value.trim();
  if (!v) return MSG.emailRequired;
  if (!EMAIL_PATTERN.test(v)) return MSG.emailInvalid;
  if (v.length < 1 || v.length > 256) return MSG.emailLength;
  return null;
}

export function validatePasswordAuth(value: string): string | null {
  if (!value) return MSG.passwordRequired;
  if (/\s/.test(value)) return 'Пароль не должен содержать пробелы';
  if (value.length < 8 || value.length > 50) return MSG.passwordLength;
  return null;
}

export function validateNewPassword(value: string): string | null {
  if (!value) return MSG.passwordRequired;
  if (/\s/.test(value)) return 'Пароль не должен содержать пробелы';
  if (value.length < 8 || value.length > 50) return MSG.passwordLength;
  return null;
}

export function isValidHttpUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}
