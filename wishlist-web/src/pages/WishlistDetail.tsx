import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Trash2, Plus, ExternalLink, 
  CheckCircle2, Circle, Gift, Edit2, X 
} from 'lucide-react';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import { Wishlist, WishlistItem } from '../types';
import api from '../api/axiosInstance';

const WishlistDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  // Состояния данных
  const [list, setList] = useState<Wishlist | null>(null);
  const [loading, setLoading] = useState(true);

  // Состояния модалок
  const [isDelOpen, setIsDelOpen] = useState(false);
  const [isItemOpen, setIsItemOpen] = useState(false);
  
  // Состояние редактирования товара
  const [editingItem, setEditingItem] = useState<WishlistItem | null>(null);
  const [itemForm, setItemForm] = useState({
    title: '',
    url: '',
    price: 0,
    currency: 'RUB',
    priority: 3
  });

  const fetchData = async () => {
    try {
      const res = await api.get(`/wishlists/${id}`);
      setList(res.data);
    } catch (e) {
      // РЕЖИМ ТЕСТА: Если бэкенд не готов, показываем моковые данные
      setList({
        id: id || '1',
        title: 'Мой День Рождения',
        description: 'Список подарков, которые я был бы рад получить!',
        is_public: true,
        items_count: 2,
        items: [
          { id: 'i1', title: 'Кроссовки Nike Air Max', price: 15000, currency: 'RUB', is_purchased: false, priority: 5, url: 'https://nike.com' },
          { id: 'i2', title: 'Умная колонка', price: 5000, currency: 'RUB', is_purchased: true, priority: 3, url: '' }
        ]
      } as any);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  // Открытие модалки для добавления
  const openAddItem = () => {
    setEditingItem(null);
    setItemForm({ title: '', url: '', price: 0, currency: 'RUB', priority: 3 });
    setIsItemOpen(true);
  };

  // Открытие модалки для редактирования
  const openEditItem = (item: WishlistItem) => {
    setEditingItem(item);
    setItemForm({
      title: item.title,
      url: item.url || '',
      price: item.price,
      currency: item.currency,
      priority: item.priority
    });
    setIsItemOpen(true);
  };

  const togglePurchased = (itemId: string) => {
    if (!list || !list.items) return;

    // Имитируем обновление: создаем новый массив, где у нужного товара меняем статус
    const updatedItems = list.items.map(item => 
      item.id === itemId ? { ...item, is_purchased: !item.is_purchased } : item
    );

    // Обновляем локальное состояние страницы
    setList({ ...list, items: updatedItems });

    // В будущем здесь будет вызов: 
    // api.put(`/wishlists/${id}/items/${itemId}`, { is_purchased: !currentStatus })
  };

  const handleSaveItem = async () => {
    if (!itemForm.title) return;
    try {
      if (editingItem) {
        // api.put(`/wishlists/${id}/items/${editingItem.id}`, itemForm)
        console.log("Обновляем товар:", itemForm);
      } else {
        // api.post(`/wishlists/${id}/items`, itemForm)
        console.log("Добавляем товар:", itemForm);
      }
      setIsItemOpen(false);
      fetchData();
    } catch (e) {
      alert("Ошибка сохранения (тестовый режим)");
    }
  };

  const handleDeleteList = async () => {
    try {
      await api.delete(`/wishlists/${id}`);
      navigate('/dashboard');
    } catch (e) {
      setIsDelOpen(false);
      alert("Удаление не сработало (тестовый режим)");
    }
  };

  if (loading) return <div className="text-center mt-20 text-gray-500">Загрузка данных...</div>;
  if (!list) return null;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Навигация */}
      <button 
        onClick={() => navigate('/dashboard')} 
        className="flex items-center text-gray-500 hover:text-brand-primary mb-6 transition-all group"
      >
        <ArrowLeft size={20} className="mr-2 group-hover:-translate-x-1 transition-transform" /> 
        Назад к спискам
      </button>

      {/* Карточка списка (п. 4.7) */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-gray-100 mb-8 flex flex-col sm:flex-row justify-between items-start gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-gray-900">{list.title}</h1>
            <span className="px-2 py-1 bg-indigo-50 text-brand-primary text-xs font-bold rounded-lg uppercase">
              {list.is_public ? 'Публичный' : 'Приватный'}
            </span>
          </div>
          <p className="text-gray-500 mt-2 text-lg">{list.description || 'Описание не добавлено'}</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button variant="danger" className="flex-1 sm:w-12 sm:h-12 p-0 rounded-2xl" onClick={() => setIsDelOpen(true)}>
            <Trash2 size={20} />
          </Button>
        </div>
      </div>

      {/* Заголовок товаров */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          Товары в списке 
          <span className="text-gray-400 text-sm font-medium">
            ({list.items?.length || 0})
          </span>
        </h2>
        
        {/* Кнопка: убрали лишнюю ширину, добавили адаптивность */}
        <Button 
          onClick={openAddItem} 
          className="w-full sm:w-auto py-2.5 px-6 flex items-center justify-center gap-2 h-11 whitespace-nowrap shadow-md shadow-indigo-50"
        >
          <Plus size={18} /> 
          <span>Добавить подарок</span>
        </Button>
      </div>

      {/* Список товаров (п. 4.8) */}
      <div className="space-y-4">
        {!list.items || list.items.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-3xl border-2 border-dashed border-gray-100 text-gray-400">
            <Gift className="mx-auto mb-3 opacity-20" size={48} />
            <p>В этом списке пока нет подарков</p>
          </div>
        ) : (
          list.items.map((item) => (
            <div 
              key={item.id} 
              className={`bg-white p-4 rounded-2xl border transition-all flex items-center gap-4 group ${
                item.is_purchased ? 'border-gray-50 opacity-60' : 'border-gray-100 hover:border-brand-primary shadow-sm'
              }`}
            >
              {/* Статус покупки */}
              <div 
                onClick={() => togglePurchased(item.id)} // Добавили клик
                className="text-brand-primary flex-shrink-0 cursor-pointer hover:scale-110 transition-transform active:scale-95"
              >
                {item.is_purchased ? 
                  <CheckCircle2 size={28} className="text-green-500" /> : 
                  <Circle size={28} className="text-gray-200" />
                }
              </div>

              {/* Заглушка картинки */}
              <div className="w-16 h-16 bg-indigo-50 rounded-xl flex items-center justify-center text-brand-primary flex-shrink-0">
                <Gift size={24} className="opacity-40" />
              </div>

              {/* Инфо */}
              <div className="flex-1 min-w-0">
                <h4 className={`font-bold truncate text-gray-900 ${item.is_purchased ? 'line-through text-gray-400' : ''}`}>
                  {item.title}
                </h4>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-brand-primary font-extrabold text-sm">
                    {item.price.toLocaleString()} {item.currency}
                  </span>
                  {item.url && (
                    <a href={item.url} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-brand-primary transition-colors">
                      <ExternalLink size={14} />
                    </a>
                  )}
                </div>
              </div>

              {/* Действия */}
              <div className="flex gap-1 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => openEditItem(item)}
                  className="p-2 text-gray-400 hover:text-brand-primary hover:bg-indigo-50 rounded-xl transition-all"
                >
                  <Edit2 size={18} />
                </button>
                <button className="p-2 text-gray-400 hover:text-brand-error hover:bg-red-50 rounded-xl transition-all">
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Модалка Удаления списка (п. 4.6) */}
      <Modal isOpen={isDelOpen} onClose={() => setIsDelOpen(false)} title="Удалить список?">
        <div className="text-center">
          <p className="text-gray-500 mb-8">
            Все данные будут безвозвратно удалены. Это действие нельзя отменить.
          </p>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setIsDelOpen(false)}>Отмена</Button>
            <Button variant="danger" onClick={handleDeleteList}>Да, удалить</Button>
          </div>
        </div>
      </Modal>

      {/* Модалка Добавления/Редактирования Товара (п. 4.4) */}
      <Modal 
        isOpen={isItemOpen} 
        onClose={() => setIsItemOpen(false)} 
        title={editingItem ? "Изменить товар" : "Новый подарок"}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Название *</label>
            <input 
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-brand-primary transition-all" 
              placeholder="Что подарить?" 
              value={itemForm.title}
              onChange={e => setItemForm({...itemForm, title: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Ссылка на магазин</label>
            <input 
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-brand-primary transition-all" 
              placeholder="https://..." 
              value={itemForm.url}
              onChange={e => setItemForm({...itemForm, url: e.target.value})}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Цена</label>
              <input 
                type="number"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-brand-primary transition-all" 
                value={itemForm.price}
                onChange={e => setItemForm({...itemForm, price: Number(e.target.value)})}
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Валюта</label>
              <select 
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-brand-primary bg-white cursor-pointer"
                value={itemForm.currency}
                onChange={e => setItemForm({...itemForm, currency: e.target.value})}
              >
                <option value="RUB">RUB (₽)</option>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
              </select>
            </div>
          </div>
          <div className="pt-2">
            <Button onClick={handleSaveItem}>
              {editingItem ? "Сохранить изменения" : "Добавить в список"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default WishlistDetail;