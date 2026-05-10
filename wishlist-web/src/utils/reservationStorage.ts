/**
 * Управление хранением информации о бронированиях гостей в LocalStorage
 */

interface GuestReservation {
  wishlist_item_id: string;
  reservation_id: string;      // UUID брони (нужен для DELETE URL)
  reservation_token: string;   // токен (нужен для тела запроса)
}

interface StoredReservation {
  wishlist_item_id: string;
  reservation_id: string;
  reservation_token: string;
  timestamp: number;
}

const STORAGE_KEY = 'guest_reservations';

/**
 * Сохраняет бронирование гостя в LocalStorage
 */
export function saveGuestReservation(itemId: string, reservationId: string, token: string): void {
  try {
    const reservation: StoredReservation = {
      wishlist_item_id: itemId,
      reservation_id: reservationId,
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
 * Получает UUID бронирования для конкретного товара
 */
export function getReservationId(itemId: string): string | null {
  const reservations = getAllReservations();
  const reservation = reservations[itemId];
  return reservation ? reservation.reservation_id : null;
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