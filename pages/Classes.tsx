
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { storage, StorageKeys } from '../services/storage';
import { useData } from '../hooks/useData';
import { 
    Course, LearningSection, LearningTopic, LearningLesson, QuizQuestion, 
    StudentProgress, UserRole, UserProfile 
} from '../types';
import { 
    BookOpen, Video, FileText, CheckCircle, Plus, 
    ChevronRight, List, Award, ArrowLeft, Atom, FlaskConical, Dna, 
    Calculator, Globe, Scroll, Gavel, Code, Music, Dumbbell, Palette,
    PlayCircle, Layout, X, Layers, Check, Circle, ExternalLink, ChevronDown,
    Settings, Edit3, Trash2, Save, MoveUp, MoveDown, HelpCircle,
    Bold, Italic, Underline, List as ListIcon, Heading3, AlignLeft, AlignCenter, AlignRight
} from 'lucide-react';

// --- Icons & Colors Mapping ---
const ICON_MAP: Record<string, React.ElementType> = {
    'Calculator': Calculator, 'FlaskConical': FlaskConical, 'Atom': Atom, 'Dna': Dna,
    'Globe': Globe, 'Scroll': Scroll, 'Gavel': Gavel, 'Code': Code,
    'Music': Music, 'Dumbbell': Dumbbell, 'Palette': Palette, 'BookOpen': BookOpen,
    'Layers': Layers, 'Video': Video
};

const COLOR_MAP: Record<string, string> = {
    blue: 'text-blue-600 bg-blue-50 border-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800',
    emerald: 'text-emerald-600 bg-emerald-50 border-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800',
    purple: 'text-purple-600 bg-purple-50 border-purple-100 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800',
    amber: 'text-amber-600 bg-amber-50 border-amber-100 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800',
    rose: 'text-rose-600 bg-rose-50 border-rose-100 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-800',
    cyan: 'text-cyan-600 bg-cyan-50 border-cyan-100 dark:bg-cyan-900/30 dark:text-cyan-400 dark:border-cyan-800',
    indigo: 'text-indigo-600 bg-indigo-50 border-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-400 dark:border-indigo-800',
    slate: 'text-slate-600 bg-slate-50 border-slate-100 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600',
};

// --- Internal Lesson Editor ---
const LessonEditorModal = ({ 
    lesson, 
    onClose, 
    onSave 
}: { 
    lesson: Partial<LearningLesson>, 
    onClose: () => void, 
    onSave: (l: LearningLesson) => void 
}) => {
    const [editData, setEditData] = useState<Partial<LearningLesson>>({...lesson});
    const editorRef = useRef<HTMLDivElement>(null);
    const initialContentSet = useRef(false);

    // Установка начального контента один раз (чтобы не ломать Undo stack)
    useEffect(() => {
        if (editorRef.current && !initialContentSet.current) {
            editorRef.current.innerHTML = editData.contentText || '';
            initialContentSet.current = true;
        }
    }, [editData.contentText]);

    // Команда для форматирования
    const execCommand = (command: string, value: string | undefined = undefined) => {
        document.execCommand(command, false, value);
    };

    // Обработка горячих клавиш
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.ctrlKey || e.metaKey) {
            switch (e.key.toLowerCase()) {
                case 'b': e.preventDefault(); execCommand('bold'); break;
                case 'i': e.preventDefault(); execCommand('italic'); break;
                case 'u': e.preventDefault(); execCommand('underline'); break;
            }
        }
    };

    const addQuestion = () => {
        const newQ: QuizQuestion = { id: Date.now().toString(), text: '', options: ['Вариант 1', 'Вариант 2'], correctIndex: 0 };
        setEditData(prev => ({ ...prev, quiz: [...(prev.quiz || []), newQ] }));
    };

    const updateQuestion = (qid: string, updates: Partial<QuizQuestion>) => {
        setEditData(prev => ({
            ...prev,
            quiz: prev.quiz?.map(q => q.id === qid ? { ...q, ...updates } : q)
        }));
    };

    const removeQuestion = (qid: string) => {
        setEditData(prev => ({ ...prev, quiz: prev.quiz?.filter(q => q.id !== qid) }));
    };

    const handleSave = () => {
        const finalContent = editorRef.current?.innerHTML || '';
        onSave({
            ...editData,
            contentText: finalContent,
            id: editData.id || Date.now().toString()
        } as LearningLesson);
    };

    return (
        <div className="fixed inset-0 bg-black/80 z-[200] flex items-center justify-center p-4 backdrop-blur-md">
            <div className="bg-white dark:bg-slate-800 w-full max-w-4xl h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-100 dark:border-slate-700">
                <header className="p-5 border-b dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/30">
                    <div>
                        <h3 className="text-lg font-bold uppercase tracking-tight">Редактор урока</h3>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{lesson.id ? 'Изменение контента' : 'Новый контент'}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors"><X size={20}/></button>
                </header>

                <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                    {/* Basic Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Название урока</label>
                            <input 
                                type="text" 
                                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                                value={editData.title || ''}
                                onChange={e => setEditData({...editData, title: e.target.value})}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Порядок</label>
                            <input 
                                type="number" 
                                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-sm font-bold outline-none"
                                value={editData.order || 1}
                                onChange={e => setEditData({...editData, order: Number(e.target.value)})}
                            />
                        </div>
                    </div>

                    {/* Resources */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest flex items-center gap-2"><Video size={12}/> Видео URL (Embed)</label>
                            <input 
                                type="text" 
                                placeholder="https://www.youtube.com/embed/..."
                                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs outline-none"
                                value={editData.videoUrl || ''}
                                onChange={e => setEditData({...editData, videoUrl: e.target.value})}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest flex items-center gap-2"><Layout size={12}/> Презентация (PDF)</label>
                            <input 
                                type="text" 
                                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs outline-none"
                                value={editData.slidesUrl || ''}
                                onChange={e => setEditData({...editData, slidesUrl: e.target.value})}
                            />
                        </div>
                    </div>

                    {/* Theory Rich Editor */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest flex items-center gap-2"><FileText size={12}/> Теоретический материал (поддержка Ctrl+B, I, U, Z)</label>
                        
                        {/* Toolbar */}
                        <div className="flex flex-wrap items-center gap-1 p-2 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-t-2xl border-b-0 sticky top-0 z-10">
                            <button onClick={() => execCommand('bold')} className="p-2 hover:bg-white dark:hover:bg-slate-800 rounded-lg transition-all text-slate-700 dark:text-slate-200" title="Жирный (Ctrl+B)"><Bold size={16}/></button>
                            <button onClick={() => execCommand('italic')} className="p-2 hover:bg-white dark:hover:bg-slate-800 rounded-lg transition-all text-slate-700 dark:text-slate-200" title="Курсив (Ctrl+I)"><Italic size={16}/></button>
                            <button onClick={() => execCommand('underline')} className="p-2 hover:bg-white dark:hover:bg-slate-800 rounded-lg transition-all text-slate-700 dark:text-slate-200" title="Подчеркнутый (Ctrl+U)"><Underline size={16}/></button>
                            <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1" />
                            <button onClick={() => execCommand('formatBlock', '<h3>')} className="p-2 hover:bg-white dark:hover:bg-slate-800 rounded-lg transition-all text-slate-700 dark:text-slate-200" title="Заголовок"><Heading3 size={16}/></button>
                            <button onClick={() => execCommand('insertUnorderedList')} className="p-2 hover:bg-white dark:hover:bg-slate-800 rounded-lg transition-all text-slate-700 dark:text-slate-200" title="Список"><ListIcon size={16}/></button>
                            <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1" />
                            <button onClick={() => execCommand('justifyLeft')} className="p-2 hover:bg-white dark:hover:bg-slate-800 rounded-lg transition-all text-slate-700 dark:text-slate-200" title="По левому краю"><AlignLeft size={16}/></button>
                            <button onClick={() => execCommand('justifyCenter')} className="p-2 hover:bg-white dark:hover:bg-slate-800 rounded-lg transition-all text-slate-700 dark:text-slate-200" title="По центру"><AlignCenter size={16}/></button>
                            <button onClick={() => execCommand('justifyRight')} className="p-2 hover:bg-white dark:hover:bg-slate-800 rounded-lg transition-all text-slate-700 dark:text-slate-200" title="По правому краю"><AlignRight size={16}/></button>
                            <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1" />
                            <button onClick={() => execCommand('removeFormat')} className="p-2 hover:bg-white dark:hover:bg-slate-800 rounded-lg transition-all text-red-500" title="Очистить формат"><X size={16}/></button>
                        </div>

                        {/* ContentEditable Area */}
                        <div 
                            ref={editorRef}
                            contentEditable
                            onKeyDown={handleKeyDown}
                            className="w-full min-h-[400px] bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-b-2xl p-6 text-sm font-medium focus:border-blue-500 outline-none overflow-y-auto leading-relaxed prose prose-sm dark:prose-invert max-w-none shadow-inner"
                        />
                    </div>

                    {/* Quiz Editor */}
                    <div className="space-y-4 border-t pt-6 dark:border-slate-700">
                        <div className="flex justify-between items-center">
                            <h4 className="text-xs font-bold uppercase tracking-widest text-slate-700 dark:text-slate-300">Тестирование</h4>
                            <button onClick={addQuestion} className="text-[10px] bg-blue-600 text-white px-3 py-1.5 rounded-lg font-bold flex items-center gap-2 hover:bg-blue-700 transition-all"><Plus size={12}/> Добавить вопрос</button>
                        </div>
                        
                        <div className="space-y-4">
                            {editData.quiz?.map((q, idx) => (
                                <div key={q.id} className="bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 relative group/q">
                                    <button onClick={() => removeQuestion(q.id)} className="absolute top-3 right-3 text-slate-300 hover:text-red-500 p-1.5 opacity-0 group-hover/q:opacity-100 transition-all"><Trash2 size={16}/></button>
                                    <div className="mb-3">
                                        <label className="text-[8px] font-bold text-blue-500 uppercase">Вопрос {idx + 1}</label>
                                        <input 
                                            className="w-full bg-transparent border-b border-slate-200 dark:border-slate-700 font-bold text-sm outline-none py-1 dark:text-white"
                                            value={q.text}
                                            onChange={e => updateQuestion(q.id, { text: e.target.value })}
                                            placeholder="Введите вопрос..."
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        {q.options.map((opt, oIdx) => (
                                            <div key={oIdx} className="flex items-center gap-2">
                                                <button 
                                                    onClick={() => updateQuestion(q.id, { correctIndex: oIdx })}
                                                    className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${q.correctIndex === oIdx ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600'}`}
                                                >
                                                    {q.correctIndex === oIdx && <Check size={12} strokeWidth={4}/>}
                                                </button>
                                                <input 
                                                    className="flex-1 bg-transparent text-xs border-b border-transparent focus:border-slate-200 outline-none py-0.5"
                                                    value={opt}
                                                    onChange={e => {
                                                        const n = [...q.options];
                                                        n[oIdx] = e.target.value;
                                                        updateQuestion(q.id, { options: n });
                                                    }}
                                                />
                                                <button onClick={() => { const n = q.options.filter((_, i) => i !== oIdx); updateQuestion(q.id, { options: n, correctIndex: 0 }); }} className="text-slate-300 hover:text-red-500 transition-colors"><X size={12}/></button>
                                            </div>
                                        ))}
                                        <button onClick={() => updateQuestion(q.id, { options: [...q.options, `Вариант ${q.options.length + 1}`] })} className="text-[9px] font-bold text-blue-600 uppercase hover:underline ml-7">+ Вариант ответа</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <footer className="p-4 border-t dark:border-slate-700 bg-slate-50 dark:bg-slate-900 flex justify-end gap-3">
                    <button onClick={onClose} className="px-5 py-2 text-xs font-bold text-slate-500 uppercase tracking-widest">Отмена</button>
                    <button onClick={handleSave} className="bg-blue-600 text-white px-8 py-2 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-blue-500/20 active:scale-95 transition-all text-xs uppercase tracking-widest"><Save size={14}/> Сохранить</button>
                </footer>
            </div>
        </div>
    );
};

// --- Main Quiz Implementation ---
const QuizInterface = ({ quiz, onComplete, isReadOnly = false }: { quiz: QuizQuestion[], onComplete: (score: number) => void, isReadOnly?: boolean }) => {
    const [answers, setAnswers] = useState<Record<string, number>>({});
    const [showResults, setShowResults] = useState(false);

    const handleSubmit = () => {
        let correctCount = 0;
        quiz.forEach(q => { if (answers[q.id] === q.correctIndex) correctCount++; });
        const score = Math.round((correctCount / quiz.length) * 100);
        setShowResults(true);
        onComplete(score);
    };

    return (
        <div className="space-y-4 max-w-xl mx-auto py-6">
            {quiz.map((q, idx) => {
                const isCorrect = answers[q.id] === q.correctIndex;
                return (
                    <div key={q.id} className={`p-5 rounded-2xl border-2 transition-all ${showResults ? (isCorrect ? 'border-emerald-200 bg-emerald-50 dark:bg-emerald-900/10' : 'border-red-200 bg-red-50 dark:bg-red-900/10') : 'border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm'}`}>
                        <p className="font-bold text-slate-800 dark:text-white mb-4 text-base tracking-tight leading-snug">
                           <span className="text-blue-500 mr-1.5 opacity-50">#{idx + 1}</span> {q.text}
                        </p>
                        <div className="space-y-1.5">
                            {q.options.map((opt, optIdx) => (
                                <button
                                    key={optIdx}
                                    disabled={showResults || isReadOnly}
                                    onClick={() => setAnswers({...answers, [q.id]: optIdx})}
                                    className={`w-full text-left p-3 rounded-xl border-2 transition-all font-bold text-xs ${
                                        answers[q.id] === optIdx 
                                        ? 'border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' 
                                        : 'border-slate-50 dark:border-slate-700 hover:border-blue-200 hover:bg-slate-50'
                                    } ${showResults && q.correctIndex === optIdx ? '!border-emerald-500 !bg-emerald-100 dark:!bg-emerald-900/30' : ''}`}
                                >
                                    {opt}
                                </button>
                            ))}
                        </div>
                    </div>
                );
            })}
            
            {!showResults && !isReadOnly && (
                <button 
                    onClick={handleSubmit}
                    disabled={Object.keys(answers).length !== quiz.length}
                    className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:shadow-xl disabled:opacity-50 text-white rounded-2xl font-bold text-sm uppercase tracking-widest transition-all active:scale-95 shadow-md"
                >
                    Проверить результаты
                </button>
            )}
            
            {showResults && (
                <div className="text-center p-8 bg-white dark:bg-slate-800 rounded-3xl border-2 border-dashed border-slate-100 dark:border-slate-700 animate-in fade-in zoom-in duration-500">
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mb-1">Ваш итоговый балл:</p>
                    <p className="text-5xl font-bold text-blue-600">
                        {Math.round((Object.keys(answers).filter(k => answers[k] === quiz.find(q => q.id === k)?.correctIndex).length / quiz.length) * 100)}%
                    </p>
                </div>
            )}
        </div>
    );
};

export const Classes: React.FC = () => {
    // Data hooks
    const [courses] = useData<Course[]>(StorageKeys.COURSES, []);
    const [sections, setSections] = useData<LearningSection[]>(StorageKeys.LMS_SECTIONS, []);
    const [topics, setTopics] = useData<LearningTopic[]>(StorageKeys.LMS_TOPICS, []);
    const [lessons, setLessons] = useData<LearningLesson[]>(StorageKeys.LMS_LESSONS, []);
    const [progress, setProgress] = useData<StudentProgress[]>(StorageKeys.LMS_PROGRESS, []);
    
    const user = storage.get<UserProfile>(StorageKeys.USER_PROFILE, { role: UserRole.Student, fullName: 'User', email: '', permissions: [] });
    const isStaff = [UserRole.GeneralDirector, UserRole.Director, UserRole.Admin, UserRole.Teacher, UserRole.Developer].includes(user.role);

    // View State
    const [activeCourseId, setActiveCourseId] = useState<number | null>(null);
    const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
    const [activeLessonId, setActiveLessonId] = useState<string | null>(null);
    const [expandedTopicId, setExpandedTopicId] = useState<string | null>(null);

    // Player State
    const [activeTab, setActiveTab] = useState<'text' | 'video' | 'quiz'>('text');
    const [showEditor, setShowEditor] = useState(false);
    const [editingLessonDraft, setEditingLessonDraft] = useState<Partial<LearningLesson> | null>(null);

    // Helpers
    const getSections = (courseId: number) => sections.filter(s => s.subjectId === String(courseId)).sort((a,b) => a.order - b.order);
    const getTopics = (sectionId: string) => topics.filter(t => t.sectionId === sectionId).sort((a,b) => a.order - b.order);
    const getLessonsByTopic = (topicId: string) => lessons.filter(l => l.topicId === topicId).sort((a,b) => a.order - b.order);
    const getProgress = (lessonId: string) => progress.find(p => p.lessonId === lessonId && p.studentId === 0);

    const currentCourse = courses.find(c => c.id === activeCourseId);
    const currentSection = sections.find(s => s.id === activeSectionId);
    const currentLesson = lessons.find(l => l.id === activeLessonId);

    // Save Logic
    const handleSaveLesson = (updated: LearningLesson) => {
        const index = lessons.findIndex(l => l.id === updated.id);
        const newList = [...lessons];
        if (index > -1) newList[index] = updated;
        else newList.push(updated);
        setLessons(newList);
        setShowEditor(false);
        storage.notify('Контент урока успешно обновлен', 'success');
    };

    const handleCreateSection = () => {
        if (!activeCourseId) return;
        const title = prompt('Введите название раздела:');
        if (title) {
            const newSec: LearningSection = { id: Date.now().toString(), subjectId: String(activeCourseId), title, order: sections.length + 1 };
            setSections([...sections, newSec]);
        }
    };

    const handleCreateTopic = () => {
        if (!activeSectionId) return;
        const title = prompt('Введите название темы:');
        if (title) {
            const newTop: LearningTopic = { id: Date.now().toString(), sectionId: activeSectionId, title, order: topics.length + 1 };
            setTopics([...topics, newTop]);
        }
    };

    const handleCreateLesson = (topicId: string) => {
        const newLesson: Partial<LearningLesson> = { topicId, title: 'Новый урок', order: 1, contentText: '', quiz: [] };
        setEditingLessonDraft(newLesson);
        setShowEditor(true);
    };

    const handleLessonComplete = (lessonId: string, score?: number) => {
        const existing = progress.findIndex(p => p.lessonId === lessonId && p.studentId === 0);
        const newEntry: StudentProgress = {
            studentId: 0,
            lessonId,
            isCompleted: true,
            quizScore: score,
            lastAttemptAt: new Date().toISOString()
        };
        const updated = [...progress];
        if (existing > -1) updated[existing] = newEntry;
        else updated.push(newEntry);
        setProgress(updated);
        storage.notify('Результат сохранен!', 'success');
    };

    // --- VIEW 1: SUBJECTS ---
    if (!activeCourseId) {
        return (
            <div className="space-y-6 animate-in fade-in duration-500">
                <header>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-white uppercase tracking-tight">Обучение (LMS)</h2>
                    <p className="text-sm text-slate-500 font-medium">Выберите дисциплину для доступа к учебному плану</p>
                </header>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {courses.map(course => {
                        const Icon = ICON_MAP[course.icon || 'BookOpen'] || BookOpen;
                        const colorClass = COLOR_MAP[course.color || 'blue'] || COLOR_MAP.blue;
                        const secCount = sections.filter(s => s.subjectId === String(course.id)).length;
                        
                        return (
                            <button 
                                key={course.id} 
                                onClick={() => setActiveCourseId(course.id)}
                                className="bg-white dark:bg-slate-800 p-5 rounded-2xl border-2 border-slate-100 dark:border-slate-700 hover:border-blue-500 hover:shadow-xl transition-all group text-left relative overflow-hidden"
                            >
                                <div className={`absolute -right-4 -top-4 w-20 h-20 rounded-full opacity-[0.03] transition-transform group-hover:scale-150 duration-700 ${colorClass.split(' ')[1]}`}></div>
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 border shadow-inner ${colorClass} transition-transform group-hover:scale-110`}>
                                    <Icon size={24} />
                                </div>
                                <h3 className="font-bold text-slate-800 dark:text-white text-base leading-tight group-hover:text-blue-600 transition-colors uppercase tracking-tight">{course.name}</h3>
                                <div className="flex items-center gap-1.5 mt-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                    <Layers size={12}/> {secCount} разделов
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>
        );
    }

    // --- VIEW 2: SECTIONS ---
    if (activeCourseId && !activeSectionId) {
        const courseSections = getSections(activeCourseId);
        return (
            <div className="space-y-6 animate-in fade-in duration-300">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setActiveCourseId(null)} className="p-3 bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 transition-all active:scale-90"><ArrowLeft size={20}/></button>
                        <div>
                            <h2 className="text-xl font-bold text-slate-800 dark:text-white uppercase tracking-tight">{currentCourse?.name}</h2>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Разделы дисциплины</p>
                        </div>
                    </div>
                    {isStaff && (
                        <button onClick={handleCreateSection} className="bg-blue-600 text-white px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-blue-500/20 active:scale-95 transition-all">
                            <Plus size={16}/> Добавить раздел
                        </button>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {courseSections.map((sec, idx) => (
                        <button 
                            key={sec.id} 
                            onClick={() => setActiveSectionId(sec.id)}
                            className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 border-2 border-slate-50 dark:border-slate-700 rounded-2xl hover:border-blue-500 hover:shadow-lg transition-all group text-left"
                        >
                            <div className="flex items-center gap-4">
                                <span className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-900 flex items-center justify-center font-bold text-lg text-slate-300 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-inner">
                                    {idx + 1}
                                </span>
                                <div>
                                    <span className="font-bold text-base text-slate-800 dark:text-slate-100 group-hover:text-blue-600 transition-colors uppercase tracking-tight leading-tight">{sec.title}</span>
                                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{topics.filter(t => t.sectionId === sec.id).length} тем включено</p>
                                </div>
                            </div>
                            <ChevronRight size={20} className="text-slate-200 group-hover:text-blue-500 transition-transform group-hover:translate-x-1" />
                        </button>
                    ))}
                </div>
            </div>
        );
    }

    // --- VIEW 3: TOPICS ---
    if (activeSectionId && !activeLessonId) {
        const sectionTopics = getTopics(activeSectionId);
        return (
            <div className="space-y-6 animate-in fade-in duration-300">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setActiveSectionId(null)} className="p-3 bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 transition-all active:scale-90"><ArrowLeft size={20}/></button>
                        <div>
                            <p className="text-[9px] font-bold text-blue-500 uppercase tracking-widest mb-0.5">{currentCourse?.name} • Разделы</p>
                            <h2 className="text-xl font-bold text-slate-800 dark:text-white uppercase tracking-tight">{currentSection?.title}</h2>
                        </div>
                    </div>
                    {isStaff && (
                        <button onClick={handleCreateTopic} className="bg-purple-600 text-white px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-purple-500/20 active:scale-95 transition-all">
                            <Plus size={16}/> Добавить тему
                        </button>
                    )}
                </div>

                <div className="space-y-3">
                    {sectionTopics.map(topic => {
                        const topicLessons = getLessonsByTopic(topic.id);
                        const isExpanded = expandedTopicId === topic.id;
                        return (
                            <div key={topic.id} className="bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl overflow-hidden shadow-sm transition-all hover:shadow-md">
                                <button 
                                    onClick={() => setExpandedTopicId(isExpanded ? null : topic.id)}
                                    className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors text-left"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`p-2 rounded-xl transition-all shadow-sm ${isExpanded ? 'bg-blue-600 text-white rotate-90 scale-110 shadow-blue-500/30' : 'bg-slate-100 dark:bg-slate-700 text-slate-400'}`}>
                                            <ChevronRight size={18}/>
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-base text-slate-800 dark:text-white uppercase tracking-tight leading-tight">{topic.title}</h4>
                                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{topicLessons.length} практических уроков</p>
                                        </div>
                                    </div>
                                    {isStaff && (
                                        <button onClick={(e) => { e.stopPropagation(); handleCreateLesson(topic.id); }} className="p-1.5 text-blue-500 bg-blue-50 dark:bg-blue-900/30 rounded-lg hover:scale-110 transition-transform"><Plus size={16}/></button>
                                    )}
                                </button>
                                
                                {isExpanded && (
                                    <div className="border-t border-slate-50 dark:border-slate-700 p-3 space-y-1.5 bg-slate-50/20 dark:bg-slate-900/30 animate-in slide-in-from-top-2">
                                        {topicLessons.map(lesson => {
                                            const lp = getProgress(lesson.id);
                                            return (
                                                <div 
                                                    key={lesson.id}
                                                    onClick={() => setActiveLessonId(lesson.id)}
                                                    className="w-full flex items-center justify-between p-3 rounded-xl bg-white dark:bg-slate-800 border-2 border-transparent hover:border-blue-400 hover:shadow-md transition-all group cursor-pointer"
                                                >
                                                    <div className="flex items-center gap-4">
                                                        {lp?.isCompleted ? (
                                                            <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30">
                                                                <Check size={16} strokeWidth={4}/>
                                                            </div>
                                                        ) : (
                                                            <div className="w-8 h-8 rounded-full border-2 border-slate-100 dark:border-slate-700 flex items-center justify-center group-hover:border-blue-200 transition-colors">
                                                                <Circle size={8} className="text-slate-200 dark:text-slate-600 fill-current"/>
                                                            </div>
                                                        )}
                                                        <div>
                                                            <span className="text-sm font-bold text-slate-700 dark:text-slate-200 group-hover:text-blue-600 transition-colors uppercase tracking-tight">{lesson.title}</span>
                                                            <div className="flex items-center gap-2 mt-0.5 text-[8px] font-bold uppercase text-slate-400 tracking-widest">
                                                                <span className="flex items-center gap-1">{lesson.videoUrl ? <Video size={10} className="text-red-500"/> : <FileText size={10}/>} {lesson.videoUrl ? 'Видеоурок' : 'Текст'}</span>
                                                                {lesson.quiz && lesson.quiz.length > 0 && <span className="flex items-center gap-1"><Award size={10} className="text-amber-500"/> Тест</span>}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <PlayCircle size={24} className="text-blue-500 opacity-0 group-hover:opacity-100 transition-all scale-75 group-hover:scale-100" />
                                                </div>
                                            );
                                        })}
                                        {topicLessons.length === 0 && <p className="text-center py-4 text-slate-400 italic text-[10px]">Уроки еще не загружены</p>}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }

    // --- VIEW 4: PLAYER ---
    if (activeLessonId && currentLesson) {
        const lp = getProgress(currentLesson.id);
        const isRichText = currentLesson.contentText?.includes('<') || false;

        return (
            <div className="h-[calc(100vh-7rem)] flex flex-col animate-in fade-in duration-500">
                <header className="flex items-center justify-between bg-white dark:bg-slate-800 p-3 rounded-2xl border border-slate-200 dark:border-slate-700 mb-4 shadow-sm shrink-0">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setActiveLessonId(null)} className="p-2.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors bg-slate-50 dark:bg-slate-900 border border-transparent hover:border-slate-200"><ArrowLeft size={20}/></button>
                        <div className="min-w-0">
                            <p className="text-[9px] font-bold text-blue-500 uppercase truncate tracking-widest">{currentSection?.title} • {currentLesson.title}</p>
                            <h3 className="font-bold text-slate-800 dark:text-white truncate text-base uppercase tracking-tight flex items-center gap-2">
                                {currentLesson.title}
                                {lp?.isCompleted && <CheckCircle size={18} className="text-emerald-500" />}
                            </h3>
                        </div>
                    </div>
                    {isStaff && (
                        <button onClick={() => { setEditingLessonDraft(currentLesson); setShowEditor(true); }} className="flex items-center gap-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 px-4 py-2 rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all shadow-sm">
                            <Edit3 size={14}/> Редактировать
                        </button>
                    )}
                </header>

                <div className="flex gap-1.5 mb-4 shrink-0 overflow-x-auto hide-scrollbar">
                    {[
                        { id: 'text', label: 'Теория', icon: FileText },
                        { id: 'video', label: 'Видео', icon: Video },
                        { id: 'quiz', label: 'Тест', icon: Award }
                    ].map(t => (
                        <button 
                            key={t.id}
                            onClick={() => setActiveTab(t.id as any)}
                            className={`flex items-center gap-2 px-5 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all border shadow-sm ${activeTab === t.id ? 'bg-blue-600 border-blue-600 text-white shadow-blue-500/30 scale-105 z-10' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50'}`}
                        >
                            <t.icon size={14}/> {t.label}
                        </button>
                    ))}
                </div>

                <div className="flex-1 overflow-y-auto bg-white dark:bg-slate-800 border-2 border-slate-50 dark:border-slate-700 rounded-3xl p-6 md:p-8 custom-scrollbar shadow-inner relative">
                    {activeTab === 'text' && (
                        <div className="max-w-3xl mx-auto animate-in fade-in duration-700">
                            {currentLesson.contentText ? (
                                <div className="prose prose-sm dark:prose-invert max-w-none">
                                    {isRichText ? (
                                        <div 
                                            className="text-base leading-relaxed text-slate-700 dark:text-slate-300 font-medium tracking-tight"
                                            dangerouslySetInnerHTML={{ __html: currentLesson.contentText }}
                                        />
                                    ) : (
                                        <div className="whitespace-pre-wrap text-base leading-relaxed text-slate-700 dark:text-slate-300 font-medium tracking-tight">
                                            {currentLesson.contentText.split('\n').map((line, i) => {
                                                if (line.startsWith('### ')) return <h3 key={i} className="text-xl font-bold text-slate-800 dark:text-white mt-8 mb-4 uppercase tracking-tight border-l-4 border-blue-600 pl-4">{line.replace('### ', '')}</h3>;
                                                if (line.startsWith('#### ')) return <h4 key={i} className="text-lg font-bold text-blue-600 mt-6 mb-3 uppercase tracking-widest">{line.replace('#### ', '')}</h4>;
                                                if (line.startsWith('* ')) return <li key={i} className="ml-4 mb-1 list-none flex gap-2 items-center"><div className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0"/> {line.replace('* ', '')}</li>;
                                                return <p key={i} className="mb-4">{line}</p>;
                                            })}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="text-center py-20 text-slate-400 italic bg-slate-50 dark:bg-slate-900/30 rounded-3xl border-2 border-dashed border-slate-100 dark:border-slate-700">
                                    <FileText size={48} className="mx-auto mb-3 opacity-10"/>
                                    <p className="text-base font-bold uppercase tracking-widest">Теория отсутствует</p>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'video' && (
                        <div className="h-full flex flex-col items-center justify-center animate-in slide-in-from-bottom-4 duration-500">
                            {currentLesson.videoUrl ? (
                                <div className="w-full max-w-4xl aspect-video rounded-3xl shadow-2xl overflow-hidden ring-8 ring-slate-100 dark:ring-slate-900 bg-black">
                                    <iframe src={currentLesson.videoUrl} className="w-full h-full border-none" allowFullScreen title="Video Lesson"></iframe>
                                </div>
                            ) : (
                                <div className="text-center py-20 italic text-slate-400 bg-slate-50 dark:bg-slate-900/30 rounded-3xl border-2 border-dashed border-slate-100 dark:border-slate-700 p-10">
                                    <Video size={48} className="mx-auto mb-4 opacity-10"/>
                                    <h4 className="text-lg font-bold text-slate-300 uppercase tracking-widest">Видео не загружено</h4>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'quiz' && (
                        <div className="animate-in fade-in duration-500">
                            {currentLesson.quiz && currentLesson.quiz.length > 0 ? (
                                <QuizInterface quiz={currentLesson.quiz} onComplete={(s) => handleLessonComplete(currentLesson.id, s)} />
                            ) : (
                                <div className="max-w-xl mx-auto py-20 bg-slate-50 dark:bg-slate-900/30 rounded-3xl border-2 border-dashed border-slate-100 dark:border-slate-700 flex flex-col items-center justify-center text-center px-6">
                                    <Award size={64} className="text-amber-500 opacity-20 mb-6"/>
                                    <h4 className="text-xl font-bold text-slate-300 uppercase tracking-tight mb-2 leading-none">Тест еще не готов</h4>
                                    <p className="text-xs text-slate-400 font-medium">Для этого урока пока нет контрольных вопросов.</p>
                                    {!lp?.isCompleted && (
                                        <button onClick={() => handleLessonComplete(currentLesson.id)} className="mt-8 px-8 py-3 bg-emerald-600 text-white rounded-2xl font-bold uppercase tracking-widest shadow-xl shadow-emerald-500/20 active:scale-95 transition-all text-xs">Завершить урок</button>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {showEditor && editingLessonDraft && (
                    <LessonEditorModal 
                        lesson={editingLessonDraft} 
                        onClose={() => { setShowEditor(false); setEditingLessonDraft(null); }}
                        onSave={handleSaveLesson}
                    />
                )}
            </div>
        );
    }

    return null;
};
