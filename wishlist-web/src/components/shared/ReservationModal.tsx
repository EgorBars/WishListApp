import { useEffect, useMemo, useState } from 'react';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { Modal } from '../common/Modal';
import { useReservation } from '../../hooks/useReservation';
import { validateGuestEmail, validateGuestName } from '../../utils/validators';
import type { ReservationPayload, WishlistItem } from '../../types';

interface ReservationModalProps {
  isOpen: boolean;
  item: WishlistItem | null;
  publicId: string;
  onClose: () => void;
  onSuccess: (payload: ReservationPayload) => void;
  onAlreadyReserved: () => void;
  onAlreadyPurchased: () => void;
}

type TouchedFields = Partial<Record<'guest_name' | 'guest_email', boolean>>;

const initialForm: ReservationPayload = {
  guest_name: '',
  guest_email: '',
};
const GUEST_NAME_MAX_LENGTH = 100;
const GUEST_EMAIL_MAX_LENGTH = 255;

export function ReservationModal({
  isOpen,
  item,
  publicId,
  onClose,
  onSuccess,
  onAlreadyReserved,
  onAlreadyPurchased,
}: ReservationModalProps) {
  const [form, setForm] = useState<ReservationPayload>(initialForm);
  const [touched, setTouched] = useState<TouchedFields>({});
  const { isSubmitting, formError, fieldErrors, submit, cancel, resetErrors } = useReservation();

  useEffect(() => {
    if (!isOpen) {
      setForm(initialForm);
      setTouched({});
      resetErrors();
    }
  }, [isOpen, resetErrors]);

  const localErrors = useMemo(
    () => ({
      guest_name: validateGuestName(form.guest_name),
      guest_email: validateGuestEmail(form.guest_email),
    }),
    [form.guest_email, form.guest_name],
  );

  const isValid = !localErrors.guest_name && !localErrors.guest_email;

  const handleFieldChange = (field: keyof ReservationPayload, value: string) => {
    const maxLength = field === 'guest_name' ? GUEST_NAME_MAX_LENGTH : GUEST_EMAIL_MAX_LENGTH;
    const normalizedValue = value.slice(0, maxLength);
    setForm((current) => ({ ...current, [field]: normalizedValue }));
    setTouched((current) => ({ ...current, [field]: true }));
    resetErrors();
  };

  const handleClose = () => {
    cancel();
    onClose();
  };

  const handleSubmit = async () => {
    setTouched({ guest_name: true, guest_email: true });
    if (!item || !isValid) return;

    const result = await submit(publicId, item.id, {
      guest_name: form.guest_name.trim(),
      guest_email: form.guest_email.trim(),
    });

    if (result.ok) {
      onSuccess({
        guest_name: form.guest_name.trim(),
        guest_email: form.guest_email.trim(),
      });
      return;
    }

    if (result.cancelled) return;
    if (result.status === 409) {
      onAlreadyReserved();
      return;
    }
    if (result.status === 400) {
      onAlreadyPurchased();
    }
  };

  const guestNameError = touched.guest_name ? fieldErrors.guest_name ?? localErrors.guest_name : '';
  const guestEmailError = touched.guest_email ? fieldErrors.guest_email ?? localErrors.guest_email : '';

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Забронировать подарок" size="md">
      <div className="space-y-5">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-400">Подарок</p>
          <p className="mt-2 text-lg font-bold text-gray-900">{item?.title ?? ''}</p>
        </div>

        <Input
          label="Ваше имя"
          placeholder="Иван Петров"
          autoComplete="name"
          disabled={isSubmitting}
          maxLength={GUEST_NAME_MAX_LENGTH}
          value={form.guest_name}
          error={guestNameError ?? ''}
          onChange={(event) => handleFieldChange('guest_name', event.target.value)}
          onBlur={() => setTouched((current) => ({ ...current, guest_name: true }))}
        />

        <Input
          label="Ваш email"
          type="email"
          placeholder="ivan@example.com"
          autoComplete="email"
          disabled={isSubmitting}
          maxLength={GUEST_EMAIL_MAX_LENGTH}
          value={form.guest_email}
          error={guestEmailError ?? ''}
          onChange={(event) => handleFieldChange('guest_email', event.target.value)}
          onBlur={() => setTouched((current) => ({ ...current, guest_email: true }))}
        />

        {formError ? (
          <p className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-brand-error">
            {formError}
          </p>
        ) : null}

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button variant="secondary" type="button" onClick={handleClose} disabled={isSubmitting}>
            Отмена
          </Button>
          <Button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={!isValid || isSubmitting}
            isLoading={isSubmitting}
            loadingLabel="Бронирование..."
          >
            Подтвердить бронирование
          </Button>
        </div>
      </div>
    </Modal>
  );
}
