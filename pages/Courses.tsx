
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { storage, StorageKeys } from '../services/storage';
import { Course, CourseBook, Branch, UserRole, UserProfile, BranchConfig, CourseTopic, CourseProgram, LearningSection, LearningTopic, BranchEntity, CourseThematic, LearningLesson, QuizQuestion } from '../types';
import { 
    BookOpen, Plus, Trash2, Save, X, Target, DollarSign, Book, Minus, 
    Calculator, FlaskConical, Atom, Dna, Globe, Scroll, Gavel, Code, 
    Search, MapPin, Check, Palette, Clock, CalendarDays,
    Music, Dumbbell, Brain, Rocket, Languages, PenTool, Layout, FileText, List, Layers, Briefcase, GraduationCap, ChevronDown, ChevronRight, Settings, 
    MoreVertical, ExternalLink, AlertCircle, Building2, PackageCheck, Coins, ClipboardList, Info, Video, Award, Circle, Edit3, ArrowLeft, MoreHorizontal, GripVertical,
    PlayCircle
} from 'lucide-react';
import { useData } from '../hooks/useData';

// Icon Map for selection
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
  const [branches] = useData<BranchEntity[]>(StorageKeys.BRANCHES, []);
  const [lmsSections, setLmsSections] = useData<LearningSection[]>(StorageKeys.LMS_SECTIONS, []);
  const [lmsTopics, setLmsTopics] = useData<LearningTopic[]>(StorageKeys.LMS_TOPICS, []);
  const [lmsLessons, setLmsLessons] = useData<LearningLesson[]>(StorageKeys.LMS_LESSONS, []);
  
  const user = storage.get<UserProfile>(StorageKeys.USER_PROFILE, { role: UserRole.GeneralDirector, fullName: 'Admin', email: '', permissions: [] });
  const isSuperUser = ([UserRole.GeneralDirector, UserRole.Director, UserRole.Developer, UserRole.Admin] as (UserRole | string)[]).includes(user.role);

  const [activeMainTab, setActiveMainTab] = useState<'programs' | 'subjects'>('subjects');
  const [searchTerm, setSearchTerm] = useState('');

  // Course Modal State
  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
  const [activeSubjectTab, setActiveSubjectTab] = useState<'general' | 'thematics'>('general');
  const [editingSubject, setEditingSubject] = useState<Partial<Course> | null>(null);
  const [expandedThematicId, setExpandedThematicId] = useState<string | null>(null);
  const [pricingThematicId, setPricingThematicId] = useState<string | null>(null);

  // Program Modal State
  const [isProgramModalOpen, setIsProgramModalOpen] = useState(false);
  const [editingProgram, setEditingProgram] = useState<Partial<CourseProgram> | null>(null);
  const [openThematicSelectId, setOpenThematicSelectId] = useState<number | null>(null);

  // LMS Studio State
  const [isLmsStudioOpen, setIsLmsStudioOpen] = useState(false);
  const [studioSubject, setStudioSubject] = useState<Course | null>(null);
  const [activeStudioLessonId, setActiveStudioLessonId] = useState<string | null>(null);
  const [studioActiveTab, setStudioActiveTab] = useState<'content' | 'video' | 'quiz'>('content');

  const handleEditSubject = (subject: Course) => {
    const subData = { 
        ...subject, 
        maxExamScore: subject.maxExamScore ?? 100,
        thematics: subject.thematics || [],
        icon: subject.icon || 'BookOpen',
        color: subject.color || 'blue'
    };
    setEditingSubject(subData);
    setActiveSubjectTab('general');
    setIsSubjectModalOpen(true);
  };

  const handleSaveSubject = () => {
    if (!editingSubject?.name?.trim()) {
      storage.notify('Укажите название курса', 'warning');
      return;
    }
    const finalData = {
        ...editingSubject,
        maxExamScore: editingSubject.maxExamScore || 100
    } as Course;
    const updated = editingSubject.id 
        ? courses.map(c => c.id === editingSubject.id ? { ...c, ...finalData } : c)
        : [{ ...finalData, id: Date.now() } as Course, ...courses];
    setCourses(updated);
    setIsSubjectModalOpen(false);
    setEditingSubject(null);
    storage.notify('Курс успешно сохранен', 'success');
  };

  const handleEditProgram = (program: CourseProgram) => {
      setEditingProgram({ 
        ...program, 
        subjectIds: program.subjectIds || [],
        subjectThematicIds: program.subjectThematicIds || {},
        icon: program.icon || 'Layers',
        color: program.color || 'blue'
      });
      setIsProgramModalOpen(true);
  };

  const handleSaveProgram = () => {
      if (!editingProgram?.name?.trim()) {
          storage.notify('Укажите название продукта', 'warning');
          return;
      }
      const updated = editingProgram.id 
          ? programs.map(p => p.id === editingProgram.id ? { ...p, ...editingProgram } as CourseProgram : p)
          : [{ ...editingProgram, id: `prog_${Date.now()}` } as CourseProgram, ...programs];
      setPrograms(updated);
      setIsProgramModalOpen(false);
      setEditingProgram(null);
      storage.notify('Продукт успешно сохранен', 'success');
  };

  const toggleSubjectInProgram = (subjectId: number) => {
      if (!editingProgram) return;
      const current = editingProgram.subjectIds || [];
      const isSelected = current.includes(subjectId);
      const updated = isSelected 
          ? current.filter(id => id !== subjectId)
          : [...current, subjectId];
      const updatedThematics = { ...(editingProgram.subjectThematicIds || {}) };
      if (isSelected) {
          delete updatedThematics[subjectId];
      } else {
          const course = courses.find(c => c.id === subjectId);
          if (course?.thematics && course.thematics.length > 0) {
              updatedThematics[subjectId] = course.thematics[0].id;
          }
      }
      setEditingProgram({ 
          ...editingProgram, 
          subjectIds: updated,
          subjectThematicIds: updatedThematics
      });
  };

  const updateSubjectThematic = (subjectId: number, thematicId: string) => {
      if (!editingProgram) return;
      setEditingProgram({
          ...editingProgram,
          subjectThematicIds: {
              ...(editingProgram.subjectThematicIds || {}),
              [subjectId]: thematicId
          }
      });
      setOpenThematicSelectId(null);
  };

  const openLmsStudio = (subject: Course) => {
      setStudioSubject(subject);
      setIsLmsStudioOpen(true);
      setActiveStudioLessonId(null);
  };

  const handleAddStudioSection = () => {
      if (!studioSubject) return;
      const title = prompt('Название нового раздела:');
      if (title) {
          const newSec: LearningSection = {
              id: `sec_${Date.now()}`,
              subjectId: String(studioSubject.id),
              title,
              order: lmsSections.filter(s => s.subjectId === String(studioSubject.id)).length + 1
          };
          setLmsSections([...lmsSections, newSec]);
      }
  };

  const handleAddStudioTopic = (sectionId: string) => {
      const title = prompt('Название новой темы:');
      if (title) {
          const newTop: LearningTopic = {
              id: `top_${Date.now()}`,
              sectionId,
              title,
              order: lmsTopics.filter(t => t.sectionId === sectionId).length + 1
          };
          setLmsTopics([...lmsTopics, newTop]);
      }
  };

  const handleAddStudioLesson = (topicId: string) => {
      const title = prompt('Название нового урока:');
      if (title) {
          const newLesson: LearningLesson = {
              id: `less_${Date.now()}`,
              topicId,
              title,
              order: lmsLessons.filter(l => l.topicId === topicId).length + 1,
              contentText: ''
          };
          setLmsLessons([...lmsLessons, newLesson]);
          setActiveStudioLessonId(newLesson.id);
      }
  };

  const updateStudioLesson = (lessonId: string, updates: Partial<LearningLesson>) => {
      setLmsLessons(lmsLessons.map(l => l.id === lessonId ? { ...l, ...updates } : l));
  };

  const updateThematic = (id: string, updates: Partial<CourseThematic>) => {
      if (updates.id === 'DELETE') {
          setEditingSubject(prev => ({
              ...prev,
              thematics: prev?.thematics?.filter(t => t.id !== id) || []
          }));
          return;
      }
      setEditingSubject(prev => ({
          ...prev,
          thematics: prev?.thematics?.map(t => t.id === id ? { ...t, ...updates } : t) || []
      }));
  };

  const programPricingPerBranch = useMemo(() => {
    if (!editingProgram || !editingProgram.subjectIds) return [];
    return branches.filter(b => b.isActive).map(branch => {
        let total = 0;
        editingProgram.subjectIds?.forEach(sid => {
            const course = courses.find(c => c.id === sid);
            const thematicId = editingProgram.subjectThematicIds?.[sid];
            const thematic = course?.thematics?.find(t => t.id === thematicId);
            if (thematic && thematic.branchPrices?.[branch.id]) {
                total += thematic.branchPrices[branch.id];
            } else if (course) {
                total += course.price || 0;
            }
        });
        return { branch, total };
    });
  }, [editingProgram, courses, branches]);

  return (
    <div className="space-y-6 antialiased font-sans">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-white tracking-tight">Курсы и программы</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">Управление тематическими планами и контентом</p>
            </div>
            {isSuperUser && (
                <button 
                    onClick={() => {
                        if (activeMainTab === 'subjects') {
                            setEditingSubject({ name: '', books: [], maxExamScore: 100, thematics: [], color: 'blue', icon: 'BookOpen' });
                            setIsSubjectModalOpen(true);
                        } else {
                            setEditingProgram({ name: '', description: '', subjectIds: [], subjectThematicIds: {}, color: 'blue', icon: 'Layers' });
                            setIsProgramModalOpen(true);
                        }
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold transition-all flex items-center gap-2 shadow-lg shadow-blue-500/20 active:scale-95 text-xs"
                >
                    <Plus size={18} strokeWidth={3} /> {activeMainTab === 'subjects' ? 'Добавить курс' : 'Добавить продукт'}
                </button>
            )}
        </div>

        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700">
            <div className="flex gap-8">
                <button onClick={() => setActiveMainTab('subjects')} className={`py-3 text-xs font-bold border-b-4 transition-all flex items-center gap-2 ${activeMainTab === 'subjects' ? 'border-blue-600 text-blue-600 dark:text-blue-400' : 'border-transparent text-slate-400 hover:text-slate-600'}`}><BookOpen size={16}/> Курсы</button>
                <button onClick={() => setActiveMainTab('programs')} className={`py-3 text-xs font-bold border-b-4 transition-all flex items-center gap-2 ${activeMainTab === 'programs' ? 'border-blue-600 text-blue-600 dark:text-blue-400' : 'border-transparent text-slate-400 hover:text-slate-600'}`}><Layers size={16}/> Продукты</button>
            </div>
            <div className="relative w-64 hidden sm:block mb-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input type="text" placeholder="Поиск..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 text-slate-900 outline-none focus:border-blue-500 transition-all h-[38px]" />
            </div>
        </div>
      </div>

      {activeMainTab === 'subjects' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-in fade-in duration-300">
            {courses.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase())).map(subject => {
                const Icon = ICON_MAP[subject.icon || 'BookOpen'] || BookOpen;
                return (
                    <div key={subject.id} className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-xl hover:border-blue-400 transition-all group cursor-pointer overflow-hidden flex flex-col" onClick={() => handleEditSubject(subject)}>
                        <div className="p-6 flex-1">
                            <div className="flex justify-between items-start mb-5">
                                <div className={`p-4 rounded-xl border transition-transform group-hover:rotate-6 duration-300 ${COLORS.find(c => c.name === subject.color)?.class || COLORS[0].class}`}><Icon size={24} /></div>
                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={(e) => { e.stopPropagation(); openLmsStudio(subject); }} className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white transition-all" title="LMS Студия"><GraduationCap size={16}/></button>
                                    <button className="p-2 bg-slate-50 text-slate-400 rounded-lg hover:bg-slate-200 transition-all" onClick={(e) => { e.stopPropagation(); handleEditSubject(subject); }}><Settings size={16}/></button>
                                </div>
                            </div>
                            <h3 className="font-bold text-base text-slate-800 dark:text-white mb-2 leading-tight tracking-tight uppercase">{subject.name}</h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 min-h-[32px] font-medium">{subject.description || 'Учебный курс.'}</p>
                        </div>
                        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900/40 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center text-[10px] font-bold text-slate-400">
                            <span className="flex items-center gap-2"><ClipboardList size={14} className="text-blue-500"/> {subject.thematics?.length || 0} планов</span>
                            <div className="flex items-center gap-1.5"><Layers size={14}/> {lmsSections.filter(s => s.subjectId === String(subject.id)).length} разд.</div>
                        </div>
                    </div>
                );
            })}
          </div>
      ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-300">
              {programs.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase())).map(program => {
                  const programColor = COLORS.find(c => c.name === program.color) || COLORS[0];
                  const ProgramIcon = ICON_MAP[program.icon || 'Layers'] || Layers;
                  return (
                      <div key={program.id} className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-xl transition-all cursor-pointer group flex flex-col p-6 overflow-hidden relative" onClick={() => handleEditProgram(program)}>
                          <div className={`absolute top-0 left-0 w-2 h-full ${programColor.class.split(' ')[1].replace('text-', 'bg-')}`}></div>
                          <div className="flex justify-between items-start mb-6">
                              <div className="flex items-center gap-4">
                                  <div className={`p-3 rounded-xl ${programColor.class}`}>
                                      <ProgramIcon size={24}/>
                                  </div>
                                  <div>
                                      <h3 className="font-bold text-lg text-slate-900 dark:text-white tracking-tight uppercase leading-tight">{program.name}</h3>
                                      <p className="text-[10px] text-slate-400 font-black uppercase mt-1">Программный комплекс</p>
                                  </div>
                              </div>
                              {isSuperUser && <button className="p-2.5 bg-slate-50 dark:bg-slate-700 rounded-xl text-slate-400 opacity-0 group-hover:opacity-100 transition-all" onClick={(e) => { e.stopPropagation(); handleEditProgram(program); }}><Settings size={18}/></button>}
                          </div>
                          <div className="flex-1 space-y-5">
                              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium line-clamp-2 leading-relaxed">{program.description || 'Нет описания для этого продукта.'}</p>
                              <div className="pt-4 border-t border-slate-100 dark:border-slate-700">
                                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block">Курсы в программе</label>
                                  <div className="flex flex-wrap gap-2.5">
                                      {program.subjectIds.map(sid => {
                                          const course = courses.find(c => c.id === sid);
                                          if (!course) return null;
                                          const Icon = ICON_MAP[course.icon || 'BookOpen'] || BookOpen;
                                          return (
                                              <div key={sid} className="relative group/tooltip">
                                                  <div className={`p-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 shadow-sm transition-transform hover:scale-110 active:scale-95 ${COLORS.find(c => c.name === course.color)?.class.split(' ')[1] || 'text-blue-500'}`}><Icon size={16}/></div>
                                                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 bg-slate-900 text-white text-[10px] font-bold uppercase rounded-lg opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-xl border border-white/10">{course.name}<div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900"></div></div>
                                              </div>
                                          );
                                      })}
                                      {program.subjectIds.length === 0 && <span className="text-[10px] text-slate-400 italic">Курсы не добавлены</span>}
                                  </div>
                              </div>
                          </div>
                      </div>
                  )
              })}
          </div>
      )}

      {/* Program Modal - PREMIUM SAAS STYLE WITH FULL BACKDROP BLUR */}
      {isProgramModalOpen && editingProgram && (
          <div className="fixed inset-0 bg-black/60 z-[500] flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-300">
              <div className="bg-white dark:bg-slate-800 rounded-[32px] shadow-2xl w-full max-w-4xl flex flex-col max-h-[85vh] border border-slate-100 dark:border-slate-700 overflow-hidden antialiased">
                  <header className="p-6 border-b dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/30 shrink-0">
                      <div className="flex items-center gap-4">
                          <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-500/20">
                              <Layers size={24}/>
                          </div>
                          <div>
                            <h3 className="font-bold text-xl tracking-tight text-slate-800 dark:text-white uppercase leading-none">
                                {editingProgram.id ? 'Настройка продукта' : 'Новый продукт'}
                            </h3>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Конфигурация программного комплекса</p>
                          </div>
                      </div>
                      <button onClick={() => setIsProgramModalOpen(false)} className="p-3 bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 rounded-full text-slate-400 transition-all active:scale-90 border border-slate-100 dark:border-slate-600 shadow-sm"><X size={24}/></button>
                  </header>

                  <div className="flex-1 overflow-hidden flex flex-col md:flex-row bg-slate-50/50 dark:bg-slate-900/20">
                      <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar border-r dark:border-slate-700 bg-white dark:bg-slate-800">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                              <div className="space-y-6">
                                  <div>
                                      <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 ml-1 mb-2 uppercase tracking-widest">Название продукта</label>
                                      <input 
                                        type="text" 
                                        value={editingProgram.name || ''} 
                                        onChange={e => setEditingProgram({...editingProgram, name: e.target.value})} 
                                        className="w-full border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 text-sm font-bold bg-slate-50 dark:bg-slate-900 outline-none focus:bg-white transition-all text-slate-800 dark:text-white uppercase shadow-inner" 
                                        placeholder="Напр. ПОДГОТОВКА К 5 КЛАСТЕРУ"
                                      />
                                  </div>
                                  
                                  <div className="grid grid-cols-1 gap-4">
                                      <div>
                                          <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 ml-1 mb-2 uppercase tracking-widest">Иконка продукта</label>
                                          <div className="grid grid-cols-6 gap-2 p-3 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-inner">
                                              {Object.keys(ICON_MAP).map(key => {
                                                  const IconComp = ICON_MAP[key];
                                                  return (
                                                      <button 
                                                          key={key} 
                                                          onClick={() => setEditingProgram({...editingProgram, icon: key})}
                                                          className={`p-2 rounded-xl flex items-center justify-center transition-all ${editingProgram.icon === key ? 'bg-blue-600 text-white shadow-lg scale-110' : 'hover:bg-white dark:hover:bg-slate-800 text-slate-400'}`}
                                                      >
                                                          <IconComp size={18}/>
                                                      </button>
                                                  );
                                              })}
                                          </div>
                                      </div>
                                      <div>
                                          <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 ml-1 mb-2 uppercase tracking-widest">Цветовая метка</label>
                                          <div className="grid grid-cols-8 gap-2 p-3 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-inner">
                                              {COLORS.map(c => (
                                                  <button 
                                                      key={c.name} 
                                                      onClick={() => setEditingProgram({...editingProgram, color: c.name})} 
                                                      className={`w-full aspect-square rounded-lg border-2 transition-all ${editingProgram.color === c.name ? 'border-blue-500 scale-110 shadow-md' : 'border-transparent'}`} 
                                                      style={{ backgroundColor: c.color }} 
                                                  />
                                              ))}
                                          </div>
                                      </div>
                                  </div>
                              </div>
                              
                              <div className="space-y-6">
                                  <div>
                                      <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 ml-1 mb-2 uppercase tracking-widest">Описание</label>
                                      <textarea 
                                        value={editingProgram.description || ''} 
                                        onChange={e => setEditingProgram({...editingProgram, description: e.target.value})} 
                                        className="w-full border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 text-sm bg-slate-50 dark:bg-slate-900 outline-none focus:bg-white transition-all h-[120px] resize-none font-medium leading-relaxed shadow-inner" 
                                        placeholder="Краткое описание программы..."
                                      />
                                  </div>
                              </div>
                          </div>

                          <div className="pt-8 border-t dark:border-slate-700">
                              <label className="block text-[11px] font-black text-slate-500 dark:text-slate-400 ml-1 mb-4 uppercase tracking-[0.1em]">Выбор курсов и тематических планов</label>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-12">
                                  {courses.map(course => {
                                      const isSelected = editingProgram.subjectIds?.includes(course.id);
                                      const selectedThematicId = editingProgram.subjectThematicIds?.[course.id];
                                      const Icon = ICON_MAP[course.icon || 'BookOpen'] || BookOpen;
                                      const selectedThematic = course.thematics?.find(t => t.id === selectedThematicId);
                                      return (
                                          <div key={course.id} className={`p-4 rounded-[24px] border-2 transition-all ${isSelected ? 'border-blue-500 bg-white dark:bg-slate-800 shadow-lg' : 'border-slate-50 dark:border-slate-900 bg-slate-50/50 dark:bg-slate-900/50 grayscale opacity-60 hover:opacity-100 hover:grayscale-0'}`}>
                                              <div className="flex items-center gap-4">
                                                  <button onClick={() => toggleSubjectInProgram(course.id)} className={`p-2.5 rounded-xl transition-all ${isSelected ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-200 dark:bg-slate-700 text-slate-400'}`}><Icon size={18}/></button>
                                                  <div className="flex-1 min-w-0" onClick={() => toggleSubjectInProgram(course.id)}><p className="text-sm font-bold uppercase truncate tracking-tight">{course.name}</p><p className="text-[10px] text-slate-400 font-bold">База: {course.price} с.</p></div>
                                                  <div onClick={() => toggleSubjectInProgram(course.id)} className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center cursor-pointer transition-all ${isSelected ? 'bg-blue-600 border-blue-600 shadow-sm scale-110' : 'border-slate-300'}`}>{isSelected && <Check size={14} strokeWidth={4} className="text-white"/>}</div>
                                              </div>
                                              {isSelected && (
                                                  <div className="ml-11 mt-3 space-y-1 animate-in slide-in-from-top-1 relative">
                                                      <button onClick={() => setOpenThematicSelectId(openThematicSelectId === course.id ? null : course.id)} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-[10px] font-black uppercase flex items-center justify-between hover:bg-white shadow-sm transition-all"><span className="truncate">{selectedThematic?.name || 'Планов нет'}</span><ChevronDown size={14} className={`text-slate-400 transition-transform ${openThematicSelectId === course.id ? 'rotate-180' : ''}`} /></button>
                                                      {openThematicSelectId === course.id && (
                                                          <div className="absolute top-full left-0 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl z-[200] p-1.5 animate-in fade-in zoom-in-95 duration-100">
                                                              <div className="max-h-32 overflow-y-auto custom-scrollbar">
                                                                  {course.thematics?.map(t => (
                                                                      <button key={t.id} onClick={() => updateSubjectThematic(course.id, t.id)} className={`w-full text-left px-3 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all flex items-center justify-between ${selectedThematicId === t.id ? 'bg-blue-50 text-blue-600' : 'hover:bg-slate-50 text-slate-600'}`}><span className="truncate">{t.name}</span>{selectedThematicId === t.id && <Check size={12} strokeWidth={4}/>}</button>
                                                                  ))}
                                                              </div>
                                                          </div>
                                                      )}
                                                  </div>
                                              )}
                                          </div>
                                      );
                                  })}
                              </div>
                          </div>
                      </div>

                      <div className="w-full md:w-64 bg-slate-50/50 dark:bg-slate-900/50 p-8 shrink-0 overflow-y-auto custom-scrollbar">
                          <div className="mb-6">
                              <h4 className="font-bold text-slate-800 dark:text-white text-xs uppercase flex items-center gap-2 tracking-widest"><Coins size={18} className="text-amber-500"/> Итоговая цена</h4>
                              <p className="text-[9px] text-slate-400 font-bold uppercase mt-1 tracking-tight">Расчет по филиалам</p>
                          </div>
                          <div className="space-y-3">
                              {programPricingPerBranch.map(({ branch, total }) => (
                                  <div key={branch.id} className="bg-white dark:bg-slate-800 p-4 rounded-[24px] border border-slate-100 dark:border-slate-700 shadow-sm transition-all hover:shadow-md">
                                      <div className="flex items-center gap-2 mb-2 text-slate-400"><MapPin size={12}/><span className="text-[10px] font-black uppercase truncate tracking-tighter">{branch.name}</span></div>
                                      <div className="flex justify-between items-baseline"><span className="text-2xl font-black text-slate-900 dark:text-white leading-none">{total}</span><span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter ml-1">смн</span></div>
                                  </div>
                              ))}
                          </div>
                      </div>
                  </div>

                  <footer className="p-6 border-t dark:border-slate-700 bg-white dark:bg-slate-900 flex justify-between items-center shrink-0">
                      {editingProgram.id ? <button onClick={() => { if(confirm('Удалить продукт?')) setPrograms(programs.filter(p => p.id !== editingProgram.id)); setIsProgramModalOpen(false); }} className="text-rose-500 px-6 py-2 text-[10px] font-black hover:bg-rose-50 rounded-xl transition-colors uppercase tracking-widest">Удалить продукт</button> : <div/>}
                      <div className="flex gap-4">
                          <button onClick={() => setIsProgramModalOpen(false)} className="px-8 py-2 text-[10px] font-black text-slate-400 hover:text-slate-600 uppercase tracking-widest transition-colors">Отмена</button>
                          <button onClick={handleSaveProgram} className="px-10 py-3 text-[10px] font-black text-white bg-blue-600 hover:bg-blue-700 rounded-2xl shadow-xl shadow-blue-500/20 transition-all active:scale-95 flex items-center gap-2 uppercase tracking-widest"><Save size={18} /> Сохранить</button>
                      </div>
                  </footer>
              </div>
          </div>
      )}

      {/* Subject Modal - MATCHING STUDENT PROFILE STYLE WITH FULL BACKDROP BLUR */}
      {isSubjectModalOpen && editingSubject && (
        <div className="fixed inset-0 bg-black/60 z-[500] flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-800 rounded-[32px] shadow-2xl w-full max-w-4xl flex flex-col max-h-[90vh] border border-slate-100 dark:border-slate-700 overflow-hidden antialiased">
                <header className="p-6 border-b dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/30 shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-500/20"><BookOpen size={24}/></div>
                        <div>
                            <h3 className="font-bold text-xl tracking-tight text-slate-800 dark:text-white uppercase leading-none">{editingSubject.id ? 'Настройка курса' : 'Новый курс'}</h3>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Параметры дисциплины и тематические планы</p>
                        </div>
                    </div>
                    <button onClick={() => setIsSubjectModalOpen(false)} className="p-3 bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 rounded-full text-slate-400 transition-all active:scale-90 border border-slate-100 dark:border-slate-600 shadow-sm"><X size={24}/></button>
                </header>

                <div className="px-8 border-b dark:border-slate-700 flex gap-4 bg-white dark:bg-slate-800 shrink-0 overflow-x-auto hide-scrollbar">
                    <div className="flex gap-2 p-1">
                        <button onClick={() => setActiveSubjectTab('general')} className={`px-6 py-2.5 text-[11px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center gap-2 ${activeSubjectTab === 'general' ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 shadow-sm border border-blue-100' : 'text-slate-400 hover:text-slate-700'}`}><Settings size={16}/> Общее</button>
                        <button onClick={() => setActiveSubjectTab('thematics')} className={`px-6 py-2.5 text-[11px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center gap-2 ${activeSubjectTab === 'thematics' ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 shadow-sm border border-blue-100' : 'text-slate-400 hover:text-slate-700'}`}><ClipboardList size={16}/> Планы ({editingSubject.thematics?.length || 0})</button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar bg-slate-50/20 dark:bg-slate-900/10 pb-24 relative">
                    {activeSubjectTab === 'general' && (
                        <div className="space-y-8 animate-in fade-in duration-300">
                            <div className="bg-white dark:bg-slate-800 p-6 rounded-[24px] border border-slate-200 dark:border-slate-700 shadow-sm space-y-6">
                                <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
                                    <div className="sm:col-span-3 space-y-2">
                                        <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 ml-1 uppercase tracking-widest">Название курса</label>
                                        <input type="text" value={editingSubject.name || ''} onChange={e => setEditingSubject({...editingSubject, name: e.target.value})} className="w-full border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 text-sm font-bold bg-slate-50 dark:bg-slate-900 outline-none focus:bg-white transition-all text-slate-800 dark:text-white uppercase tracking-tight shadow-inner" placeholder="Напр. МАТЕМАТИКА"/>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 ml-1 uppercase tracking-widest">Макс. балл</label>
                                        <input type="number" value={editingSubject.maxExamScore ?? ''} onChange={e => setEditingSubject({...editingSubject, maxExamScore: e.target.value === '' ? undefined : Number(e.target.value)})} className="w-full border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 text-sm font-bold bg-slate-50 dark:bg-slate-900 outline-none focus:bg-white transition-all text-center shadow-inner" placeholder="100"/>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 ml-1 mb-2 uppercase tracking-widest">Иконка</label>
                                        <div className="grid grid-cols-6 gap-2 p-3 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-inner">
                                            {Object.keys(ICON_MAP).map(key => {
                                                const IconComp = ICON_MAP[key];
                                                return (<button key={key} onClick={() => setEditingSubject({...editingSubject, icon: key})} className={`p-2 rounded-xl flex items-center justify-center transition-all ${editingSubject.icon === key ? 'bg-blue-600 text-white shadow-lg scale-110' : 'hover:bg-white dark:hover:bg-slate-800 text-slate-400'}`}><IconComp size={18}/></button>);
                                            })}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 ml-1 mb-2 uppercase tracking-widest">Цвет</label>
                                        <div className="grid grid-cols-4 gap-2 p-3 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-inner">
                                            {COLORS.map(c => (<button key={c.name} onClick={() => setEditingSubject({...editingSubject, color: c.name})} className={`w-full aspect-square rounded-xl border-2 transition-all ${editingSubject.color === c.name ? 'border-blue-500 scale-110 shadow-md' : 'border-transparent'}`} style={{ backgroundColor: c.color }} />))}
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 ml-1 mb-2 uppercase tracking-widest">Описание курса</label>
                                    <textarea value={editingSubject.description || ''} onChange={e => setEditingSubject({...editingSubject, description: e.target.value})} className="w-full border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 text-sm bg-slate-50 dark:bg-slate-900 outline-none focus:bg-white transition-all h-24 resize-none font-medium text-slate-600 shadow-inner" placeholder="Информация о предмете..."></textarea>
                                </div>
                            </div>
                        </div>
                    )}
                    {activeSubjectTab === 'thematics' && (
                        <div className="space-y-6 animate-in fade-in duration-300">
                             <div className="flex justify-between items-center bg-white dark:bg-slate-800 p-6 rounded-[24px] border border-slate-100 dark:border-slate-700 shadow-sm">
                                <div><h4 className="font-bold text-slate-800 dark:text-white text-sm uppercase tracking-tight leading-none">Тематические планы</h4><p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1.5">Темы занятий и филиалы</p></div>
                                <button onClick={() => {
                                    const newThematic: CourseThematic = { id: `them_${Date.now()}`, name: 'Новый план', topicIds: [], branchPrices: {} };
                                    setEditingSubject(prev => ({ ...prev, thematics: [...(prev?.thematics || []), newThematic] }));
                                    setExpandedThematicId(newThematic.id);
                                }} className="px-6 py-2.5 bg-blue-600 text-white text-[10px] font-black rounded-xl flex items-center gap-2 uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-blue-500/20"><Plus size={16} strokeWidth={3}/> Создать план</button>
                            </div>
                            <div className="space-y-4">
                                {editingSubject.thematics?.map((thematic) => (
                                    <div key={thematic.id} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[28px] overflow-hidden shadow-sm transition-all hover:border-blue-300">
                                        <div className={`p-4 px-6 flex items-center justify-between cursor-pointer ${expandedThematicId === thematic.id ? 'bg-slate-50/50 dark:bg-slate-800 border-b dark:border-slate-700' : ''}`} onClick={() => setExpandedThematicId(expandedThematicId === thematic.id ? null : thematic.id)}>
                                            <div className="flex items-center gap-4">
                                                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border shadow-sm transition-all ${expandedThematicId === thematic.id ? 'bg-blue-600 text-white' : 'bg-slate-50 text-slate-300'}`}><PackageCheck size={20}/></div>
                                                <span className="text-[13px] font-black text-slate-800 dark:text-white uppercase truncate">{thematic.name}</span>
                                            </div>
                                            <ChevronRight size={20} className={`text-slate-300 transition-transform ${expandedThematicId === thematic.id ? 'rotate-90 text-blue-500' : ''}`}/>
                                        </div>
                                        {expandedThematicId === thematic.id && (
                                            <div className="p-8 bg-white dark:bg-slate-900 space-y-8 animate-in slide-in-from-top-2">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                                    <div>
                                                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2 ml-1">Название плана</label>
                                                        <input type="text" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-3 text-sm font-bold outline-none shadow-inner" value={thematic.name} onChange={e => updateThematic(thematic.id, { name: e.target.value })} />
                                                    </div>
                                                    <div>
                                                        <div className="flex justify-between items-center mb-2 px-1"><label className="text-[10px] font-bold text-slate-400 uppercase">Цены</label><button onClick={() => setPricingThematicId(pricingThematicId === thematic.id ? null : thematic.id)} className="text-[10px] font-black text-blue-600 hover:underline uppercase">Настроить</button></div>
                                                        <div className="flex flex-wrap gap-2">{branches.filter(b => thematic.branchPrices?.[b.id]).map(b => (<div key={b.id} className="px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-xl text-[9px] font-black uppercase flex items-center gap-1"><MapPin size={10}/> {b.name}: {thematic.branchPrices[b.id]}с.</div>))}{Object.keys(thematic.branchPrices || {}).length === 0 && <span className="text-[10px] text-slate-300 italic px-1 font-bold uppercase tracking-widest opacity-50">Цены не заданы</span>}</div>
                                                    </div>
                                                </div>
                                                <div className="flex justify-end pt-4 border-t dark:border-slate-800"><button onClick={() => updateThematic(thematic.id, { id: 'DELETE' })} className="flex items-center gap-2 text-[10px] font-black text-rose-500 uppercase tracking-widest hover:bg-rose-50 px-4 py-2 rounded-xl transition-all"><Trash2 size={16}/> Удалить план</button></div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
                <footer className="p-6 border-t dark:border-slate-700 bg-white dark:bg-slate-900 flex justify-between items-center shrink-0">
                    {editingSubject.id ? <button onClick={() => { if(confirm('Удалить курс?')) setCourses(courses.filter(c => c.id !== editingSubject.id)); setIsSubjectModalOpen(false); }} className="text-rose-500 px-6 py-2 text-[10px] font-black uppercase tracking-widest transition-colors hover:bg-rose-50 rounded-xl">Удалить курс</button> : <div/>}
                    <div className="flex gap-4">
                        <button onClick={() => setIsSubjectModalOpen(false)} className="px-8 py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest transition-colors">Отмена</button>
                        <button onClick={handleSaveSubject} className="px-12 py-3 text-[10px] font-black text-white bg-blue-600 hover:bg-blue-700 rounded-2xl shadow-xl flex items-center gap-3 uppercase tracking-widest transition-all active:scale-95"><Save size={20} /> Сохранить</button>
                    </div>
                </footer>
            </div>
        </div>
      )}
    </div>
  );
};
