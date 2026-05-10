/**
 * Управление хранением информации о бронированиях гостей в LocalStorage
 */

interface GuestReservation {
  wishlist_item_id: string;
  reservation_token: string;
}

interface StoredReservation {
  wishlist_item_id: string;
  reservation_token: string;
  timestamp: number;
}

const STORAGE_KEY = 'guest_reservations';

/**
 * Сохраняет бронирование гостя в LocalStorage
 */
export function saveGuestReservation(itemId: string, token: string): void {
  try {
    const reservation: StoredReservation = {
      wishlist_item_id: itemId,
      reservation_token: token,
      timestamp: Date.now(),
    };

    const reservations = getAllReservations();
    reservations[itemId] = reservation;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reservations));
  } catch (error) {
    console.error('Failed to save reservation to localStorage:', error);
  }
}

/**
 * Получает все бронирования гостя из LocalStorage
 */
export function getAllReservations(): Record<string, StoredReservation> {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : {};
  } catch (error) {
    console.error('Failed to read reservations from localStorage:', error);
    return {};
  }
}

/**
 * Проверяет, забронировал ли гость конкретный товар
 */
export function isItemReservedByGuest(itemId: string): boolean {
  const reservations = getAllReservations();
  return itemId in reservations;
}

/**
 * Получает токен бронирования для конкретного товара
 */
export function getReservationToken(itemId: string): string | null {
  const reservations = getAllReservations();
  const reservation = reservations[itemId];
  return reservation ? reservation.reservation_token : null;
}

/**
 * Удаляет бронирование гостя из LocalStorage
 */
export function removeGuestReservation(itemId: string): void {
  try {
    const reservations = getAllReservations();
    delete reservations[itemId];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reservations));
  } catch (error) {
    console.error('Failed to remove reservation from localStorage:', error);
  }
}

/**
 * Очищает все бронирования гостя
 */
export function clearAllReservations(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear reservations from localStorage:', error);
  }
}
