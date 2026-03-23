import React, { useEffect, useState } from 'react';
import { Plus, Gift, ChevronRight, Edit2 } from 'lucide-react'; // Добавили Edit2 сюда
import { Link } from 'react-router-dom';
import { Wishlist } from '../types';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import api from '../api/axiosInstance';

const Dashboard = () => {
  const [wishlists, setWishlists] = useState<Wishlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingList, setEditingList] = useState<Wishlist | null>(null);
  const [newList, setNewList] = useState({ title: '', description: '', is_public: false });

  // Загрузка списков
  const fetchWishlists = async () => {
    try {
      const res = await api.get('/wishlists');
      setWishlists(res.data);
    } catch (e) {
      // ТЕСТОВЫЕ ДАННЫЕ (если бэкенд недоступен)
      setWishlists([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchWishlists(); }, []);

  // Открытие модалки для редактирования
  const openEditModal = (e: React.MouseEvent, list: Wishlist) => {
    e.preventDefault(); 
    e.stopPropagation(); // Чтобы не сработал переход по ссылке Link
    setEditingList(list);
    setNewList({ title: list.title, description: list.description || '', is_public: list.is_public });
    setIsModalOpen(true);
  };

  // Закрытие модалки и сброс данных
  const closeVariant = () => {
    setIsModalOpen(false);
    setEditingList(null);
    setNewList({ title: '', description: '', is_public: false });
  };

  // Сохранение (Создание или Обновление)
  const handleSave = async () => {
    if (!newList.title) return;
    try {
      if (editingList) {
        // Логика обновления (Спринт 2: PUT /wishlists/{id})
        await api.put(`/wishlists/${editingList.id}`, newList);
      } else {
        // Логика создания
        await api.post('/wishlists', newList);
      }
      closeVariant();
      fetchWishlists();
    } catch (e) {
      alert("Ошибка при сохранении (проверьте работу бэкенда)");
      closeVariant();
    }
  };

  if (loading) return <div className="text-center mt-20 text-gray-500">Загрузка ваших желаний...</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Шапка */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900">Мои списки желаний</h1>
          <p className="text-gray-500 text-sm mt-1">Управляйте своими идеями для подарков</p>
        </div>
        
        {/* Кнопка: убрали w-full, добавили md:w-auto и whitespace-nowrap */}
        <Button 
          onClick={() => setIsModalOpen(true)} 
          className="w-full md:w-auto flex items-center justify-center gap-2 h-12 px-6 shadow-lg shadow-indigo-100 whitespace-nowrap"
        >
          <Plus size={20} /> 
          <span>Создать список</span>
        </Button>
      </div>

      {/* Контент: Пустое состояние или Сетка */}
      {wishlists.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-gray-100">
          <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <Gift className="text-brand-primary opacity-40" size={40} />
          </div>
          <h3 className="text-xl font-bold text-gray-900">У вас пока нет списков</h3>
          <p className="text-gray-500 mb-8 max-w-xs mx-auto text-sm">
            Создайте свой первый список, чтобы не забыть о важных желаниях
          </p>

          {/* Оборачиваем кнопку в флекс-контейнер для центрирования и контроля ширины */}
          <div className="flex justify-center px-6">
            <Button 
              variant="secondary" 
              onClick={() => setIsModalOpen(true)} 
              className="w-full md:w-auto px-10 h-12 shadow-sm"
            >
              Создать первый список
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {wishlists.map(list => (
            <div key={list.id} className="relative group">
              <Link 
                to={`/wishlist/${list.id}`} 
                className="block bg-white p-6 rounded-3xl shadow-sm border border-gray-100 hover:border-brand-primary hover:shadow-xl transition-all duration-300"
              >
                <div className="pr-8">
                  <h3 className="text-lg font-bold text-gray-900 group-hover:text-brand-primary transition-colors truncate">
                    {list.title}
                  </h3>
                  <p className="text-gray-500 text-sm mt-2 line-clamp-2 h-10">
                    {list.description || 'Нет описания'}
                  </p>
                </div>
                
                <div className="mt-6 flex justify-between items-center border-t border-gray-50 pt-4">
                  <span className="text-xs font-bold px-3 py-1 rounded-full bg-indigo-50 text-brand-primary">
                    {list.items_count} подарков
                  </span>
                  <div className="flex items-center text-gray-300 group-hover:text-brand-primary transition-colors text-xs font-bold">
                    Открыть <ChevronRight size={16} className="ml-1" />
                  </div>
                </div>
              </Link>

              {/* Кнопка редактирования */}
              <button 
                onClick={(e) => openEditModal(e, list)}
                className="absolute top-5 right-5 p-2.5 bg-gray-50 text-gray-400 rounded-xl opacity-0 group-hover:opacity-100 transition-all hover:bg-indigo-50 hover:text-brand-primary shadow-sm"
                title="Редактировать"
              >
                <Edit2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Модалка для Создания/Редактирования */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={closeVariant} 
        title={editingList ? "Редактировать список" : "Новый список"}
      >
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5">Название списка *</label>
            <input 
              className="w-full border border-gray-200 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-brand-primary transition-all" 
              value={newList.title}
              placeholder="Напр: Мой Wishlist 2026" 
              onChange={e => setNewList({...newList, title: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5">Описание</label>
            <textarea 
              className="w-full border border-gray-200 rounded-2xl px-4 py-3 h-32 outline-none focus:ring-2 focus:ring-brand-primary transition-all resize-none" 
              value={newList.description}
              placeholder="Для чего этот список?" 
              onChange={e => setNewList({...newList, description: e.target.value})}
            />
          </div>
          <div className="pt-2">
            <Button onClick={handleSave} className="h-12 shadow-lg">
              {editingList ? "Сохранить изменения" : "Создать список"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Dashboard;