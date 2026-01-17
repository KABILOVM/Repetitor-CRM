
import React, { useState } from 'react';
import { storage, StorageKeys } from '../services/storage';
import { Course, CourseBook, Branch, UserRole, UserProfile, BranchConfig } from '../types';
import { 
    BookOpen, Plus, Trash2, Save, X, Target, DollarSign, Book, Minus, 
    Calculator, FlaskConical, Atom, Dna, Globe, Scroll, Gavel, Code, 
    Search, MapPin, Check, Palette, Clock, CalendarDays, ListChecks,
    Music, Dumbbell, Brain, Rocket, Languages, PenTool
} from 'lucide-react';

// Icon Map
const ICON_MAP: Record<string, React.ElementType> = {
    'Calculator': Calculator,
    'FlaskConical': FlaskConical,
    'Atom': Atom,
    'Dna': Dna,
    'Globe': Globe,
    'Scroll': Scroll,
    'Gavel': Gavel,
    'Code': Code,
    'BookOpen': BookOpen,
    'Music': Music,
    'Dumbbell': Dumbbell,
    'Brain': Brain,
    'Rocket': Rocket,
    'Languages': Languages,
    'PenTool': PenTool
};

const COLORS = [
    { name: 'blue', class: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' },
    { name: 'emerald', class: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' },
    { name: 'purple', class: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400' },
    { name: 'amber', class: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' },
    { name: 'rose', class: 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400' },
    { name: 'cyan', class: 'bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400' },
    { name: 'indigo', class: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400' },
    { name: 'slate', class: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300' },
];

export const Courses: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>(() => storage.get(StorageKeys.COURSES, []));
  const user = storage.get<UserProfile>(StorageKeys.USER_PROFILE, { role: UserRole.GeneralDirector, fullName: 'Admin', email: '', permissions: [] });
  
  // Determine user context
  const isSuperUser = [UserRole.GeneralDirector, UserRole.Director, UserRole.Developer].includes(user.role);
  const userBranch = user.branch; // Only set for Branch Admins/Teachers

  // Filter State
  const [searchTerm, setSearchTerm] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Partial<Course> | null>(null);

  // Aux Input State inside modal
  const [newBookName, setNewBookName] = useState('');
  const [newBookPrice, setNewBookPrice] = useState('');
  const [newIncludeItem, setNewIncludeItem] = useState('');

  // Filter Logic
  const filteredCourses = courses.filter(course => 
    course.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddNew = () => {
    setEditingCourse({
      name: '',
      description: '',
      books: [],
      branchConfig: {}, // Empty init
      includedItems: [],
      scheduleDays: [],
      icon: 'BookOpen',
      color: 'blue'
    });
    setIsModalOpen(true);
  };

  const handleEdit = (course: Course) => {
    setEditingCourse({ 
        ...course, 
        branchConfig: course.branchConfig || {},
        includedItems: course.includedItems || [],
        scheduleDays: course.scheduleDays || [],
        icon: course.icon || 'BookOpen',
        color: course.color || 'blue'
    });
    setIsModalOpen(true);
  };

  const handleDelete = () => {
    if (!editingCourse?.id) return;
    if (confirm('Вы уверены? Удаление курса может повлиять на привязанных студентов.')) {
      const updated = courses.filter(c => c.id !== editingCourse.id);
      setCourses(updated);
      storage.set(StorageKeys.COURSES, updated);
      setIsModalOpen(false);
      setEditingCourse(null);
    }
  };

  const handleSave = () => {
    if (!editingCourse?.name) {
      alert('Укажите название курса');
      return;
    }

    let updated: Course[];
    if (editingCourse.id) {
      updated = courses.map(c => c.id === editingCourse.id ? { ...c, ...editingCourse } as Course : c);
    } else {
      const newCourse = { ...editingCourse, id: Date.now() } as Course;
      updated = [...courses, newCourse];
    }

    setCourses(updated);
    storage.set(StorageKeys.COURSES, updated);
    setIsModalOpen(false);
    setEditingCourse(null);
  };

  // Helper Inputs
  const handleAddBook = () => {
    if (!newBookName || !newBookPrice) return;
    const book: CourseBook = {
        id: Date.now().toString(),
        name: newBookName,
        price: Number(newBookPrice)
    };
    setEditingCourse(prev => ({
        ...prev,
        books: [...(prev?.books || []), book]
    }));
    setNewBookName('');
    setNewBookPrice('');
  };

  const handleRemoveBook = (bookId: string) => {
      setEditingCourse(prev => ({
          ...prev,
          books: prev?.books?.filter(b => b.id !== bookId) || []
      }));
  };

  const handleAddIncludedItem = () => {
      if (!newIncludeItem) return;
      setEditingCourse(prev => ({
          ...prev,
          includedItems: [...(prev?.includedItems || []), newIncludeItem]
      }));
      setNewIncludeItem('');
  };

  const handleRemoveIncludedItem = (idx: number) => {
      setEditingCourse(prev => ({
          ...prev,
          includedItems: prev?.includedItems?.filter((_, i) => i !== idx)
      }));
  };

  const toggleDay = (day: string) => {
      const current = editingCourse?.scheduleDays || [];
      if (current.includes(day)) {
          setEditingCourse(prev => ({ ...prev, scheduleDays: current.filter(d => d !== day) }));
      } else {
          setEditingCourse(prev => ({ ...prev, scheduleDays: [...current, day] }));
      }
  };

  // Helper to determine icon based on subject name
  const getIcon = (iconName?: string) => {
      return ICON_MAP[iconName || 'BookOpen'] || BookOpen;
  };

  const getColorClass = (colorName?: string) => {
      return COLORS.find(c => c.name === colorName)?.class || COLORS[0].class;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Курсы и Предметы</h2>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Управление программами обучения и тарифами филиалов.</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-none sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                    type="text" 
                    placeholder="Поиск предмета..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none"
                />
            </div>
            {isSuperUser && (
                <button 
                    onClick={handleAddNew}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 shadow-sm whitespace-nowrap"
                >
                    <Plus size={18} />
                    Добавить курс
                </button>
            )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredCourses.map(course => {
            const Icon = getIcon(course.icon);
            const colorClass = getColorClass(course.color);
            return (
                <div 
                    key={course.id} 
                    className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow overflow-hidden group cursor-pointer"
                    onClick={() => handleEdit(course)}
                >
                    <div className="p-5">
                        <div className="flex justify-between items-start mb-4">
                            <div className={`p-3 rounded-xl ${colorClass}`}>
                                <Icon size={24} />
                            </div>
                            {/* Visual indicator for active branches count */}
                            <span className="text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded">
                                {(Object.values(course.branchConfig || {}) as BranchConfig[]).filter(c => c.isActive).length} фил.
                            </span>
                        </div>
                        <h3 className="font-bold text-lg text-slate-800 dark:text-white mb-1 group-hover:text-blue-600 transition-colors">
                            {course.name}
                        </h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 min-h-[40px]">
                            {course.description || 'Нет описания'}
                        </p>
                    </div>
                    <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/30 flex justify-between items-center text-xs text-slate-500 dark:text-slate-400">
                        <span className="flex items-center gap-1"><Book size={12}/> {course.books.length} мат.</span>
                        <span className="flex items-center gap-1"><Clock size={12}/> {course.duration || '-'}</span>
                    </div>
                </div>
            );
        })}
      </div>

      {/* Course Edit Modal */}
      {isModalOpen && editingCourse && (
        <div className="fixed inset-0 bg-black/60 z-50 flex justify-end">
            <div className="w-full max-w-2xl bg-white dark:bg-slate-800 h-full shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col">
                <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                    <div>
                        <h3 className="font-bold text-lg text-slate-800 dark:text-white flex items-center gap-2">
                            {editingCourse.id ? 'Редактирование курса' : 'Новый курс'}
                        </h3>
                        <p className="text-xs text-slate-500">Настройка программы и стоимости</p>
                    </div>
                    <div className="flex gap-2">
                        {editingCourse.id && (
                            <button onClick={handleDelete} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                                <Trash2 size={20} />
                            </button>
                        )}
                        <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
                            <X size={20} />
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                    
                    {/* Basic Info Section */}
                    <section className="space-y-4">
                        <div className="flex items-center gap-4">
                            <div className="flex-1">
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Название предмета</label>
                                <input 
                                    type="text" 
                                    value={editingCourse.name}
                                    onChange={(e) => setEditingCourse({...editingCourse, name: e.target.value})}
                                    className="w-full border border-slate-300 dark:border-slate-600 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                                    placeholder="Например: Математика"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Длительность</label>
                                <input 
                                    type="text" 
                                    value={editingCourse.duration || ''}
                                    onChange={(e) => setEditingCourse({...editingCourse, duration: e.target.value})}
                                    className="w-32 border border-slate-300 dark:border-slate-600 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                                    placeholder="6 мес."
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Описание</label>
                            <textarea 
                                value={editingCourse.description || ''}
                                onChange={(e) => setEditingCourse({...editingCourse, description: e.target.value})}
                                className="w-full border border-slate-300 dark:border-slate-600 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 h-20 resize-none"
                                placeholder="Краткое описание программы..."
                            />
                        </div>

                        {/* Styling Options */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2 flex items-center gap-1"><Target size={12}/> Иконка</label>
                                <div className="grid grid-cols-5 gap-2 bg-slate-50 dark:bg-slate-700/30 p-2 rounded-xl border border-slate-200 dark:border-slate-600">
                                    {Object.keys(ICON_MAP).map(iconKey => {
                                        const Icon = ICON_MAP[iconKey];
                                        return (
                                            <button
                                                key={iconKey}
                                                onClick={() => setEditingCourse({...editingCourse, icon: iconKey})}
                                                className={`p-2 rounded-lg flex items-center justify-center transition-all ${editingCourse.icon === iconKey ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:bg-white dark:hover:bg-slate-600'}`}
                                            >
                                                <Icon size={18} />
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2 flex items-center gap-1"><Palette size={12}/> Цвет темы</label>
                                <div className="grid grid-cols-4 gap-2 bg-slate-50 dark:bg-slate-700/30 p-2 rounded-xl border border-slate-200 dark:border-slate-600">
                                    {COLORS.map(c => (
                                        <button
                                            key={c.name}
                                            onClick={() => setEditingCourse({...editingCourse, color: c.name})}
                                            className={`h-8 rounded-lg border-2 transition-all ${editingCourse.color === c.name ? 'border-slate-600 dark:border-white scale-105' : 'border-transparent hover:scale-105'}`}
                                        >
                                            <div className={`w-full h-full rounded ${c.class}`}></div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Branch Pricing Configuration */}
                    <div className="bg-slate-50 dark:bg-slate-700/30 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                        <h4 className="font-bold text-slate-700 dark:text-slate-300 text-sm mb-3 flex items-center gap-2">
                            <MapPin size={16}/> Цены и Планы по филиалам
                        </h4>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="text-xs text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-600">
                                        <th className="py-2 font-bold uppercase">Филиал</th>
                                        <th className="py-2 font-bold uppercase text-center w-16">Активен</th>
                                        <th className="py-2 font-bold uppercase w-32">Цена (с.)</th>
                                        <th className="py-2 font-bold uppercase w-32">План (уч.)</th>
                                    </tr>
                                </thead>
                                <tbody className="text-sm">
                                    {Object.values(Branch).map(branch => {
                                        const config: BranchConfig = editingCourse.branchConfig?.[branch] || { price: 0, targetStudents: 0, isActive: false };
                                        return (
                                            <tr key={branch} className="border-b border-slate-100 dark:border-slate-700 last:border-0 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors">
                                                <td className="py-3 font-medium text-slate-700 dark:text-slate-200">{branch}</td>
                                                <td className="py-3 text-center">
                                                    <button 
                                                        type="button"
                                                        onClick={() => {
                                                            const newConfig = { ...config, isActive: !config.isActive };
                                                            setEditingCourse(prev => ({
                                                                ...prev,
                                                                branchConfig: { ...prev?.branchConfig, [branch]: newConfig }
                                                            }));
                                                        }}
                                                        className={`
                                                            w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 mx-auto
                                                            ${config.isActive 
                                                                ? 'bg-blue-600 border-blue-600 dark:bg-blue-500 dark:border-blue-500 shadow-sm' 
                                                                : 'bg-white border-slate-300 dark:bg-slate-800 dark:border-slate-600 hover:border-blue-400 dark:hover:border-blue-400'
                                                            }
                                                        `}
                                                    >
                                                        {config.isActive && <Check size={14} className="text-white" strokeWidth={3} />}
                                                    </button>
                                                </td>
                                                <td className="py-3">
                                                    <div className="relative">
                                                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">$</span>
                                                        <input 
                                                            type="number" 
                                                            disabled={!config.isActive}
                                                            value={config.price || ''}
                                                            onChange={(e) => {
                                                                const newConfig = { ...config, price: Number(e.target.value) };
                                                                setEditingCourse(prev => ({
                                                                    ...prev,
                                                                    branchConfig: { ...prev?.branchConfig, [branch]: newConfig }
                                                                }));
                                                            }}
                                                            className={`w-full pl-6 pr-2 py-1.5 border rounded-lg text-sm outline-none ${config.isActive ? 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 focus:ring-2 focus:ring-blue-500' : 'bg-slate-100 dark:bg-slate-900 border-transparent text-slate-400 cursor-not-allowed'}`}
                                                            placeholder="0"
                                                        />
                                                    </div>
                                                </td>
                                                <td className="py-3">
                                                    <div className="relative">
                                                        <Target size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400"/>
                                                        <input 
                                                            type="number" 
                                                            disabled={!config.isActive}
                                                            value={config.targetStudents || ''}
                                                            onChange={(e) => {
                                                                const newConfig = { ...config, targetStudents: Number(e.target.value) };
                                                                setEditingCourse(prev => ({
                                                                    ...prev,
                                                                    branchConfig: { ...prev?.branchConfig, [branch]: newConfig }
                                                                }));
                                                            }}
                                                            className={`w-full pl-7 pr-2 py-1.5 border rounded-lg text-sm outline-none ${config.isActive ? 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 focus:ring-2 focus:ring-blue-500' : 'bg-slate-100 dark:bg-slate-900 border-transparent text-slate-400 cursor-not-allowed'}`}
                                                            placeholder="0"
                                                        />
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Additional Settings Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Included Items */}
                        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-3 flex items-center gap-2"><ListChecks size={14}/> В стоимость входит</label>
                            <div className="flex gap-2 mb-3">
                                <input 
                                    type="text" 
                                    value={newIncludeItem}
                                    onChange={e => setNewIncludeItem(e.target.value)}
                                    className="flex-1 border border-slate-300 dark:border-slate-600 rounded-lg p-2 text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 outline-none"
                                    placeholder="Напр: Сертификат"
                                />
                                <button onClick={handleAddIncludedItem} className="bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-600 dark:text-slate-300 p-2 rounded-lg"><Plus size={20}/></button>
                            </div>
                            <div className="space-y-2">
                                {editingCourse.includedItems?.map((item, idx) => (
                                    <div key={idx} className="flex justify-between items-center bg-slate-50 dark:bg-slate-700/50 p-2 rounded border border-slate-100 dark:border-slate-700">
                                        <span className="text-sm text-slate-700 dark:text-slate-200">{item}</span>
                                        <button onClick={() => handleRemoveIncludedItem(idx)} className="text-slate-400 hover:text-red-500"><X size={14}/></button>
                                    </div>
                                ))}
                                {(!editingCourse.includedItems || editingCourse.includedItems.length === 0) && <p className="text-xs text-slate-400 italic text-center py-2">Список пуст</p>}
                            </div>
                        </div>

                        {/* Schedule Days */}
                        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-3 flex items-center gap-2"><CalendarDays size={14}/> Дни занятий (по умолчанию)</label>
                            <div className="flex justify-between gap-1">
                                {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map(day => (
                                    <button
                                        key={day}
                                        onClick={() => toggleDay(day)}
                                        className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${editingCourse.scheduleDays?.includes(day) ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-200'}`}
                                    >
                                        {day}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Books & Materials */}
                    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-3 flex items-center gap-2"><Book size={14}/> Учебные материалы (для продажи)</label>
                        <div className="flex gap-2 mb-3">
                            <input 
                                type="text" 
                                value={newBookName}
                                onChange={e => setNewBookName(e.target.value)}
                                className="flex-[2] border border-slate-300 dark:border-slate-600 rounded-lg p-2 text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 outline-none"
                                placeholder="Название книги"
                            />
                            <input 
                                type="number" 
                                value={newBookPrice}
                                onChange={e => setNewBookPrice(e.target.value)}
                                className="flex-1 border border-slate-300 dark:border-slate-600 rounded-lg p-2 text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 outline-none"
                                placeholder="Цена"
                            />
                            <button onClick={handleAddBook} className="bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-600 dark:text-slate-300 p-2 rounded-lg"><Plus size={20}/></button>
                        </div>
                        <div className="space-y-2">
                            {editingCourse.books?.map((book) => (
                                <div key={book.id} className="flex justify-between items-center bg-slate-50 dark:bg-slate-700/50 p-2 rounded border border-slate-100 dark:border-slate-700">
                                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{book.name}</span>
                                    <div className="flex items-center gap-3">
                                        <span className="text-sm font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded">{book.price} с.</span>
                                        <button onClick={() => handleRemoveBook(book.id)} className="text-slate-400 hover:text-red-500"><X size={14}/></button>
                                    </div>
                                </div>
                            ))}
                            {(!editingCourse.books || editingCourse.books.length === 0) && <p className="text-xs text-slate-400 italic text-center py-2">Нет материалов</p>}
                        </div>
                    </div>

                </div>

                <div className="p-5 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex justify-end gap-3">
                    <button onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors">Отмена</button>
                    <button onClick={handleSave} className="px-6 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-lg shadow-blue-500/30 flex items-center gap-2 transition-all active:scale-95">
                        <Save size={18} /> Сохранить курс
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};
