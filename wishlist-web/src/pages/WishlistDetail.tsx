import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  ArrowLeft,
  Trash2,
  Plus,
  ExternalLink,
  CheckCircle2,
  Circle,
  Gift,
  Edit2,
  Star,
  MessageSquare,
} from 'lucide-react';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import { Input } from '../components/common/Input';
import { Textarea } from '../components/common/Textarea';
import type { WishlistDetail as WishlistDetailType, WishlistItem } from '../types';
import {
  addWishlistItem,
  deleteWishlist,
  deleteWishlistItem,
  fetchWishlist,
  updateWishlist,
  updateWishlistItem,
} from '../api/wishlistsApi';

type Filter = 'all' | 'active' | 'purchased';

function numPrice(price: number | string): number {
  return typeof price === 'number' ? price : Number(price);
}

function formatMoney(price: number | string, currency: string): string {
  const n = numPrice(price);
  const cur = currency?.toUpperCase() ?? 'RUB';
  if (cur === 'RUB') {
    return `${n.toLocaleString('ru-RU', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ₽`;
  }
  if (cur === 'USD') return `$ ${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (cur === 'EUR') return `€ ${n.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return `${n.toLocaleString('ru-RU')} ${cur}`;
}

function PriorityStars({ priority }: { priority: number }) {
  const filled = 6 - priority;
  return (
    <div className="flex items-center gap-0.5 text-amber-400" aria-label={`Приоритет ${priority} из 5`}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star key={i} size={12} className={i < filled ? 'fill-current' : 'text-gray-200'} />
      ))}
    </div>
  );
}

const WishlistDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [list, setList] = useState<WishlistDetailType | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('all');

  const [isDelListOpen, setIsDelListOpen] = useState(false);
  const [isEditListOpen, setIsEditListOpen] = useState(false);
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [isDelItemOpen, setIsDelItemOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  const [listForm, setListForm] = useState({ title: '', description: '', is_public: false });
  const [listSaving, setListSaving] = useState(false);

  const [editingItem, setEditingItem] = useState<WishlistItem | null>(null);
  const [itemForm, setItemForm] = useState({
    title: '',
    url: '',
    price: '',
    currency: 'RUB' as 'RUB' | 'USD' | 'EUR',
    image_url: '',
    priority: 3,
    note: '',
  });
  const [itemError, setItemError] = useState('');
  const [itemSaving, setItemSaving] = useState(false);

  const fetchData = useCallback(async () => {
    if (!id) return;
    try {
      const data = await fetchWishlist(id);
      setList(data);
      setListForm({
        title: data.title,
        description: data.description ?? '',
        is_public: data.is_public,
      });
    } catch {
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const filteredItems = useMemo(() => {
    if (!list?.items) return [];
    if (filter === 'active') return list.items.filter((i) => !i.is_purchased);
    if (filter === 'purchased') return list.items.filter((i) => i.is_purchased);
    return list.items;
  }, [list, filter]);

  const openAddItem = () => {
    setEditingItem(null);
    setItemError('');
    setItemForm({
      title: '',
      url: '',
      price: '',
      currency: 'RUB',
      image_url: '',
      priority: 3,
      note: '',
    });
    setIsItemModalOpen(true);
  };

  const openEditItem = (item: WishlistItem) => {
    setEditingItem(item);
    setItemError('');
    setItemForm({
      title: item.title,
      url: item.url,
      price: String(numPrice(item.price)),
      currency: (item.currency?.toUpperCase() as 'RUB' | 'USD' | 'EUR') || 'RUB',
      image_url: item.image_url ?? '',
      priority: item.priority,
      note: item.note ?? '',
    });
    setIsItemModalOpen(true);
  };

  const togglePurchased = async (item: WishlistItem) => {
    if (!id) return;
    try {
      await updateWishlistItem(id, item.id, { is_purchased: !item.is_purchased });
      await fetchData();
    } catch {
      /* ignore */
    }
  };

  const handleSaveItem = async () => {
    if (!id) return;
    setItemError('');
    if (editingItem) {
      setItemSaving(true);
      try {
        await updateWishlistItem(id, editingItem.id, {
          note: itemForm.note.trim() || null,
          priority: itemForm.priority,
        });
        setIsItemModalOpen(false);
        await fetchData();
      } finally {
        setItemSaving(false);
      }
      return;
    }

    if (!itemForm.title.trim()) {
      setItemError('Укажите название');
      return;
    }
    if (!itemForm.url.trim()) {
      setItemError('Укажите ссылку на товар');
      return;
    }
    let url: URL;
    try {
      url = new URL(itemForm.url.trim());
      if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new Error('bad');
    } catch {
      setItemError('Введите корректную ссылку (http или https)');
      return;
    }
    const priceNum = itemForm.price === '' ? NaN : Number(itemForm.price);
    if (Number.isNaN(priceNum) || priceNum < 0) {
      setItemError('Укажите цену от 0');
      return;
    }
    if (itemForm.image_url.trim()) {
      try {
        const iu = new URL(itemForm.image_url.trim());
        if (iu.protocol !== 'http:' && iu.protocol !== 'https:') throw new Error('bad');
      } catch {
        setItemError('Ссылка на изображение должна быть валидным URL');
        return;
      }
    }

    setItemSaving(true);
    try {
      await addWishlistItem(id, {
        title: itemForm.title.trim(),
        url: url.toString(),
        price: priceNum,
        currency: itemForm.currency,
        image_url: itemForm.image_url.trim() || null,
        priority: itemForm.priority,
        note: itemForm.note.trim() || null,
      });
      setIsItemModalOpen(false);
      await fetchData();
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.status === 409) {
        setItemError('Этот товар уже добавлен в список');
        return;
      }
      setItemError('Не удалось сохранить. Проверьте данные.');
    } finally {
      setItemSaving(false);
    }
  };

  const handleSaveList = async () => {
    if (!id || !listForm.title.trim()) return;
    setListSaving(true);
    try {
      await updateWishlist(id, {
        title: listForm.title.trim(),
        description: listForm.description.trim() || null,
        is_public: listForm.is_public,
      });
      setIsEditListOpen(false);
      await fetchData();
    } finally {
      setListSaving(false);
    }
  };

  const handleDeleteList = async () => {
    if (!id) return;
    try {
      await deleteWishlist(id);
      navigate('/dashboard');
    } catch {
      navigate('/dashboard');
    }
  };

  const confirmDeleteItem = async () => {
    if (!id || !itemToDelete) return;
    try {
      await deleteWishlistItem(id, itemToDelete);
      setIsDelItemOpen(false);
      setItemToDelete(null);
      await fetchData();
    } catch {
      setIsDelItemOpen(false);
    }
  };

  if (loading) {
    return <div className="mt-20 text-center text-gray-500">Загрузка данных...</div>;
  }
  if (!list) return null;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <button
        type="button"
        onClick={() => navigate('/dashboard')}
        className="mb-6 flex min-h-[44px] items-center text-gray-500 transition-all hover:text-brand-primary"
      >
        <ArrowLeft size={20} className="mr-2" />
        Назад к спискам
      </button>

      <div className="mb-8 rounded-3xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex-1">
            <div className="mb-2 flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-bold text-gray-900">{list.title}</h1>
              <span className="rounded-lg bg-indigo-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-brand-primary">
                {list.is_public ? 'Публичный' : 'Приватный'}
              </span>
            </div>
            <p className="text-lg leading-relaxed text-gray-500">
              {list.description?.trim() ? list.description : 'Описание не добавлено'}
            </p>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <Button variant="secondary" className="min-h-[44px] sm:px-4" onClick={() => setIsEditListOpen(true)}>
              Редактировать список
            </Button>
            <Button variant="danger" className="min-h-[44px] sm:px-4" onClick={() => setIsDelListOpen(true)}>
              Удалить список
            </Button>
          </div>
        </div>
      </div>

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Фильтр по статусу">
          {(
            [
              ['all', 'Все'],
              ['active', 'Некупленные'],
              ['purchased', 'Купленные'],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={filter === key}
              onClick={() => setFilter(key)}
              className={`min-h-[44px] rounded-2xl px-4 text-sm font-bold transition-colors ${
                filter === key ? 'bg-brand-primary text-white shadow-md' : 'bg-white text-gray-600 ring-1 ring-gray-100 hover:bg-gray-50'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <Button onClick={openAddItem} className="flex min-h-[44px] w-full gap-2 py-2.5 shadow-md sm:w-auto">
          <Plus size={18} /> Добавить подарок
        </Button>
      </div>

      <div className="space-y-4">
        {!list.items?.length ? (
          <div className="rounded-3xl border-2 border-dashed border-gray-100 bg-white py-16 text-center text-gray-400">
            <Gift className="mx-auto mb-3 opacity-20" size={48} />
            <h2 className="mb-2 text-lg font-bold text-gray-900">В этом списке пока нет подарков</h2>
            <p className="mb-6 text-sm text-gray-500">Добавьте первый подарок, чтобы поделиться желанием с близкими</p>
            <Button variant="secondary" className="mx-auto w-auto" onClick={openAddItem}>
              Добавить первый подарок
            </Button>
          </div>
        ) : filteredItems.length === 0 ? (
          <p className="text-center text-gray-500">Нет подарков в этой категории</p>
        ) : (
          filteredItems.map((item) => (
            <div
              key={item.id}
              className={`group flex flex-col items-stretch gap-4 rounded-3xl border bg-white p-5 transition-all sm:flex-row sm:items-center ${
                item.is_purchased ? 'border-gray-50 opacity-70' : 'border-gray-100 hover:border-brand-primary hover:shadow-sm'
              }`}
            >
              <button
                type="button"
                onClick={() => togglePurchased(item)}
                className="min-h-[44px] min-w-[44px] shrink-0 self-start text-brand-primary sm:self-center"
                aria-label={item.is_purchased ? 'Вернуть в желаемое' : 'Отметить купленным'}
              >
                {item.is_purchased ? (
                  <CheckCircle2 size={30} className="text-green-500" />
                ) : (
                  <Circle size={30} className="text-gray-200" />
                )}
              </button>

              <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-gray-100 bg-gray-50 text-brand-primary">
                {item.image_url ? (
                  <img src={item.image_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <Gift size={28} className="opacity-20" />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <h4
                    className={`truncate text-lg font-bold sm:max-w-md ${
                      item.is_purchased ? 'text-gray-400 line-through' : 'text-gray-900'
                    }`}
                  >
                    {item.title}
                  </h4>
                  <PriorityStars priority={item.priority} />
                  {item.is_purchased && (
                    <span className="rounded-md bg-gray-100 px-2 py-0.5 text-[10px] font-bold uppercase text-gray-500">Куплено</span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-4 text-sm font-bold">
                  <span className="text-brand-primary">{formatMoney(item.price, item.currency)}</span>
                  {item.url ? (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noreferrer"
                      className="min-h-[44px] min-w-[44px] text-gray-400 hover:text-brand-primary"
                      aria-label="Открыть ссылку на товар"
                    >
                      <ExternalLink size={16} />
                    </a>
                  ) : null}
                </div>
                {item.note ? (
                  <p className="mt-2 flex items-start gap-1.5 text-xs text-gray-400">
                    <MessageSquare size={12} className="mt-0.5 shrink-0" />
                    <span className="line-clamp-2">{item.note}</span>
                  </p>
                ) : null}
              </div>

              <div className="flex gap-1 sm:justify-end">
                <button
                  type="button"
                  onClick={() => openEditItem(item)}
                  className="min-h-[44px] min-w-[44px] rounded-xl p-2.5 text-gray-400 transition-all hover:bg-indigo-50 hover:text-brand-primary"
                  aria-label="Редактировать подарок"
                >
                  <Edit2 size={18} />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setItemToDelete(item.id);
                    setIsDelItemOpen(true);
                  }}
                  className="min-h-[44px] min-w-[44px] rounded-xl p-2.5 text-gray-400 transition-all hover:bg-red-50 hover:text-brand-error"
                  aria-label="Удалить подарок"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <Modal isOpen={isEditListOpen} onClose={() => setIsEditListOpen(false)} title="Редактировать список">
        <div className="space-y-5">
          <Input
            label="Название"
            maxLength={100}
            value={listForm.title}
            onChange={(e) => setListForm({ ...listForm, title: e.target.value })}
          />
          <Textarea
            label="Описание"
            maxLength={500}
            value={listForm.description}
            onChange={(e) => setListForm({ ...listForm, description: e.target.value })}
            rows={4}
          />
          <label className="flex cursor-pointer items-start gap-3 rounded-2xl bg-indigo-50/50 p-4">
            <input
              type="checkbox"
              className="mt-1 h-5 w-5 rounded border-gray-300 text-brand-primary focus:ring-brand-primary"
              checked={listForm.is_public}
              onChange={(e) => setListForm({ ...listForm, is_public: e.target.checked })}
            />
            <span>
              <span className="block text-sm font-bold text-gray-900">Публичный список</span>
              <span className="text-xs text-gray-500">Позволяет делиться списком по ссылке в будущем</span>
            </span>
          </label>
          <Button onClick={() => void handleSaveList()} isLoading={listSaving} loadingLabel="Сохранение..." className="min-h-[44px]">
            Сохранить настройки
          </Button>
        </div>
      </Modal>

      <Modal
        isOpen={isItemModalOpen}
        onClose={() => setIsItemModalOpen(false)}
        title={editingItem ? 'Редактировать подарок' : 'Новый подарок'}
      >
        <div className="space-y-4">
          {itemError && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-brand-error">{itemError}</p>}
          {editingItem ? (
            <>
              <div>
                <p className="mb-1 ml-1 text-xs font-bold uppercase tracking-wide text-gray-400">Название</p>
                <p className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-800">{itemForm.title}</p>
              </div>
              <div>
                <p className="mb-1 ml-1 text-xs font-bold uppercase tracking-wide text-gray-400">Ссылка</p>
                <p className="truncate rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm text-gray-600">{itemForm.url}</p>
              </div>
              <div>
                <p className="mb-1 ml-1 text-xs font-bold uppercase tracking-wide text-gray-400">Цена</p>
                <p className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-800">
                  {formatMoney(itemForm.price, itemForm.currency)}
                </p>
              </div>
            </>
          ) : (
            <>
              <Input label="Название" value={itemForm.title} onChange={(e) => setItemForm({ ...itemForm, title: e.target.value })} maxLength={255} />
              <Input
                label="Ссылка на товар"
                type="url"
                placeholder="https://..."
                value={itemForm.url}
                onChange={(e) => setItemForm({ ...itemForm, url: e.target.value })}
              />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Input
                  label="Цена"
                  type="number"
                  min={0}
                  step="0.01"
                  value={itemForm.price}
                  onChange={(e) => setItemForm({ ...itemForm, price: e.target.value })}
                />
                <div>
                  <label htmlFor="currency-select" className="mb-1.5 ml-1 block text-sm font-bold text-gray-700">
                    Валюта
                  </label>
                  <select
                    id="currency-select"
                    value={itemForm.currency}
                    onChange={(e) =>
                      setItemForm({ ...itemForm, currency: e.target.value as 'RUB' | 'USD' | 'EUR' })
                    }
                    className="w-full cursor-pointer rounded-2xl border border-gray-200 bg-white px-4 py-3 text-gray-900 outline-none focus:border-brand-primary focus:ring-4 focus:ring-indigo-50"
                  >
                    <option value="RUB">RUB</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                  </select>
                </div>
              </div>
              <Input
                label="Ссылка на изображение (необязательно)"
                type="url"
                value={itemForm.image_url}
                onChange={(e) => setItemForm({ ...itemForm, image_url: e.target.value })}
              />
            </>
          )}
          <div>
            <label htmlFor="priority-item" className="mb-1.5 ml-1 block text-sm font-bold text-gray-700">
              Приоритет (1 — высший)
            </label>
            <select
              id="priority-item"
              value={itemForm.priority}
              onChange={(e) => setItemForm({ ...itemForm, priority: Number(e.target.value) })}
              className="w-full cursor-pointer rounded-2xl border border-gray-200 px-4 py-3 outline-none focus:ring-2 focus:ring-brand-primary"
            >
              <option value={1}>1 — Высший</option>
              <option value={2}>2</option>
              <option value={3}>3 — По умолчанию</option>
              <option value={4}>4</option>
              <option value={5}>5 — Низший</option>
            </select>
          </div>
          <Textarea
            label="Комментарий"
            maxLength={500}
            value={itemForm.note}
            onChange={(e) => setItemForm({ ...itemForm, note: e.target.value })}
            placeholder="Цвет, размер и т.д."
            rows={3}
          />
          <Button onClick={() => void handleSaveItem()} isLoading={itemSaving} loadingLabel="Сохранение..." className="min-h-[44px]">
            {editingItem ? 'Сохранить' : 'Добавить в список'}
          </Button>
        </div>
      </Modal>

      <Modal isOpen={isDelListOpen} onClose={() => setIsDelListOpen(false)} title="Удалить список?">
        <div className="px-2 text-center">
          <p className="mb-8 text-sm leading-relaxed text-gray-500">
            Это действие нельзя отменить. Все подарки в списке также будут удалены.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button variant="secondary" className="min-h-[44px]" onClick={() => setIsDelListOpen(false)}>
              Отмена
            </Button>
            <Button variant="danger" className="min-h-[44px]" onClick={() => void handleDeleteList()}>
              Да, удалить
            </Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={isDelItemOpen} onClose={() => setIsDelItemOpen(false)} title="Удалить подарок?">
        <div className="text-center">
          <p className="mb-8 text-sm text-gray-500">Подарок будет убран из списка. Это действие нельзя отменить.</p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button variant="secondary" className="min-h-[44px]" onClick={() => setIsDelItemOpen(false)}>
              Отмена
            </Button>
            <Button variant="danger" className="min-h-[44px]" onClick={() => void confirmDeleteItem()}>
              Да, удалить
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default WishlistDetail;
