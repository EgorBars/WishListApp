import { useCallback, useRef, useState } from 'react';
import axios from 'axios';
import { reserveItem } from '../api/wishlistsApi';
import type { ReservationPayload, ReservationResponse } from '../types';

type ReservationFieldErrors = Partial<Record<'guest_name' | 'guest_email', string>>;

function extractFieldErrors(detail: unknown): ReservationFieldErrors {
  if (!Array.isArray(detail)) return {};

  const next: ReservationFieldErrors = {};

  for (const issue of detail) {
    if (!issue || typeof issue !== 'object') continue;
    const loc = Array.isArray((issue as { loc?: unknown[] }).loc) ? (issue as { loc: unknown[] }).loc : [];
    const field = loc[loc.length - 1];
    if (field === 'guest_name') {
      next.guest_name = 'Имя должно содержать от 2 до 100 символов (только буквы и пробелы)';
    }
    if (field === 'guest_email') {
      next.guest_email = 'Введите корректный email адрес';
    }
  }

  return next;
}

export function useReservation() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<ReservationFieldErrors>({});
  const controllerRef = useRef<AbortController | null>(null);

  const resetErrors = useCallback(() => {
    setFormError('');
    setFieldErrors({});
  }, []);

  const cancel = useCallback(() => {
    controllerRef.current?.abort();
    controllerRef.current = null;
    setIsSubmitting(false);
  }, []);

  const submit = useCallback(
    async (publicId: string, itemId: string, payload: ReservationPayload) => {
      controllerRef.current?.abort();
      const controller = new AbortController();
      controllerRef.current = controller;
      setIsSubmitting(true);
      setFormError('');
      setFieldErrors({});

      try {
        const result: ReservationResponse = await reserveItem(
          publicId,
          itemId,
          payload,
          controller.signal,
        );
        return { ok: true as const, data: result };
      } catch (error) {
        if (axios.isCancel(error)) {
          return { ok: false as const, cancelled: true as const };
        }

        if (axios.isAxiosError(error)) {
          const status = error.response?.status;
          const detail = error.response?.data?.detail;

          if (status === 422) {
            const nextFieldErrors = extractFieldErrors(detail);
            setFieldErrors(nextFieldErrors);
            return { ok: false as const, status };
          }

          if (status === 429) {
            setFormError('Слишком много попыток. Попробуйте позже.');
            return { ok: false as const, status };
          }

          if (status === 409 || status === 400) {
            return { ok: false as const, status };
          }
        }

        setFormError('Не удалось отправить запрос. Проверьте подключение к интернету.');
        return { ok: false as const, status: undefined };
      } finally {
        setIsSubmitting(false);
        controllerRef.current = null;
      }
    },
    [],
  );

  return {
    isSubmitting,
    formError,
    fieldErrors,
    submit,
    cancel,
    resetErrors,
  };
}
