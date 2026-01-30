import React, { useState, useEffect, useMemo, useRef } from 'react';
import { storage, StorageKeys } from '../services/storage';
import { Branch, BranchEntity, Student, Employee, StudentStatus, Classroom } from '../types';
import { 
    MapPin, Phone, User, Plus, Edit2, Trash2, X, Save, Users, 
    Building2, Search, DoorOpen, Calendar as CalendarIcon 
} from 'lucide-react';
import { useData } from '../hooks/useData';

// Helper Input Component
const FormInput = ({ label, value, onChange, placeholder = "" }: { label: string, value: string, onChange: (v: string) => void, placeholder?: string }) => (
    <div>
        <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1 tracking-wider">{label}</label>
        <input 
            type="text" 
            value={value} 
            onChange={e => onChange(e.target.value)} 
            placeholder={placeholder}
            className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
        />
    </div>
);

export const Branches: React.FC = () => {
    // Data hooks
    const [branches, setBranches] = useData<BranchEntity[]>(StorageKeys.BRANCHES, []);
    const [students] = useData<Student[]>(StorageKeys.STUDENTS, []);
    const [employees] = useData<Employee[]>(StorageKeys.EMPLOYEES, []);

    // Local state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingBranch, setEditingBranch] = useState<Partial<BranchEntity> | null>(null);
    const originalBranchRef = useRef<string>('');
    const [searchTerm, setSearchTerm] = useState('');

    // Classroom Temp State
    const [newRoomName, setNewRoomName] = useState('');
    const [newRoomCapacity, setNewRoomCapacity] = useState('');

    // --- Init: Pre-populate from Enum if empty ---
    useEffect(() => {
        if (branches.length === 0) {
            const initialBranches: BranchEntity[] = Object.values(Branch).map((name, idx) => ({
                id: Date.now() + idx,
                name: name,
                address: '',
                phone: '',
                manager: '',
                isActive: true,
                classrooms: []
            }));
            setBranches(initialBranches);
        }
    }, [branches.length]);

    // Close logic
    const handleClose = () => {
        if (editingBranch && JSON.stringify(editingBranch) !== originalBranchRef.current) {
            if (!confirm('Есть несохраненные изменения. Закрыть окно?')) return;
        }
        setIsModalOpen(false);
        setEditingBranch(null);
    };

    // Esc listener
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isModalOpen) handleClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isModalOpen, editingBranch]);

    // --- Stats Calculation ---
    const enrichedBranches = useMemo(() => {
        return branches.map(b => {
            const activeStudents = students.filter(s => s.branch === b.name && s.status === StudentStatus.Active).length;
            const staffCount = employees.filter(e => {
                const empBranches = e.branches || (e.branch ? [e.branch] : []);
                return empBranches.includes(b.name as Branch);
            }).length;
            const roomsCount = b.classrooms?.length || 0;
            const totalCapacity = b.classrooms?.reduce((acc, r) => acc + (Number(r.capacity) || 0), 0) || 0;
            
            return { ...b, activeStudents, staffCount, roomsCount, totalCapacity };
        }).filter(b => b.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [branches, students, employees, searchTerm]);

    // --- Handlers ---
    const handleSave = () => {
        if (!editingBranch?.name) {
            alert('Название филиала обязательно');
            return;
        }

        let updated: BranchEntity[];
        if (editingBranch.id) {
            updated = branches.map(b => b.id === editingBranch.id ? { ...b, ...editingBranch } as BranchEntity : b);
        } else {
            const newBranch = { 
                ...editingBranch, 
                id: Date.now(), 
                isActive: editingBranch.isActive ?? true 
            } as BranchEntity;
            updated = [...branches, newBranch];
        }

        setBranches(updated);
        setIsModalOpen(false);
        setEditingBranch(null);
        storage.notify('Данные филиала сохранены', 'success');
    };

    const handleDelete = (id: number) => {
        if (confirm('Удалить этот филиал? Это не удалит связанных студентов, но уберет филиал из списка выбора.')) {
            const updated = branches.filter(b => b.id !== id);
            setBranches(updated);
        }
    };

    const handleAddRoom = () => {
        if (!newRoomName || !newRoomCapacity) return;
        const newRoom: Classroom = {
            id: Date.now().toString(),
            name: newRoomName,
            capacity: Number(newRoomCapacity)
        };
        setEditingBranch(prev => ({
            ...prev,
            classrooms: [...(prev?.classrooms || []), newRoom]
        }));
        setNewRoomName('');
        setNewRoomCapacity('');
    };

    const handleRemoveRoom = (roomId: string) => {
        setEditingBranch(prev => ({
            ...prev,
            classrooms: prev?.classrooms?.filter(r => r.id !== roomId) || []
        }));
    };

    const startEditing = (branch: Partial<BranchEntity>) => {
        setEditingBranch(branch);
        originalBranchRef.current = JSON.stringify(branch);
        setIsModalOpen(true);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-white uppercase tracking-tight">Управление филиалами</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Сеть учебных центров Repetitor.tj</p>
                </div>
                <div className="flex gap-3 w-full sm:w-auto">
                    <div className="relative flex-1 sm:flex-none">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input 
                            type="text" 
                            placeholder="Поиск..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-xl text-sm font-medium bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                        />
                    </div>
                    <button 
                        onClick={() => startEditing({ name: '', isActive: true, classrooms: [] })}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-bold transition-all flex items-center gap-2 shadow-sm whitespace-nowrap text-xs uppercase tracking-widest active:scale-95"
                    >
                        <Plus size={18} />
                        Добавить
                    </button>
                </div>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                {enrichedBranches.map(branch => (
                    <div key={branch.id} className={`bg-white dark:bg-slate-800 rounded-3xl shadow-sm border ${branch.isActive ? 'border-slate-200 dark:border-slate-700' : 'border-slate-200 dark:border-slate-700 opacity-75'} overflow-hidden hover:shadow-xl transition-all group cursor-default`}>
                        <div className="p-6">
                            <div className="flex justify-between items-start mb-6">
                                <div className="p-3.5 bg-blue-50 dark:bg-blue-900/30 rounded-2xl text-blue-600 dark:text-blue-400 shadow-inner group-hover:scale-110 transition-transform">
                                    <Building2 size={24} />
                                </div>
                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button 
                                        onClick={() => startEditing({ ...branch, classrooms: branch.classrooms || [] })}
                                        className="p-2.5 hover:bg-blue-50 dark:hover:bg-slate-700 rounded-xl text-slate-400 hover:text-blue-600 transition-all active:scale-90 border border-slate-100 dark:border-slate-600"
                                    >
                                        <Edit2 size={18}/>
                                    </button>
                                    <button 
                                        onClick={() => handleDelete(branch.id)}
                                        className="p-2.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl text-slate-400 hover:text-red-500 transition-all active:scale-90 border border-slate-100 dark:border-slate-600"
                                    >
                                        <Trash2 size={18}/>
                                    </button>
                                </div>
                            </div>

                            <h3 className="font-bold text-xl text-slate-800 dark:text-white mb-2 flex items-center gap-2 uppercase tracking-tight">
                                {branch.name}
                                {!branch.isActive && <span className="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded-lg font-black">АРХИВ</span>}
                            </h3>
                            
                            <div className="space-y-3 mt-6 text-sm text-slate-600 dark:text-slate-400">
                                <div className="flex items-start gap-2.5">
                                    <MapPin size={16} className="text-slate-400 shrink-0 mt-0.5"/>
                                    <span className="leading-snug font-medium">{branch.address || 'Адрес не заполнен'}</span>
                                </div>
                                <div className="flex items-center gap-2.5">
                                    <Phone size={16} className="text-slate-400 shrink-0"/>
                                    <span className="font-bold">{branch.phone || '—'}</span>
                                </div>
                                <div className="flex items-center gap-2.5">
                                    <User size={16} className="text-slate-400 shrink-0"/>
                                    <span className="font-medium text-xs uppercase tracking-tight">Рук: <span className="text-slate-800 dark:text-slate-200 font-bold">{branch.manager || 'Не назначен'}</span></span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-slate-50/80 dark:bg-slate-900/20 px-6 py-4 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-slate-400">
                            <span className="flex items-center gap-2 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-full shadow-sm">
                                <Users size={14} className="text-blue-500"/> {branch.activeStudents} уч.
                            </span>
                            <span className="flex items-center gap-2 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-full shadow-sm" title={`Вместимость: ${branch.totalCapacity} мест`}>
                                <DoorOpen size={14} className="text-emerald-500"/> {branch.roomsCount} ауд.
                            </span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Modal */}
            {isModalOpen && editingBranch && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh] border border-slate-100 dark:border-slate-700 overflow-hidden">
                        <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50 flex-shrink-0">
                            <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2 uppercase tracking-tight text-xl">
                                <Building2 size={22} className="text-blue-600 dark:text-blue-400"/>
                                {editingBranch.id ? 'Настройка филиала' : 'Новый филиал'}
                            </h3>
                            <button onClick={handleClose} className="p-2 text-slate-400 hover:text-red-500 transition-colors bg-white dark:bg-slate-700 rounded-full shadow-sm">
                                <X size={20} />
                            </button>
                        </div>
                        
                        <div className="p-8 space-y-8 overflow-y-auto custom-scrollbar flex-1 bg-slate-50/20 dark:bg-slate-900/10">
                            <FormInput 
                                label="Название филиала *" 
                                value={editingBranch.name || ''} 
                                onChange={v => setEditingBranch({...editingBranch, name: v})}
                                placeholder="Например: Душанбе (Центр)"
                            />
                            
                            <div className="grid grid-cols-2 gap-6">
                                <FormInput 
                                    label="Телефон" 
                                    value={editingBranch.phone || ''} 
                                    onChange={v => setEditingBranch({...editingBranch, phone: v})}
                                    placeholder="+992..."
                                />
                                <FormInput 
                                    label="Руководитель" 
                                    value={editingBranch.manager || ''} 
                                    onChange={v => setEditingBranch({...editingBranch, manager: v})}
                                />
                            </div>

                            <FormInput 
                                label="Адрес расположения" 
                                value={editingBranch.address || ''} 
                                onChange={v => setEditingBranch({...editingBranch, address: v})}
                                placeholder="Город, улица, номер дома..."
                            />

                            <div className="flex items-center gap-2 p-3 bg-white dark:bg-slate-700 border border-slate-100 dark:border-slate-600 rounded-2xl shadow-sm w-fit">
                                <label className="flex items-center gap-3 cursor-pointer select-none">
                                    <input 
                                        type="checkbox" 
                                        checked={editingBranch.isActive} 
                                        onChange={e => setEditingBranch({...editingBranch, isActive: e.target.checked})}
                                        className="w-5 h-5 rounded-lg border-2 border-slate-300 text-blue-600 focus:ring-blue-500 transition-all"
                                    />
                                    <span className="text-xs font-bold uppercase tracking-tight text-slate-700 dark:text-slate-200">Филиал активен</span>
                                </label>
                            </div>

                            {/* Classrooms Editor */}
                            <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-6">
                                <h4 className="font-bold text-slate-800 dark:text-white text-sm flex items-center gap-2 uppercase tracking-tight">
                                    <DoorOpen size={18} className="text-emerald-500"/> Кабинеты и Аудитории
                                </h4>
                                
                                <div className="flex gap-3">
                                    <div className="flex-[3]">
                                        <input 
                                            type="text" 
                                            placeholder="Номер / Название" 
                                            className="w-full border border-slate-300 dark:border-slate-600 rounded-xl p-2.5 text-sm bg-slate-50 dark:bg-slate-900 outline-none focus:bg-white transition-all font-bold"
                                            value={newRoomName}
                                            onChange={e => setNewRoomName(e.target.value)}
                                        />
                                    </div>
                                    <div className="flex-1 relative">
                                        <input 
                                            type="number" 
                                            placeholder="Мест" 
                                            className="w-full border border-slate-300 dark:border-slate-600 rounded-xl p-2.5 text-sm bg-slate-50 dark:bg-slate-900 outline-none text-center font-bold"
                                            value={newRoomCapacity}
                                            onChange={e => setNewRoomCapacity(e.target.value)}
                                        />
                                    </div>
                                    <button 
                                        onClick={handleAddRoom}
                                        className="bg-blue-600 hover:bg-blue-700 text-white p-2.5 rounded-xl transition-all shadow-lg shadow-blue-500/20 active:scale-95 shrink-0"
                                    >
                                        <Plus size={22}/>
                                    </button>
                                </div>

                                <div className="space-y-2.5 max-h-52 overflow-y-auto custom-scrollbar pr-1">
                                    {editingBranch.classrooms && editingBranch.classrooms.length > 0 ? (
                                        editingBranch.classrooms.map(room => (
                                            <div key={room.id} className="flex justify-between items-center bg-slate-50 dark:bg-slate-900 p-3 rounded-2xl border border-slate-100 dark:border-slate-700 group/room transition-all hover:bg-white hover:shadow-md">
                                                <div className="flex items-center gap-3">
                                                    <span className="font-bold text-sm text-slate-800 dark:text-slate-200 uppercase">{room.name}</span>
                                                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded-md uppercase tracking-tight">{room.capacity} чел.</span>
                                                </div>
                                                <button onClick={() => handleRemoveRoom(room.id)} className="text-slate-300 hover:text-red-500 transition-colors p-1 group-hover/room:scale-110">
                                                    <Trash2 size={16}/>
                                                </button>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-center py-6 border-2 border-dashed border-slate-100 dark:border-slate-700 rounded-2xl">
                                            <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest italic">Список аудиторий пуст</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="p-6 border-t border-slate-100 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/80 flex justify-end gap-3 rounded-b-3xl flex-shrink-0">
                            <button onClick={handleClose} className="px-8 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors uppercase tracking-widest">Отмена</button>
                            <button onClick={handleSave} className="px-10 py-3 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold flex items-center gap-2 shadow-xl shadow-blue-500/20 transition-all active:scale-95 uppercase tracking-widest">
                                <Save size={20} /> Сохранить
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};