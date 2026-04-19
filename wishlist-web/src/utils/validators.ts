const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const GUEST_NAME_PATTERN = /^[A-Za-zА-Яа-яЁёІіЇїЄєЎў\s]+$/;

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

export function validateGuestName(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return 'Укажите ваше имя';
  if (trimmed.length < 2 || trimmed.length > 100) {
    return 'Имя должно содержать от 2 до 100 символов';
  }
  if (!GUEST_NAME_PATTERN.test(trimmed)) {
    return 'Имя может содержать только буквы и пробелы';
  }
  return null;
}

export function validateGuestEmail(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return 'Укажите email';
  if (trimmed.length > 255 || !EMAIL_PATTERN.test(trimmed)) {
    return 'Введите корректный email адрес';
  }
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
