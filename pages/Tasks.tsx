
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { storage, StorageKeys } from '../services/storage';
import { useData } from '../hooks/useData';
import { Task, TaskStatus, TaskPriority, Team, Sprint, Employee, UserRole, UserProfile, TaskType, SubTask, Branch } from '../types';
import { 
    LayoutGrid, List, Plus, Search, Filter, X, Save, Trash2, 
    Users, Calendar, Flag, CheckCircle2, Clock, 
    ArrowRight, AlertCircle, User, Settings, Layers, Zap, MoreVertical,
    ChevronDown, Edit2, UserPlus, Check, Info, Briefcase, ListChecks,
    ChevronUp, Tag, CornerDownLeft, CalendarDays, ArrowUpCircle, ChevronRight,
    Palette, RefreshCw, ShieldCheck, GripVertical
} from 'lucide-react';
import { DateRangePicker } from '../components/DateRangePicker';

const PRIORITY_COLORS: Record<TaskPriority, string> = {
    [TaskPriority.Low]: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-700 dark:text-slate-400',
    [TaskPriority.Medium]: 'bg-blue-100 text-blue-600 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400',
    [TaskPriority.High]: 'bg-orange-100 text-orange-600 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400',
    [TaskPriority.Urgent]: 'bg-red-50 text-red-600 border-red-100 dark:bg-red-900/30 dark:text-red-400 animate-pulse'
};

const PRIORITY_ICON_COLORS: Record<TaskPriority, string> = {
    [TaskPriority.Low]: 'text-sky-300 dark:text-sky-400',
    [TaskPriority.Medium]: 'text-blue-500 dark:text-blue-400',
    [TaskPriority.High]: 'text-orange-500 dark:text-orange-400',
    [TaskPriority.Urgent]: 'text-red-600 dark:text-red-500'
};

const TYPE_STYLES: Record<TaskType, string> = {
    'Run': 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400',
    'Change': 'bg-purple-50 text-purple-600 border-purple-100 dark:bg-purple-900/20 dark:text-purple-400'
};

export const Tasks: React.FC = () => {
    // --- Data Hooks ---
    const [tasks, setTasks] = useData<Task[]>(StorageKeys.TASK_ITEMS, []);
    const [teams, setTeams] = useData<Team[]>(StorageKeys.TASK_TEAMS, []);
    const [sprints] = useData<Sprint[]>(StorageKeys.TASK_SPRINTS, []);
    const [employees] = useData<Employee[]>(StorageKeys.EMPLOYEES, []);
    
    const [kanbanColumns, setKanbanColumns] = useData<string[]>(StorageKeys.TASK_COLUMNS, [
        'НУЖНО СДЕЛАТЬ',
        'В РАБОТЕ',
        'ГОТОВО'
    ]);
    
    const userProfile = storage.get<UserProfile>(StorageKeys.USER_PROFILE, { role: UserRole.Admin, fullName: '', email: '', permissions: [] });
    const isSuperAdmin = [UserRole.GeneralDirector, UserRole.Director, UserRole.Developer].includes(userProfile.role);

    // --- View State ---
    const [viewMode, setViewMode] = useState<'board' | 'list' | 'backlog' | 'teams'>('board');
    const [activeTeamId, setActiveTeamId] = useState<string>('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [priorityFilter, setPriorityFilter] = useState<string>('All');

    // --- Column Drag & Drop ---
    const [draggedColIdx, setDraggedColIdx] = useState<number | null>(null);

    const onDragStart = (e: React.DragEvent, index: number) => {
        if (!isSuperAdmin) return;
        setDraggedColIdx(index);
        e.dataTransfer.effectAllowed = 'move';
    };

    const onDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault();
        if (draggedColIdx === null || draggedColIdx === index) return;
    };

    const onDrop = (e: React.DragEvent, index: number) => {
        e.preventDefault();
        if (draggedColIdx === null || draggedColIdx === index) {
            setDraggedColIdx(null);
            return;
        }
        const newCols = [...kanbanColumns];
        const item = newCols.splice(draggedColIdx, 1)[0];
        newCols.splice(index, 0, item);
        setKanbanColumns(newCols);
        setDraggedColIdx(null);
    };

    // --- Inline Creation State ---
    const [inlineCreationStatus, setInlineCreationStatus] = useState<string | null>(null);
    const [inlineDraft, setInlineDraft] = useState<Partial<Task>>({ title: '', assigneeIds: [], priority: TaskPriority.Medium, type: 'Run' });

    // --- New Column State ---
    const [isAddingColumn, setIsAddingColumn] = useState(false);
    const [newColTitle, setNewColTitle] = useState('');

    // --- Edit Column Modal State ---
    const [isEditColumnModalOpen, setIsEditColumnModalOpen] = useState(false);
    const [editingColumnName, setEditingColumnName] = useState('');
    const [newEditingColumnName, setNewEditingColumnName] = useState('');

    // --- Popover State ---
    const [activePopover, setActivePopover] = useState<{ taskId: string | 'inline' | 'editing' | 'team', type: 'assignee' | 'priority' | 'calendar' | 'team' | 'sprint' | 'type' | 'color' | null }>({ taskId: '', type: null });

    // --- Modals ---
    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
    const [editingTask, setEditingTask] = useState<Partial<Task> | null>(null);

    const handleAddColumn = () => {
        if (!newColTitle.trim()) {
            setIsAddingColumn(false);
            return;
        }
        const upperTitle = newColTitle.toUpperCase().trim();
        if (!kanbanColumns.includes(upperTitle)) {
            setKanbanColumns([...kanbanColumns, upperTitle]);
            setNewColTitle('');
            setIsAddingColumn(false);
            storage.notify(`Колонка ${upperTitle} добавлена`, 'success');
        } else {
            alert('Такая колонка уже существует');
        }
    };

    const handleUpdateColumnName = () => {
        if (!newEditingColumnName.trim() || newEditingColumnName === editingColumnName) {
            setIsEditColumnModalOpen(false);
            return;
        }
        const upperNew = newEditingColumnName.toUpperCase().trim();
        setKanbanColumns(kanbanColumns.map(c => c === editingColumnName ? upperNew : c));
        setTasks(tasks.map(t => t.status === editingColumnName ? { ...t, status: upperNew } : t));
        setIsEditColumnModalOpen(false);
        storage.notify('Название колонки обновлено', 'success');
    };

    const handleRemoveColumnConfirmed = () => {
        if (!isSuperAdmin) return;
        
        const tasksInCol = tasks.filter(t => t.status === editingColumnName);
        const fallbackStatus = kanbanColumns.find(c => c !== editingColumnName) || 'БЭКЛОГ';
        
        // Move tasks to another column
        if (tasksInCol.length > 0) {
            setTasks(tasks.map(t => t.status === editingColumnName ? { ...t, status: fallbackStatus } : t));
            storage.notify(`${tasksInCol.length} задач перемещены в "${fallbackStatus}"`, 'info');
        }

        setKanbanColumns(kanbanColumns.filter(c => c !== editingColumnName));
        setIsEditColumnModalOpen(false);
        storage.notify(`Колонка "${editingColumnName}" удалена`, 'success');
    };

    const filteredTasks = useMemo(() => {
        return tasks.filter(t => {
            const matchTeam = activeTeamId === 'all' || t.teamId === activeTeamId;
            const matchSearch = t.title.toLowerCase().includes(searchTerm.toLowerCase());
            const matchPriority = priorityFilter === 'All' || t.priority === priorityFilter;
            return matchTeam && matchSearch && matchPriority;
        });
    }, [tasks, activeTeamId, searchTerm, priorityFilter]);

    const handleSaveInlineTask = () => {
        if (!inlineDraft.title || !inlineCreationStatus) return;
        const selectedTeamId = activeTeamId !== 'all' ? activeTeamId : (teams[0]?.id || 'default_team');
        const newTask: Task = {
            id: `task_${Date.now()}`,
            title: inlineDraft.title,
            status: inlineCreationStatus,
            priority: inlineDraft.priority || TaskPriority.Medium,
            type: inlineDraft.type || 'Run',
            assigneeIds: inlineDraft.assigneeIds || [],
            subtasks: [],
            teamId: selectedTeamId,
            createdAt: new Date().toISOString(),
            dueDate: inlineDraft.dueDate,
            tags: []
        };
        setTasks([newTask, ...tasks]);
        setInlineCreationStatus(null);
        setInlineDraft({ title: '', assigneeIds: [], priority: TaskPriority.Medium, type: 'Run' });
        storage.notify('Задача создана', 'success');
    };

    const handleSaveFullTask = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingTask?.title) return;
        const teamId = editingTask.teamId || (activeTeamId !== 'all' ? activeTeamId : teams[0]?.id);
        const payload = { ...editingTask, teamId, id: editingTask.id || `task_${Date.now()}`, createdAt: editingTask.createdAt || new Date().toISOString(), status: editingTask.status || kanbanColumns[0], priority: editingTask.priority || TaskPriority.Medium, type: editingTask.type || 'Run', assigneeIds: editingTask.assigneeIds || [], subtasks: editingTask.subtasks || [] } as Task;
        const updated = tasks.find(t => t.id === payload.id) ? tasks.map(t => t.id === payload.id ? payload : t) : [payload, ...tasks];
        setTasks(updated);
        setIsTaskModalOpen(false);
        setEditingTask(null);
        storage.notify('Задача сохранена', 'success');
    };

    useEffect(() => {
        const handleGlobalClick = () => setActivePopover({ taskId: '', type: null });
        window.addEventListener('click', handleGlobalClick);
        return () => window.removeEventListener('click', handleGlobalClick);
    }, []);

    const teamEmployees = useMemo(() => {
        const targetTeamId = editingTask?.teamId || activeTeamId;
        if (!targetTeamId || targetTeamId === 'all') return employees;
        const team = teams.find(t => t.id === targetTeamId);
        return employees.filter(e => team?.memberIds.includes(e.id));
    }, [editingTask?.teamId, activeTeamId, teams, employees]);

    const getColumnColor = (status: string) => {
        const s = status.toUpperCase();
        if (s.includes('НУЖНО')) return 'bg-slate-400';
        if (s.includes('РАБОТ')) return 'bg-blue-500';
        if (s.includes('ГОТОВО')) return 'bg-emerald-500';
        if (s.includes('ПРОВЕР')) return 'bg-purple-500';
        return 'bg-blue-300';
    };

    return (
        <div className="space-y-4 animate-in fade-in duration-500 h-[calc(100vh-7rem)] flex flex-col overflow-hidden text-slate-700">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0 px-2">
                <h2 className="text-2xl font-bold text-slate-800 dark:text-white uppercase leading-none">Задачи</h2>
                <div className="flex gap-2">
                    <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                        <button onClick={() => setViewMode('board')} className={`px-4 py-1.5 rounded-lg flex items-center gap-1.5 text-[10px] font-bold uppercase transition-all ${viewMode === 'board' ? 'bg-white dark:bg-slate-600 text-blue-600 dark:text-white shadow-sm' : 'text-slate-500'}`}><LayoutGrid size={14}/> Доска</button>
                        <button onClick={() => setViewMode('backlog')} className={`px-4 py-1.5 rounded-lg flex items-center gap-1.5 text-[10px] font-bold uppercase transition-all ${viewMode === 'backlog' ? 'bg-white dark:bg-slate-600 text-blue-600 dark:text-white shadow-sm' : 'text-slate-500'}`}><Briefcase size={14}/> Бэклог</button>
                        <button onClick={() => setViewMode('list')} className={`px-4 py-1.5 rounded-lg flex items-center gap-1.5 text-[10px] font-bold uppercase transition-all ${viewMode === 'list' ? 'bg-white dark:bg-slate-600 text-blue-600 dark:text-white shadow-sm' : 'text-slate-500'}`}><List size={14}/> Список</button>
                    </div>
                    <button onClick={() => { setEditingTask({ status: kanbanColumns[0], type: 'Run' }); setIsTaskModalOpen(true); }} className="bg-blue-500 hover:bg-blue-600 text-white px-5 py-1.5 rounded-xl font-bold text-[11px] uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-blue-500/20 active:scale-95 transition-all"><Plus size={16} strokeWidth={3} /> Задача</button>
                </div>
            </div>

            <div className="flex-1 overflow-hidden h-full">
                {viewMode === 'board' ? (
                    <div className="h-full flex flex-col overflow-hidden">
                        <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md p-3 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-wrap items-center gap-3 mb-4 mx-2 shadow-sm shrink-0">
                            <div className="flex items-center gap-2 bg-white dark:bg-slate-900 px-4 py-2 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm">
                                <Users size={16} className="text-blue-500" />
                                <select value={activeTeamId} onChange={(e) => setActiveTeamId(e.target.value)} className="bg-transparent text-[11px] font-bold text-slate-600 dark:text-slate-200 outline-none cursor-pointer uppercase tracking-widest min-w-[150px]"><option value="all">Все команды</option>{teams.map(t => <option key={t.id} value={t.id}>{t.name.toUpperCase()}</option>)}</select>
                            </div>
                            <div className="flex-1 relative group"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={20} /><input type="text" placeholder="Поиск задач..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border-2 border-transparent focus:border-blue-500 rounded-xl text-sm font-bold outline-none transition-all placeholder:text-slate-400 shadow-inner" /></div>
                        </div>

                        <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar flex-1 px-2 h-full">
                            {kanbanColumns.map((status, colIdx) => {
                                const statusTasks = filteredTasks.filter(t => t.status === status);
                                const isCreating = inlineCreationStatus === status;
                                return (
                                    <div 
                                        key={status} 
                                        onDragOver={e => onDragOver(e, colIdx)}
                                        onDrop={e => onDrop(e, colIdx)}
                                        className="w-[280px] flex-none flex flex-col bg-slate-100/40 dark:bg-slate-900/40 rounded-[32px] border border-slate-200 dark:border-slate-700 p-4 h-full relative group/col"
                                    >
                                        <div 
                                            draggable={isSuperAdmin}
                                            onDragStart={e => onDragStart(e, colIdx)}
                                            className={`flex items-center justify-between mb-5 px-3 shrink-0 ${isSuperAdmin ? 'cursor-grab active:cursor-grabbing' : ''}`}
                                        >
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${getColumnColor(status)}`}></div>
                                                <h3 className="text-[11px] font-bold uppercase tracking-wider truncate">{status}</h3>
                                            </div>
                                            <div className="flex items-center gap-2 text-slate-300">
                                                <span className="text-[11px] font-bold">{statusTasks.length}</span>
                                                {isSuperAdmin && (
                                                    <button 
                                                        onClick={() => {
                                                            setEditingColumnName(status);
                                                            setNewEditingColumnName(status);
                                                            setIsEditColumnModalOpen(true);
                                                        }} 
                                                        className="p-1 hover:text-blue-500 opacity-0 group-hover/col:opacity-100 transition-all"
                                                    >
                                                        <Settings size={14}/>
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                        
                                        <div className="flex-1 overflow-y-auto space-y-4 custom-scrollbar pr-1 pb-4">
                                            {isCreating && (
                                                <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border-2 border-blue-400 shadow-xl animate-in zoom-in-95 duration-200 relative z-50 overflow-visible" onClick={e => e.stopPropagation()}>
                                                    <textarea 
                                                        autoFocus 
                                                        className="w-full text-sm font-bold bg-transparent outline-none mb-4 dark:text-white uppercase resize-none h-20" 
                                                        placeholder="Что именно нужно сделать?" 
                                                        value={inlineDraft.title} 
                                                        onChange={e => setInlineDraft({...inlineDraft, title: e.target.value})}
                                                    />
                                                    <div className="flex items-center justify-between pt-4 border-t dark:border-slate-700">
                                                        <div className="flex items-center gap-2">
                                                            <div className="relative">
                                                                <button onClick={(e) => { e.stopPropagation(); setActivePopover({ taskId: 'inline', type: 'calendar' }); }} className={`p-2 rounded-xl border-2 ${inlineDraft.dueDate ? 'bg-blue-50 border-blue-400 text-blue-600' : 'bg-slate-50 border-slate-100 text-slate-400'}`}><Calendar size={18}/></button>
                                                                {activePopover.taskId === 'inline' && activePopover.type === 'calendar' && (
                                                                    <div className="absolute top-full left-0 mt-2 z-[100] shadow-2xl rounded-2xl border bg-white dark:bg-slate-800" onClick={e => e.stopPropagation()}>
                                                                        <DateRangePicker startDate={inlineDraft.dueDate || ''} onChange={(d) => { setInlineDraft({...inlineDraft, dueDate: d}); setActivePopover({ taskId: '', type: null }); }} mode="single" showTrigger={false} />
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div className="relative">
                                                                <button onClick={(e) => { e.stopPropagation(); setActivePopover({ taskId: 'inline', type: 'priority' }); }} className="px-3 py-2 rounded-xl border-2 bg-slate-50 border-slate-100 flex items-center gap-2 text-[10px] font-bold uppercase"><Flag size={16} className={PRIORITY_ICON_COLORS[(inlineDraft.priority || TaskPriority.Medium) as TaskPriority]} /> {inlineDraft.priority}</button>
                                                                {activePopover.taskId === 'inline' && activePopover.type === 'priority' && (
                                                                    <div className="absolute top-full left-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border z-[100] p-1.5 animate-in fade-in zoom-in-95">{Object.values(TaskPriority).map(p => (<button key={p} onClick={() => { setInlineDraft({...inlineDraft, priority: p}); setActivePopover({ taskId: '', type: null }); }} className={`w-full text-left px-4 py-3 text-[10px] font-bold uppercase tracking-widest hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg flex items-center justify-between ${inlineDraft.priority === p ? 'text-blue-500 bg-slate-50' : ''}`}>{p} <Flag size={14} className={PRIORITY_ICON_COLORS[p as TaskPriority]} /></button>))}</div>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="flex gap-2">
                                                            <button onClick={() => setInlineCreationStatus(null)} className="text-slate-400 hover:text-slate-600"><X size={24}/></button>
                                                            <button onClick={handleSaveInlineTask} disabled={!inlineDraft.title} className="bg-blue-600 text-white p-2.5 rounded-xl shadow-md active:scale-95 disabled:opacity-50"><Check size={24} strokeWidth={4}/></button>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                            {statusTasks.map(task => (
                                                <div key={task.id} onClick={() => { setEditingTask(task); setIsTaskModalOpen(true); }} className="bg-white dark:bg-slate-800 p-5 rounded-[24px] border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-xl hover:border-blue-400 transition-all cursor-pointer group/card active:scale-[0.98]">
                                                    <div className="flex justify-between items-start gap-2 mb-3"><div className="flex flex-wrap gap-1.5"><span className={`px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase border flex items-center gap-1 shadow-sm ${PRIORITY_COLORS[task.priority as TaskPriority]}`}><Flag size={10} /> {task.priority}</span></div><span className="text-[9px] font-bold text-slate-200 group-hover/card:text-blue-200 transition-colors uppercase tracking-widest">#{task.id.slice(-4)}</span></div>
                                                    <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm mb-4 uppercase tracking-tight leading-tight group-hover/card:text-blue-600 transition-colors line-clamp-4">{task.title}</h4>
                                                    <div className="flex items-center justify-between pt-4 border-t border-slate-50 dark:border-slate-700"><div className="flex -space-x-2">{task.assigneeIds.length > 0 ? task.assigneeIds.map(aid => (<div key={aid} className="w-8 h-8 rounded-xl bg-slate-100 border-2 border-white dark:border-slate-800 shadow-sm overflow-hidden aspect-square"><img src={employees.find(e => e.id === aid)?.avatar} className="w-full h-full object-cover" /></div>)) : <div className="w-8 h-8 rounded-xl border-2 border-dashed border-slate-200 flex items-center justify-center text-slate-300"><User size={14}/></div>}</div>{task.dueDate && <div className="px-2.5 py-1 bg-slate-50 dark:bg-slate-700 rounded-lg text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><Clock size={12}/> {new Date(task.dueDate).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}</div>}</div>
                                                </div>
                                            ))}
                                        </div>
                                        {!isCreating && <button onClick={() => { setInlineCreationStatus(status); setInlineDraft({ title: '', priority: TaskPriority.Medium, type: 'Run' }); }} className="mt-2 w-full shrink-0 py-4 rounded-[20px] border-2 border-dashed border-slate-300 dark:border-slate-700 text-slate-400 hover:text-blue-500 hover:border-blue-400 transition-all flex items-center justify-center gap-3 text-[11px] font-bold uppercase tracking-widest bg-white/60 dark:bg-slate-800/40"><Plus size={18} strokeWidth={3}/> Добавить</button>}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ) : viewMode === 'backlog' ? (
                    <div className="h-full bg-white dark:bg-slate-800 mx-2 rounded-[40px] border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col shadow-sm animate-in fade-in">
                        <div className="p-8 border-b dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
                            <div><h3 className="font-bold text-xl uppercase tracking-tight">Бэклог</h3><p className="text-[11px] text-slate-400 font-bold uppercase mt-1.5 tracking-widest">Задачи без привязки к спринту</p></div>
                            <span className="px-5 py-2 bg-white dark:bg-slate-700 rounded-3xl text-[11px] font-bold text-slate-500 border-2 shadow-sm uppercase tracking-widest">{filteredTasks.filter(t => !t.sprintId).length} задач</span>
                        </div>
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-3">
                            {filteredTasks.filter(t => !t.sprintId).map(task => (
                                <div key={task.id} onClick={() => { setEditingTask(task); setIsTaskModalOpen(true); }} className="p-5 rounded-[28px] bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-700 hover:border-blue-400 hover:shadow-xl transition-all flex items-center justify-between group cursor-pointer">
                                    <div className="flex items-center gap-6 flex-1 min-w-0">
                                        <div className={`w-2 h-12 rounded-full shrink-0 ${PRIORITY_COLORS[task.priority as TaskPriority].split(' ')[0]}`}></div>
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-3 mb-1.5"><span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-lg border shadow-sm ${TYPE_STYLES[task.type as TaskType]}`}>{task.type}</span><Flag size={14} className={PRIORITY_ICON_COLORS[task.priority as TaskPriority]} /></div>
                                            <h4 className="font-bold text-slate-800 dark:text-slate-100 uppercase tracking-tight truncate text-base">{task.title}</h4>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-8 shrink-0">
                                        <div className="flex -space-x-2.5 hidden sm:flex">
                                            {task.assigneeIds.map(aid => (<div key={aid} className="w-10 h-10 rounded-2xl border-2 border-white dark:border-slate-800 overflow-hidden shadow-sm aspect-square"><img src={employees.find(e => e.id === aid)?.avatar} className="w-full h-full object-cover" /></div>))}
                                        </div>
                                        <div className="p-2.5 bg-slate-50 dark:bg-slate-700 rounded-2xl text-slate-300 group-hover:text-blue-600 group-hover:bg-blue-50 transition-all"><ChevronRight size={22} /></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="mx-2 bg-white dark:bg-slate-800 rounded-[40px] border border-slate-200 dark:border-slate-700 h-full overflow-hidden flex flex-col shadow-sm">
                        <div className="overflow-x-auto custom-scrollbar flex-1">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-slate-50/50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 text-[11px] font-bold uppercase tracking-widest border-b h-20">
                                    <tr><th className="p-6 px-10">Задача</th><th className="p-6">Приоритет</th><th className="p-6">Тип</th><th className="p-6">Исполнители</th><th className="p-6 text-right pr-10">Срок</th></tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredTasks.map(task => (
                                        <tr key={task.id} onClick={() => { setEditingTask(task); setIsTaskModalOpen(true); }} className="hover:bg-slate-50/50 transition-colors cursor-pointer group">
                                            <td className="p-8 px-10"><div className="flex flex-col"><span className="font-bold text-slate-800 uppercase tracking-tight text-base leading-tight group-hover:text-blue-600 transition-colors">{task.title}</span><span className="text-[10px] text-slate-300 font-bold uppercase mt-1.5 tracking-[0.1em]">#{task.id.slice(-4)} • {task.status}</span></div></td>
                                            <td className="p-6"><span className={`px-3 py-1 rounded-xl text-[10px] font-bold uppercase border flex items-center gap-1.5 w-fit shadow-sm ${PRIORITY_COLORS[task.priority as TaskPriority]}`}><Flag size={12} className={PRIORITY_ICON_COLORS[task.priority as TaskPriority]} />{task.priority}</span></td>
                                            <td className="p-6"><span className={`px-3 py-1 rounded-xl text-[10px] font-bold uppercase border shadow-sm ${TYPE_STYLES[task.type as TaskType]}`}>{task.type}</span></td>
                                            <td className="p-6"><div className="flex -space-x-3">{task.assigneeIds.map(aid => (<div key={aid} className="w-10 h-10 rounded-2xl border-4 border-white dark:border-slate-800 overflow-hidden shadow-sm aspect-square"><img src={employees.find(e => e.id === aid)?.avatar} className="w-full h-full object-cover" /></div>))}</div></td>
                                            <td className="p-6 text-right pr-10 text-xs font-bold uppercase tracking-widest text-slate-400">{task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '—'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {/* Modal: Task Editor */}
            {isTaskModalOpen && editingTask && (
                <div className="fixed inset-0 bg-black/70 z-[400] flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-800 w-full max-w-2xl rounded-[40px] shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-700 flex flex-col max-h-[90vh]">
                        <header className="p-6 border-b dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30 flex justify-between items-center shrink-0"><div className="flex items-center gap-4"><div className="p-3 bg-white dark:bg-slate-700 rounded-2xl shadow-sm text-blue-600 aspect-square"><Edit2 size={24}/></div><div><h3 className="font-bold text-xl uppercase tracking-tight leading-none">Редактор задачи</h3><p className="text-[10px] text-slate-400 font-bold uppercase mt-1.5">Параметры и участники</p></div></div><button onClick={() => setIsTaskModalOpen(false)} className="p-2 text-slate-400 hover:text-red-500 transition-colors bg-white dark:bg-slate-700 rounded-2xl shadow-sm"><X size={24}/></button></header>
                        <form onSubmit={handleSaveFullTask} className="flex-1 overflow-y-auto p-10 space-y-8 custom-scrollbar">
                            <div className="space-y-2"><label className="block text-[10px] font-bold uppercase text-slate-400 tracking-[0.2em] ml-1">Название задачи *</label><input className="w-full text-2xl font-bold bg-transparent border-b-4 border-slate-100 dark:border-slate-700 focus:border-blue-500 outline-none py-3 text-slate-800 dark:text-white uppercase tracking-tight transition-all" placeholder="Что нужно сделать?" value={editingTask.title} onChange={e => setEditingTask({...editingTask, title: e.target.value})} required /></div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                <div className="space-y-6">
                                    <div className="relative"><label className="block text-[10px] font-bold uppercase text-slate-400 mb-2 tracking-widest ml-1">Статус</label><button type="button" onClick={(e) => { e.stopPropagation(); setActivePopover({ taskId: 'editing', type: 'type' }); }} className="w-full flex items-center justify-between bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-4 py-3 rounded-2xl font-bold text-sm transition-all hover:border-blue-300 uppercase tracking-widest"><div className="flex items-center gap-3"><div className={`w-2 h-2 rounded-full ${getColumnColor(editingTask.status || kanbanColumns[0])}`} />{editingTask.status || kanbanColumns[0]}</div><ChevronDown size={18} className="text-slate-300" /></button>{activePopover.taskId === 'editing' && activePopover.type === 'type' && (<div className="absolute top-full left-0 w-full mt-2 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border z-[500] p-1 overflow-hidden animate-in fade-in zoom-in-95">{kanbanColumns.map(t => (<button key={t} type="button" onClick={() => setEditingTask({...editingTask, status: t})} className={`w-full flex items-center justify-between px-4 py-3 text-[10px] font-bold uppercase tracking-widest rounded-xl ${editingTask.status === t ? 'bg-blue-50 text-blue-600' : 'hover:bg-slate-50 text-slate-600'}`}>{t} {editingTask.status === t && <Check size={16} strokeWidth={4}/>}</button>))}</div>)}</div>
                                </div>
                                <div className="space-y-6">
                                    <div className="grid grid-cols-2 gap-4"><div className="relative"><label className="block text-[10px] font-bold uppercase text-slate-400 mb-2 tracking-widest ml-1">Приоритет</label><button type="button" onClick={(e) => { e.stopPropagation(); setActivePopover({ taskId: 'editing', type: 'priority' }); }} className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl font-bold text-[10px] border ${PRIORITY_COLORS[(editingTask.priority || TaskPriority.Medium) as TaskPriority]}`}><div className="flex items-center gap-2 uppercase tracking-widest"><Flag size={14} className={PRIORITY_ICON_COLORS[(editingTask.priority || TaskPriority.Medium) as TaskPriority]} />{editingTask.priority}</div><ChevronDown size={14}/></button>{activePopover.taskId === 'editing' && activePopover.type === 'priority' && (<div className="absolute top-full left-0 mt-2 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border z-[500] p-1 animate-in fade-in zoom-in-95">{Object.values(TaskPriority).map(p => (<button key={p} type="button" onClick={() => setEditingTask({...editingTask, priority: p as TaskPriority})} className={`w-full flex items-center justify-between px-4 py-2.5 text-[10px] font-bold rounded-xl uppercase ${editingTask.priority === p ? 'bg-slate-100' : 'hover:bg-slate-50'}`}>{p} <Flag size={14} className={PRIORITY_ICON_COLORS[p as TaskPriority]} /></button>))}</div>)}</div><div className="relative"><label className="block text-[10px] font-bold uppercase text-slate-400 mb-2 tracking-widest ml-1">Дедлайн</label><button type="button" onClick={(e) => { e.stopPropagation(); setActivePopover({ taskId: 'editing', type: 'calendar' }); }} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl pl-4 pr-4 py-3 text-xs font-bold uppercase tracking-widest text-left outline-none hover:border-blue-300 h-[48px] flex items-center gap-3"><CalendarDays size={18} className="text-slate-400"/> {editingTask.dueDate ? new Date(editingTask.dueDate).toLocaleDateString('ru-RU') : 'БЕЗ СРОКА'}</button>{activePopover.taskId === 'editing' && activePopover.type === 'calendar' && (<div className="absolute top-full left-0 mt-2 z-[510] animate-in fade-in zoom-in-95" onClick={e => e.stopPropagation()}><DateRangePicker startDate={editingTask.dueDate || ''} onChange={(d) => { setEditingTask({...editingTask, dueDate: d}); setActivePopover({ taskId: '', type: null }); }} mode="single" showTrigger={false} /></div>)}</div></div>
                                </div>
                            </div>
                        </form>
                        <footer className="p-8 border-t dark:border-slate-700 bg-slate-50/80 flex justify-between items-center shrink-0"><button type="button" onClick={() => { if(confirm('Удалить задачу?')) { setTasks(tasks.filter(t => t.id !== editingTask.id)); setIsTaskModalOpen(false); } }} className="text-rose-500 p-3 hover:bg-rose-50 rounded-2xl transition-all aspect-square"><Trash2 size={24}/></button><div className="flex gap-4 ml-auto"><button type="button" onClick={() => setIsTaskModalOpen(false)} className="px-8 py-3 text-xs font-bold text-slate-400 uppercase tracking-widest">Отмена</button><button type="submit" onClick={handleSaveFullTask} className="bg-blue-600 hover:bg-blue-700 text-white px-12 py-4 rounded-3xl font-bold uppercase tracking-widest shadow-2xl shadow-blue-500/20 active:scale-95 transition-all flex items-center gap-3 text-sm"><Save size={20}/> Сохранить</button></div></footer>
                    </div>
                </div>
            )}
        </div>
    );
};
