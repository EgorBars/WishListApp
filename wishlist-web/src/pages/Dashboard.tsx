import { useCallback, useEffect, useState } from 'react';
import { Calendar, Edit2, Gift, Link2, Plus, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { Modal } from '../components/common/Modal';
import { Textarea } from '../components/common/Textarea';
import { useToast } from '../context/ToastContext';
import {
  createWishlist,
  deleteWishlist,
  fetchWishlists,
  getShareLink,
  updateWishlist,
} from '../api/wishlistsApi';
import type { WishlistSummary } from '../types';

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function pluralizeItems(count: number) {
  if (count % 10 === 1 && count % 100 !== 11) return 'подарок';
  if (count % 10 >= 2 && count % 10 <= 4 && (count % 100 < 10 || count % 100 >= 20)) {
    return 'подарка';
  }
  return 'подарков';
}

function isRequestCanceled(error: unknown) {
  return (
    axios.isCancel(error) ||
    (axios.isAxiosError(error) && error.code === 'ERR_CANCELED') ||
    (error instanceof DOMException && error.name === 'AbortError')
  );
}

export default function Dashboard() {
  const { showToast } = useToast();
  const [wishlists, setWishlists] = useState<WishlistSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingList, setEditingList] = useState<WishlistSummary | null>(null);
  const [listToDelete, setListToDelete] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [sharingId, setSharingId] = useState<string | null>(null);
  const [listForm, setListForm] = useState({
    title: '',
    description: '',
    is_public: false,
  });

  const fetchData = useCallback(async (signal?: AbortSignal) => {
    setLoadError('');

    try {
      const data = await fetchWishlists(signal);
      setWishlists(data);
    } catch (error) {
      if (isRequestCanceled(error)) return;
      setLoadError('Не удалось загрузить списки. Попробуйте обновить страницу.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void fetchData(controller.signal);
    return () => controller.abort();
  }, [fetchData]);

  const openCreate = () => {
    setEditingList(null);
    setListForm({ title: '', description: '', is_public: false });
    setIsModalOpen(true);
  };

  const openEdit = (list: WishlistSummary) => {
    setEditingList(list);
    setListForm({
      title: list.title,
      description: list.description ?? '',
      is_public: list.is_public,
    });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!listForm.title.trim()) return;
    setSaving(true);

    try {
      if (editingList) {
        const updated = await updateWishlist(editingList.id, {
          title: listForm.title.trim(),
          description: listForm.description.trim() || null,
          is_public: listForm.is_public,
        });
        setWishlists((current) =>
          current.map((item) => (item.id === editingList.id ? { ...item, ...updated } : item)),
        );
      } else {
        await createWishlist({
          title: listForm.title.trim(),
          description: listForm.description.trim() || null,
          is_public: listForm.is_public,
        });
        await fetchData();
      }

      setIsModalOpen(false);
      setEditingList(null);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!listToDelete) return;
    await deleteWishlist(listToDelete);
    setWishlists((current) => current.filter((item) => item.id !== listToDelete));
    setIsDeleteModalOpen(false);
    setListToDelete(null);
  };

  const handleShare = async (list: WishlistSummary) => {
    setSharingId(list.id);
    try {
      const response = await getShareLink(list.id);
      try {
        await navigator.clipboard.writeText(response.share_url);
      } catch {
        showToast('Не удалось скопировать ссылку. Скопируйте её вручную.');
        return;
      }
      setWishlists((current) =>
        current.map((item) =>
          item.id === list.id
            ? { ...item, public_id: response.public_id, share_url: response.share_url, is_public: true }
            : item,
        ),
      );
      showToast('Ссылка скопирована в буфер обмена');
    } catch {
      showToast('Не удалось получить ссылку. Попробуйте позже');
    } finally {
      setSharingId(null);
    }
  };

  if (loading) {
    return <div className="mt-20 text-center text-gray-500">Загрузка списков...</div>;
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      {loadError ? (
        <p className="mb-6 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-brand-error">
          {loadError}
        </p>
      ) : null}

      <div className="mb-10 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900">Мои списки желаний</h1>
          <p className="mt-1 text-sm text-gray-500">
            Управляйте подарками, следите за прогрессом и делитесь списками с гостями.
          </p>
        </div>
        <Button onClick={openCreate} className="flex h-12 min-h-[44px] w-full gap-2 px-6 md:w-auto">
          <Plus size={20} />
          Создать список
        </Button>
      </div>

      {wishlists.length === 0 ? (
        <div className="rounded-3xl border-2 border-dashed border-gray-100 bg-white py-20 text-center">
          <Gift className="mx-auto mb-4 text-gray-200" size={64} />
          <h2 className="mb-2 text-xl font-bold text-gray-900">У вас пока нет списков желаний</h2>
          <p className="mb-8 text-gray-500">Создайте первый список, чтобы начать добавлять подарки.</p>
          <Button variant="secondary" onClick={openCreate} className="mx-auto w-auto min-w-[220px] px-8">
            Создать первый список
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {wishlists.map((list) => {
            const itemsCount = list.items_count || 0;
            const reservedCount = list.reserved_count || 0;
            const purchasedCount = list.purchased_count || 0;
            const progressValue = itemsCount > 0 ? Math.min((purchasedCount / itemsCount) * 100, 100) : 0;

            return (
              <article
                key={list.id}
                className="group flex flex-col rounded-3xl border border-gray-100 bg-white p-6 shadow-sm transition-all hover:border-brand-primary/20 hover:shadow-xl"
              >
                <div className="mb-2 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate text-lg font-bold text-gray-900" title={list.title}>
                      {list.title}
                    </h3>
                    <p className="mt-1 line-clamp-2 min-h-[40px] text-sm leading-relaxed text-gray-500">
                      {list.description || 'Без описания'}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
                      list.is_public ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {list.is_public ? 'Публичный' : 'Приватный'}
                  </span>
                </div>

                <div className="mb-5 flex items-center justify-between text-xs text-gray-400">
                  <div className="flex items-center gap-1.5 font-semibold text-brand-primary">
                    <Gift size={14} />
                    {itemsCount} {pluralizeItems(itemsCount)}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Calendar size={14} />
                    <span>{formatDate(list.created_at)}</span>
                  </div>
                </div>

                <div className="mb-5 rounded-3xl bg-gray-50 p-4">
                  <div className="mb-3 flex items-center justify-between text-sm font-semibold text-gray-700">
                    <span>Прогресс списка</span>
                    <span>
                      {purchasedCount}/{itemsCount || 0}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-white">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-amber-400 to-brand-primary transition-[width] duration-300"
                      style={{ width: `${progressValue}%` }}
                    />
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                    <span>Забронировано: {reservedCount}</span>
                    <span>Куплено: {purchasedCount}</span>
                  </div>
                </div>

                <div className="mt-auto grid grid-cols-[minmax(0,1fr)_44px_44px_44px] items-center gap-2">
                  <Link to={`/wishlist/${list.id}`} className="block min-h-[44px] min-w-0">
                    <Button variant="primary" className="h-11 min-h-[44px] !w-full text-sm">
                      Открыть
                    </Button>
                  </Link>

                  {list.is_public ? (
                    <Button
                      type="button"
                      variant="secondary"
                      className="h-11 !w-11 min-h-[44px] !min-w-[44px] rounded-2xl !px-0"
                      onClick={() => void handleShare(list)}
                      isLoading={sharingId === list.id}
                      loadingLabel=""
                      aria-label="Поделиться списком"
                    >
                      <Link2 size={18} />
                    </Button>
                  ) : null}

                  <button
                    type="button"
                    aria-label="Редактировать список"
                    onClick={() => openEdit(list)}
                    className="min-h-[44px] min-w-[44px] rounded-2xl bg-gray-50 p-2.5 text-gray-500 transition-colors hover:bg-indigo-50 hover:text-brand-primary"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button
                    type="button"
                    aria-label="Удалить список"
                    onClick={() => {
                      setListToDelete(list.id);
                      setIsDeleteModalOpen(true);
                    }}
                    className="min-h-[44px] min-w-[44px] rounded-2xl bg-gray-50 p-2.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-brand-error"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingList ? 'Редактировать список' : 'Новый список'}
      >
        <div className="space-y-5">
          <Input
            label="Название"
            required
            maxLength={100}
            value={listForm.title}
            onChange={(event) => setListForm((current) => ({ ...current, title: event.target.value }))}
            placeholder="Название списка"
          />
          <Textarea
            label="Описание"
            maxLength={500}
            value={listForm.description}
            onChange={(event) => setListForm((current) => ({ ...current, description: event.target.value }))}
            placeholder="Описание списка"
            rows={4}
          />
          <label className="flex cursor-pointer items-start gap-3 rounded-2xl bg-gray-50 p-4 transition-colors hover:bg-indigo-50">
            <input
              type="checkbox"
              className="mt-1 h-5 w-5 rounded border-gray-300 text-brand-primary focus:ring-brand-primary"
              checked={listForm.is_public}
              onChange={(event) =>
                setListForm((current) => ({ ...current, is_public: event.target.checked }))
              }
            />
            <span>
              <span className="block text-sm font-bold text-gray-900">Публичный список</span>
              <span className="text-xs text-gray-500">
                У публичного списка появится кнопка «Поделиться» без перезагрузки страницы.
              </span>
            </span>
          </label>
          <Button
            onClick={() => void handleSave()}
            isLoading={saving}
            loadingLabel="Сохранение..."
            className="min-h-[44px]"
            disabled={!listForm.title.trim()}
          >
            {editingList ? 'Сохранить изменения' : 'Создать список'}
          </Button>
        </div>
      </Modal>

      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Удалить список?"
      >
        <div className="text-center">
          <p className="mb-8 text-sm leading-relaxed text-gray-500">
            Это действие нельзя отменить. Все подарки и связанные бронирования будут удалены.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button variant="secondary" className="min-h-[44px]" onClick={() => setIsDeleteModalOpen(false)}>
              Отмена
            </Button>
            <Button variant="danger" className="min-h-[44px]" onClick={() => void handleDelete()}>
              Да, удалить
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
