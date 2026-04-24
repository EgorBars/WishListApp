import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import {
  ArrowLeft,
  Edit2,
  ExternalLink,
  Gift,
  ImageIcon,
  Link2,
  MessageSquare,
  Plus,
  Star,
  Trash2,
} from 'lucide-react';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { Modal } from '../components/common/Modal';
import { Textarea } from '../components/common/Textarea';
import { InputSkeleton } from '../components/common/InputSkeleton';
import { Spinner } from '../components/common/Spinner';
import { ErrorModal } from '../components/common/ErrorModal';
import { useItemParsing } from '../hooks/useItemParsing';
import { useToast } from '../context/ToastContext';
import { isValidHttpUrl } from '../utils/validators';
import {
  addWishlistItem,
  deleteWishlist,
  deleteWishlistItem,
  fetchWishlist,
  getShareLink,
  updateWishlist,
  updateWishlistItem,
} from '../api/wishlistsApi';
import type { Wishlist, WishlistItem } from '../types';

type ItemFilter = 'all' | 'free' | 'reserved' | 'purchased';

const initialItemForm = {
  title: '',
  url: '',
  price: '' as string | number,
  currency: 'BYN' as 'BYN' | 'USD' | 'EUR',
  image_url: '',
  priority: 3,
  note: '',
};

function getItemErrorMessage(error: unknown, fallback: string) {
  if (typeof error === 'object' && error && 'response' in error) {
    const detail = (error as { response?: { data?: { detail?: string } } }).response?.data?.detail;
    if (typeof detail === 'string') return detail;
  }
  return fallback;
}

function isRequestCanceled(error: unknown) {
  return (
    axios.isCancel(error) ||
    (axios.isAxiosError(error) && error.code === 'ERR_CANCELED') ||
    (error instanceof DOMException && error.name === 'AbortError')
  );
}

export default function WishlistDetail() {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [list, setList] = useState<Wishlist | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<ItemFilter>('all');
  const [showReserved, setShowReserved] = useState(false);
  const [isEditListOpen, setIsEditListOpen] = useState(false);
  const [isDeleteListOpen, setIsDeleteListOpen] = useState(false);
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [isDeleteItemOpen, setIsDeleteItemOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<WishlistItem | null>(null);
  const [itemToDelete, setItemToDelete] = useState<WishlistItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [listForm, setListForm] = useState({
    title: '',
    description: '',
    is_public: false,
  });
  const [itemForm, setItemForm] = useState(initialItemForm);
  const [userModifiedFields, setUserModifiedFields] = useState<Set<keyof typeof initialItemForm>>(
    new Set(),
  );

  const {
    isParsing,
    error: parsingError,
    handleUrlInputChange,
    handleUrlPaste,
    handleUrlBlur,
    resetSession,
  } = useItemParsing({
    onSuccess: (data) => {
      if (data.url) {
        setItemForm((current) => ({ ...current, url: data.url }));
      }
      if (!userModifiedFields.has('title') && data.title) {
        setItemForm((current) => ({ ...current, title: data.title ?? '' }));
      }
      if (!userModifiedFields.has('price') && data.price !== null) {
        setItemForm((current) => ({ ...current, price: String(data.price) }));
      }
      if (!userModifiedFields.has('image_url') && data.image_url) {
        setItemForm((current) => ({ ...current, image_url: data.image_url ?? '' }));
      }
      if (data.currency === 'BYN' || data.currency === 'USD' || data.currency === 'EUR') {
        setItemForm((current) => ({ ...current, currency: data.currency }));
      }
    },
    onError: (message) => {
      showToast(message);
    },
  });

  const loadWishlist = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);

    try {
      const data = await fetchWishlist(id, { signal });
      setList(data);
      setListForm({
        title: data.title,
        description: data.description ?? '',
        is_public: data.is_public,
      });
    } catch (error) {
      if (isRequestCanceled(error)) return;
      setErrorMessage(getItemErrorMessage(error, 'Не удалось загрузить список'));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    const controller = new AbortController();
    void loadWishlist(controller.signal);
    return () => controller.abort();
  }, [loadWishlist]);

  useEffect(() => {
    if (!showReserved && (filter === 'reserved' || filter === 'purchased')) {
      setFilter('all');
    }
  }, [filter, showReserved]);

  const itemFormValid = useMemo(() => {
    const titleOk = itemForm.title.trim().length > 0;
    const priceOk = itemForm.price !== '' && !Number.isNaN(Number(itemForm.price));
    const urlOk = isValidHttpUrl(itemForm.url);
    const imageOk = !itemForm.image_url.trim() || isValidHttpUrl(itemForm.image_url);
    return titleOk && priceOk && urlOk && imageOk;
  }, [itemForm]);

  const filteredItems = useMemo(() => {
    const items = list?.items ?? [];
    return items.filter((item) => {
      if (filter === 'free') return !item.is_purchased && !item.is_reserved;
      if (filter === 'reserved') return Boolean(item.is_reserved);
      if (filter === 'purchased') return item.is_purchased;
      return true;
    });
  }, [filter, list?.items]);

  const listStats = useMemo(() => {
    const items = list?.items ?? [];
    return {
      itemsCount: items.length,
      reservedCount: items.filter((item) => Boolean(item.is_reserved)).length,
      purchasedCount: items.filter((item) => item.is_purchased).length,
    };
  }, [list?.items]);

  const openCreateItem = () => {
    setEditingItem(null);
    setItemForm(initialItemForm);
    setUserModifiedFields(new Set());
    resetSession();
    setIsItemModalOpen(true);
  };

  const openEditItem = (item: WishlistItem) => {
    setEditingItem(item);
    setItemForm({
      title: item.title,
      url: item.url || '',
      price: String(item.price),
      currency: item.currency as 'BYN' | 'USD' | 'EUR',
      image_url: item.image_url || '',
      priority: item.priority,
      note: item.note || '',
    });
    setUserModifiedFields(new Set());
    resetSession();
    setIsItemModalOpen(true);
  };

  const closeItemModal = () => {
    setIsItemModalOpen(false);
    setEditingItem(null);
    setItemForm(initialItemForm);
    setUserModifiedFields(new Set());
    resetSession();
  };

  const handleShare = async () => {
    if (!list) return;
    setSharing(true);
    try {
      const response = await getShareLink(list.id);
      try {
        await navigator.clipboard.writeText(response.share_url);
      } catch {
        showToast('Не удалось скопировать ссылку. Скопируйте её вручную.');
        return;
      }
      setList((current) =>
        current
          ? { ...current, is_public: true, public_id: response.public_id, share_url: response.share_url }
          : current,
      );
      showToast('Ссылка скопирована в буфер обмена');
    } catch {
      showToast('Не удалось получить ссылку. Попробуйте позже');
    } finally {
      setSharing(false);
    }
  };

  const handleUpdateList = async () => {
    if (!listForm.title.trim() || !list) return;
    setSaving(true);

    try {
      const updated = await updateWishlist(list.id, {
        title: listForm.title.trim(),
        description: listForm.description.trim() || null,
        is_public: listForm.is_public,
      });
      setList(updated);
      setIsEditListOpen(false);
    } catch (error) {
      setErrorMessage(getItemErrorMessage(error, 'Ошибка обновления списка'));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteList = async () => {
    if (!list) return;
    await deleteWishlist(list.id);
    navigate('/dashboard');
  };

  const handleSaveItem = async () => {
    if (!itemFormValid || !list) return;
    setSaving(true);

    try {
      if (editingItem) {
        await updateWishlistItem(list.id, editingItem.id, {
          title: itemForm.title.trim(),
          url: itemForm.url.trim(),
          price: Number(itemForm.price),
          currency: itemForm.currency,
          image_url: itemForm.image_url.trim() || null,
          priority: itemForm.priority,
          note: itemForm.note.trim() || null,
        });
      } else {
        await addWishlistItem(list.id, {
          title: itemForm.title.trim(),
          url: itemForm.url.trim(),
          price: Number(itemForm.price),
          currency: itemForm.currency,
          image_url: itemForm.image_url.trim() || null,
          priority: itemForm.priority,
          note: itemForm.note.trim() || null,
        });
      }

      closeItemModal();
      await loadWishlist();
    } catch (error) {
      setErrorMessage(getItemErrorMessage(error, 'Ошибка при сохранении товара'));
    } finally {
      setSaving(false);
    }
  };


  const handleDeleteItem = async () => {
    if (!list || !itemToDelete) return;
    await deleteWishlistItem(list.id, itemToDelete.id);
    setList((current) =>
      current
        ? {
            ...current,
            items: current.items.filter((item) => item.id !== itemToDelete.id),
          }
        : current,
    );
    setItemToDelete(null);
    setIsDeleteItemOpen(false);
  };

  const handlePriceChange = (value: string) => {
    let normalized = value;
    if (normalized.startsWith('.')) normalized = `0${normalized}`;
    if (normalized !== '' && !/^\d*\.?\d{0,2}$/.test(normalized)) return;
    setItemForm((current) => ({ ...current, price: normalized }));
    setUserModifiedFields((current) => new Set([...current, 'price']));
  };

  if (loading) {
    return <div className="mt-20 text-center text-gray-500">Загрузка списка...</div>;
  }

  if (!list) {
    return null;
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <button
        onClick={() => navigate('/dashboard')}
        className="mb-6 flex items-center font-bold text-gray-500 transition-colors hover:text-brand-primary"
      >
        <ArrowLeft size={20} className="mr-2" />
        Назад к спискам
      </button>

      <section className="mb-8 flex flex-col gap-6 rounded-3xl border border-gray-100 bg-white p-6 shadow-sm sm:flex-row sm:items-start sm:justify-between">
        <div className="flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-bold text-gray-900">{list.title}</h1>
            <span
              className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
                list.is_public ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'
              }`}
            >
              {list.is_public ? 'Публичный' : 'Приватный'}
            </span>
          </div>
          <p className="text-lg text-gray-500">{list.description || 'Описание не добавлено'}</p>
          <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-gray-500">
            <span>Всего товаров: {listStats.itemsCount}</span>
            <span>Забронировано: {listStats.reservedCount}</span>
            <span>Куплено: {listStats.purchasedCount}</span>
          </div>
        </div>

        <div className="flex w-full flex-col gap-2 sm:w-auto">
          {list.is_public ? (
            <Button
              variant="secondary"
              className="sm:min-w-[180px]"
              onClick={() => void handleShare()}
              isLoading={sharing}
              loadingLabel="Подготовка..."
            >
              <Link2 size={18} />
              Поделиться
            </Button>
          ) : null}
          <div className="flex gap-2">
            <Button variant="secondary" className="sm:w-12 sm:px-0" onClick={() => setIsEditListOpen(true)}>
              <Edit2 size={18} />
            </Button>
            <Button variant="danger" className="sm:w-12 sm:px-0" onClick={() => setIsDeleteListOpen(true)}>
              <Trash2 size={18} />
            </Button>
          </div>
        </div>
      </section>

      <section className="mb-8 flex flex-col gap-5 rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Товары</h2>
            <p className="mt-1 text-sm text-gray-500">
              Режим «Сюрприз» скрывает забронированные подарки, пока вы не включите показ.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="flex flex-wrap gap-2">
  {[
    ['all', 'Все'],
    ['free', 'Свободные'],
    ['reserved', 'Забронированные'],
    ['purchased', 'Купленные'],
  ].map(([value, label]) => {
    // Определяем, должна ли кнопка быть заблокирована
    const isStatusFilter = value === 'reserved' || value === 'purchased';
    const isDisabled = isStatusFilter && !showReserved;

    return (
      <button
        key={value}
        type="button"
        disabled={isDisabled}
        onClick={() => setFilter(value as ItemFilter)}
        className={`rounded-full px-4 py-2 text-sm font-semibold transition-all ${
          filter === value
            ? 'bg-brand-primary text-white shadow-md'
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
        } ${
          isDisabled 
            ? 'opacity-40 cursor-not-allowed grayscale' 
            : 'active:scale-95'
        }`}
      >
        {label}
      </button>
    );
  })}
</div>

            <label className="flex items-center gap-3 rounded-full bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700">
              <input
                type="checkbox"
                checked={showReserved}
                onChange={(event) => setShowReserved(event.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-brand-primary focus:ring-brand-primary"
              />
              Показать статус бронирования и покупки
            </label>

            <Button className="sm:w-auto" onClick={openCreateItem}>
              <Plus size={18} />
              Добавить подарок
            </Button>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        {filteredItems.length === 0 ? (
          <div className="rounded-3xl border-2 border-dashed border-gray-100 bg-white py-20 text-center text-gray-400">
            <Gift className="mx-auto mb-3 opacity-20" size={48} />
            <p className="font-bold">Ничего не найдено</p>
          </div>
        ) : (
          filteredItems.map((item) => (
            <article
              key={item.id}
              className={`flex flex-col gap-4 rounded-3xl border bg-white p-5 transition-all sm:flex-row sm:items-center ${
                item.is_purchased ? 'border-gray-100 bg-gray-50/70' : 'border-gray-100 hover:shadow-md'
              }`}
            >

              <div className="flex h-24 w-full shrink-0 items-center justify-center overflow-hidden rounded-3xl border border-gray-100 bg-gray-50 sm:w-24">
                {item.image_url ? (
                  <img src={item.image_url} alt={item.title} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center gap-1 text-gray-300">
                    <ImageIcon size={26} />
                    <span className="text-[10px] font-semibold uppercase">Нет фото</span>
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="mb-2 flex flex-wrap items-start gap-2">
                  <h3 className="text-lg font-bold text-gray-900">
                    {item.title}
                  </h3>
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700">
                    <Star size={12} className="fill-current" />
                    {item.priority}
                  </span>
                  {showReserved && item.is_reserved ? (
                    <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">
                      Забронировано: {item.reserved_by?.guest_name || 'Гость'}
                    </span>
                  ) : null}
                  {showReserved && item.is_purchased ? (
                    <span className="rounded-full bg-gray-900 px-3 py-1 text-xs font-semibold text-white">
                      Куплено
                    </span>
                  ) : null}
                </div>

                <div className="flex flex-wrap items-center gap-3 text-sm font-semibold">
                  <span className="text-brand-primary">
                    {Number(item.price).toLocaleString('ru-RU')} {item.currency}
                  </span>
                  {item.url ? (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-gray-400 transition-colors hover:text-brand-primary"
                    >
                      Открыть
                      <ExternalLink size={14} />
                    </a>
                  ) : null}
                </div>

                {item.note ? (
                  <p className="mt-3 flex items-center gap-1.5 text-sm text-gray-500">
                    <MessageSquare size={14} />
                    {item.note}
                  </p>
                ) : null}
              </div>

              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  onClick={() => openEditItem(item)}
                  className="rounded-2xl bg-gray-50 p-3 text-gray-400 transition-colors hover:bg-indigo-50 hover:text-brand-primary"
                  aria-label="Редактировать подарок"
                >
                  <Edit2 size={18} />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setItemToDelete(item);
                    setIsDeleteItemOpen(true);
                  }}
                  className="rounded-2xl bg-gray-50 p-3 text-gray-400 transition-colors hover:bg-red-50 hover:text-brand-error"
                  aria-label="Удалить подарок"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </article>
          ))
        )}
      </section>

      <Modal isOpen={isEditListOpen} onClose={() => setIsEditListOpen(false)} title="Настройки списка">
        <div className="space-y-5">
          <Input
            label="Название"
            value={listForm.title}
            maxLength={100}
            onChange={(event) => setListForm((current) => ({ ...current, title: event.target.value }))}
          />
          <Textarea
            label="Описание"
            className="h-32"
            value={listForm.description}
            maxLength={500}
            onChange={(event) =>
              setListForm((current) => ({ ...current, description: event.target.value }))
            }
          />
          <label className="flex cursor-pointer items-center gap-3 rounded-2xl bg-indigo-50/60 p-4">
            <input
              type="checkbox"
              className="h-5 w-5 rounded border-gray-300 text-brand-primary focus:ring-brand-primary"
              checked={listForm.is_public}
              onChange={(event) =>
                setListForm((current) => ({ ...current, is_public: event.target.checked }))
              }
            />
            <span className="text-sm font-bold text-gray-900">Публичный список</span>
          </label>
          <Button
            onClick={() => void handleUpdateList()}
            disabled={!listForm.title.trim()}
            isLoading={saving}
            loadingLabel="Сохранение..."
          >
            Сохранить
          </Button>
        </div>
      </Modal>

      <Modal
        isOpen={isItemModalOpen}
        onClose={closeItemModal}
        title={editingItem ? 'Изменить подарок' : 'Новый подарок'}
      >
        <div className="space-y-4">
          {isParsing && userModifiedFields.size === 0 ? (
            <div className="space-y-1.5">
              <label className="ml-1 block text-sm font-bold text-gray-700">Название</label>
              <InputSkeleton height="md" />
            </div>
          ) : (
            <Input
              label="Название"
              placeholder="Что подарить?"
              value={itemForm.title}
              maxLength={255}
              onChange={(event) => {
                setItemForm((current) => ({ ...current, title: event.target.value }));
                setUserModifiedFields((current) => new Set([...current, 'title']));
              }}
            />
          )}

          <div className="space-y-1.5">
            <label className="ml-1 block text-sm font-bold text-gray-700">Ссылка на товар</label>
            <div className="relative">
              <input
                type="text"
                placeholder="https://..."
                value={itemForm.url}
                onChange={(event) => {
                  const value = event.target.value;
                  setItemForm((current) => ({ ...current, url: value }));
                  handleUrlInputChange(value);
                }}
                onPaste={(event) => {
                  const pastedUrl = event.clipboardData.getData('text');
                  if (!pastedUrl.trim()) return;
                  event.preventDefault();
                  const input = event.currentTarget;
                  const selectionStart = input.selectionStart ?? itemForm.url.length;
                  const selectionEnd = input.selectionEnd ?? itemForm.url.length;
                  const nextValue =
                    itemForm.url.slice(0, selectionStart) +
                    pastedUrl +
                    itemForm.url.slice(selectionEnd);

                  setItemForm((current) => ({ ...current, url: nextValue }));
                  handleUrlPaste(nextValue);
                }}
                onBlur={() => handleUrlBlur(itemForm.url)}
                className={`w-full rounded-2xl border px-4 py-3 outline-none transition-all ${
                  parsingError
                    ? 'border-red-200 bg-red-50/30 focus:ring-4 focus:ring-red-100'
                    : 'border-gray-200 bg-white focus:border-brand-primary focus:ring-4 focus:ring-indigo-50'
                } ${isParsing ? 'bg-gray-50 text-gray-400' : ''}`}
              />
              {isParsing ? (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <Spinner size="sm" />
                </div>
              ) : null}
            </div>
            {parsingError ? <p className="ml-1 text-xs text-red-500">{parsingError}</p> : null}
          </div>

          {isParsing && userModifiedFields.size === 0 ? (
            <div className="space-y-1.5">
              <label className="ml-1 block text-sm font-bold text-gray-700">Ссылка на фото</label>
              <InputSkeleton height="md" />
            </div>
          ) : (
            <Input
              label="Ссылка на фото"
              placeholder="https://... (необязательно)"
              value={itemForm.image_url}
              error={
                itemForm.image_url && !isValidHttpUrl(itemForm.image_url) ? 'Неверный формат ссылки' : ''
              }
              onChange={(event) => {
                setItemForm((current) => ({ ...current, image_url: event.target.value }));
                setUserModifiedFields((current) => new Set([...current, 'image_url']));
              }}
            />
          )}

          <div className="grid grid-cols-2 gap-4">
            {isParsing && userModifiedFields.size === 0 ? (
              <div className="space-y-1.5">
                <label className="ml-1 block text-sm font-bold text-gray-700">Цена</label>
                <InputSkeleton height="md" />
              </div>
            ) : (
              <Input
                label="Цена"
                type="text"
                placeholder="0.00"
                value={itemForm.price}
                onChange={(event) => handlePriceChange(event.target.value)}
              />
            )}

            <div className="space-y-1.5">
              <label className="ml-1 block text-sm font-bold text-gray-700">Валюта</label>
              <select
                className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 outline-none focus:ring-4 focus:ring-indigo-50"
                value={itemForm.currency}
                onChange={(event) =>
                  setItemForm((current) => ({
                    ...current,
                    currency: event.target.value as 'BYN' | 'USD' | 'EUR',
                  }))
                }
              >
                <option value="BYN">BYN</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="ml-1 block text-sm font-bold text-gray-700">Приоритет</label>
            <select
              className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 outline-none focus:ring-4 focus:ring-indigo-50"
              value={itemForm.priority}
              onChange={(event) =>
                setItemForm((current) => ({ ...current, priority: Number(event.target.value) }))
              }
            >
              <option value="1">1 — низкий</option>
              <option value="2">2 — ниже среднего</option>
              <option value="3">3 — средний</option>
              <option value="4">4 — высокий</option>
              <option value="5">5 — максимальный</option>
            </select>
          </div>

          <Textarea
            label="Комментарий"
            placeholder="Цвет, размер и т.д."
            className="h-24"
            maxLength={500}
            value={itemForm.note}
            onChange={(event) => setItemForm((current) => ({ ...current, note: event.target.value }))}
          />

          <Button
            onClick={() => void handleSaveItem()}
            disabled={!itemFormValid || saving || isParsing}
            isLoading={saving}
            loadingLabel="Сохранение..."
          >
            {editingItem ? 'Сохранить' : 'Добавить'}
          </Button>
        </div>
      </Modal>

      <Modal isOpen={isDeleteListOpen} onClose={() => setIsDeleteListOpen(false)} title="Удалить список?">
        <div className="text-center">
          <p className="mb-8 text-sm text-gray-500">
            Это действие нельзя отменить. Все подарки и связанные бронирования будут удалены.
          </p>
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => setIsDeleteListOpen(false)}>
              Отмена
            </Button>
            <Button variant="danger" className="flex-1" onClick={() => void handleDeleteList()}>
              Да, удалить
            </Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={isDeleteItemOpen} onClose={() => setIsDeleteItemOpen(false)} title="Удалить подарок?">
        <div className="text-center">
          <p className="mb-8 text-sm text-gray-500">
            Это действие нельзя отменить. Подарок будет удалён из списка навсегда.
          </p>
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => setIsDeleteItemOpen(false)}>
              Отмена
            </Button>
            <Button variant="danger" className="flex-1" onClick={() => void handleDeleteItem()}>
              Да, удалить
            </Button>
          </div>
        </div>
      </Modal>

      <ErrorModal
        isOpen={errorMessage !== null}
        message={errorMessage || ''}
        onClose={() => setErrorMessage(null)}
      />
    </div>
  );
}

