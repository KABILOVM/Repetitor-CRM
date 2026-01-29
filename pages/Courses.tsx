
import React, { useState, useEffect, useRef } from 'react';
import { storage, StorageKeys } from '../services/storage';
import { Course, CourseBook, Branch, UserRole, UserProfile, BranchConfig, CourseTopic, CourseProgram, LearningSection, LearningTopic, BranchEntity, CourseThematic } from '../types';
import { 
    BookOpen, Plus, Trash2, Save, X, Target, DollarSign, Book, Minus, 
    Calculator, FlaskConical, Atom, Dna, Globe, Scroll, Gavel, Code, 
    Search, MapPin, Check, Palette, Clock, CalendarDays, ListChecks,
    Music, Dumbbell, Brain, Rocket, Languages, PenTool, Layout, FileText, MoveUp, MoveDown, List, Layers, Briefcase, GraduationCap, ChevronDown, ChevronRight, Settings, 
    MoreVertical, ExternalLink, AlertCircle, Banknote, Building2, PackageCheck, Coins, ClipboardList
} from 'lucide-react';
import { useData } from '../hooks/useData';

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
    'PenTool': PenTool,
    'Layers': Layers,
    'GraduationCap': GraduationCap
};

const COLORS = [
    { name: 'blue', color: '#3b82f6', class: 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 border-blue-100 dark:border-blue-800' },
    { name: 'emerald', color: '#10b981', class: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800' },
    { name: 'purple', color: '#a855f7', class: 'bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400 border-purple-100 dark:border-purple-800' },
    { name: 'amber', color: '#f59e0b', class: 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400 border-amber-100 dark:border-amber-800' },
    { name: 'rose', color: '#f43f5e', class: 'bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400 border-rose-100 dark:border-rose-800' },
    { name: 'cyan', color: '#06b6d4', class: 'bg-cyan-50 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400 border-cyan-100 dark:border-cyan-800' },
    { name: 'indigo', color: '#6366f1', class: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 border-indigo-100 dark:border-indigo-800' },
    { name: 'slate', color: '#64748b', class: 'bg-slate-50 text-slate-600 dark:bg-slate-700 dark:text-slate-300 border-slate-100 dark:border-slate-600' },
];

export const Courses: React.FC = () => {
  const [courses, setCourses] = useData<Course[]>(StorageKeys.COURSES, []);
  const [programs, setPrograms] = useData<CourseProgram[]>(StorageKeys.COURSE_PROGRAMS, []);
  const [lmsSections, setLmsSections] = useData<LearningSection[]>(StorageKeys.LMS_SECTIONS, []);
  const [lmsTopics, setLmsTopics] = useData<LearningTopic[]>(StorageKeys.LMS_TOPICS, []);
  const [branches] = useData<BranchEntity[]>(StorageKeys.BRANCHES, []);
  
  const user = storage.get<UserProfile>(StorageKeys.USER_PROFILE, { role: UserRole.GeneralDirector, fullName: 'Admin', email: '', permissions: [] });
  const isSuperUser = [UserRole.GeneralDirector, UserRole.Director, UserRole.Developer].includes(user.role);

  // Default tab is subjects (Курсы)
  const [activeMainTab, setActiveMainTab] = useState<'programs' | 'subjects'>('subjects');
  const [searchTerm, setSearchTerm] = useState('');

  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
  const [activeSubjectTab, setActiveSubjectTab] = useState<'general' | 'thematics'>('general');
  const [editingSubject, setEditingSubject] = useState<Partial<Course> | null>(null);
  const [expandedThematicId, setExpandedThematicId] = useState<string | null>(null);
  const [pricingThematicId, setPricingThematicId] = useState<string | null>(null);
  const originalSubjectRef = useRef<string>('');

  const [isProgramModalOpen, setIsProgramModalOpen] = useState(false);
  const [activeProgramTab, setActiveProgramTab] = useState<'info' | 'composition' | 'plan'>('info');
  const [editingProgram, setEditingProgram] = useState<Partial<CourseProgram> | null>(null);
  const [expandedSubjectInProgram, setExpandedSubjectInProgram] = useState<number | null>(null);
  const originalProgramRef = useRef<string>('');

  const [newBookName, setNewBookName] = useState('');
  const [newBookPrice, setNewBookPrice] = useState('');

  useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
          if (e.key === 'Escape') {
              if (pricingThematicId) setPricingThematicId(null);
              else if (isSubjectModalOpen) closeSubjectModal();
              else if (isProgramModalOpen) closeProgramModal();
          }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSubjectModalOpen, isProgramModalOpen, editingSubject, editingProgram, pricingThematicId]);

  const handleEditSubject = (subject: Course) => {
    const subData = { 
        ...subject, 
        maxExamScore: subject.maxExamScore || 100,
        branchConfig: subject.branchConfig || {},
        thematics: subject.thematics || [],
        icon: subject.icon || 'BookOpen',
        color: subject.color || 'blue'
    };
    setEditingSubject(subData);
    originalSubjectRef.current = JSON.stringify(subData);
    setActiveSubjectTab('general');
    setIsSubjectModalOpen(true);
  };

  const handleAddNewSubject = () => {
    const newSub = {
      name: '',
      description: '',
      books: [],
      maxExamScore: 100,
      thematics: [],
      icon: 'BookOpen',
      color: 'blue'
    };
    setEditingSubject(newSub);
    originalSubjectRef.current = JSON.stringify(newSub);
    setActiveSubjectTab('general');
    setIsSubjectModalOpen(true);
  };

  const closeSubjectModal = () => {
      if (JSON.stringify(editingSubject) !== originalSubjectRef.current) {
          if (!confirm('Есть несохраненные изменения. Закрыть окно?')) return;
      }
      setIsSubjectModalOpen(false);
      setEditingSubject(null);
      setExpandedThematicId(null);
  };

  const handleSaveSubject = () => {
    if (!editingSubject?.name) {
      alert('Укажите название курса');
      return;
    }
    let updated: Course[];
    if (editingSubject.id) {
      updated = courses.map(c => c.id === editingSubject.id ? { ...c, ...editingSubject } as Course : c);
    } else {
      updated = [...courses, { ...editingSubject, id: Date.now() } as Course];
    }
    setCourses(updated);
    setIsSubjectModalOpen(false);
    setEditingSubject(null);
  };

  const handleDeleteSubject = () => {
    if (!editingSubject?.id) return;
    if (confirm('Удалить курс?')) {
      setCourses(courses.filter(c => c.id !== editingSubject.id));
      setIsSubjectModalOpen(false);
      setEditingSubject(null);
    }
  };

  const handleEditProgram = (program: CourseProgram) => {
      setEditingProgram({ ...program });
      originalProgramRef.current = JSON.stringify(program);
      setActiveProgramTab('info');
      setIsProgramModalOpen(true);
  };

  const handleAddNewProgram = () => {
      const newProg = { name: '', subjectIds: [], icon: 'Layers', color: 'blue' };
      setEditingProgram(newProg);
      originalProgramRef.current = JSON.stringify(newProg);
      setActiveProgramTab('info');
      setIsProgramModalOpen(true);
  };

  const closeProgramModal = () => {
      if (JSON.stringify(editingProgram) !== originalProgramRef.current) {
          if (!confirm('Закрыть без сохранения?')) return;
      }
      setIsProgramModalOpen(false);
      setEditingProgram(null);
  };

  const handleSaveProgram = () => {
      if (!editingProgram?.name) return alert('Введите название');
      let updated: CourseProgram[];
      if (editingProgram.id) {
          updated = programs.map(p => p.id === editingProgram.id ? { ...p, ...editingProgram } as CourseProgram : p);
      } else {
          updated = [...programs, { ...editingProgram, id: Date.now().toString() } as CourseProgram];
      }
      setPrograms(updated);
      setIsProgramModalOpen(false);
  };

  const handleDeleteProgram = () => {
      if (!editingProgram?.id) return;
      if (confirm('Удалить продукт?')) {
          setPrograms(programs.filter(p => p.id !== editingProgram.id));
          setIsProgramModalOpen(false);
      }
  };

  const updateThematic = (id: string, updates: Partial<CourseThematic>) => {
      setEditingSubject(prev => ({
          ...prev,
          thematics: prev?.thematics?.map(t => t.id === id ? { ...t, ...updates } : t) || []
      }));
  };

  const handleAddThematic = () => {
      const newThematic: CourseThematic = {
          id: `them_${Date.now()}`,
          name: 'Новый тематический план',
          topicIds: [],
          branchPrices: {}
      };
      setEditingSubject(prev => ({
          ...prev,
          thematics: [...(prev?.thematics || []), newThematic]
      }));
      setExpandedThematicId(newThematic.id);
  };

  const removeThematic = (id: string) => {
      if (confirm('Удалить этот тематический план?')) {
          setEditingSubject(prev => ({
              ...prev,
              thematics: prev?.thematics?.filter(t => t.id !== id) || []
          }));
      }
  };

  const getIcon = (iconName?: string) => ICON_MAP[iconName || 'BookOpen'] || BookOpen;
  const getColorClass = (colorName?: string) => COLORS.find(c => c.name === colorName)?.class || COLORS[0].class;

  const filteredSubjects = courses.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()));
  const filteredPrograms = programs.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
  const currentPricingThematic = editingSubject?.thematics?.find(t => t.id === pricingThematicId);

  return (
    <div className="space-y-6 antialiased">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-white tracking-tight">Курсы и программы</h2>
                <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm font-medium">Управление образовательными продуктами и планами.</p>
            </div>
            {isSuperUser && (
                <button 
                    onClick={activeMainTab === 'programs' ? handleAddNewProgram : handleAddNewSubject}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold transition-all flex items-center gap-2 shadow-lg shadow-blue-600/20 active:scale-95 text-sm"
                >
                    <Plus size={18} strokeWidth={3} />
                    {activeMainTab === 'subjects' ? 'Добавить курс' : 'Создать продукт'}
                </button>
            )}
        </div>

        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700">
            <div className="flex gap-8">
                <button 
                    onClick={() => setActiveMainTab('subjects')}
                    className={`py-3 text-xs font-bold border-b-4 transition-all flex items-center gap-2 tracking-wide ${activeMainTab === 'subjects' ? 'border-blue-600 text-blue-600 dark:text-blue-400' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                >
                    <BookOpen size={16}/> Курсы
                </button>
                <button 
                    onClick={() => setActiveMainTab('programs')}
                    className={`py-3 text-xs font-bold border-b-4 transition-all flex items-center gap-2 tracking-wide ${activeMainTab === 'programs' ? 'border-blue-600 text-blue-600 dark:text-blue-400' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                >
                    <Layers size={16}/> Продукты
                </button>
            </div>
            <div className="relative w-64 hidden sm:block mb-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input 
                    type="text" 
                    placeholder="Поиск по названию..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-sm bg-white dark:bg-slate-800 text-slate-900 focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 outline-none transition-all shadow-sm"
                />
            </div>
        </div>
      </div>

      {activeMainTab === 'subjects' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {filteredSubjects.map(subject => (
                <div key={subject.id} className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-xl hover:border-blue-400 transition-all group cursor-pointer overflow-hidden flex flex-col" onClick={() => handleEditSubject(subject)}>
                    <div className="p-6 flex-1">
                        <div className="flex justify-between items-start mb-5">
                            <div className={`p-4 rounded-2xl border transition-transform group-hover:rotate-6 duration-300 ${getColorClass(subject.color)}`}>
                                {(() => { const Icon = getIcon(subject.icon); return <Icon size={24} /> })()}
                            </div>
                            <div className="p-1.5 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity"><Settings size={16}/></div>
                        </div>
                        <h3 className="font-bold text-lg text-slate-800 dark:text-white mb-2 leading-tight group-hover:text-blue-600 transition-colors uppercase tracking-tight">{subject.name}</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 min-h-[32px] leading-relaxed font-medium">{subject.description || 'Учебный курс.'}</p>
                    </div>
                    <div className="px-6 py-4 border-t border-slate-50 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/20 flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-slate-400">
                        <span className="flex items-center gap-2"><ClipboardList size={14} className="text-blue-500"/> {subject.thematics?.length || 0} планов</span>
                        <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform"/>
                    </div>
                </div>
            ))}
          </div>
      )}

      {activeMainTab === 'programs' && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              {filteredPrograms.map(prog => (
                  <div key={prog.id} className="bg-white dark:bg-slate-800 rounded-[32px] shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden group transition-all hover:shadow-xl flex flex-col h-full">
                      <div className="p-6 cursor-pointer flex-1" onClick={() => handleEditProgram(prog)}>
                          <div className="flex justify-between items-start mb-6">
                              <div className={`p-4 rounded-2xl border transition-transform group-hover:scale-105 duration-300 ${getColorClass(prog.color)}`}>
                                  {(() => { const Icon = getIcon(prog.icon); return <Icon size={28} /> })()}
                              </div>
                              <span className="text-[10px] font-bold uppercase tracking-widest bg-slate-100 dark:bg-slate-700 px-3 py-1 rounded-full text-slate-500 flex items-center gap-1.5"><Layers size={12}/> {prog.subjectIds.length} курсов</span>
                          </div>
                          <h3 className="font-bold text-xl text-slate-800 dark:text-white mb-2 leading-tight group-hover:text-blue-600 transition-colors uppercase tracking-tight">{prog.name}</h3>
                          <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-3 leading-relaxed font-medium">{prog.description || 'Образовательный продукт.'}</p>
                      </div>
                      <div className="px-6 py-5 border-t border-slate-50 dark:border-slate-700 bg-slate-50/30 dark:bg-slate-900/20 flex gap-2 overflow-x-auto hide-scrollbar">
                          {courses.filter(c => prog.subjectIds.includes(c.id)).map(subj => {
                              const SIcon = getIcon(subj.icon);
                              return (
                                  <div key={subj.id} className={`w-10 h-10 rounded-xl flex items-center justify-center border shadow-sm shrink-0 ${getColorClass(subj.color)}`} title={subj.name}>
                                      <SIcon size={20}/>
                                  </div>
                              );
                          })}
                      </div>
                  </div>
              ))}
          </div>
      )}

      {/* Subject Modal */}
      {isSubjectModalOpen && editingSubject && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-800 rounded-[32px] shadow-2xl w-full max-w-3xl flex flex-col max-h-[90vh] border border-slate-100 dark:border-slate-700 overflow-hidden">
                <header className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
                    <div className="flex items-center gap-4">
                        <div className="p-3.5 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-500/20">
                            <BookOpen size={24} strokeWidth={2.5}/>
                        </div>
                        <h3 className="font-bold text-2xl text-slate-800 dark:text-white tracking-tight">
                            {editingSubject.id ? 'Редактирование курса' : 'Новый курс'}
                        </h3>
                    </div>
                    <div className="flex items-center gap-2">
                        {editingSubject.id && <button onClick={handleDeleteSubject} className="p-3 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all"><Trash2 size={22} /></button>}
                        <button onClick={closeSubjectModal} className="p-3 text-slate-300 hover:text-slate-900 dark:hover:text-white rounded-2xl transition-all"><X size={24}/></button>
                    </div>
                </header>

                <div className="px-8 border-b border-slate-200 dark:border-slate-700 flex gap-10 bg-white dark:bg-slate-800">
                    <button onClick={() => setActiveSubjectTab('general')} className={`py-5 text-sm font-bold border-b-4 transition-all flex items-center gap-2 tracking-wide ${activeSubjectTab === 'general' ? 'border-blue-600 text-blue-600 dark:text-blue-400' : 'border-transparent text-slate-400 hover:text-slate-600'}`}><Settings size={18}/> Параметры</button>
                    <button onClick={() => setActiveSubjectTab('thematics')} className={`py-5 text-sm font-bold border-b-4 transition-all flex items-center gap-2 tracking-wide ${activeSubjectTab === 'thematics' ? 'border-blue-600 text-blue-600 dark:text-blue-400' : 'border-transparent text-slate-400 hover:text-slate-600'}`}><ClipboardList size={18}/> Тематический план ({editingSubject.thematics?.length || 0})</button>
                </div>

                <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar">
                    {activeSubjectTab === 'general' && (
                        <div className="space-y-10 animate-in fade-in slide-in-from-left-2 duration-300 pb-4">
                            <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
                                <div className="sm:col-span-3 space-y-2">
                                    <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-400 ml-1">Название курса</label>
                                    <input type="text" value={editingSubject.name} onChange={e => setEditingSubject({...editingSubject, name: e.target.value})} className="w-full border-2 border-slate-100 dark:border-slate-700 rounded-2xl p-4 text-sm font-bold bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:border-blue-500 outline-none uppercase transition-all shadow-sm" placeholder="Напр. МАТЕМАТИКА"/>
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-400 ml-1">Макс. балл</label>
                                    <input type="number" value={editingSubject.maxExamScore || 100} onChange={e => setEditingSubject({...editingSubject, maxExamScore: Number(e.target.value)})} className="w-full border-2 border-slate-100 dark:border-slate-700 rounded-2xl p-4 text-sm font-bold bg-white dark:bg-slate-900 text-center focus:border-blue-500 outline-none shadow-sm"/>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                <div className="space-y-4">
                                    <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-400 ml-1">Визуализация (иконка)</label>
                                    <div className="grid grid-cols-5 gap-3 p-5 bg-slate-50 dark:bg-slate-900/50 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-inner">
                                        {Object.keys(ICON_MAP).map(iconKey => { 
                                            const Icon = ICON_MAP[iconKey]; 
                                            const isSel = editingSubject.icon === iconKey;
                                            return (
                                                <button key={iconKey} onClick={() => setEditingSubject({...editingSubject, icon: iconKey})} className={`p-3 rounded-xl flex items-center justify-center transition-all ${isSel ? 'bg-blue-600 text-white shadow-xl scale-110' : 'text-slate-400 hover:bg-white dark:hover:bg-slate-800 hover:text-blue-500 hover:shadow-sm'}`}><Icon size={20}/></button>
                                            ) 
                                        })}
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-400 ml-1">Цветовая гамма</label>
                                    <div className="grid grid-cols-4 gap-3 p-5 bg-slate-50 dark:bg-slate-900/50 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-inner">
                                        {COLORS.map(c => {
                                            const isSel = editingSubject.color === c.name;
                                            return (
                                                <button key={c.name} onClick={() => setEditingSubject({...editingSubject, color: c.name})} className={`h-10 rounded-xl border-4 transition-all relative overflow-hidden flex items-center justify-center ${isSel ? 'border-white dark:border-slate-800 ring-2 ring-blue-500 shadow-lg scale-110' : 'border-transparent opacity-60 hover:opacity-100'}`}><div className="absolute inset-0" style={{ backgroundColor: c.color }}></div>{isSel && <Check size={16} className="text-white z-10" strokeWidth={4}/>}</button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeSubjectTab === 'thematics' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-2 duration-300 pb-4">
                             <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-900/50 p-6 rounded-[32px] border border-slate-100 dark:border-slate-700">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-blue-100 dark:bg-blue-900/40 text-blue-600 rounded-2xl"><ClipboardList size={22}/></div>
                                    <div>
                                        <h4 className="font-bold text-lg text-slate-800 dark:text-white leading-none">Тематический план</h4>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase mt-1 tracking-widest">Организация и ценообразование</p>
                                    </div>
                                </div>
                                <button onClick={handleAddThematic} className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-black uppercase tracking-widest rounded-2xl flex items-center gap-2 shadow-xl shadow-blue-500/20 transition-all active:scale-95"><Plus size={18} strokeWidth={3}/> Создать план</button>
                            </div>

                            <div className="space-y-4">
                                {editingSubject.thematics?.map((thematic) => (
                                    <div key={thematic.id} className="bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-[28px] overflow-hidden shadow-sm transition-all hover:border-blue-400">
                                        <div className={`p-6 flex items-center justify-between cursor-pointer ${expandedThematicId === thematic.id ? 'bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700' : ''}`} onClick={() => setExpandedThematicId(expandedThematicId === thematic.id ? null : thematic.id)}>
                                            <div className="flex items-center gap-4 min-w-0">
                                                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center border shadow-sm transition-all ${expandedThematicId === thematic.id ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-50 text-slate-400 dark:bg-slate-900 dark:border-slate-700'}`}><PackageCheck size={22}/></div>
                                                <div className="min-w-0">
                                                    <span className="text-base font-bold text-slate-800 dark:text-white uppercase truncate block tracking-tight">{thematic.name}</span>
                                                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{thematic.topicIds.length} тем добавлено</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <button onClick={(e) => { e.stopPropagation(); removeThematic(thematic.id); }} className="p-2.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"><Trash2 size={20}/></button>
                                                <ChevronDown size={22} className={`text-slate-300 transition-transform ${expandedThematicId === thematic.id ? 'rotate-180 text-blue-500' : ''}`}/>
                                            </div>
                                        </div>
                                        {expandedThematicId === thematic.id && (
                                            <div className="p-8 space-y-8 animate-in slide-in-from-top-2 duration-300">
                                                <div className="flex flex-col sm:flex-row gap-6 items-end">
                                                    <div className="flex-1 w-full space-y-2">
                                                        <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-400 ml-1">Название тематического плана</label>
                                                        <input type="text" value={thematic.name} onChange={e => updateThematic(thematic.id, { name: e.target.value })} className="w-full border-2 border-slate-50 dark:border-slate-700 rounded-2xl p-4 text-sm font-bold bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:border-blue-500 transition-all shadow-inner uppercase"/>
                                                    </div>
                                                    <button onClick={() => setPricingThematicId(thematic.id)} className="px-8 py-4 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl font-bold uppercase tracking-widest text-[11px] flex items-center gap-3 shadow-xl shadow-amber-500/20 transition-all active:scale-95 h-[58px]"><Coins size={20}/> Стоимость в филиалах</button>
                                                </div>
                                                <div className="bg-slate-50 dark:bg-slate-900/30 rounded-[32px] p-6 border border-slate-100 dark:border-slate-700">
                                                    <h5 className="text-xs font-bold uppercase text-slate-400 tracking-widest mb-6 flex items-center gap-2"><List size={16} className="text-blue-500"/> Выберите темы учебного плана</h5>
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-80 overflow-y-auto custom-scrollbar pr-2">
                                                        {lmsTopics.filter(t => lmsSections.filter(s => s.subjectId === String(editingSubject.id)).some(s => s.id === t.sectionId)).map((topic, index) => (
                                                            <label key={topic.id} className={`flex items-center gap-3 p-3.5 rounded-2xl border-2 transition-all cursor-pointer ${thematic.topicIds.includes(topic.id) ? 'bg-white border-blue-600 dark:bg-slate-800 shadow-md scale-[1.02]' : 'bg-transparent border-transparent hover:border-slate-200 opacity-60'}`}>
                                                                <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all shrink-0 ${thematic.topicIds.includes(topic.id) ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white dark:bg-slate-700 border-slate-300'}`}>{thematic.topicIds.includes(topic.id) && <Check size={14} strokeWidth={4}/>}</div>
                                                                <input type="checkbox" checked={thematic.topicIds.includes(topic.id)} onChange={e => {
                                                                    const nextIds = e.target.checked ? [...thematic.topicIds, topic.id] : thematic.topicIds.filter(id => id !== topic.id);
                                                                    updateThematic(thematic.id, { topicIds: nextIds });
                                                                }} className="hidden"/>
                                                                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200 uppercase tracking-tight truncate">{index + 1}. {topic.title}</span>
                                                            </label>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                                {(!editingSubject.thematics || editingSubject.thematics.length === 0) && (
                                    <div className="text-center py-20 bg-slate-50 dark:bg-slate-900/30 border-4 border-dashed border-slate-100 dark:border-slate-800 rounded-[48px]">
                                        <ClipboardList size={64} className="mx-auto mb-6 text-slate-200 dark:text-slate-700"/>
                                        <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Тематический план пуст</p>
                                        <button onClick={handleAddThematic} className="mt-6 px-8 py-3 bg-blue-50 text-blue-600 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all shadow-sm">Создать первый план</button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <footer className="p-6 border-t border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 flex justify-end items-center gap-6 shrink-0">
                    <button onClick={closeSubjectModal} className="px-8 py-3 text-xs font-bold text-slate-400 hover:text-slate-800 transition-colors uppercase tracking-widest">Отмена</button>
                    <button onClick={handleSaveSubject} className="px-14 py-4 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-2xl shadow-2xl shadow-blue-500/30 transition-all active:scale-95 flex items-center gap-3 uppercase tracking-widest"><Save size={20} strokeWidth={3} /> Сохранить</button>
                </footer>
            </div>
        </div>
      )}

      {/* Pricing Modal */}
      {pricingThematicId && currentPricingThematic && (
          <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-200">
              <div className="bg-white dark:bg-slate-800 rounded-[40px] shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-100 dark:border-slate-700">
                  <header className="p-8 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/30">
                      <div className="flex items-center gap-4">
                          <div className="p-4 bg-amber-100 dark:bg-amber-900/40 text-amber-600 rounded-2xl shadow-inner"><Coins size={28}/></div>
                          <div>
                              <h3 className="text-xl font-bold uppercase tracking-tight leading-tight">Стоимость по филиалам</h3>
                              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">План: {currentPricingThematic.name}</p>
                          </div>
                      </div>
                      <button onClick={() => setPricingThematicId(null)} className="p-2.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full text-slate-300 transition-all"><X size={24}/></button>
                  </header>
                  <div className="p-10 space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar bg-slate-50/10 dark:bg-slate-900/10">
                      {branches.filter(b => b.isActive).map(branch => (
                          <div key={branch.id} className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-100 dark:border-slate-700 flex items-center justify-between shadow-sm transition-all hover:border-amber-400 group">
                              <div className="flex items-center gap-4 flex-1">
                                  <div className="w-10 h-10 rounded-2xl bg-slate-50 dark:bg-slate-900 flex items-center justify-center text-slate-300 group-hover:text-amber-500 transition-colors"><Building2 size={20}/></div>
                                  <span className="text-sm font-bold text-slate-700 dark:text-white uppercase leading-tight pr-4">{branch.name}</span>
                              </div>
                              <div className="relative w-40 shrink-0">
                                  <input type="number" value={currentPricingThematic.branchPrices?.[branch.id] || ''} onChange={e => {
                                      updateThematic(currentPricingThematic.id, { branchPrices: { ...currentPricingThematic.branchPrices, [branch.id]: Number(e.target.value) } });
                                  }} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 rounded-2xl px-6 py-3.5 text-lg font-bold text-right pr-12 outline-none focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 transition-all shadow-inner" placeholder="0"/>
                                  <span className="absolute right-5 top-1/2 -translate-y-1/2 text-sm font-bold text-blue-500">с.</span>
                              </div>
                          </div>
                      ))}
                  </div>
                  <footer className="p-8 border-t dark:border-slate-700 bg-white dark:bg-slate-900 flex justify-center">
                      <button onClick={() => setPricingThematicId(null)} className="w-full sm:w-1/2 bg-blue-600 hover:bg-blue-700 text-white py-5 rounded-[24px] font-bold uppercase tracking-widest text-xs shadow-2xl shadow-blue-500/20 transition-all flex items-center justify-center gap-3"><Check size={24} strokeWidth={4}/> Подтвердить</button>
                  </footer>
              </div>
          </div>
      )}
    </div>
  );
};
