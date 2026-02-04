
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
  const isSuperUser = [UserRole.GeneralDirector, UserRole.Director, UserRole.Developer, UserRole.Admin].includes(user.role);

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
    
    // Принудительно устанавливаем 100, если балл не указан или равен 0
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
        subjectThematicIds: program.subjectThematicIds || {}
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
          // Auto-select first thematic if available
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

  const courseLmsTopics = useMemo(() => {
    if (!editingSubject?.id) return [];
    const courseSections = lmsSections.filter(s => s.subjectId === String(editingSubject.id));
    const sectionIds = courseSections.map(s => s.id);
    return lmsTopics.filter(t => sectionIds.includes(t.sectionId));
  }, [editingSubject?.id, lmsSections, lmsTopics]);

  const currentStudioLesson = lmsLessons.find(l => l.id === activeStudioLessonId);

  // Калькуляция цен для продукта
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
                            setEditingProgram({ name: '', description: '', subjectIds: [], subjectThematicIds: {}, color: 'blue' });
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
                <button 
                    onClick={() => setActiveMainTab('subjects')}
                    className={`py-3 text-xs font-bold border-b-4 transition-all flex items-center gap-2 ${activeMainTab === 'subjects' ? 'border-blue-600 text-blue-600 dark:text-blue-400' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                >
                    <BookOpen size={16}/> Курсы
                </button>
                <button 
                    onClick={() => setActiveMainTab('programs')}
                    className={`py-3 text-xs font-bold border-b-4 transition-all flex items-center gap-2 ${activeMainTab === 'programs' ? 'border-blue-600 text-blue-600 dark:text-blue-400' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                >
                    <Layers size={16}/> Продукты
                </button>
            </div>
            <div className="relative w-64 hidden sm:block mb-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input 
                    type="text" 
                    placeholder="Поиск..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 text-slate-900 outline-none focus:border-blue-500 transition-all h-[38px]"
                />
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
                                <div className={`p-4 rounded-xl border transition-transform group-hover:rotate-6 duration-300 ${COLORS.find(c => c.name === subject.color)?.class || COLORS[0].class}`}>
                                    <Icon size={24} />
                                </div>
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
                  return (
                      <div 
                        key={program.id} 
                        className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-xl transition-all cursor-pointer group flex flex-col p-6 overflow-hidden relative"
                        onClick={() => handleEditProgram(program)}
                      >
                          <div className={`absolute top-0 left-0 w-2 h-full ${programColor.class.split(' ')[1].replace('text-', 'bg-')}`}></div>
                          <div className="flex justify-between items-start mb-6">
                              <div>
                                  <h3 className="font-bold text-lg text-slate-900 dark:text-white tracking-tight uppercase leading-tight">{program.name}</h3>
                                  <p className="text-[10px] text-slate-400 font-black uppercase mt-1">Программный комплекс</p>
                              </div>
                              {isSuperUser && (
                                  <button 
                                    className="p-2.5 bg-slate-50 dark:bg-slate-700 rounded-xl text-slate-400 opacity-0 group-hover:opacity-100 transition-all"
                                    onClick={(e) => { e.stopPropagation(); handleEditProgram(program); }}
                                  >
                                      <Settings size={18}/>
                                  </button>
                              )}
                          </div>

                          <div className="flex-1 space-y-5">
                              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium line-clamp-2 leading-relaxed">
                                  {program.description || 'Нет описания для этого продукта.'}
                              </p>
                              
                              <div className="pt-4 border-t border-slate-100 dark:border-slate-700">
                                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block">Курсы в программе</label>
                                  <div className="flex flex-wrap gap-2.5">
                                      {program.subjectIds.map(sid => {
                                          const course = courses.find(c => c.id === sid);
                                          if (!course) return null;
                                          const Icon = ICON_MAP[course.icon || 'BookOpen'] || BookOpen;
                                          return (
                                              <div key={sid} className="relative group/tooltip">
                                                  <div className={`p-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 shadow-sm transition-transform hover:scale-110 active:scale-95 ${COLORS.find(c => c.name === course.color)?.class.split(' ')[1] || 'text-blue-500'}`}>
                                                      <Icon size={16}/>
                                                  </div>
                                                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 bg-slate-900 text-white text-[10px] font-bold uppercase rounded-lg opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-xl border border-white/10">
                                                      {course.name}
                                                      <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900"></div>
                                                  </div>
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

      {/* Program Modal */}
      {isProgramModalOpen && editingProgram && (
          <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="bg-white dark:bg-slate-800 rounded-[32px] shadow-2xl w-full max-w-4xl flex flex-col max-h-[90vh] border border-slate-100 dark:border-slate-700 overflow-hidden antialiased">
                  <header className="p-6 border-b dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/30 shrink-0">
                      <div className="flex items-center gap-4">
                          <div className="p-3.5 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-500/20">
                              <Layers size={24}/>
                          </div>
                          <h3 className="font-bold text-xl tracking-tight text-slate-800 dark:text-white uppercase">
                              {editingProgram.id ? 'Настройка продукта' : 'Новый продукт'}
                          </h3>
                      </div>
                      <button onClick={() => setIsProgramModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-900 transition-all"><X size={24}/></button>
                  </header>

                  <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
                      {/* Left: Configuration */}
                      <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar border-r dark:border-slate-700">
                          <div className="space-y-6">
                              <div>
                                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 ml-1 mb-2 uppercase">Название продукта</label>
                                  <input 
                                    type="text" 
                                    value={editingProgram.name || ''} 
                                    onChange={e => setEditingProgram({...editingProgram, name: e.target.value})} 
                                    className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold bg-slate-50 dark:bg-slate-900 outline-none focus:bg-white transition-all text-slate-800 dark:text-white uppercase" 
                                    placeholder="Напр. ПОДГОТОВКА К 5 КЛАСТЕРУ"
                                  />
                              </div>

                              <div className="grid grid-cols-1 gap-6">
                                  <div>
                                      <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 ml-1 mb-2 uppercase">Цветовая метка</label>
                                      <div className="grid grid-cols-8 gap-2 p-2 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800">
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
                                  <div>
                                      <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 ml-1 mb-2 uppercase">Описание</label>
                                      <textarea 
                                        value={editingProgram.description || ''} 
                                        onChange={e => setEditingProgram({...editingProgram, description: e.target.value})} 
                                        className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm bg-slate-50 dark:bg-slate-900 outline-none focus:bg-white transition-all h-[86px] resize-none font-medium" 
                                        placeholder="Краткое описание программы..."
                                      />
                                  </div>
                              </div>

                              <div className="pt-6 border-t dark:border-slate-700">
                                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 ml-1 mb-4 uppercase">Выбор курсов и тематических планов</label>
                                  <div className="space-y-3 pb-20">
                                      {courses.map(course => {
                                          const isSelected = editingProgram.subjectIds?.includes(course.id);
                                          const selectedThematicId = editingProgram.subjectThematicIds?.[course.id];
                                          const Icon = ICON_MAP[course.icon || 'BookOpen'] || BookOpen;
                                          const selectedThematic = course.thematics?.find(t => t.id === selectedThematicId);
                                          
                                          return (
                                              <div key={course.id} className={`p-4 rounded-2xl border-2 transition-all ${isSelected ? 'border-blue-500 bg-white dark:bg-slate-800 shadow-sm' : 'border-slate-50 dark:border-slate-900 bg-slate-50 dark:bg-slate-900 grayscale opacity-60 hover:opacity-100 hover:grayscale-0'}`}>
                                                  <div className="flex items-center gap-4 mb-3">
                                                      <button 
                                                        onClick={() => toggleSubjectInProgram(course.id)}
                                                        className={`p-2 rounded-xl transition-all ${isSelected ? 'bg-blue-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-400'}`}
                                                      >
                                                          <Icon size={18}/>
                                                      </button>
                                                      <div className="flex-1 min-w-0" onClick={() => toggleSubjectInProgram(course.id)}>
                                                          <p className="text-xs font-bold uppercase truncate">{course.name}</p>
                                                          <p className="text-[10px] text-slate-400 font-bold">Базовая цена: {course.price} с.</p>
                                                      </div>
                                                      <div onClick={() => toggleSubjectInProgram(course.id)} className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center cursor-pointer transition-all ${isSelected ? 'bg-blue-600 border-blue-600 shadow-sm' : 'border-slate-300'}`}>
                                                          {isSelected && <Check size={14} strokeWidth={4} className="text-white"/>}
                                                      </div>
                                                  </div>
                                                  
                                                  {isSelected && (
                                                      <div className="ml-12 space-y-2 animate-in slide-in-from-top-1 relative">
                                                          <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest">Тематический план:</label>
                                                          <div className="relative">
                                                              <button 
                                                                onClick={() => setOpenThematicSelectId(openThematicSelectId === course.id ? null : course.id)}
                                                                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-[11px] font-bold flex items-center justify-between transition-all hover:bg-white"
                                                              >
                                                                  <span className="truncate uppercase">{selectedThematic?.name || 'Планов нет (базовая цена)'}</span>
                                                                  <ChevronDown size={14} className={`text-slate-400 transition-transform ${openThematicSelectId === course.id ? 'rotate-180 text-blue-500' : ''}`} />
                                                              </button>
                                                              
                                                              {openThematicSelectId === course.id && (
                                                                  <div className="absolute top-full left-0 w-full mt-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl z-[200] p-1 animate-in fade-in zoom-in-95 duration-100">
                                                                      <div className="max-h-40 overflow-y-auto custom-scrollbar">
                                                                          {course.thematics?.map(t => (
                                                                              <button 
                                                                                key={t.id} 
                                                                                onClick={() => updateSubjectThematic(course.id, t.id)}
                                                                                className={`w-full text-left px-3 py-2 rounded-lg text-[10px] font-bold uppercase transition-all flex items-center justify-between ${selectedThematicId === t.id ? 'bg-blue-50 text-blue-600' : 'hover:bg-slate-50 text-slate-600'}`}
                                                                              >
                                                                                  <span className="truncate">{t.name}</span>
                                                                                  {selectedThematicId === t.id && <Check size={14} strokeWidth={4}/>}
                                                                              </button>
                                                                          ))}
                                                                          {(!course.thematics || course.thematics.length === 0) && (
                                                                              <div className="p-3 text-center text-[10px] font-bold text-slate-400 uppercase italic">Планов не найдено</div>
                                                                          )}
                                                                      </div>
                                                                  </div>
                                                              )}
                                                          </div>
                                                      </div>
                                                  )}
                                              </div>
                                          );
                                      })}
                                  </div>
                              </div>
                          </div>
                      </div>

                      {/* Right: Branch Pricing Summary */}
                      <div className="w-full md:w-80 bg-slate-50/50 dark:bg-slate-900/50 p-8 shrink-0 overflow-y-auto custom-scrollbar">
                          <div className="mb-6">
                              <h4 className="font-bold text-slate-800 dark:text-white text-sm uppercase flex items-center gap-2">
                                  <Coins size={18} className="text-amber-500"/> Итоговая цена
                              </h4>
                              <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Для разных филиалов</p>
                          </div>

                          <div className="space-y-3">
                              {programPricingPerBranch.map(({ branch, total }) => (
                                  <div key={branch.id} className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
                                      <div className="flex items-center gap-2 mb-2 text-slate-400">
                                          <MapPin size={12}/>
                                          <span className="text-[10px] font-bold uppercase truncate">{branch.name}</span>
                                      </div>
                                      <div className="flex justify-between items-baseline">
                                          <span className="text-2xl font-black text-slate-900 dark:text-white">{total}</span>
                                          <span className="text-[10px] font-bold text-slate-400 uppercase">сомони / мес</span>
                                      </div>
                                  </div>
                              ))}
                              {programPricingPerBranch.length === 0 && (
                                  <div className="text-center py-10 opacity-30 italic text-xs uppercase tracking-widest">
                                      Сначала добавьте филиалы
                                  </div>
                              )}
                          </div>
                      </div>
                  </div>

                  <footer className="p-6 border-t dark:border-slate-700 bg-white dark:bg-slate-900 flex justify-between items-center shrink-0">
                      {editingProgram.id ? (
                          <button onClick={() => { if(confirm('Удалить программу?')) setPrograms(programs.filter(p => p.id !== editingProgram.id)); setIsProgramModalOpen(false); }} className="text-rose-500 px-4 py-2 text-xs font-bold hover:bg-rose-50 rounded-xl transition-colors">Удалить продукт</button>
                      ) : <div/>}
                      <div className="flex gap-4">
                          <button onClick={() => setIsProgramModalOpen(false)} className="px-6 py-2 text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors">Отмена</button>
                          <button onClick={handleSaveProgram} className="px-10 py-3 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-2xl shadow-xl shadow-blue-500/20 transition-all active:scale-95 flex items-center gap-2"><Save size={18} /> Сохранить</button>
                      </div>
                  </footer>
              </div>
          </div>
      )}

      {/* LMS Studio Context (Full screen) */}
      {isLmsStudioOpen && studioSubject && (
          <div className="fixed inset-0 bg-gray-50 dark:bg-slate-950 z-[500] flex flex-col animate-in fade-in duration-300 antialiased overflow-hidden font-sans">
              <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-6 shrink-0 z-50">
                  <div className="flex items-center gap-6">
                      <button onClick={() => setIsLmsStudioOpen(false)} className="flex items-center gap-2 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-all group">
                          <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                          <span className="text-sm font-bold">Выход в CRM</span>
                      </button>
                      <div className="h-6 w-px bg-slate-200 dark:bg-slate-800"></div>
                      <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center border shadow-sm ${COLORS.find(c => c.name === studioSubject.color)?.class || COLORS[0].class}`}>
                              {(() => { const Icon = ICON_MAP[studioSubject.icon || 'BookOpen'] || BookOpen; return <Icon size={18}/> })()}
                          </div>
                          <div>
                              <h3 className="text-sm font-bold text-slate-800 dark:text-white tracking-tight leading-none uppercase">{studioSubject.name}</h3>
                              <p className="text-[10px] text-blue-500 font-bold mt-1">Студия контента</p>
                          </div>
                      </div>
                  </div>
                  <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-4 py-2 rounded-xl text-[10px] font-bold">
                          <Check size={14} strokeWidth={4}/> Автосохранение включено
                      </div>
                  </div>
              </header>

              <div className="flex-1 flex overflow-hidden">
                  <aside className="w-80 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col shrink-0 overflow-hidden">
                      <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                          <h4 className="text-xs font-bold text-slate-400">Структура курса</h4>
                          <button onClick={handleAddStudioSection} className="p-1.5 bg-blue-600 text-white rounded-lg shadow-lg shadow-blue-500/20 hover:scale-110 transition-all flex items-center justify-center"><Plus size={16}/></button>
                      </div>
                      <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-4 pb-20">
                          {lmsSections.filter(s => s.subjectId === String(studioSubject.id)).sort((a,b) => (a.order || 0) - (b.order || 0)).map((section, sIdx) => (
                              <div key={section.id} className="space-y-2">
                                  <div className="flex items-center justify-between group/sec px-3 py-1">
                                      <span className="text-xs font-bold text-slate-500 flex items-center gap-2 truncate tracking-tight">
                                          <span className="text-blue-500 opacity-50">#{sIdx + 1}</span> {section.title}
                                      </span>
                                      <div className="flex gap-1 opacity-0 group-hover/sec:opacity-100 transition-opacity">
                                          <button onClick={() => handleAddStudioTopic(section.id)} className="p-1 text-blue-500 hover:bg-blue-50 rounded-md" title="Добавить тему"><Plus size={14}/></button>
                                          <button onClick={() => { if(confirm('Удалить раздел?')) setLmsSections(lmsSections.filter(s => s.id !== section.id)); }} className="p-1 text-slate-300 hover:text-rose-500 rounded-md"><Trash2 size={14}/></button>
                                      </div>
                                  </div>
                                  <div className="space-y-1 ml-2 border-l-2 border-slate-100 dark:border-slate-800 pl-2">
                                      {lmsTopics.filter(t => t.sectionId === section.id).sort((a,b) => (a.order || 0) - (b.order || 0)).map(topic => {
                                          const topicLessons = lmsLessons.filter(l => l.topicId === topic.id).sort((a,b) => (a.order || 0) - (b.order || 0));
                                          return (
                                              <div key={topic.id} className="space-y-1">
                                                  <div className="flex items-center justify-between group/top px-3 py-2 bg-slate-50/50 dark:bg-slate-800/50 rounded-xl border border-transparent hover:border-slate-200 transition-all">
                                                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate tracking-tight">{topic.title}</span>
                                                      <div className="flex gap-1 opacity-0 group-hover/top:opacity-100 transition-opacity">
                                                          <button onClick={() => handleAddStudioLesson(topic.id)} className="p-1 text-blue-500" title="Добавить урок"><Plus size={14}/></button>
                                                          <button onClick={() => { if(confirm('Удалить тему?')) setLmsTopics(lmsTopics.filter(t => t.id !== topic.id)); }} className="p-1 text-slate-300 hover:text-rose-500"><Trash2 size={14}/></button>
                                                      </div>
                                                  </div>
                                                  <div className="space-y-1 mt-1 pl-2">
                                                      {topicLessons.map(lesson => (
                                                          <button 
                                                            key={lesson.id} 
                                                            onClick={() => setActiveStudioLessonId(lesson.id)}
                                                            className={`w-full flex items-center justify-between group/less px-3 py-2 rounded-xl text-left transition-all ${activeStudioLessonId === lesson.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'hover:bg-blue-50 text-slate-500'}`}
                                                          >
                                                              <div className="flex items-center gap-2 min-w-0">
                                                                  {lesson.videoUrl ? <Video size={12}/> : <FileText size={12}/>}
                                                                  <span className="text-xs font-bold truncate tracking-tight">{lesson.title}</span>
                                                              </div>
                                                          </button>
                                                      ))}
                                                  </div>
                                              </div>
                                          );
                                      })}
                                  </div>
                              </div>
                          ))}
                      </div>
                  </aside>

                  <main className="flex-1 bg-gray-50 dark:bg-slate-950 overflow-y-auto custom-scrollbar p-10 flex flex-col items-center">
                      {currentStudioLesson ? (
                          <div className="w-full max-w-4xl animate-in slide-in-from-bottom-4 duration-500">
                              <div className="flex flex-col sm:flex-row items-center justify-between mb-10 gap-6">
                                  <div className="min-w-0 w-full">
                                      <div className="flex items-center gap-2 text-[11px] font-bold text-blue-500 mb-2">
                                          {lmsSections.find(s => s.id === lmsTopics.find(t => t.id === currentStudioLesson.topicId)?.sectionId)?.title}
                                          <ChevronRight size={12}/>
                                          {lmsTopics.find(t => t.id === currentStudioLesson.topicId)?.title}
                                      </div>
                                      <input 
                                        className="text-3xl font-bold bg-transparent border-none outline-none text-slate-900 dark:text-white tracking-tight w-full"
                                        value={currentStudioLesson.title}
                                        onChange={e => updateStudioLesson(currentStudioLesson.id, { title: e.target.value })}
                                      />
                                  </div>
                              </div>

                              <div className="bg-white dark:bg-slate-900 rounded-[32px] shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col min-h-[600px]">
                                  <div className="flex border-b border-slate-100 dark:border-slate-800 px-8 gap-10 bg-slate-50/50 dark:bg-slate-900/50">
                                      {[
                                          { id: 'content', label: 'Текст урока', icon: FileText },
                                          { id: 'video', label: 'Видео', icon: Video },
                                          { id: 'quiz', label: 'Тест', icon: Award }
                                      ].map(tab => (
                                          <button 
                                            key={tab.id} 
                                            onClick={() => setStudioActiveTab(tab.id as any)}
                                            className={`py-5 text-xs font-bold border-b-4 transition-all flex items-center gap-2.5 ${studioActiveTab === tab.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                                          >
                                              <tab.icon size={16}/> {tab.label}
                                          </button>
                                      ))}
                                  </div>

                                  <div className="p-10 flex-1">
                                      {studioActiveTab === 'content' && (
                                          <div className="space-y-6 animate-in fade-in duration-300">
                                              <textarea 
                                                className="w-full min-h-[500px] bg-transparent text-lg font-medium text-slate-700 dark:text-slate-300 outline-none resize-none leading-relaxed custom-scrollbar"
                                                placeholder="Введите содержание урока..."
                                                value={currentStudioLesson.contentText}
                                                onChange={e => updateStudioLesson(currentStudioLesson.id, { contentText: e.target.value })}
                                              />
                                          </div>
                                      )}

                                      {studioActiveTab === 'video' && (
                                          <div className="space-y-8 animate-in slide-in-from-top-4 duration-300">
                                              <div className="space-y-2">
                                                  <label className="text-xs font-bold text-slate-400 ml-1">Ссылка на видео (YouTube Embed)</label>
                                                  <input 
                                                    type="text" 
                                                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 rounded-2xl p-4 font-mono text-sm focus:ring-4 focus:ring-blue-500/10 outline-none"
                                                    placeholder="https://www.youtube.com/embed/..."
                                                    value={currentStudioLesson.videoUrl || ''}
                                                    onChange={e => updateStudioLesson(currentStudioLesson.id, { videoUrl: e.target.value })}
                                                  />
                                              </div>
                                              {currentStudioLesson.videoUrl && (
                                                  <div className="aspect-video bg-black rounded-3xl overflow-hidden shadow-2xl">
                                                      <iframe src={currentStudioLesson.videoUrl} className="w-full h-full border-none" allowFullScreen title="Preview"></iframe>
                                                  </div>
                                              )}
                                          </div>
                                      )}

                                      {studioActiveTab === 'quiz' && (
                                          <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-300">
                                              <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-900 p-5 rounded-3xl border border-slate-100 dark:border-slate-800">
                                                  <h4 className="font-bold text-slate-800 dark:text-white">Контрольные вопросы</h4>
                                                  <button 
                                                    onClick={() => {
                                                        const newQ: QuizQuestion = { id: `q_${Date.now()}`, text: 'Новый вопрос', options: ['Вариант 1', 'Вариант 2'], correctIndex: 0 };
                                                        updateStudioLesson(currentStudioLesson.id, { quiz: [...(currentStudioLesson.quiz || []), newQ] });
                                                    }}
                                                    className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-500/20 active:scale-95 transition-all flex items-center gap-2"
                                                  >
                                                      <Plus size={14} /> Добавить вопрос
                                                  </button>
                                              </div>

                                              <div className="space-y-4">
                                                  {currentStudioLesson.quiz?.map((q, qIdx) => (
                                                      <div key={q.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-3xl p-6 shadow-sm relative group/q">
                                                          <button 
                                                            onClick={() => updateStudioLesson(currentStudioLesson.id, { quiz: currentStudioLesson.quiz?.filter(item => item.id !== q.id) })}
                                                            className="absolute top-4 right-4 p-2 text-slate-300 hover:text-rose-500 transition-all opacity-0 group-hover/q:opacity-100"
                                                          >
                                                              <Trash2 size={18}/>
                                                          </button>
                                                          <div className="mb-6">
                                                              <label className="text-[10px] font-bold text-blue-500 mb-2 block">Вопрос #{qIdx + 1}</label>
                                                              <input 
                                                                className="w-full bg-transparent border-b-2 border-slate-100 dark:border-slate-800 font-bold text-lg outline-none pb-2 focus:border-blue-500 transition-all dark:text-white"
                                                                value={q.text}
                                                                onChange={e => {
                                                                    const updated = currentStudioLesson.quiz!.map(item => item.id === q.id ? { ...item, text: e.target.value } : item);
                                                                    updateStudioLesson(currentStudioLesson.id, { quiz: updated });
                                                                }}
                                                              />
                                                          </div>
                                                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                              {q.options.map((opt, oIdx) => (
                                                                  <div key={oIdx} className="flex items-center gap-3 bg-slate-50 dark:bg-slate-950 p-3 rounded-2xl border-2 border-transparent transition-all hover:border-slate-200">
                                                                      <button 
                                                                        onClick={() => {
                                                                            const updated = currentStudioLesson.quiz!.map(item => item.id === q.id ? { ...item, correctIndex: oIdx } : item);
                                                                            updateStudioLesson(currentStudioLesson.id, { quiz: updated });
                                                                        }}
                                                                        className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 transition-all ${q.correctIndex === oIdx ? 'bg-emerald-50 border-emerald-500 text-white shadow-lg' : 'bg-white dark:bg-slate-800 border-slate-200'}`}
                                                                      >
                                                                          {q.correctIndex === oIdx && <Check size={14} strokeWidth={4}/>}
                                                                      </button>
                                                                      <input 
                                                                        className="flex-1 bg-transparent text-sm font-bold outline-none dark:text-slate-300"
                                                                        value={opt}
                                                                        onChange={e => {
                                                                            const newOpts = [...q.options];
                                                                            newOpts[oIdx] = e.target.value;
                                                                            const updated = currentStudioLesson.quiz!.map(item => item.id === q.id ? { ...item, options: newOpts } : item);
                                                                            updateStudioLesson(currentStudioLesson.id, { quiz: updated });
                                                                        }}
                                                                      />
                                                                  </div>
                                                              ))}
                                                          </div>
                                                      </div>
                                                  ))}
                                              </div>
                                          </div>
                                      )}
                                  </div>
                              </div>
                          </div>
                      ) : (
                          <div className="h-full flex flex-col items-center justify-center text-slate-300 py-32">
                              <Layout size={64} strokeWidth={1} className="mb-4 opacity-20" />
                              <h5 className="text-sm font-bold text-slate-400">Выберите урок для редактирования</h5>
                          </div>
                      )}
                  </main>
              </div>
          </div>
      )}

      {/* Subject Modal */}
      {isSubjectModalOpen && editingSubject && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-800 rounded-[32px] shadow-2xl w-full max-w-3xl flex flex-col max-h-[90vh] border border-slate-100 dark:border-slate-700 overflow-hidden antialiased">
                <header className="p-6 border-b dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/30 shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="p-3.5 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-500/20">
                            <BookOpen size={24}/>
                        </div>
                        <h3 className="font-bold text-xl tracking-tight text-slate-800 dark:text-white uppercase">
                            {editingSubject.id ? 'Настройка курса' : 'Новый курс'}
                        </h3>
                    </div>
                    <button onClick={() => setIsSubjectModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-900 transition-all"><X size={24}/></button>
                </header>

                <div className="px-8 border-b dark:border-slate-700 flex gap-8 bg-white dark:bg-slate-800 shrink-0">
                    <button onClick={() => setActiveSubjectTab('general')} className={`py-4 text-xs font-bold border-b-4 transition-all flex items-center gap-2 ${activeSubjectTab === 'general' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}><Settings size={16}/> Общее</button>
                    <button onClick={() => setActiveSubjectTab('thematics')} className={`py-4 text-xs font-bold border-b-4 transition-all flex items-center gap-2 ${activeSubjectTab === 'thematics' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}><ClipboardList size={16}/> Тематические планы ({editingSubject.thematics?.length || 0})</button>
                </div>

                <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar bg-slate-50/20 dark:bg-slate-900/10">
                    {activeSubjectTab === 'general' && (
                        <div className="space-y-8 animate-in fade-in duration-300">
                            <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
                                <div className="sm:col-span-3 space-y-2">
                                    <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 ml-1">Название курса</label>
                                    <input type="text" value={editingSubject.name || ''} onChange={e => setEditingSubject({...editingSubject, name: e.target.value})} className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold bg-white dark:bg-slate-900 outline-none focus:border-blue-500 transition-all text-slate-800 dark:text-white tracking-tight uppercase" placeholder="Напр. МАТЕМАТИКА"/>
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 ml-1">Макс. балл</label>
                                    <input 
                                        type="number" 
                                        value={editingSubject.maxExamScore ?? ''} 
                                        onChange={e => setEditingSubject({...editingSubject, maxExamScore: e.target.value === '' ? undefined : Number(e.target.value)})} 
                                        className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold bg-white dark:bg-slate-900 outline-none focus:border-blue-500 text-center"
                                        placeholder="100"
                                    />
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 ml-1 mb-2">Иконка курса</label>
                                    <div className="grid grid-cols-6 gap-2 p-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-inner">
                                        {Object.keys(ICON_MAP).map(key => {
                                            const IconComp = ICON_MAP[key];
                                            return (
                                                <button 
                                                    key={key} 
                                                    onClick={() => setEditingSubject({...editingSubject, icon: key})}
                                                    className={`p-2 rounded-xl flex items-center justify-center transition-all ${editingSubject.icon === key ? 'bg-blue-600 text-white shadow-lg scale-110' : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-400'}`}
                                                >
                                                    <IconComp size={18}/>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 ml-1 mb-2">Цветовая схема</label>
                                    <div className="grid grid-cols-4 gap-2 p-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-inner">
                                        {COLORS.map(c => (
                                            <button 
                                                key={c.name}
                                                onClick={() => setEditingSubject({...editingSubject, color: c.name})}
                                                className={`w-full aspect-square rounded-xl border-2 transition-all ${editingSubject.color === c.name ? 'border-blue-500 scale-110 shadow-md' : 'border-transparent'}`}
                                                style={{ backgroundColor: c.color }}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 ml-1 mb-2">Описание курса</label>
                                <textarea value={editingSubject.description || ''} onChange={e => setEditingSubject({...editingSubject, description: e.target.value})} className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm bg-white dark:bg-slate-900 outline-none focus:border-blue-500 transition-all h-24 resize-none font-medium text-slate-600 dark:text-slate-400" placeholder="Краткая информация о предмете..."></textarea>
                            </div>
                        </div>
                    )}

                    {activeSubjectTab === 'thematics' && (
                        <div className="space-y-6 animate-in fade-in duration-300">
                             <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
                                <div>
                                    <h4 className="font-bold text-slate-800 dark:text-white text-sm tracking-tight uppercase">Тематические планы</h4>
                                    <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase">Темы занятий и филиалы</p>
                                </div>
                                <button onClick={() => {
                                    const newThematic: CourseThematic = { id: `them_${Date.now()}`, name: 'Новый план', topicIds: [], branchPrices: {} };
                                    setEditingSubject(prev => ({ ...prev, thematics: [...(prev?.thematics || []), newThematic] }));
                                    setExpandedThematicId(newThematic.id);
                                }} className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-lg shadow-blue-500/10 transition-all active:scale-95 uppercase tracking-widest"><Plus size={16} strokeWidth={3}/> Создать план</button>
                            </div>

                            <div className="space-y-4">
                                {editingSubject.thematics?.map((thematic) => (
                                    <div key={thematic.id} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl overflow-hidden shadow-sm transition-all hover:border-blue-200">
                                        <div className={`p-4 px-6 flex items-center justify-between cursor-pointer transition-colors ${expandedThematicId === thematic.id ? 'bg-slate-50/50 dark:bg-slate-800 border-b dark:border-slate-700' : ''}`} onClick={() => setExpandedThematicId(expandedThematicId === thematic.id ? null : thematic.id)}>
                                            <div className="flex items-center gap-4">
                                                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center border shadow-sm transition-all ${expandedThematicId === thematic.id ? 'bg-blue-600 text-white border-blue-600 scale-110 shadow-blue-500/20' : 'bg-slate-50 text-slate-300 dark:bg-slate-950 dark:border-slate-800'}`}><PackageCheck size={20}/></div>
                                                <div>
                                                    <span className="text-sm font-bold text-slate-800 dark:text-white truncate block tracking-tight uppercase">{thematic.name}</span>
                                                    <span className="text-[9px] text-slate-400 font-bold leading-none uppercase">{thematic.topicIds?.length || 0} тем включено</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <button onClick={(e) => { e.stopPropagation(); if(confirm('Удалить план?')) updateThematic(thematic.id, { id: 'DELETE' }); }} className="p-2 text-slate-300 hover:text-rose-500 transition-all hover:bg-rose-50 rounded-xl"><Trash2 size={18}/></button>
                                                <ChevronDown size={22} className={`text-slate-300 transition-transform duration-300 ${expandedThematicId === thematic.id ? 'rotate-180 text-blue-500' : ''}`}/>
                                            </div>
                                        </div>
                                        {expandedThematicId === thematic.id && (
                                            <div className="p-6 space-y-6 animate-in slide-in-from-top-2 duration-300 bg-white dark:bg-slate-900">
                                                <div className="flex flex-col sm:flex-row gap-6 items-end">
                                                    <div className="flex-1 w-full space-y-2">
                                                        <label className="block text-[11px] font-bold text-slate-400 dark:text-slate-500 ml-1 uppercase">Название плана</label>
                                                        <input type="text" value={thematic.name} onChange={e => updateThematic(thematic.id, { name: e.target.value })} className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm font-bold bg-slate-50 dark:bg-slate-950 outline-none focus:border-blue-500 transition-all tracking-tight shadow-inner uppercase"/>
                                                    </div>
                                                    <button onClick={() => setPricingThematicId(thematic.id)} className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl font-bold text-xs flex items-center gap-2 shadow-lg shadow-amber-500/10 active:scale-95 h-[46px] transition-all uppercase tracking-widest"><Coins size={18}/> Цены филиалов</button>
                                                </div>
                                                
                                                <div className="space-y-3">
                                                    <label className="block text-[11px] font-bold text-slate-400 dark:text-slate-500 ml-1 uppercase">Темы для этого плана</label>
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-2 p-1 bg-slate-50/50 dark:bg-slate-900/50 rounded-2xl shadow-inner border border-slate-100 dark:border-slate-800">
                                                        {courseLmsTopics.map(topic => {
                                                            const isSelected = thematic.topicIds?.includes(topic.id);
                                                            return (
                                                                <button
                                                                    key={topic.id}
                                                                    onClick={() => {
                                                                        const current = thematic.topicIds || [];
                                                                        const next = isSelected ? current.filter(id => id !== topic.id) : [...current, topic.id];
                                                                        updateThematic(thematic.id, { topicIds: next });
                                                                    }}
                                                                    className={`flex items-center justify-between p-3 rounded-2xl border-2 transition-all text-left ${isSelected ? 'bg-blue-50 border-blue-500 dark:bg-blue-900/20 shadow-sm' : 'bg-white dark:bg-slate-800 border-transparent dark:border-slate-700 hover:border-slate-200'}`}
                                                                >
                                                                    <div className="flex items-center gap-3">
                                                                        <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${isSelected ? 'bg-blue-600 border-blue-600' : 'bg-white dark:bg-slate-800 border-slate-200'}`}>{isSelected && <Check size={12} strokeWidth={4} className="text-white"/>}</div>
                                                                        <span className={`text-xs font-bold truncate tracking-tight ${isSelected ? 'text-blue-700 dark:text-blue-300' : 'text-slate-700 dark:text-slate-300'}`}>{topic.title}</span>
                                                                    </div>
                                                                </button>
                                                            );
                                                        })}
                                                        {courseLmsTopics.length === 0 && <div className="col-span-full py-10 text-center text-slate-400 italic text-xs border-2 border-dashed rounded-3xl uppercase">Сначала создайте темы в «Студии контента»</div>}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <footer className="p-6 border-t dark:border-slate-700 bg-white dark:bg-slate-900 flex justify-between items-center shrink-0">
                    <button onClick={() => { if(confirm('Удалить курс?')) setCourses(courses.filter(c => c.id !== editingSubject.id)); setIsSubjectModalOpen(false); }} className="text-rose-500 px-4 py-2 text-xs font-bold hover:bg-rose-50 rounded-xl transition-colors uppercase">Удалить курс</button>
                    <div className="flex gap-4">
                        <button onClick={() => setIsSubjectModalOpen(false)} className="px-6 py-2 text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors uppercase">Отмена</button>
                        <button onClick={handleSaveSubject} className="px-10 py-3 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-2xl shadow-xl shadow-blue-500/20 transition-all active:scale-95 flex items-center gap-2 uppercase tracking-widest"><Save size={18} /> Сохранить</button>
                    </div>
                </footer>
            </div>
        </div>
      )}

      {/* Pricing Context Modal (Popup) */}
      {pricingThematicId && (
          <div className="fixed inset-0 bg-black/80 z-[1000] flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-200">
              <div className="bg-white dark:bg-slate-800 rounded-[32px] shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100 dark:border-slate-700">
                  <header className="p-6 border-b dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/30">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/40 rounded-xl flex items-center justify-center text-amber-600"><Coins size={20}/></div>
                        <h3 className="text-lg font-bold text-slate-800 dark:text-white leading-none tracking-tight uppercase">Цены филиалов</h3>
                      </div>
                      <button onClick={() => setPricingThematicId(null)} className="p-1.5 hover:bg-slate-100 rounded-full text-slate-300 transition-all"><X size={24}/></button>
                  </header>
                  <div className="p-6 space-y-3 max-h-[60vh] overflow-y-auto custom-scrollbar bg-slate-50/20 dark:bg-slate-900/10">
                      {branches.filter(b => b.isActive).map(branch => {
                          const thematic = editingSubject?.thematics?.find(t => t.id === pricingThematicId);
                          return (
                            <div key={branch.id} className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 flex items-center justify-between shadow-sm transition-all hover:border-amber-400 group">
                                <div className="flex items-center gap-3">
                                    <MapPin size={14} className="text-slate-300 group-hover:text-blue-500 transition-colors"/>
                                    <span className="text-xs font-bold text-slate-700 dark:text-white leading-tight tracking-tight uppercase">{branch.name}</span>
                                </div>
                                <div className="relative w-32 shrink-0">
                                    <input 
                                        type="number" 
                                        value={thematic?.branchPrices?.[branch.id] || ''} 
                                        onChange={e => {
                                            if (thematic) {
                                                updateThematic(thematic.id, { branchPrices: { ...thematic.branchPrices, [branch.id]: Number(e.target.value) } });
                                            }
                                        }} 
                                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm font-bold text-right pr-8 outline-none focus:border-amber-500 shadow-inner" 
                                        placeholder="0"
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">с.</span>
                                </div>
                            </div>
                          );
                      })}
                  </div>
                  <footer className="p-6 border-t dark:border-slate-700 flex justify-center bg-white dark:bg-slate-800">
                      <button onClick={() => setPricingThematicId(null)} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl font-bold text-xs shadow-xl active:scale-95 transition-all uppercase tracking-widest">Подтвердить изменения</button>
                  </footer>
              </div>
          </div>
      )}
    </div>
  );
};
