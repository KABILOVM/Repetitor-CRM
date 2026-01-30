
import React, { useState, useMemo } from 'react';
import { storage, StorageKeys } from '../services/storage';
import { useData } from '../hooks/useData';
import { UserRole, UserProfile, Survey, SurveyQuestion, SurveyQuestionType, SurveyResponse, SurveyAnswer } from '../types';
import { 
    Plus, Trash2, Save, X, FileQuestion, ChevronRight, Send, 
    BarChart3, Edit2, CheckCircle, Users, Layout, List, 
    CheckSquare, Type, Star, MoreVertical, Eye, ArrowLeft,
    Database, PieChart as PieIcon, MessageSquare, Calendar, Activity
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];

export const Surveys: React.FC = () => {
    const user = storage.get<UserProfile>(StorageKeys.USER_PROFILE, { role: UserRole.Student, fullName: 'User', email: '', permissions: [] });
    const isAdmin = [UserRole.GeneralDirector, UserRole.Director, UserRole.Developer].includes(user.role);

    const [surveys, setSurveys] = useData<Survey[]>(StorageKeys.SURVEYS, []);
    const [responses, setResponses] = useData<SurveyResponse[]>(StorageKeys.SURVEY_RESPONSES, []);

    const [activeTab, setActiveTab] = useState<'list' | 'creator' | 'passing' | 'analytics'>('list');
    const [selectedSurvey, setSelectedSurvey] = useState<Survey | null>(null);

    // --- State for Creator ---
    const [editingSurvey, setEditingSurvey] = useState<Partial<Survey>>({
        title: '',
        description: '',
        targetRoles: [UserRole.Student, UserRole.Teacher],
        questions: [],
        isActive: true
    });

    const handleLoadDemo = () => {
        if (!confirm('Загрузить тестовые анкеты и ответы для аналитики?')) return;

        const demoSurveys: Survey[] = [
            {
                id: 's_1',
                title: 'Оценка качества преподавания',
                description: 'Анонимный опрос для учеников о качестве уроков и материалов.',
                createdAt: new Date().toISOString(),
                createdBy: 'System',
                isActive: true,
                targetRoles: [UserRole.Student],
                questions: [
                    { id: 'q1', type: SurveyQuestionType.Rating, text: 'Насколько понятно учитель объясняет тему?', required: true },
                    { id: 'q2', type: SurveyQuestionType.SingleChoice, text: 'Успеваете ли вы записывать материал?', options: ['Всегда', 'Часто', 'Редко', 'Никогда'], required: true },
                    { id: 'q3', type: SurveyQuestionType.MultipleChoice, text: 'Какие форматы обучения вам нравятся больше?', options: ['Видео', 'Практика', 'Лекция', 'Игры'], required: false },
                    { id: 'q4', type: SurveyQuestionType.Text, text: 'Ваши пожелания учебному центру:', required: false }
                ]
            },
            {
                id: 's_2',
                title: 'Комфорт рабочего процесса (Учителя)',
                description: 'Опрос для преподавателей о графике и ресурсах.',
                createdAt: new Date().toISOString(),
                createdBy: 'System',
                isActive: true,
                targetRoles: [UserRole.Teacher],
                questions: [
                    { id: 't1', type: SurveyQuestionType.SingleChoice, text: 'Довольны ли вы своим расписанием?', options: ['Да', 'Скорее да', 'Нет', 'Требует правок'], required: true },
                    { id: 't2', type: SurveyQuestionType.Rating, text: 'Оцените обеспеченность кабинетов техникой:', required: true }
                ]
            }
        ];

        const names = ['Алишер А.', 'Мадина С.', 'Рустам И.', 'Зарина К.', 'Далер М.', 'Нигина П.'];
        const demoResponses: SurveyResponse[] = [];

        // Generate 15-20 random responses for first survey
        for (let i = 0; i < 18; i++) {
            demoResponses.push({
                id: `r_${Date.now()}_${i}`,
                surveyId: 's_1',
                userId: `test${i}@mail.com`,
                userName: names[i % names.length],
                userRole: UserRole.Student,
                submittedAt: new Date().toISOString(),
                answers: [
                    { questionId: 'q1', value: Math.floor(Math.random() * 3) + 3 }, // Scores 3-5
                    { questionId: 'q2', value: ['Всегда', 'Часто', 'Редко'][Math.floor(Math.random() * 3)] },
                    { questionId: 'q3', value: ['Видео', 'Практика'].filter(() => Math.random() > 0.4) },
                    { questionId: 'q4', value: i % 3 === 0 ? 'Все отлично, спасибо!' : '' }
                ]
            });
        }

        setSurveys([...demoSurveys, ...surveys]);
        setResponses([...demoResponses, ...responses]);
        storage.notify('Тестовые данные загружены', 'success');
    };

    const addQuestion = () => {
        const newQ: SurveyQuestion = {
            id: Date.now().toString(),
            type: SurveyQuestionType.SingleChoice,
            text: '',
            options: ['Вариант 1'],
            required: false
        };
        setEditingSurvey(prev => ({ ...prev, questions: [...(prev.questions || []), newQ] }));
    };

    const updateQuestion = (id: string, updates: Partial<SurveyQuestion>) => {
        setEditingSurvey(prev => ({
            ...prev,
            questions: prev.questions?.map(q => q.id === id ? { ...q, ...updates } : q)
        }));
    };

    const handleSaveSurvey = () => {
        if (!editingSurvey.title) return alert('Введите заголовок');
        const newS = {
            ...editingSurvey,
            id: editingSurvey.id || Date.now().toString(),
            createdAt: editingSurvey.createdAt || new Date().toISOString(),
            createdBy: user.fullName,
            questions: editingSurvey.questions || []
        } as Survey;

        const updated = editingSurvey.id 
            ? surveys.map(s => s.id === newS.id ? newS : s)
            : [newS, ...surveys];
        
        setSurveys(updated);
        setActiveTab('list');
        storage.notify('Анкета сохранена', 'success');
    };

    // --- State for Passing ---
    const [currentAnswers, setCurrentAnswers] = useState<Record<string, any>>({});

    const handleSubmitResponse = () => {
        if (!selectedSurvey) return;
        
        const response: SurveyResponse = {
            id: Date.now().toString(),
            surveyId: selectedSurvey.id,
            userId: user.email,
            userName: user.fullName,
            userRole: user.role,
            submittedAt: new Date().toISOString(),
            answers: Object.entries(currentAnswers).map(([qid, val]) => ({
                questionId: qid,
                value: val
            }))
        };

        setResponses([response, ...responses]);
        setSelectedSurvey(null);
        setActiveTab('list');
        storage.notify('Спасибо! Ваш ответ принят.', 'success');
    };

    // --- Analytics Logic ---
    const surveyStats = useMemo(() => {
        if (!selectedSurvey) return null;
        const surveyResponses = responses.filter(r => r.surveyId === selectedSurvey.id);
        
        return selectedSurvey.questions.map(q => {
            const counts: Record<string, number> = {};
            
            if (q.type === SurveyQuestionType.SingleChoice || q.type === SurveyQuestionType.MultipleChoice) {
                q.options?.forEach(opt => counts[opt] = 0);
                surveyResponses.forEach(r => {
                    const ans = r.answers.find(a => a.questionId === q.id);
                    if (ans) {
                        if (Array.isArray(ans.value)) {
                            ans.value.forEach(v => counts[v] = (counts[v] || 0) + 1);
                        } else {
                            counts[ans.value] = (counts[ans.value] || 0) + 1;
                        }
                    }
                });
            } else if (q.type === SurveyQuestionType.Rating) {
                [1,2,3,4,5].forEach(v => counts[v] = 0);
                surveyResponses.forEach(r => {
                    const ans = r.answers.find(a => a.questionId === q.id);
                    if (ans) counts[ans.value] = (counts[ans.value] || 0) + 1;
                });
            }

            const chartData = Object.entries(counts).map(([name, value]) => ({ name, value }));

            return {
                ...q,
                totalAnswers: surveyResponses.filter(r => r.answers.some(a => a.questionId === q.id)).length,
                chartData
            };
        });
    }, [selectedSurvey, responses]);

    const availableSurveys = surveys.filter(s => s.isActive && s.targetRoles.includes(user.role));
    const myResponses = responses.filter(r => r.userId === user.email);

    // --- RENDERING ---

    if (activeTab === 'creator') {
        return (
            <div className="max-w-4xl mx-auto space-y-6 pb-20 animate-in fade-in duration-300">
                <div className="flex items-center gap-4">
                    <button onClick={() => setActiveTab('list')} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors"><ArrowLeft size={24}/></button>
                    <h2 className="text-2xl font-bold uppercase tracking-tight">Создание опроса</h2>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <div className="p-6 space-y-4">
                        <input 
                            className="text-3xl font-bold w-full outline-none bg-transparent dark:text-white border-b-2 border-transparent focus:border-blue-500 transition-all py-2"
                            placeholder="Название анкеты..."
                            value={editingSurvey.title}
                            onChange={e => setEditingSurvey({...editingSurvey, title: e.target.value})}
                        />
                        <textarea 
                            className="w-full text-slate-500 dark:text-slate-400 outline-none bg-transparent resize-none border-b border-transparent focus:border-slate-200"
                            placeholder="Описание опроса"
                            value={editingSurvey.description}
                            onChange={e => setEditingSurvey({...editingSurvey, description: e.target.value})}
                        />
                        
                        <div className="pt-4 border-t border-slate-100 dark:border-slate-700">
                            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-2">Кто должен пройти?</label>
                            <div className="flex flex-wrap gap-2">
                                {Object.values(UserRole).filter(r => r !== UserRole.Developer).map(role => (
                                    <button
                                        key={role}
                                        onClick={() => {
                                            const current = editingSurvey.targetRoles || [];
                                            setEditingSurvey({
                                                ...editingSurvey,
                                                targetRoles: current.includes(role) ? current.filter(r => r !== role) : [...current, role]
                                            });
                                        }}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${editingSurvey.targetRoles?.includes(role) ? 'bg-blue-600 border-blue-600 text-white' : 'bg-slate-50 dark:bg-slate-700 text-slate-500 border-slate-200 dark:border-slate-600'}`}
                                    >
                                        {role}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    {editingSurvey.questions?.map((q, idx) => (
                        <div key={q.id} className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 group animate-in slide-in-from-bottom-2">
                            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between mb-4">
                                <div className="flex-1 w-full sm:w-auto">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="text-slate-300 font-bold text-xl">#{idx + 1}</span>
                                        <input 
                                            className="font-bold text-lg w-full outline-none bg-transparent border-b border-transparent focus:border-blue-300 dark:text-white"
                                            placeholder="Введите вопрос..."
                                            value={q.text}
                                            onChange={e => updateQuestion(q.id, { text: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-700 p-1 rounded-xl shrink-0">
                                    <button onClick={() => updateQuestion(q.id, { type: SurveyQuestionType.SingleChoice })} className={`p-2 rounded-lg ${q.type === SurveyQuestionType.SingleChoice ? 'bg-white dark:bg-slate-600 shadow-sm text-blue-600' : 'text-slate-400'}`} title="Один выбор"><CheckCircle size={18}/></button>
                                    <button onClick={() => updateQuestion(q.id, { type: SurveyQuestionType.MultipleChoice })} className={`p-2 rounded-lg ${q.type === SurveyQuestionType.MultipleChoice ? 'bg-white dark:bg-slate-600 shadow-sm text-blue-600' : 'text-slate-400'}`} title="Несколько"><CheckSquare size={18}/></button>
                                    <button onClick={() => updateQuestion(q.id, { type: SurveyQuestionType.Text })} className={`p-2 rounded-lg ${q.type === SurveyQuestionType.Text ? 'bg-white dark:bg-slate-600 shadow-sm text-blue-600' : 'text-slate-400'}`} title="Текст"><Type size={18}/></button>
                                    <button onClick={() => updateQuestion(q.id, { type: SurveyQuestionType.Rating })} className={`p-2 rounded-lg ${q.type === SurveyQuestionType.Rating ? 'bg-white dark:bg-slate-600 shadow-sm text-blue-600' : 'text-slate-400'}`} title="Рейтинг"><Star size={18}/></button>
                                </div>
                            </div>

                            {(q.type === SurveyQuestionType.SingleChoice || q.type === SurveyQuestionType.MultipleChoice) && (
                                <div className="ml-8 space-y-2 mb-4">
                                    {q.options?.map((opt, optIdx) => (
                                        <div key={optIdx} className="flex items-center gap-2 group/opt">
                                            <div className={`w-4 h-4 border-2 rounded ${q.type === SurveyQuestionType.SingleChoice ? 'rounded-full' : ''} border-slate-200`}></div>
                                            <input 
                                                className="text-sm outline-none bg-transparent flex-1 border-b border-transparent focus:border-slate-100 dark:text-slate-300"
                                                value={opt}
                                                onChange={e => {
                                                    const newOpts = [...(q.options || [])];
                                                    newOpts[optIdx] = e.target.value;
                                                    updateQuestion(q.id, { options: newOpts });
                                                }}
                                            />
                                            <button 
                                                onClick={() => updateQuestion(q.id, { options: q.options?.filter((_, i) => i !== optIdx) })}
                                                className="text-slate-300 hover:text-red-500 opacity-0 group-hover/opt:opacity-100 transition-opacity"
                                            >
                                                <X size={14}/>
                                            </button>
                                        </div>
                                    ))}
                                    <button 
                                        onClick={() => updateQuestion(q.id, { options: [...(q.options || []), `Вариант ${q.options?.length + 1}`] })}
                                        className="text-xs text-blue-500 font-bold hover:underline ml-6"
                                    >
                                        + Добавить вариант
                                    </button>
                                </div>
                            )}

                            <div className="flex justify-between items-center pt-4 border-t border-slate-50 dark:border-slate-700/50">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" checked={q.required} onChange={e => updateQuestion(q.id, { required: e.target.checked })} className="w-4 h-4 text-blue-600 rounded" />
                                    <span className="text-xs text-slate-500 font-bold uppercase">Обязательный вопрос</span>
                                </label>
                                <button 
                                    onClick={() => setEditingSurvey({ ...editingSurvey, questions: editingSurvey.questions?.filter(question => question.id !== q.id) })}
                                    className="p-2 text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                >
                                    <Trash2 size={18}/>
                                </button>
                            </div>
                        </div>
                    ))}
                    
                    <button 
                        onClick={addQuestion}
                        className="w-full py-8 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl text-slate-400 hover:text-blue-500 hover:border-blue-500 transition-all flex flex-col items-center justify-center gap-2 bg-white dark:bg-slate-800"
                    >
                        <Plus size={32} />
                        <span className="font-bold">Добавить новый вопрос</span>
                    </button>
                </div>

                <div className="fixed bottom-8 right-8 flex gap-3">
                     <button 
                        onClick={handleSaveSurvey}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-2xl font-bold uppercase tracking-tight shadow-xl shadow-emerald-500/20 transition-all active:scale-95 flex items-center gap-2"
                    >
                        <Save size={20}/> Сохранить и опубликовать
                    </button>
                </div>
            </div>
        );
    }

    if (activeTab === 'analytics' && selectedSurvey) {
        const surveyResponses = responses.filter(r => r.surveyId === selectedSurvey.id);
        return (
            <div className="max-w-5xl mx-auto space-y-6 pb-20 animate-in fade-in duration-500">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setActiveTab('list')} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors"><ArrowLeft size={24}/></button>
                        <div>
                            <h2 className="text-2xl font-bold text-slate-800 dark:text-white uppercase tracking-tight">{selectedSurvey.title}</h2>
                            <p className="text-slate-500 text-sm flex items-center gap-2 font-medium"><Users size={14}/> Всего ответов: {surveyResponses.length}</p>
                        </div>
                    </div>
                    <div className="bg-blue-50 dark:bg-blue-900/30 px-4 py-2 rounded-xl border border-blue-100 dark:border-blue-800 flex items-center gap-3">
                        <Activity size={18} className="text-blue-600"/>
                        <span className="text-sm font-bold text-blue-800 dark:text-blue-300">Аналитика активна</span>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-8">
                    {surveyStats?.map((q, idx) => (
                        <div key={q.id} className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700">
                            <div className="flex justify-between items-start mb-6">
                                <h4 className="font-bold text-xl text-slate-800 dark:text-white flex gap-3">
                                    <span className="text-blue-500">Q{idx+1}</span> {q.text}
                                </h4>
                                <span className="text-xs font-bold text-slate-400 bg-slate-50 dark:bg-slate-700 px-3 py-1 rounded-full uppercase">{q.totalAnswers} ответов</span>
                            </div>
                            
                            {q.type === SurveyQuestionType.Text ? (
                                <div className="space-y-3 max-h-80 overflow-y-auto custom-scrollbar pr-2">
                                    {responses.filter(r => r.surveyId === selectedSurvey.id).map(r => {
                                        const ans = r.answers.find(a => a.questionId === q.id);
                                        return ans?.value ? (
                                            <div key={r.id} className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-2xl border border-slate-100 dark:border-slate-700">
                                                <div className="flex justify-between items-center mb-2">
                                                    <span className="font-bold text-xs text-blue-500 uppercase">{r.userName}</span>
                                                    <span className="text-[10px] text-slate-400 font-mono">{new Date(r.submittedAt).toLocaleDateString()}</span>
                                                </div>
                                                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed italic">«{ans.value}»</p>
                                            </div>
                                        ) : null;
                                    })}
                                </div>
                            ) : q.type === SurveyQuestionType.SingleChoice ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                                    <div className="h-64">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie data={q.chartData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5}>
                                                    {q.chartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                                </Pie>
                                                <Tooltip />
                                                <Legend verticalAlign="bottom" height={36}/>
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <div className="space-y-2">
                                        {q.chartData.map((d, i) => (
                                            <div key={i} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/30 rounded-xl">
                                                <span className="text-sm font-medium">{d.name}</span>
                                                <span className="font-bold text-blue-600">{d.value} ({Math.round(d.value / (surveyResponses.length || 1) * 100)}%)</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="h-72 mt-4">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={q.chartData} layout="vertical" margin={{ left: 40, right: 40 }}>
                                            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                            <XAxis type="number" hide />
                                            <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} />
                                            <Tooltip cursor={{fill: 'transparent'}} />
                                            <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]}>
                                                {q.chartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (selectedSurvey) {
        return (
            <div className="max-w-2xl mx-auto space-y-6 pb-20 animate-in zoom-in-95 duration-300">
                 <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-700 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-2 bg-blue-600"></div>
                    <h2 className="text-3xl font-bold mb-3 dark:text-white uppercase tracking-tight">{selectedSurvey.title}</h2>
                    <p className="text-slate-500 leading-relaxed font-medium">{selectedSurvey.description}</p>
                 </div>

                 <div className="space-y-4">
                    {selectedSurvey.questions.map((q, idx) => (
                        <div key={q.id} className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm transition-all hover:shadow-md">
                            <p className="font-bold text-lg mb-6 dark:text-white">
                                {idx + 1}. {q.text} {q.required && <span className="text-red-500">*</span>}
                            </p>
                            
                            {q.type === SurveyQuestionType.SingleChoice && (
                                <div className="space-y-2">
                                    {q.options?.map(opt => (
                                        <label key={opt} className="flex items-center gap-3 p-4 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer transition-colors border border-slate-100 dark:border-slate-700/50">
                                            <input 
                                                type="radio" 
                                                name={q.id} 
                                                checked={currentAnswers[q.id] === opt}
                                                onChange={() => setCurrentAnswers({...currentAnswers, [q.id]: opt})}
                                                className="w-5 h-5 text-blue-600 focus:ring-blue-500 border-slate-300" 
                                            />
                                            <span className="text-slate-700 dark:text-slate-200 font-medium">{opt}</span>
                                        </label>
                                    ))}
                                </div>
                            )}

                            {q.type === SurveyQuestionType.MultipleChoice && (
                                <div className="space-y-2">
                                    {q.options?.map(opt => (
                                        <label key={opt} className="flex items-center gap-3 p-4 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer transition-colors border border-slate-100 dark:border-slate-700/50">
                                            <input 
                                                type="checkbox" 
                                                checked={currentAnswers[q.id]?.includes(opt)}
                                                onChange={(e) => {
                                                    const cur = currentAnswers[q.id] || [];
                                                    const next = e.target.checked ? [...cur, opt] : cur.filter((v: any) => v !== opt);
                                                    setCurrentAnswers({...currentAnswers, [q.id]: next});
                                                }}
                                                className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500 border-slate-300" 
                                            />
                                            <span className="text-slate-700 dark:text-slate-200 font-medium">{opt}</span>
                                        </label>
                                    ))}
                                </div>
                            )}

                            {q.type === SurveyQuestionType.Text && (
                                <textarea 
                                    className="w-full p-4 rounded-2xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 h-32 transition-all font-medium"
                                    placeholder="Введите ваш ответ здесь..."
                                    value={currentAnswers[q.id] || ''}
                                    onChange={e => setCurrentAnswers({...currentAnswers, [q.id]: e.target.value})}
                                />
                            )}

                            {q.type === SurveyQuestionType.Rating && (
                                <div className="flex justify-between items-center max-w-sm mx-auto py-2">
                                    {[1,2,3,4,5].map(val => (
                                        <button 
                                            key={val}
                                            onClick={() => setCurrentAnswers({...currentAnswers, [q.id]: val})}
                                            className={`w-14 h-14 rounded-2xl border-2 transition-all font-bold text-xl flex items-center justify-center ${currentAnswers[q.id] === val ? 'bg-blue-600 border-blue-600 text-white scale-110 shadow-lg' : 'bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-300 hover:border-blue-300'}`}
                                        >
                                            {val}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                 </div>

                 <div className="flex justify-between items-center py-10">
                     <button onClick={() => setSelectedSurvey(null)} className="text-slate-500 font-bold hover:text-slate-700 transition-colors">Отмена</button>
                     <button 
                        onClick={handleSubmitResponse}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-12 py-5 rounded-3xl font-bold uppercase tracking-widest shadow-2xl shadow-blue-500/30 transition-all active:scale-95 flex items-center gap-3"
                    >
                         <Send size={20}/> Отправить ответы
                    </button>
                 </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-300">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-white uppercase tracking-tight">Опросы и Анкеты</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">Проходите назначенные опросы или управляйте ими</p>
                </div>
                {isAdmin && (
                    <div className="flex gap-2">
                        <button 
                            onClick={handleLoadDemo}
                            className="bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-slate-50 transition-all text-xs uppercase tracking-widest"
                        >
                            <Database size={18}/> Тестовые данные
                        </button>
                        <button 
                            onClick={() => {
                                setEditingSurvey({ title: '', description: '', questions: [], targetRoles: [UserRole.Student, UserRole.Teacher], isActive: true });
                                setActiveTab('creator');
                            }}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-blue-500/20 transition-all active:scale-95 text-xs uppercase tracking-widest"
                        >
                            <Plus size={20}/> Создать анкету
                        </button>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {availableSurveys.map(s => {
                    const hasResponded = myResponses.some(r => r.surveyId === s.id);
                    const totalResponses = responses.filter(r => r.surveyId === s.id).length;

                    return (
                        <div key={s.id} className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm hover:shadow-xl transition-all group border-b-4 hover:border-b-blue-500">
                            <div className="p-8">
                                <div className="flex justify-between items-start mb-6">
                                    <div className="p-4 bg-blue-50 dark:bg-blue-900/30 rounded-2xl text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
                                        <FileQuestion size={28}/>
                                    </div>
                                    {isAdmin && (
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => { setSelectedSurvey(s); setActiveTab('analytics'); }} className="p-2 hover:bg-blue-50 dark:hover:bg-blue-900/40 rounded-lg text-blue-500" title="Аналитика"><BarChart3 size={20}/></button>
                                            <button onClick={() => { setEditingSurvey(s); setActiveTab('creator'); }} className="p-2 hover:bg-amber-50 dark:hover:bg-amber-900/40 rounded-lg text-amber-500" title="Редактировать"><Edit2 size={20}/></button>
                                            <button onClick={() => setSurveys(surveys.filter(sur => sur.id !== s.id))} className="p-2 hover:bg-red-50 dark:hover:bg-red-900/40 rounded-lg text-red-500" title="Удалить"><Trash2 size={20}/></button>
                                        </div>
                                    )}
                                </div>
                                <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2 uppercase tracking-tight line-clamp-1">{s.title}</h3>
                                <p className="text-slate-500 dark:text-slate-400 text-sm line-clamp-2 min-h-[40px] mb-8 leading-relaxed font-medium">{s.description || 'Описание не указано'}</p>
                                
                                <div className="grid grid-cols-2 gap-4 mb-8">
                                    <div className="bg-slate-50 dark:bg-slate-700/50 p-3 rounded-2xl flex flex-col items-center">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase mb-1 tracking-widest">Ответов</span>
                                        <span className="font-bold text-slate-800 dark:text-white">{totalResponses}</span>
                                    </div>
                                    <div className="bg-slate-50 dark:bg-slate-700/50 p-3 rounded-2xl flex flex-col items-center">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase mb-1 tracking-widest">Вопросов</span>
                                        <span className="font-bold text-slate-800 dark:text-white">{s.questions.length}</span>
                                    </div>
                                </div>

                                {hasResponded ? (
                                    <div className="flex items-center justify-center gap-2 py-4 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-2xl text-xs font-bold uppercase tracking-widest border border-emerald-100 dark:border-emerald-800">
                                        <CheckCircle size={18}/> Завершено
                                    </div>
                                ) : (
                                    <button 
                                        onClick={() => { setSelectedSurvey(s); setCurrentAnswers({}); }}
                                        className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-bold uppercase tracking-widest shadow-lg shadow-blue-500/20 transition-all active:scale-95"
                                    >
                                        Пройти сейчас
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}

                {availableSurveys.length === 0 && (
                    <div className="col-span-full py-32 flex flex-col items-center justify-center text-slate-400 bg-white dark:bg-slate-800 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-[40px]">
                        <div className="p-8 bg-slate-50 dark:bg-slate-900 rounded-full mb-6">
                            <Layout size={64} className="opacity-10"/>
                        </div>
                        <h3 className="text-xl font-bold dark:text-white mb-2 uppercase tracking-tight">Анкет пока нет</h3>
                        <p className="text-slate-500 max-w-xs text-center leading-relaxed font-medium">Здесь будут отображаться опросы, назначенные вашей роли.</p>
                    </div>
                )}
            </div>
        </div>
    );
};
