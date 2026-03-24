import React, { useCallback, useEffect, useState } from 'react';
import { Plus, Gift, Edit2, Trash2, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { WishlistSummary } from '../types';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import { Input } from '../components/common/Input';
import { Textarea } from '../components/common/Textarea';
import {
  createWishlist,
  deleteWishlist,
  fetchWishlists,
  updateWishlist,
} from '../api/wishlistsApi';

const Dashboard = () => {
  const [wishlists, setWishlists] = useState<WishlistSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDelModalOpen, setIsDelModalOpen] = useState(false);
  const [editingList, setEditingList] = useState<WishlistSummary | null>(null);
  const [listToDelete, setListToDelete] = useState<string | null>(null);
  const [listForm, setListForm] = useState({ title: '', description: '', is_public: false });
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setLoadError('');
    try {
      const data = await fetchWishlists();
      setWishlists(data);
    } catch {
      setLoadError('Не удалось загрузить списки. Попробуйте обновить страницу.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });

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

  const openDelete = (id: string) => {
    setListToDelete(id);
    setIsDelModalOpen(true);
  };

  const handleSave = async () => {
    if (!listForm.title.trim()) return;
    setSaving(true);
    try {
      if (editingList) {
        await updateWishlist(editingList.id, {
          title: listForm.title.trim(),
          description: listForm.description.trim() || null,
          is_public: listForm.is_public,
        });
      } else {
        await createWishlist({
          title: listForm.title.trim(),
          description: listForm.description.trim() || null,
          is_public: listForm.is_public,
        });
      }
      setIsModalOpen(false);
      setEditingList(null);
      await fetchData();
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!listToDelete) return;
    try {
      await deleteWishlist(listToDelete);
      setIsDelModalOpen(false);
      setListToDelete(null);
      await fetchData();
    } catch {
      setIsDelModalOpen(false);
    }
  };

  if (loading) {
    return <div className="mt-20 text-center text-gray-500">Загрузка списков...</div>;
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      {loadError && (
        <p className="mb-6 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-brand-error">{loadError}</p>
      )}

      <div className="mb-10 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900">Мои списки желаний</h1>
          <p className="mt-1 text-sm text-gray-500">Создавайте и управляйте своими списками подарков</p>
        </div>
        <Button onClick={openCreate} className="flex h-12 min-h-[44px] w-full gap-2 px-6 shadow-lg shadow-indigo-100 md:w-auto">
          <Plus size={20} /> Создать список
        </Button>
      </div>

      {wishlists.length === 0 ? (
        <div className="rounded-3xl border-2 border-dashed border-gray-100 bg-white py-20 text-center">
          <Gift className="mx-auto mb-4 text-gray-200" size={64} />
          <h2 className="mb-2 text-xl font-bold text-gray-900">У вас пока нет списков желаний</h2>
          <p className="mb-8 text-gray-500">Создайте первый список, чтобы начать добавлять подарки</p>
          <Button variant="secondary" onClick={openCreate} className="mx-auto w-auto min-w-[200px] px-8">
            Создать первый список
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {wishlists.map((list) => (
            <div
              key={list.id}
              className="group flex flex-col rounded-3xl border border-gray-100 bg-white p-6 transition-all duration-300 hover:border-brand-primary/20 hover:shadow-2xl"
            >
              <div className="mb-2 flex justify-between gap-2">
                <h3 className="flex-1 truncate pr-2 text-lg font-bold text-gray-900" title={list.title}>
                  {list.title}
                </h3>
                {list.is_public && (
                  <span className="rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-bold uppercase text-green-600">
                    Публичный
                  </span>
                )}
              </div>

              {list.description ? (
                <p className="mb-6 line-clamp-2 h-10 text-sm leading-relaxed text-gray-500">{list.description}</p>
              ) : (
                <div className="mb-6 h-10" />
              )}

              <div className="mb-6 flex items-center justify-between rounded-2xl bg-gray-50/50 p-3 text-xs text-gray-400">
                <div className="flex items-center gap-1.5 font-bold text-brand-primary">
                  <Gift size={14} />
                  <span>
                    {list.items_count}{' '}
                    {list.items_count === 1 ? 'подарок' : list.items_count > 1 && list.items_count < 5 ? 'подарка' : 'подарков'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 font-medium">
                  <Calendar size={14} />
                  <span>{formatDate(list.created_at)}</span>
                </div>
              </div>

              <div className="mt-auto flex items-center gap-2">
                <Link to={`/wishlist/${list.id}`} className="min-h-[44px] min-w-[44px] flex-1">
                  <Button variant="primary" className="h-10 min-h-[44px] text-sm shadow-md shadow-indigo-100">
                    Открыть
                  </Button>
                </Link>
                <button
                  type="button"
                  aria-label="Редактировать список"
                  onClick={() => openEdit(list)}
                  className="min-h-[44px] min-w-[44px] rounded-xl bg-gray-50 p-2.5 text-gray-500 transition-colors hover:bg-indigo-50 hover:text-brand-primary"
                >
                  <Edit2 size={18} />
                </button>
                <button
                  type="button"
                  aria-label="Удалить список"
                  onClick={() => openDelete(list.id)}
                  className="min-h-[44px] min-w-[44px] rounded-xl bg-gray-50 p-2.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-brand-error"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingList ? 'Редактировать список' : 'Новый список'}>
        <div className="space-y-5">
          <Input
            label="Название"
            required
            maxLength={100}
            value={listForm.title}
            onChange={(e) => setListForm({ ...listForm, title: e.target.value })}
            placeholder="Название списка"
          />
          <Textarea
            label="Описание"
            maxLength={500}
            value={listForm.description}
            onChange={(e) => setListForm({ ...listForm, description: e.target.value })}
            placeholder="Описание (необязательно)"
            rows={4}
          />
          <label className="flex cursor-pointer items-start gap-3 rounded-2xl bg-gray-50 p-4 transition-colors hover:bg-indigo-50">
            <input
              type="checkbox"
              className="mt-1 h-5 w-5 rounded border-gray-300 text-brand-primary focus:ring-brand-primary"
              checked={listForm.is_public}
              onChange={(e) => setListForm({ ...listForm, is_public: e.target.checked })}
            />
            <span>
              <span className="block text-sm font-bold text-gray-900">Публичный список</span>
              <span className="text-xs text-gray-500">Список смогут видеть по ссылке (в будущих версиях)</span>
            </span>
          </label>
          <Button onClick={() => void handleSave()} isLoading={saving} loadingLabel="Сохранение..." className="min-h-[44px]" disabled={!listForm.title.trim()}>
            {editingList ? 'Сохранить изменения' : 'Создать список'}
          </Button>
        </div>
      </Modal>

      <Modal isOpen={isDelModalOpen} onClose={() => setIsDelModalOpen(false)} title="Удалить список?">
        <div className="text-center">
          <p className="mb-8 text-sm leading-relaxed text-gray-500">
            Это действие нельзя отменить. Все подарки в списке также будут удалены.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button variant="secondary" className="min-h-[44px]" onClick={() => setIsDelModalOpen(false)}>
              Отмена
            </Button>
            <Button variant="danger" className="min-h-[44px]" onClick={() => void handleConfirmDelete()}>
              Да, удалить
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Dashboard;
