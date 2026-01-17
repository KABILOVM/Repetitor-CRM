
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Student, StudentStatus, Branch, Cluster, AuditLog, Transaction, ExamResult, Course, Group, StudentBook, PipelineStage, Violation, UserProfile, UserRole, ParentInfo, Company } from '../types';
import { storage, StorageKeys } from '../services/storage';
import { X, User, GraduationCap, CreditCard, Award, Trash2, History, Save, AlertTriangle, Activity, Calendar, FileText, Percent, Eye, Check, StickyNote, Globe, Shield, Clock, Book, Calculator, Filter, Plus, FileSignature, PackageCheck, Camera, Upload, AlertCircle, Pencil, Image, Users, Info, ChevronDown, BookOpen, FlaskConical, Atom, Dna, Scroll, Gavel, Code, HelpCircle, TrendingUp, Wallet, Banknote, Landmark, Music, Dumbbell, Brain, Rocket, Languages, PenTool, MapPin, DoorOpen, RotateCcw } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { DateRangePicker } from './DateRangePicker';
import { Checkbox } from './Checkbox';
import { CustomSelect } from './CustomSelect';

// We now load these from Company Config
// const SOURCES = ... (Removed hardcoded)
// const GRADES = ... (Removed hardcoded)
// const STUDY_GOALS = ... (Removed hardcoded)

const STUDY_LANGUAGES = ["Русский", "Таджикский", "Английский"];
const PARENT_ROLES = ["Мама", "Папа", "Другое"];
const ADAPTATION_STATUSES = ["Проведена", "Не проведена"];

const DISCOUNT_DURATIONS = [
    '1 месяц',
    '3 месяца',
    '6 месяцев',
    '9 месяцев',
    'Весь год (12)'
];

const ICON_MAP: Record<string, React.ElementType> = {
    'Calculator': Calculator, 'FlaskConical': FlaskConical, 'Atom': Atom, 'Dna': Dna,
    'Globe': Globe, 'Scroll': Scroll, 'Gavel': Gavel, 'Code': Code, 'BookOpen': BookOpen,
    'Music': Music, 'Dumbbell': Dumbbell, 'Brain': Brain, 'Rocket': Rocket,
    'Languages': Languages, 'PenTool': PenTool
};

// Defined locally to ensure type safety
interface PaymentState {
    amount: number;
    method: 'Наличные' | 'Алиф' | 'DC' | 'Карта' | 'Перевод';
    subjectDistribution: Record<string, number>;
    promiseDate: string;
    promiseReason: string;
}

const getSubjectIcon = (name: string, course?: Course) => {
    if (course) {
        const Icon = ICON_MAP[course.icon || 'BookOpen'] || BookOpen;
        const colorClass = course.color || 'blue';
        let bg = 'bg-blue-100 dark:bg-blue-900/30';
        let text = 'text-blue-500';
        
        if (colorClass === 'emerald') { bg = 'bg-emerald-100 dark:bg-emerald-900/30'; text = 'text-emerald-500'; }
        if (colorClass === 'purple') { bg = 'bg-purple-100 dark:bg-purple-900/30'; text = 'text-purple-500'; }
        if (colorClass === 'amber') { bg = 'bg-amber-100 dark:bg-amber-900/30'; text = 'text-amber-500'; }
        if (colorClass === 'rose') { bg = 'bg-rose-100 dark:bg-rose-900/30'; text = 'text-rose-500'; }
        if (colorClass === 'cyan') { bg = 'bg-cyan-100 dark:bg-cyan-900/30'; text = 'text-cyan-500'; }
        if (colorClass === 'indigo') { bg = 'bg-indigo-100 dark:bg-indigo-900/30'; text = 'text-indigo-500'; }
        
        return { icon: Icon, color: text, bg: bg };
    }

    const n = name.toLowerCase();
    if (n.includes('мат')) return { icon: Calculator, color: 'text-blue-500', bg: 'bg-blue-100 dark:bg-blue-900/30' };
    if (n.includes('хим')) return { icon: FlaskConical, color: 'text-purple-500', bg: 'bg-purple-100 dark:bg-purple-900/30' };
    if (n.includes('физ')) return { icon: Atom, color: 'text-indigo-500', bg: 'bg-indigo-100 dark:bg-indigo-900/30' };
    if (n.includes('био')) return { icon: Dna, color: 'text-emerald-500', bg: 'bg-emerald-100 dark:bg-emerald-900/30' };
    if (n.includes('англ') || n.includes('english') || n.includes('язык')) return { icon: Globe, color: 'text-sky-500', bg: 'bg-sky-100 dark:bg-sky-900/30' };
    if (n.includes('истор')) return { icon: Scroll, color: 'text-amber-500', bg: 'bg-amber-100 dark:bg-amber-900/30' };
    if (n.includes('прав')) return { icon: Gavel, color: 'text-rose-500', bg: 'bg-rose-100 dark:bg-rose-900/30' };
    if (n.includes('it') || n.includes('прог')) return { icon: Code, color: 'text-slate-600', bg: 'bg-slate-200 dark:bg-slate-700' };
    
    return { icon: BookOpen, color: 'text-slate-500', bg: 'bg-slate-100 dark:bg-slate-800' };
};

const getStatusColor = (status: StudentStatus | string) => {
    switch (status) {
      case StudentStatus.Active: return 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800';
      case StudentStatus.Presale: return 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800';
      case StudentStatus.Paused: return 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800';
      case StudentStatus.Archived: return 'bg-slate-200 text-slate-700 border-slate-300 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600';
      case StudentStatus.Dropped: return 'bg-rose-50 text-rose-700 border-rose-200 line-through decoration-rose-400 dark:bg-rose-900/20 dark:text-rose-300 dark:border-rose-800';
      default: return 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600';
    }
};

const getScoreColor = (percent: number) => {
    if (percent >= 80) return 'bg-emerald-500 text-white';
    if (percent >= 50) return 'bg-amber-500 text-white';
    return 'bg-red-500 text-white';
};

const InputGroup = ({ label, value, onChange, type = "text", placeholder = "", className = "", disabled = false, error = false, ...props }: any) => (
    <div className={className}>
      <label className={`block text-[10px] font-bold uppercase mb-1 ${error ? 'text-red-500' : 'text-slate-500 dark:text-slate-400'}`}>
          {label} {error && '*'}
      </label>
      <input
        type={type}
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className={`w-full border rounded-lg p-2 text-sm outline-none transition-all duration-300 h-[38px]
            ${error 
                ? 'border-red-500 ring-2 ring-red-200 dark:ring-red-900/50 shadow-[0_0_10px_rgba(239,68,68,0.3)] bg-red-50 dark:bg-red-900/10 text-red-900 dark:text-red-100 placeholder-red-300' 
                : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 placeholder-slate-400'
            }
            ${disabled ? 'opacity-60 cursor-not-allowed bg-slate-100 dark:bg-slate-800' : ''}
        `}
        {...props}
      />
      {error && <p className="text-[10px] text-red-500 mt-1 font-bold animate-pulse">Обязательное поле</p>}
    </div>
  );

interface GroupSelectorProps {
    groups: Group[];
    selectedGroupId?: number;
    onChange: (groupId: number) => void;
    disabled?: boolean;
    placeholder?: string;
}

const GroupSelector: React.FC<GroupSelectorProps> = ({ groups, selectedGroupId, onChange, disabled, placeholder = "Выберите группу..." }) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const selectedGroup = groups.find(g => g.id === selectedGroupId);

    const getGroupSchedule = (g: Group) => {
        if (g.scheduleDays && g.scheduleDays.length > 0) {
            return `${g.scheduleDays.join('/')} ${g.scheduleTime || ''}`;
        }
        return g.schedule || 'Расписание не указано';
    };

    return (
        <div className="relative w-full group" ref={containerRef}>
            {selectedGroup && !isOpen && (
                <div className="absolute bottom-full left-0 mb-2 w-max max-w-[220px] p-2 bg-slate-800 text-white text-xs rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 animate-in fade-in slide-in-from-bottom-2">
                    <div className="font-bold border-b border-slate-600 pb-1 mb-1 text-slate-300 flex items-center gap-1">
                        <Clock size={10} /> Расписание
                    </div>
                    <div className="font-mono text-emerald-400 mb-1 text-xs">{getGroupSchedule(selectedGroup)}</div>
                    <div className="text-slate-300 truncate">{selectedGroup.teacher}</div>
                    {selectedGroup.room && <div className="text-slate-400 mt-1 flex items-center gap-1"><DoorOpen size={10}/> {selectedGroup.room}</div>}
                    <div className="absolute -bottom-1 left-4 w-2 h-2 bg-slate-800 transform rotate-45"></div>
                </div>
            )}

            <button
                type="button"
                onClick={() => !disabled && setIsOpen(!isOpen)}
                className={`
                    w-full flex items-center justify-between px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border rounded-lg shadow-sm transition-all h-[38px] truncate outline-none relative
                    ${isOpen 
                        ? 'border-blue-500 ring-2 ring-blue-100 dark:ring-blue-900/20' 
                        : 'border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500'
                    }
                    ${disabled ? 'opacity-60 cursor-not-allowed bg-slate-100 dark:bg-slate-900' : ''}
                `}
            >
                <span className={`truncate flex-1 text-left ${selectedGroup ? 'text-slate-800 dark:text-slate-200 font-medium' : 'text-slate-400'}`}>
                    {selectedGroup 
                        ? (
                            <span className="flex items-center gap-2 w-full">
                                <span className="font-bold truncate">{selectedGroup.name}</span>
                                <span className="text-slate-500 dark:text-slate-400 truncate hidden sm:inline">— {selectedGroup.teacher.split(' ')[0]}</span>
                                <span className={`text-[10px] ml-auto font-mono px-1.5 py-0.5 rounded flex-shrink-0 ${(Number(selectedGroup.studentsCount) || 0) >= (Number(selectedGroup.maxStudents) || 0) ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>
                                    {selectedGroup.studentsCount}/{selectedGroup.maxStudents}
                                </span>
                            </span>
                        )
                        : placeholder}
                </span>
                <ChevronDown size={14} className={`ml-2 text-slate-400 transition-transform duration-200 flex-shrink-0 ${isOpen ? 'rotate-180 text-blue-500' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute top-full left-0 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                    <div className="max-h-64 overflow-y-auto custom-scrollbar p-1">
                        {groups.map(group => {
                            const isSelected = group.id === selectedGroupId;
                            const isFull = (group.studentsCount || 0) >= (group.maxStudents || 0);
                            const scheduleStr = getGroupSchedule(group);
                            
                            return (
                                <button
                                    key={group.id}
                                    onClick={() => {
                                        onChange(group.id);
                                        setIsOpen(false);
                                    }}
                                    title={`Расписание: ${scheduleStr}\nАудитория: ${group.room || 'Не указана'}`}
                                    className={`
                                        w-full text-left px-3 py-2.5 text-xs rounded-lg transition-all flex flex-col gap-1 mb-1 group
                                        ${isSelected 
                                            ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800' 
                                            : 'hover:bg-slate-50 dark:hover:bg-slate-700/50 border border-transparent'
                                        }
                                    `}
                                >
                                    <div className="flex items-center justify-between w-full">
                                        <span className={`font-bold text-sm truncate ${isSelected ? 'text-blue-700 dark:text-blue-300' : 'text-slate-800 dark:text-white'}`}>
                                            {group.name}
                                        </span>
                                        <span className={`text-[10px] font-bold font-mono px-1.5 py-0.5 rounded
                                            ${isFull 
                                                ? 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400' 
                                                : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
                                            }
                                        `}>
                                            {group.studentsCount}/{group.maxStudents}
                                        </span>
                                    </div>
                                    
                                    <div className="flex justify-between items-center w-full">
                                        <span className="truncate text-[11px] text-slate-500 dark:text-slate-400 max-w-[50%]">
                                            {group.teacher}
                                        </span>
                                        <span className="truncate text-[10px] font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-1.5 py-0.5 rounded max-w-[45%]">
                                            {scheduleStr}
                                        </span>
                                    </div>
                                </button>
                            );
                        })}
                        {groups.length === 0 && (
                            <div className="px-3 py-6 text-center text-xs text-slate-400 italic flex flex-col items-center gap-2">
                                <BookOpen size={16} className="opacity-20"/>
                                <span>Нет доступных групп</span>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

interface StudentProfileModalProps {
    student: Student;
    onClose: () => void;
    onSave: (updatedStudent: Student) => void;
}

// Define interface for heatmap row to fix type inference issues
interface HeatmapRow {
    subject: string;
    months: ({ percent: number; count: number; rawAvg: number } | null)[];
}

export const StudentProfileModal: React.FC<StudentProfileModalProps> = ({ student, onClose, onSave }) => {
    // --- LOAD COMPANY CONFIGURATION ---
    const user = storage.get<UserProfile>(StorageKeys.USER_PROFILE, { role: UserRole.GeneralDirector, fullName: 'Admin', email: '', permissions: [] });
    const company = storage.getCompanyConfig(user.companyId || 'repetitor_tj');
    
    const SOURCES = company.dictionaries.sources;
    const GRADES = company.dictionaries.grades;
    const LEAVE_REASONS = company.dictionaries.leaveReasons;

    const [editingStudent, setEditingStudent] = useState<Student>({ 
        ...student, 
        phone: student.phone || '+992 ',
        parentPhone: student.parentPhone || '+992 ',
        assignedBooks: student.assignedBooks || [],
        subjects: student.subjects || (student['subject'] ? [student['subject']] : []),
        groupIds: student.groupIds || [],
        parents: (student.parents && student.parents.length > 0) 
            ? student.parents 
            : [{ 
                name: student.parentName || '', 
                role: 'Мама', 
                phone: student.parentPhone || '+992 ', 
                email: student.parentEmail || '' 
              }]
    });
    
    const [errors, setErrors] = useState<Record<string, boolean>>({});
    const [showPhotoMenu, setShowPhotoMenu] = useState(false);
    const [showSubjectMenu, setShowSubjectMenu] = useState(false);
    const [violationFilter, setViolationFilter] = useState('All');
    const [showViolationFilterMenu, setShowViolationFilterMenu] = useState(false);
    const violationFilterRef = useRef<HTMLDivElement>(null);

    // History State
    const [showHistory, setShowHistory] = useState(false);

    // Finance State
    const [discountDuration, setDiscountDuration] = useState<string>(
        editingStudent.discountDuration ? `${editingStudent.discountDuration} мес.` : 'Весь год (12)'
    );

    // --- PAYMENT MODAL STATE ---
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [paymentData, setPaymentData] = useState<PaymentState>({
        amount: 0,
        method: 'Наличные',
        subjectDistribution: {},
        promiseDate: '',
        promiseReason: ''
    });

    const courses = storage.get<Course[]>(StorageKeys.COURSES, []);
    const groups = storage.get<Group[]>(StorageKeys.GROUPS, []);
    
    const fileInputRef = useRef<HTMLInputElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const [showCamera, setShowCamera] = useState(false);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const photoMenuRef = useRef<HTMLDivElement>(null);
    const subjectMenuRef = useRef<HTMLDivElement>(null);

    const calculateTotalBaseFee = (subjects: string[], branch?: Branch) => {
        let total = 0;
        subjects.forEach(sub => {
            const course = courses.find(c => c.name === sub);
            if (course) {
                if (branch && course.branchConfig && course.branchConfig[branch]) {
                    const conf = course.branchConfig[branch];
                    if (conf.isActive) {
                        total += conf.price;
                        return;
                    }
                }
                const regionalPrice = (branch && course.branchPrices && course.branchPrices[branch]) 
                                      ? course.branchPrices[student.branch!] 
                                      : (course.price || 0);
                total += regionalPrice;
            }
        });
        return total;
    };

    const [baseFee, setBaseFee] = useState<number>(() => {
        if (student.monthlyFee > 0 && student.discountPercent !== undefined) {
             return Math.round(student.monthlyFee / (1 - student.discountPercent / 100));
        }
        return calculateTotalBaseFee(student.subjects || [], student.branch);
    });

    const [activeTab, setActiveTab] = useState<'info' | 'academic' | 'finance' | 'exams' | 'violations'>('info');
    const [examFilter, setExamFilter] = useState<string>('All');

    useEffect(() => {
        // Only update base fee if student ID is 0 (new) OR we specifically changed subjects in edit mode
        if (editingStudent.id === 0) {
            const newBase = calculateTotalBaseFee(editingStudent.subjects || [], editingStudent.branch);
            setBaseFee(newBase);
            const discount = editingStudent.discountPercent || 0;
            const newMonthly = Math.round(newBase * (1 - discount / 100));
            setEditingStudent(prev => ({ ...prev, monthlyFee: newMonthly }));
        }
    }, [editingStudent.subjects, editingStudent.branch, editingStudent.id]);

    // --- AUTO-POPULATE BOOKS BASED ON SUBJECTS ---
    useEffect(() => {
        setEditingStudent(prev => {
            const currentSubjects = prev.subjects || [];
            const currentBooks = prev.assignedBooks || [];
            const newBooks = [...currentBooks];
            let changed = false;

            currentSubjects.forEach(sub => {
                const course = courses.find(c => c.name === sub);
                if (course?.books) {
                    course.books.forEach(cb => {
                        // If book is not already in the student's list, add it
                        if (!newBooks.some(nb => nb.bookId === cb.id)) {
                            newBooks.push({
                                bookId: cb.id,
                                name: cb.name,
                                price: cb.price,
                                isPaid: false,
                                isIssued: false
                            });
                            changed = true;
                        }
                    });
                }
            });

            if (changed) {
                return { ...prev, assignedBooks: newBooks };
            }
            return prev;
        });
    }, [editingStudent.subjects, courses]);

    const allLogs = storage.get<AuditLog[]>(StorageKeys.AUDIT_LOGS, []);
    const allTransactions = storage.get<Transaction[]>(StorageKeys.TRANSACTIONS, []);
    const allExams = storage.get<ExamResult[]>(StorageKeys.EXAM_RESULTS, []);
    const allViolations = storage.get<Violation[]>(StorageKeys.VIOLATIONS, []);
    const isSuperUser = [UserRole.GeneralDirector, UserRole.Director, UserRole.Developer, UserRole.Financier].includes(user.role);
    const isTeacher = user.role === UserRole.Teacher;

    const studentTransactions = useMemo(() => allTransactions.filter(t => t.studentId === editingStudent.id).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()), [allTransactions, editingStudent.id]);
    const rawExams = useMemo(() => allExams.filter(e => e.studentId === editingStudent.id || e.studentName === editingStudent.fullName).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()), [allExams, editingStudent.id, editingStudent.fullName]);
    const studentViolations = useMemo(() => allViolations.filter(v => v.studentId === editingStudent.id || v.studentName === editingStudent.fullName).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()), [allViolations, editingStudent.id, editingStudent.fullName]);

    // History Logs Logic
    const historyLogs = useMemo(() => {
        return allLogs
            .filter(l => l.entityId === editingStudent.id)
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }, [allLogs, editingStudent.id]);

    // Internal Functions
    const clearError = (field: string) => {
        if (errors[field]) {
            setErrors(prev => {
                const next = { ...prev };
                delete next[field];
                return next;
            });
        }
    };

    const startCamera = async () => {
        setShowCamera(true);
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
            setStream(mediaStream);
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
            }
        } catch (err) {
            console.error("Error accessing camera:", err);
            alert("Не удалось получить доступ к камере");
            setShowCamera(false);
        }
    };

    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
        }
        setShowCamera(false);
    };

    const capturePhoto = () => {
        if (videoRef.current) {
            const canvas = document.createElement('canvas');
            canvas.width = videoRef.current.videoWidth;
            canvas.height = videoRef.current.videoHeight;
            canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0);
            const dataUrl = canvas.toDataURL('image/jpeg');
            setEditingStudent(prev => ({ ...prev, avatar: dataUrl }));
            stopCamera();
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setEditingStudent(prev => ({ ...prev, avatar: reader.result as string }));
            };
            reader.readAsDataURL(file);
        }
    };

    const removeAvatar = () => {
        setEditingStudent(prev => ({ ...prev, avatar: undefined }));
        setShowPhotoMenu(false);
    };

    const addParent = () => {
        setEditingStudent(prev => ({
            ...prev,
            parents: [...(prev.parents || []), { name: '', role: 'Другое', phone: '+992 ' }]
        }));
    };

    const removeParent = (index: number) => {
        setEditingStudent(prev => ({
            ...prev,
            parents: prev.parents?.filter((_, i) => i !== index)
        }));
    };

    const handleParentChange = (index: number, field: keyof ParentInfo, value: string) => {
        setEditingStudent(prev => {
            const newParents = [...(prev.parents || [])];
            newParents[index] = { ...newParents[index], [field]: value };
            const updates: any = { parents: newParents };
            if (index === 0) {
                if (field === 'name') updates.parentName = value;
                if (field === 'phone') updates.parentPhone = value;
                if (field === 'email') updates.parentEmail = value;
            }
            return { ...prev, ...updates };
        });
    };

    const handleStatusChange = (val: string) => {
        const newStatus = val as StudentStatus;
        const today = new Date().toISOString().split('T')[0];
        
        setEditingStudent(prev => {
            const updated = { ...prev, status: newStatus };
            
            // Auto-set dates logic
            if (newStatus === StudentStatus.Active) {
                if (!updated.startDate) updated.startDate = today;
                updated.endDate = undefined; 
                updated.dropOffDate = undefined;
            } else if (newStatus === StudentStatus.Archived) {
                if (!updated.endDate) updated.endDate = today;
            } else if (newStatus === StudentStatus.Dropped) {
                if (!updated.dropOffDate) updated.dropOffDate = today;
            } else if (newStatus === StudentStatus.Presale) {
                if (!updated.presaleDate) updated.presaleDate = today;
            }
            
            return updated;
        });
    };

    const handleAddSubject = (subject: string) => {
        if (!editingStudent.subjects?.includes(subject)) {
            setEditingStudent(prev => ({
                ...prev,
                subjects: [...(prev.subjects || []), subject]
            }));
        }
        setShowSubjectMenu(false);
    };

    const handleRemoveSubject = (subject: string) => {
        if (confirm(`Удалить предмет "${subject}"?`)) {
            setEditingStudent(prev => ({
                ...prev,
                subjects: prev.subjects?.filter(s => s !== subject)
            }));
        }
    };

    const handleGroupChangeForSubject = (subject: string, groupId: string) => {
        const id = Number(groupId);
        const subjectGroups = groups.filter(g => g.subject === subject).map(g => g.id);
        
        setEditingStudent(prev => {
            const currentGroupIds = prev.groupIds || [];
            const cleanedGroupIds = currentGroupIds.filter(gid => !subjectGroups.includes(gid));
            return { ...prev, groupIds: [...cleanedGroupIds, id] };
        });
    };

    const handleAddBook = (bookId: string) => {
        const courseBook = courses.flatMap(c => c.books).find(b => b.id === bookId);
        if (courseBook) {
            const newBook: StudentBook = {
                bookId: courseBook.id,
                name: courseBook.name,
                price: courseBook.price,
                isPaid: false,
                isIssued: false
            };
            setEditingStudent(prev => ({
                ...prev,
                assignedBooks: [...(prev.assignedBooks || []), newBook]
            }));
        }
    };

    const removeBook = (index: number) => {
        setEditingStudent(prev => ({
            ...prev,
            assignedBooks: prev.assignedBooks?.filter((_, i) => i !== index)
        }));
    };

    const getCourseNameForBook = (bookId: string) => {
        const c = courses.find(course => course.books.some(b => b.id === bookId));
        return c?.name || 'Unknown';
    };

    const handleBaseFeeChange = (val: string) => {
        const numericVal = Number(val);
        setBaseFee(numericVal);
        const discount = editingStudent.discountPercent || 0;
        setEditingStudent(prev => ({ ...prev, monthlyFee: Math.round(numericVal * (1 - discount / 100)) }));
    };

    const handleDiscountChange = (val: string) => {
        const numericVal = Number(val);
        const clamped = Math.min(100, Math.max(0, numericVal));
        setEditingStudent(prev => ({ 
            ...prev, 
            discountPercent: clamped,
            monthlyFee: Math.round(baseFee * (1 - clamped / 100))
        }));
    };

    const handleDurationChange = (val: string) => {
        setDiscountDuration(val);
        // Extract numeric value from string if needed for backend, assuming string for display here
        const match = val.match(/\d+/);
        if (match) {
            setEditingStudent(prev => ({ ...prev, discountDuration: Number(match[0]) }));
        } else {
            setEditingStudent(prev => ({ ...prev, discountDuration: undefined })); // Infinite
        }
    };

    // --- PAYMENT HANDLERS ---
    
    // Auto-calculate distribution when amount changes
    const calculateDistribution = (total: number, student: Student) => {
        const distribution: Record<string, number> = {};
        let remaining = total;

        if (student.subjects) {
            const subjectPrices = student.subjects.map(sub => {
                const course = courses.find(c => c.name === sub);
                let price = 0;
                if (course) {
                    if (student.branch && course.branchConfig && course.branchConfig[student.branch]?.isActive) {
                        price = course.branchConfig[student.branch].price;
                    } else {
                        price = (student.branch && course.branchPrices && course.branchPrices[student.branch]) 
                                ? course.branchPrices[student.branch] 
                                : (course.price || 0);
                    }
                    
                    if (student.discountPercent) {
                        price = Math.round(price * (1 - student.discountPercent / 100));
                    }
                }
                return { name: sub, price };
            });

            // Fill sequentially
            subjectPrices.forEach(p => {
                const alloc = Math.min(remaining, p.price);
                distribution[p.name] = alloc;
                remaining -= alloc;
            });

            // If overpayment, add to first subject (or handle as general credit)
            if (remaining > 0 && subjectPrices.length > 0) {
                distribution[subjectPrices[0].name] += remaining;
            }
        }
        return distribution;
    };

    const handlePaymentAmountChange = (newAmount: number) => {
        const dist = calculateDistribution(newAmount, editingStudent);
        setPaymentData(prev => ({
            ...prev,
            amount: newAmount,
            subjectDistribution: dist
        }));
    };

    const handleOpenPaymentModal = () => {
        setPaymentData({
            amount: 0,
            method: 'Наличные',
            subjectDistribution: {},
            promiseDate: '',
            promiseReason: ''
        });
        setShowPaymentModal(true);
    };

    const handlePaymentSubmit = () => {
        if (paymentData.amount <= 0) return;

        // Construct Purpose string from distribution
        let purposeStr = 'Оплата за обучение';
        const distEntries = Object.entries(paymentData.subjectDistribution);
        if (distEntries.length > 0) {
            const details = distEntries
                .filter(([_, amt]) => amt > 0)
                .map(([sub, amt]) => `${sub}: ${amt}`)
                .join(', ');
            if (details) purposeStr += ` (${details})`;
        }

        const newTransaction: Transaction = {
            id: Date.now(),
            studentId: editingStudent.id,
            studentName: editingStudent.fullName,
            amount: paymentData.amount,
            date: new Date().toISOString().split('T')[0],
            type: 'Payment',
            purpose: purposeStr,
            paymentMethod: paymentData.method,
            createdBy: user.fullName
        };

        const updatedBalance = editingStudent.balance + paymentData.amount;
        
        // Update student object locally
        const updatedStudent: Student = { 
            ...editingStudent, 
            balance: updatedBalance,
            debtPromise: (updatedBalance < 0 && paymentData.promiseReason) ? paymentData.promiseReason : editingStudent.debtPromise,
            debtPromiseDeadline: (updatedBalance < 0 && paymentData.promiseDate) ? paymentData.promiseDate : editingStudent.debtPromiseDeadline
        };

        if (updatedBalance >= 0) {
            updatedStudent.debtPromise = undefined;
            updatedStudent.debtPromiseDeadline = undefined;
        }

        // Save transaction
        const allTransactions = storage.get<Transaction[]>(StorageKeys.TRANSACTIONS, []);
        storage.set(StorageKeys.TRANSACTIONS, [newTransaction, ...allTransactions]);
        
        // Save student immediately to storage to persist financial change
        const currentStudents = storage.get<Student[]>(StorageKeys.STUDENTS, []);
        const updatedStudentsList = currentStudents.map(s => s.id === updatedStudent.id ? updatedStudent : s);
        storage.set(StorageKeys.STUDENTS, updatedStudentsList);

        // Update local state
        setEditingStudent(updatedStudent);
        
        storage.notify('Оплата успешно принята', 'success');
        setShowPaymentModal(false);
    };

    const handleValidateAndSave = () => {
        const newErrors: Record<string, boolean> = {};
        if (!editingStudent.fullName) newErrors.fullName = true;
        
        if (editingStudent.parents && editingStudent.parents.length > 0) {
            if (!editingStudent.parents[0].name) newErrors.parentName = true;
            if (!editingStudent.parents[0].phone) newErrors.parentPhone = true;
        }

        // New Mandatory Field Validation
        if (!editingStudent.primaryAdaptationStatus) {
            newErrors.primaryAdaptationStatus = true;
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        onSave(editingStudent);
    };

    const examSubjects = useMemo(() => Array.from(new Set(rawExams.map(e => e.subject))), [rawExams]);
    
    const examData = useMemo(() => {
        const filtered = rawExams.filter(e => examFilter === 'All' || e.subject === examFilter);
        return filtered.map(e => ({
            date: e.date,
            score: Math.round((e.score / e.maxScore) * 100),
            subject: e.subject
        }));
    }, [rawExams, examFilter]);

    const heatmapMonths = useMemo(() => {
        const months = [];
        const today = new Date();
        for (let i = 11; i >= 0; i--) {
            const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
            months.push({ key: d.toISOString().slice(0, 7), label: d.toLocaleString('ru-RU', { month: 'short' }) });
        }
        return months;
    }, []);

    const heatmapData: HeatmapRow[] = useMemo(() => {
        const subjects = editingStudent.subjects || [];
        return subjects.map(sub => {
            const subjectExams = rawExams.filter(e => e.subject === sub);
            const monthsData = heatmapMonths.map(m => {
                const examsInMonth = subjectExams.filter(e => e.date.startsWith(m.key));
                if (examsInMonth.length === 0) return null;
                const totalPercent = examsInMonth.reduce((acc, e) => acc + (e.score / e.maxScore), 0);
                const avgPercent = Math.round((totalPercent / examsInMonth.length) * 100);
                return { percent: avgPercent, count: examsInMonth.length, rawAvg: Math.round(examsInMonth.reduce((a, b) => a + b.score, 0) / examsInMonth.length) };
            });
            return { subject: sub, months: monthsData };
        });
    }, [editingStudent.subjects, rawExams, heatmapMonths]);

    const filteredViolations = useMemo(() => {
        return studentViolations.filter(v => violationFilter === 'All' || v.type === violationFilter || (violationFilter === 'Успеваемость' && v.type === 'ДЗ'));
    }, [studentViolations, violationFilter]);

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="w-full max-w-4xl bg-white dark:bg-slate-800 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200 relative">
                {/* ... Header and Tabs ... */}
                <div className="bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700 p-6 flex items-start justify-between z-10 flex-shrink-0">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800 dark:text-white">
                            {editingStudent.id ? editingStudent.fullName : 'Новый ученик'}
                        </h2>
                        <div className="flex items-center gap-2 mt-2">
                             <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${getStatusColor(editingStudent.status as StudentStatus)}`}>
                                {editingStudent.status}
                             </span>
                             {editingStudent.id && <span className="text-xs text-slate-400 font-mono">ID: {editingStudent.id}</span>}
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full text-slate-400 transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <div className="px-6 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex-shrink-0 overflow-x-auto hide-scrollbar">
                    <div className="flex gap-2 p-1">
                        <button onClick={() => setActiveTab('info')} className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${activeTab === 'info' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-white/50 dark:hover:bg-slate-700/50'}`}>
                            <User size={16} /> 
                            Общее
                            {Object.keys(errors).length > 0 ? <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span> : null}
                        </button>
                        <button onClick={() => setActiveTab('academic')} className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${activeTab === 'academic' ? 'bg-white dark:bg-slate-700 text-purple-600 dark:text-purple-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-white/50 dark:hover:bg-slate-700/50'}`}>
                            <GraduationCap size={16} /> Обучение
                        </button>
                        {!isTeacher && (
                            <button onClick={() => setActiveTab('finance')} className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${activeTab === 'finance' ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-white/50 dark:hover:bg-slate-700/50'}`}>
                                <CreditCard size={16} /> Финансы
                            </button>
                        )}
                        <button onClick={() => setActiveTab('exams')} className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${activeTab === 'exams' ? 'bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-white/50 dark:hover:bg-slate-700/50'}`}>
                            <Award size={16} /> Экзамены
                        </button>
                        <button onClick={() => setActiveTab('violations')} className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${activeTab === 'violations' ? 'bg-white dark:bg-slate-700 text-red-600 dark:text-red-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-white/50 dark:hover:bg-slate-700/50'}`}>
                            <AlertTriangle size={16} /> Нарушения
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-slate-50/50 dark:bg-slate-900/20 pb-24 relative">
                    {/* Content remains the same as previously defined, just ensuring it renders inside the new centered container structure */}
                    {activeTab === 'info' && (
                        <div className="space-y-6 animate-in fade-in duration-300">
                             {/* ... Info Content ... */}
                             <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 space-y-4 shadow-sm">
                                <h3 className="font-bold text-slate-800 dark:text-white border-b border-slate-100 dark:border-slate-700 pb-2 mb-2">Личные данные</h3>
                                <div className="flex items-center gap-5 mb-2">
                                    <div className="relative group shrink-0" ref={photoMenuRef}>
                                        <div className="w-24 h-24 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center overflow-hidden border-4 border-white dark:border-slate-600 shadow-md">
                                            {editingStudent.avatar ? <img src={editingStudent.avatar} alt="Avatar" className="w-full h-full object-cover" /> : <User size={36} className="text-slate-400" />}
                                        </div>
                                        {!isTeacher && (
                                            <button onClick={() => setShowPhotoMenu(!showPhotoMenu)} className="absolute bottom-0 right-0 bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 p-2 rounded-full shadow-lg border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors">
                                                <Pencil size={14} />
                                            </button>
                                        )}
                                        {showPhotoMenu && (
                                            <div className="absolute top-full left-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                                                <div className="p-1">
                                                    <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-3 w-full px-3 py-2.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg transition-colors text-left"><Upload size={14} className="text-blue-500"/> Загрузить фото</button>
                                                    <button onClick={startCamera} className="flex items-center gap-3 w-full px-3 py-2.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg transition-colors text-left"><Camera size={14} className="text-emerald-500"/> Сделать фото</button>
                                                    {editingStudent.avatar && <button onClick={removeAvatar} className="flex items-center gap-3 w-full px-3 py-2.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors text-left border-t border-slate-100 dark:border-slate-700 mt-1"><Trash2 size={14} /> Удалить</button>}
                                                </div>
                                            </div>
                                        )}
                                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                                    </div>
                                    <div className="flex-1">
                                        <InputGroup label="ФИО Ученика" value={editingStudent.fullName} onChange={(v: string) => { setEditingStudent({...editingStudent, fullName: v}); clearError('fullName'); }} disabled={isTeacher} error={errors.fullName} className="mb-0" />
                                        <div className="mt-2 flex gap-2">
                                            {editingStudent.status && <span className={`px-2 py-1 rounded text-xs font-bold ${getStatusColor(editingStudent.status as StudentStatus)} border`}>{editingStudent.status}</span>}
                                            <span className="px-2 py-1 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 rounded text-xs font-bold border border-slate-200 dark:border-slate-600">ID: {editingStudent.id || 'NEW'}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <InputGroup label="Телефон (Необязательно)" value={editingStudent.phone} onChange={(v: string) => { setEditingStudent({...editingStudent, phone: v}); clearError('phone'); }} disabled={isTeacher} error={false} />
                                    <div className="w-full">
                                        <DateRangePicker label="Дата рождения" startDate={editingStudent.birthYear || ''} onChange={(start) => { setEditingStudent({...editingStudent, birthYear: start}); clearError('birthYear'); }} mode="single" align="left" />
                                        {errors.birthYear && <p className="text-[10px] text-red-500 mt-1 font-bold animate-pulse">Обязательное поле</p>}
                                    </div>
                                </div>
                                <div className="mt-2">
                                    <InputGroup label="Аккаунт Repetitor.mobi" value={editingStudent.platformAccount} onChange={(v: string) => setEditingStudent({...editingStudent, platformAccount: v})} disabled={isTeacher} placeholder="Логин / Email" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div><CustomSelect label="Статус (Воронка)" value={editingStudent.pipelineStage || PipelineStage.New} onChange={(val) => setEditingStudent({...editingStudent, pipelineStage: val as PipelineStage})} options={Object.values(PipelineStage)} disabled={isTeacher} /></div>
                                    <div className="flex items-center gap-2 mt-6"><Checkbox label={<span className="flex items-center gap-1"><Eye size={14} className="text-slate-400"/> Справка о дальтонизме</span>} checked={!!editingStudent.isColorBlind} onChange={(checked) => setEditingStudent({...editingStudent, isColorBlind: checked})} disabled={isTeacher} /></div>
                                </div>
                            </div>
                            
                            <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 space-y-4 shadow-sm">
                                <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-700 pb-2 mb-2">
                                    <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2"><Users size={16}/> Родители / Ответственные лица</h3>
                                    {!isTeacher && <button onClick={addParent} className="text-blue-600 dark:text-blue-400 text-xs font-bold flex items-center gap-1 hover:underline"><Plus size={14}/> Добавить</button>}
                                </div>
                                {editingStudent.parents?.map((parent, index) => {
                                    const isCustomRole = !['Мама', 'Папа'].includes(parent.role);
                                    return (
                                        <div key={index} className="space-y-3 bg-slate-50 dark:bg-slate-700/30 p-3 rounded-lg border border-slate-100 dark:border-slate-700 relative group">
                                            <div className="flex justify-between items-start gap-4">
                                                <div className="flex-1 flex gap-2">
                                                    <div className="w-1/3"><CustomSelect value={isCustomRole ? 'Другое' : parent.role} onChange={(val) => handleParentChange(index, 'role', val === 'Другое' ? '' : val)} options={PARENT_ROLES} disabled={isTeacher} /></div>
                                                    {isCustomRole && <div className="flex-1"><input type="text" value={parent.role} onChange={(e) => handleParentChange(index, 'role', e.target.value)} placeholder="Укажите роль (напр. Брат)" disabled={isTeacher} className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500 h-[38px]" /></div>}
                                                </div>
                                                {!isTeacher && index > 0 && <button onClick={() => removeParent(index)} className="text-slate-400 hover:text-red-500 p-1" title="Удалить"><Trash2 size={16}/></button>}
                                            </div>
                                            <div className="grid grid-cols-1 gap-2"><InputGroup label="ФИО" value={parent.name} onChange={(v: string) => { handleParentChange(index, 'name', v); if (index === 0) clearError('parentName'); }} disabled={isTeacher} error={index === 0 && errors.parentName} className="mb-0" /></div>
                                            <div className="grid grid-cols-2 gap-4"><InputGroup label="Телефон" value={parent.phone} onChange={(v: string) => { handleParentChange(index, 'phone', v); if (index === 0) clearError('parentPhone'); }} disabled={isTeacher} error={index === 0 && errors.parentPhone} /><InputGroup label="Email" value={parent.email} onChange={(v: string) => handleParentChange(index, 'email', v)} disabled={isTeacher} /></div>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 space-y-4 shadow-sm">
                                <h3 className="font-bold text-slate-800 dark:text-white border-b border-slate-100 dark:border-slate-700 pb-2 mb-2">Образование и Источник</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <InputGroup label="Школа" value={editingStudent.school} onChange={(v: string) => {setEditingStudent({...editingStudent, school: v}); clearError('school');}} disabled={isTeacher} error={errors.school} />
                                    {/* Using Dynamic GRADES from Company Config */}
                                    <CustomSelect label="Образование" value={editingStudent.grade || ''} onChange={(v) => {setEditingStudent({...editingStudent, grade: v}); clearError('grade');}} options={GRADES} disabled={isTeacher} error={errors.grade} />
                                </div>
                                {/* Using Dynamic SOURCES from Company Config */}
                                <div><CustomSelect label="Откуда узнали" value={editingStudent.source} onChange={(v) => {setEditingStudent({...editingStudent, source: v}); clearError('source');}} options={SOURCES} disabled={isTeacher} error={errors.source} /></div>
                            </div>
                            <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 space-y-4 shadow-sm">
                                <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-slate-700 pb-2 mb-2"><StickyNote size={16} /> Примечание</h3>
                                <textarea className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2 text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 h-24 disabled:opacity-60 disabled:cursor-not-allowed" placeholder="Дополнительная информация о студенте..." value={editingStudent.note || ''} onChange={(e) => setEditingStudent({...editingStudent, note: e.target.value})} disabled={isTeacher}></textarea>
                            </div>
                        </div>
                    )}

                    {activeTab === 'academic' && (
                        <div className="space-y-6 animate-in fade-in duration-300">
                            {/* ... Content of Academic tab (LEAVE_REASONS, STUDY_GOALS from config) ... */}
                            <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                                <div className="flex justify-between items-center mb-4 border-b border-slate-100 dark:border-slate-700 pb-2"><h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2"><Calendar size={18} className="text-blue-500"/>Даты и Статус</h3></div>
                                
                                <div className="grid grid-cols-2 gap-4 mb-4">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400">Статус обучения</span>
                                            {!isTeacher && (
                                                <div className="relative group">
                                                    <Info size={14} className="text-blue-500 cursor-help opacity-70 hover:opacity-100 transition-opacity" />
                                                    {/* Tooltip */}
                                                    <div className="absolute left-0 top-full mt-2 w-64 p-3 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs rounded-xl shadow-xl z-50 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none group-hover:pointer-events-auto border border-slate-200 dark:border-slate-700">
                                                        <div className="space-y-2">
                                                            <div><span className="font-bold text-emerald-600 dark:text-emerald-400">Активен</span>: Учится, баланс списывается.</div>
                                                            <div><span className="font-bold text-slate-500 dark:text-slate-400">Неактивен</span>: Архив (ушел), история сохраняется.</div>
                                                            <div><span className="font-bold text-blue-600 dark:text-blue-400">Предзапись</span>: Новый лид, воронка продаж.</div>
                                                            <div><span className="font-bold text-rose-600 dark:text-rose-400">Отвалился</span>: Лид, который отказался.</div>
                                                            <div><span className="font-bold text-amber-600 dark:text-amber-400">Пауза</span>: Временная заморозка.</div>
                                                        </div>
                                                        {/* Arrow */}
                                                        <div className="absolute -top-1 left-3 w-2 h-2 bg-white dark:bg-slate-800 transform rotate-45 border-t border-l border-slate-200 dark:border-slate-700"></div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        <CustomSelect 
                                            value={editingStudent.status} 
                                            onChange={handleStatusChange} 
                                            options={Object.values(StudentStatus)} 
                                            disabled={isTeacher} 
                                        />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400">Филиал</span>
                                            {!isTeacher && isSuperUser && (
                                                <div className="relative group">
                                                    <MapPin size={12} className="text-slate-400 cursor-help opacity-70 hover:opacity-100 transition-opacity" />
                                                    <div className="absolute right-0 top-full mt-2 w-48 p-2 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs rounded-lg shadow-xl z-50 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none group-hover:pointer-events-auto border border-slate-200 dark:border-slate-700">
                                                        Привязка ученика к конкретной локации учебного центра.
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        <CustomSelect 
                                            value={editingStudent.branch || ''} 
                                            onChange={(v) => setEditingStudent({...editingStudent, branch: v as Branch})} 
                                            options={Object.values(Branch)} 
                                            disabled={!isSuperUser} 
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 mb-4">
                                    <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-100 dark:border-blue-800 relative group"><label className="block text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase mb-1">Дата предзаписи</label><div className="relative"><DateRangePicker startDate={editingStudent.presaleDate || ''} onChange={(d) => setEditingStudent({...editingStudent, presaleDate: d})} mode="single" className="w-full" /></div></div>
                                    <div className="bg-emerald-50 dark:bg-emerald-900/20 p-3 rounded-lg border border-emerald-100 dark:border-emerald-800"><label className="block text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase mb-1">Дата начала обучения</label><div className="relative"><DateRangePicker startDate={editingStudent.startDate || ''} onChange={(d) => setEditingStudent({...editingStudent, startDate: d})} mode="single" className="w-full" /></div></div>
                                    {(editingStudent.status === StudentStatus.Archived || editingStudent.endDate) && <div className="bg-slate-200 dark:bg-slate-700 p-3 rounded-lg border border-slate-300 dark:border-slate-600 animate-in fade-in"><label className="block text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Дата ухода</label><div className="relative"><DateRangePicker startDate={editingStudent.endDate || ''} onChange={(d) => setEditingStudent({...editingStudent, endDate: d})} mode="single" className="w-full" /></div></div>}
                                    {(editingStudent.status === StudentStatus.Dropped || editingStudent.dropOffDate) && <div className="bg-rose-50 dark:bg-rose-900/20 p-3 rounded-lg border border-rose-100 dark:border-rose-800 animate-in fade-in"><label className="block text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase mb-1">Дата отвала</label><div className="relative"><DateRangePicker startDate={editingStudent.dropOffDate || ''} onChange={(d) => setEditingStudent({...editingStudent, dropOffDate: d})} mode="single" className="w-full" /></div></div>}
                                </div>
                                {(editingStudent.status === StudentStatus.Archived || editingStudent.status === StudentStatus.Dropped) && <div className="mb-6 animate-in fade-in"><CustomSelect label="Причина ухода / отвала" value={editingStudent.leaveReason || ''} onChange={(v) => setEditingStudent({...editingStudent, leaveReason: v})} options={LEAVE_REASONS} disabled={isTeacher} /></div>}
                            </div>

                            {/* ... Rest of Academic Tab ... */}
                            <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 space-y-4 shadow-sm">
                                <h3 className="font-bold text-slate-800 dark:text-white border-b border-slate-100 dark:border-slate-700 pb-2 mb-2">Учебная программа</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <InputGroup 
                                        label="Номер договора" 
                                        value={editingStudent.contractNumber || ''} 
                                        onChange={(v: string) => setEditingStudent({...editingStudent, contractNumber: v})} 
                                        placeholder="№ 1234-56" 
                                        disabled={isTeacher} 
                                    />
                                    <CustomSelect 
                                        label="Первичная адаптация" 
                                        value={editingStudent.primaryAdaptationStatus || ''} 
                                        onChange={(v) => {
                                            setEditingStudent({...editingStudent, primaryAdaptationStatus: v});
                                            clearError('primaryAdaptationStatus');
                                        }} 
                                        options={ADAPTATION_STATUSES} 
                                        disabled={isTeacher}
                                        error={errors.primaryAdaptationStatus}
                                        required
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400">Курс (Кластер)</span>
                                            <div className="relative group">
                                                <Info size={14} className="text-blue-500 cursor-help opacity-70 hover:opacity-100 transition-opacity" />
                                                <div className="absolute left-0 top-full mt-2 w-64 p-3 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs rounded-xl shadow-xl z-50 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none group-hover:pointer-events-auto border border-slate-200 dark:border-slate-700">
                                                    <div className="space-y-2">
                                                        <div><span className="font-bold text-slate-800 dark:text-white">1 кластер:</span> Естественный и технический</div>
                                                        <div><span className="font-bold text-slate-800 dark:text-white">2 кластер:</span> Экономико-географический</div>
                                                        <div><span className="font-bold text-slate-800 dark:text-white">3 кластер:</span> Филолого-педагогический</div>
                                                        <div><span className="font-bold text-slate-800 dark:text-white">4 кластер:</span> Обществоведческий и юридический</div>
                                                        <div><span className="font-bold text-slate-800 dark:text-white">5 кластер:</span> Медицинский и биологический</div>
                                                        <div><span className="font-bold text-slate-800 dark:text-white">Языки/Предметы:</span> Отдельные курсы</div>
                                                    </div>
                                                    <div className="absolute -top-1 left-1 w-2 h-2 bg-white dark:bg-slate-800 transform rotate-45 border-t border-l border-slate-200 dark:border-slate-700"></div>
                                                </div>
                                            </div>
                                        </div>
                                        <CustomSelect value={editingStudent.cluster || ''} onChange={(v) => setEditingStudent({...editingStudent, cluster: v as Cluster})} options={Object.values(Cluster)} disabled={isTeacher} />
                                    </div>
                                    <CustomSelect label="Язык обучения" value={editingStudent.studyLanguage || ''} onChange={(v) => setEditingStudent({...editingStudent, studyLanguage: v})} options={STUDY_LANGUAGES} disabled={isTeacher} />
                                </div>
                                
                                {/* ... Rest of Academic Tab (Subject/Groups/Books) ... */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Предметы и Группы</label>
                                    <div className="space-y-3 mb-3">
                                        {editingStudent.subjects && editingStudent.subjects.length > 0 ? editingStudent.subjects.map(subject => {
                                            const availableGroupsForSubject = groups.filter(g => g.subject === subject && (isSuperUser || !user.branch || g.branch === user.branch));
                                            const assignedGroupId = editingStudent.groupIds?.find(id => availableGroupsForSubject.some(g => g.id === id));
                                            const courseObj = courses.find(c => c.name === subject);
                                            const { icon: SubjectIcon, color, bg } = getSubjectIcon(subject, courseObj);

                                            return (
                                                <div key={subject} className="flex items-center justify-between gap-3 p-3 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl shadow-sm">
                                                    <div className="flex items-center gap-3 flex-1">
                                                        <div className={`p-2 rounded-lg ${bg}`}>
                                                            <SubjectIcon size={18} className={color} />
                                                        </div>
                                                        <span className="text-sm font-bold text-slate-800 dark:text-white">{subject}</span>
                                                    </div>
                                                    
                                                    <div className="w-1/2">
                                                        <GroupSelector 
                                                            groups={availableGroupsForSubject}
                                                            selectedGroupId={assignedGroupId}
                                                            onChange={(gid) => handleGroupChangeForSubject(subject, gid.toString())}
                                                            disabled={isTeacher}
                                                        />
                                                    </div>

                                                    {!isTeacher && (
                                                        <button 
                                                            onClick={() => handleRemoveSubject(subject)}
                                                            className="text-slate-400 hover:text-red-500 p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                                            title="Убрать предмет"
                                                        >
                                                            <X size={18} />
                                                        </button>
                                                    )}
                                                </div>
                                            );
                                        }) : (
                                            <div className="text-center text-slate-400 text-xs italic py-4 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
                                                Предметы не выбраны
                                            </div>
                                        )}
                                    </div>
                                    {!isTeacher && (
                                        <div className="relative mt-2" ref={subjectMenuRef}>
                                            <button onClick={() => setShowSubjectMenu(!showSubjectMenu)} className="w-full flex items-center justify-center gap-2 border border-dashed border-blue-300 dark:border-blue-700 rounded-xl p-3 text-sm bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 outline-none hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors font-bold"><Plus size={16} /> Добавить предмет</button>
                                            {showSubjectMenu && (
                                                <div className="absolute top-full left-0 w-full mt-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 max-h-60 overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95 duration-100">
                                                    <div className="p-1">
                                                        {courses.filter(c => !editingStudent.subjects?.includes(c.name)).map(c => {
                                                                const { icon: Icon, color } = getSubjectIcon(c.name, c);
                                                                return (
                                                                    <button key={c.id} onClick={() => handleAddSubject(c.name)} className="w-full text-left px-3 py-2.5 text-sm rounded-lg transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/50 flex items-center gap-3 text-slate-700 dark:text-slate-200">
                                                                        <Icon size={16} className={color} /> {c.name}
                                                                    </button>
                                                                );
                                                            })
                                                        }
                                                        {courses.filter(c => !editingStudent.subjects?.includes(c.name)).length === 0 && <div className="p-2 text-center text-xs text-slate-400">Все предметы добавлены</div>}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                                <h3 className="font-bold text-slate-800 dark:text-white border-b border-slate-100 dark:border-slate-700 pb-2 mb-4">Учебные материалы (Книги)</h3>
                                <div className="space-y-2">
                                    {editingStudent.assignedBooks?.map((book, idx) => (
                                        <div key={idx} className="flex justify-between items-center bg-slate-50 dark:bg-slate-700/50 p-2 rounded border border-slate-100 dark:border-slate-700">
                                            <div><div className="text-sm font-bold text-slate-800 dark:text-white">{book.name}</div><div className="text-xs text-slate-500">{getCourseNameForBook(book.bookId)} • {book.price} с. • {book.issuedDate || 'Не выдана'}</div></div>
                                            <div className="flex items-center gap-3">
                                                <div className="flex flex-col gap-1 items-end">
                                                    <button onClick={() => { if (isTeacher) return; const updated = [...(editingStudent.assignedBooks || [])]; updated[idx].isIssued = !updated[idx].isIssued; if (updated[idx].isIssued && !updated[idx].issuedDate) { updated[idx].issuedDate = new Date().toISOString().split('T')[0]; } setEditingStudent({...editingStudent, assignedBooks: updated}); }} disabled={isTeacher} className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border transition-colors ${book.isIssued ? 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800' : 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-700 dark:text-slate-400 dark:border-slate-600 hover:bg-slate-200 dark:hover:bg-slate-600'}`}>{book.isIssued ? <Check size={10} /> : <X size={10} />}{book.isIssued ? 'Выдана' : 'Не выдана'}</button>
                                                </div>
                                                {!isTeacher && <button onClick={() => removeBook(idx)} className="text-slate-400 hover:text-red-500 ml-2"><Trash2 size={14} /></button>}
                                            </div>
                                        </div>
                                    ))}
                                    {(!editingStudent.assignedBooks || editingStudent.assignedBooks.length === 0) && <div className="text-center text-slate-400 text-xs italic py-2">Нет выданных материалов</div>}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'finance' && (
                        <div className="space-y-6 animate-in fade-in duration-300">
                            {/* ... (Finance State Header and Editable Fees Section remain same) ... */}
                            {/* --- FINANCIAL STATE HEADER --- */}
                            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                                    <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Финансовое состояние</h3>
                                    <button 
                                        onClick={handleOpenPaymentModal} 
                                        disabled={isTeacher} 
                                        className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 shadow-sm transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <Wallet size={18}/> Принять оплату
                                    </button>
                                </div>

                                <div className="flex flex-col sm:flex-row items-baseline gap-2 mb-2">
                                    <div className="text-sm text-slate-500">Текущий баланс</div>
                                    <div className={`text-4xl font-bold ${editingStudent.balance < 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                                        {editingStudent.balance} <span className="text-xl font-medium text-slate-400">с.</span>
                                    </div>
                                </div>

                                <div className="flex flex-col sm:flex-row justify-between items-end border-t border-slate-100 dark:border-slate-700 pt-4 mt-2">
                                    <div>
                                        <div className="text-sm text-slate-500 mb-1">К оплате (ежемесячно)</div>
                                        <div className="text-2xl font-bold text-slate-800 dark:text-white">
                                            {editingStudent.monthlyFee} с.
                                        </div>
                                        <div className="text-xs text-slate-400 mt-1">
                                            * Расчет по тарифам филиала {editingStudent.branch || 'Не указан'}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            {/* --- EDITABLE FEES SECTION --- */}
                            <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-xl border border-slate-200 dark:border-slate-700">
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                                    <InputGroup 
                                        label="Базовая стоимость" 
                                        type="number"
                                        value={baseFee} 
                                        onChange={handleBaseFeeChange} 
                                        disabled={isTeacher} 
                                        className="bg-white dark:bg-slate-800"
                                    />
                                    <InputGroup 
                                        label="Скидка (%)" 
                                        type="number"
                                        value={editingStudent.discountPercent || ''} 
                                        onChange={handleDiscountChange} 
                                        disabled={isTeacher}
                                        className="bg-white dark:bg-slate-800"
                                    />
                                    <CustomSelect
                                        label="Длительность"
                                        value={discountDuration}
                                        onChange={handleDurationChange}
                                        options={DISCOUNT_DURATIONS}
                                        disabled={isTeacher}
                                        className="bg-white dark:bg-slate-800"
                                    />
                                </div>

                                <div className="flex justify-between items-center mb-4 px-2">
                                    <span className="text-sm font-medium text-slate-500">Итого в месяц:</span>
                                    <span className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                        <Calculator size={16} className="text-slate-400"/> {editingStudent.monthlyFee} с.
                                    </span>
                                </div>

                                <InputGroup 
                                    label="Основание для скидки" 
                                    value={editingStudent.discountReason} 
                                    onChange={(v: string) => setEditingStudent({...editingStudent, discountReason: v})} 
                                    disabled={isTeacher} 
                                    placeholder="Например: Сотрудник, Сирота"
                                    className="bg-white dark:bg-slate-800"
                                />
                            </div>

                            {/* Transaction History */}
                            <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                                <h3 className="font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2"><History size={18}/> История операций</h3>
                                <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
                                    {studentTransactions.length > 0 ? studentTransactions.map(t => (
                                        <div key={t.id} className="flex justify-between items-center text-sm p-2 hover:bg-slate-50 dark:hover:bg-slate-700/30 rounded border-b border-slate-50 dark:border-slate-700/50 last:border-0">
                                            <div>
                                                <span className="font-bold text-slate-700 dark:text-slate-200">{t.type === 'Payment' ? 'Оплата' : 'Возврат'}</span>
                                                <span className="text-slate-400 text-xs ml-2">{t.date}</span>
                                                <div className="text-[10px] text-slate-400">{t.purpose}</div>
                                            </div>
                                            <span className={`font-bold ${t.type === 'Payment' ? 'text-emerald-600' : 'text-red-600'}`}>
                                                {t.type === 'Payment' ? '+' : '-'}{t.amount} с.
                                            </span>
                                        </div>
                                    )) : <p className="text-center text-slate-400 text-xs py-4">Нет операций</p>}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ... (Exams and Violations and History Overlay remain same) ... */}
                    {activeTab === 'exams' && (
                        <div className="space-y-6 animate-in fade-in duration-300">
                            {/* ... Content of Exams tab ... */}
                            <div className="flex gap-2 overflow-x-auto pb-2 hide-scrollbar">
                                {['All', ...examSubjects].map(sub => (
                                    <button
                                        key={sub}
                                        onClick={() => setExamFilter(sub)}
                                        className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${examFilter === sub ? 'bg-amber-500 text-white shadow-md' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'}`}
                                    >
                                        {sub === 'All' ? 'Все предметы' : sub}
                                    </button>
                                ))}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm h-64">
                                    <h4 className="text-xs font-bold text-slate-500 uppercase mb-4">Динамика успеваемости</h4>
                                    <ResponsiveContainer width="100%" height="80%">
                                        <LineChart data={examData}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                            <XAxis dataKey="date" hide />
                                            <YAxis domain={[0, 100]} hide />
                                            <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                            <Line type="monotone" dataKey="score" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4, fill: '#f59e0b' }} activeDot={{ r: 6 }} />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm h-64 overflow-y-auto custom-scrollbar">
                                    <h4 className="text-xs font-bold text-slate-500 uppercase mb-4 sticky top-0 bg-white dark:bg-slate-800 z-10">История экзаменов</h4>
                                    <div className="space-y-2">
                                        {rawExams.filter(e => examFilter === 'All' || e.subject === examFilter).map(exam => (
                                            <div key={exam.id} className="flex justify-between items-center p-2 hover:bg-slate-50 dark:hover:bg-slate-700/30 rounded border border-slate-100 dark:border-slate-700">
                                                <div>
                                                    <div className="text-sm font-bold text-slate-800 dark:text-slate-200">{exam.subject}</div>
                                                    <div className="text-xs text-slate-400">{exam.date}</div>
                                                </div>
                                                <div className="text-right">
                                                    <div className={`text-sm font-black ${getScoreColor((exam.score / exam.maxScore) * 100).split(' ')[0].replace('bg-', 'text-')}`}>
                                                        {exam.score}/{exam.maxScore}
                                                    </div>
                                                    <div className="text-[10px] text-slate-400">{Math.round((exam.score / exam.maxScore) * 100)}%</div>
                                                </div>
                                            </div>
                                        ))}
                                        {rawExams.length === 0 && <p className="text-center text-slate-400 text-xs py-4">Нет данных</p>}
                                    </div>
                                </div>
                            </div>
                            
                            {/* Heatmap */}
                            <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                                <h4 className="text-xs font-bold text-slate-500 uppercase mb-4">Тепловая карта (Средний балл)</h4>
                                <div className="overflow-x-auto">
                                    <div className="min-w-[500px]">
                                        <div className="flex">
                                            <div className="w-24 shrink-0"></div>
                                            {heatmapMonths.map(m => (
                                                <div key={m.key} className="flex-1 text-center text-[10px] font-bold text-slate-400 uppercase">{m.label}</div>
                                            ))}
                                        </div>
                                        <div className="space-y-1 mt-2">
                                            {heatmapData.map(row => (
                                                <div key={row.subject} className="flex items-center">
                                                    <div className="w-24 shrink-0 text-xs font-bold text-slate-600 dark:text-slate-300 truncate pr-2">{row.subject}</div>
                                                    {row.months.map((m, i) => (
                                                        <div key={i} className="flex-1 h-8 flex items-center justify-center m-0.5 rounded text-[10px] font-bold text-white relative group cursor-default"
                                                            style={{ backgroundColor: m ? (m.percent >= 80 ? '#10b981' : m.percent >= 50 ? '#f59e0b' : '#ef4444') : '#f1f5f9' }}
                                                        >
                                                            {m && m.percent}
                                                            {m && (
                                                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none z-50 whitespace-nowrap">
                                                                    {m.rawAvg} баллов ({m.count} экз.)
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'violations' && (
                        <div className="space-y-6 animate-in fade-in duration-300">
                            {/* ... Content of Violations tab ... */}
                            <div className="flex justify-between items-center bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                                <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2"><AlertTriangle size={18} className="text-red-500"/> Журнал нарушений</h3>
                                <div className="relative" ref={violationFilterRef}>
                                    <button onClick={() => setShowViolationFilterMenu(!showViolationFilterMenu)} className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 px-3 py-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
                                        <Filter size={12}/> {violationFilter === 'All' ? 'Все типы' : violationFilter}
                                    </button>
                                    {showViolationFilterMenu && (
                                        <div className="absolute right-0 top-full mt-1 w-40 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl shadow-xl z-50 overflow-hidden">
                                            {['All', 'Опоздание', 'Поведение', 'Успеваемость'].map(f => (
                                                <button key={f} onClick={() => { setViolationFilter(f); setShowViolationFilterMenu(false); }} className="w-full text-left px-4 py-2 text-xs hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200">
                                                    {f === 'All' ? 'Все типы' : f}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-3">
                                {filteredViolations.map(v => (
                                    <div key={v.id} className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex gap-4">
                                        <div className={`w-1 shrink-0 rounded-full ${v.type === 'Поведение' ? 'bg-red-500' : v.type === 'Опоздание' ? 'bg-amber-500' : 'bg-orange-500'}`}></div>
                                        <div className="flex-1">
                                            <div className="flex justify-between items-start mb-1">
                                                <span className={`text-xs font-bold px-2 py-0.5 rounded uppercase ${v.type === 'Поведение' ? 'bg-red-100 text-red-700' : v.type === 'Опоздание' ? 'bg-amber-100 text-amber-700' : 'bg-orange-100 text-orange-700'}`}>
                                                    {v.type === 'ДЗ' ? 'Успеваемость' : v.type}
                                                </span>
                                                <span className="text-xs text-slate-400">{v.date}</span>
                                            </div>
                                            <p className="text-sm text-slate-700 dark:text-slate-300 mt-2">{v.comment}</p>
                                            {v.subject && <p className="text-xs text-slate-400 mt-1 italic">Предмет: {v.subject}</p>}
                                        </div>
                                    </div>
                                ))}
                                {filteredViolations.length === 0 && (
                                    <div className="text-center py-10 text-slate-400">
                                        <Shield size={32} className="mx-auto mb-2 opacity-20"/>
                                        <p className="text-sm">Нет зафиксированных нарушений</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-6 border-t border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 flex justify-between items-center rounded-b-2xl flex-shrink-0">
                    <button 
                        onClick={() => setShowHistory(true)}
                        className="text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 font-bold text-sm flex items-center gap-2 transition-colors"
                    >
                        <History size={18} /> История изменений
                    </button>
                    <button 
                        onClick={handleValidateAndSave}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-blue-500/30 transition-all active:scale-95 ml-auto"
                    >
                        <Save size={20} />
                        Сохранить
                    </button>
                </div>

                {/* History Overlay (Slide Up) */}
                {showHistory && (
                    <div className="absolute inset-0 bg-black/20 backdrop-blur-[2px] z-50 flex items-end sm:items-center justify-center animate-in fade-in duration-200">
                        <div className="w-full h-[60%] sm:h-[80%] sm:w-[90%] bg-slate-100 dark:bg-slate-900 rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-300">
                            <div className="p-4 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                                <h3 className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                                    <RotateCcw size={18} /> ЖУРНАЛ ДЕЙСТВИЙ
                                </h3>
                                <button onClick={() => setShowHistory(false)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full text-slate-400">
                                    <X size={20} />
                                </button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                {historyLogs.length > 0 ? historyLogs.map(log => (
                                    <div key={log.id} className="relative pl-6 border-l-2 border-slate-200 dark:border-slate-700 pb-4 last:pb-0">
                                        <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-white dark:bg-slate-800 border-2 border-blue-500"></div>
                                        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                                            <div className="flex justify-between items-start mb-1">
                                                <h4 className="font-bold text-slate-800 dark:text-white text-sm">{log.action}</h4>
                                                <span className="text-xs text-slate-400 font-mono">{new Date(log.timestamp).toLocaleString()}</span>
                                            </div>
                                            <p className="text-sm text-slate-600 dark:text-slate-300 mb-3">{log.details}</p>
                                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[10px] font-bold border border-blue-100 dark:border-blue-800">
                                                by {log.userName}
                                            </span>
                                        </div>
                                    </div>
                                )) : (
                                    <div className="flex flex-col items-center justify-center h-full text-slate-400">
                                        <History size={48} className="mb-4 opacity-20"/>
                                        <p>История изменений пуста</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Payment Modal */}
            {showPaymentModal && (
                <div className="absolute inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md p-6 relative">
                        <button onClick={() => setShowPaymentModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"><X size={20}/></button>
                        <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2"><Wallet size={24} className="text-emerald-500"/> Прием оплаты</h3>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Сумма (сомони)</label>
                                <input 
                                    type="number" 
                                    value={paymentData.amount || ''}
                                    onChange={(e) => handlePaymentAmountChange(Number(e.target.value))}
                                    className="w-full text-3xl font-black text-slate-800 dark:text-white bg-transparent border-b-2 border-slate-200 focus:border-emerald-500 outline-none py-2"
                                    placeholder="0"
                                    autoFocus
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Способ оплаты</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {['Наличные', 'Алиф', 'DC', 'Карта', 'Перевод'].map(m => (
                                        <button 
                                            key={m}
                                            onClick={() => setPaymentData({...paymentData, method: m as any})}
                                            className={`py-2 rounded-lg text-sm font-bold border transition-all ${paymentData.method === m ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'bg-slate-50 border-transparent text-slate-600 hover:bg-slate-100'}`}
                                        >
                                            {m}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Subject Distribution (Optional) */}
                            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Распределение по предметам (опционально)</label>
                                {Object.keys(paymentData.subjectDistribution).length > 0 ? (
                                    <div className="space-y-2">
                                        {Object.entries(paymentData.subjectDistribution).map(([subject, price]) => (
                                            <div key={subject} className="flex items-center justify-between">
                                                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{subject}</span>
                                                <div className="flex items-center gap-2">
                                                    <input 
                                                        type="number"
                                                        className="w-20 p-1 text-right text-sm border border-slate-200 dark:border-slate-600 rounded bg-white dark:bg-slate-700 outline-none focus:border-blue-500"
                                                        value={price}
                                                        onChange={(e) => {
                                                            const newDist = {...paymentData.subjectDistribution, [subject]: Number(e.target.value)};
                                                            setPaymentData({...paymentData, subjectDistribution: newDist});
                                                        }}
                                                    />
                                                    <span className="text-xs text-slate-400">с.</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-xs text-slate-400 italic">Нет предметов для распределения</p>
                                )}
                            </div>

                            {(editingStudent.balance + paymentData.amount) < 0 && (
                                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-900/30 animate-in slide-in-from-top-2">
                                    <div className="flex items-center gap-2 mb-3">
                                        <FileSignature size={18} className="text-blue-600" />
                                        <h4 className="font-bold text-blue-700 dark:text-blue-300 text-sm">Обещание оплаты (Расписка)</h4>
                                    </div>
                                    <div className="space-y-3">
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Обещанная дата оплаты</label>
                                            <DateRangePicker 
                                                startDate={paymentData.promiseDate || ''}
                                                onChange={(d) => setPaymentData({...paymentData, promiseDate: d})}
                                                mode="single"
                                                className="w-full"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Комментарий к долгу</label>
                                            <input 
                                                type="text" 
                                                className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2 text-sm bg-white dark:bg-slate-700"
                                                placeholder="Например: Зарплата родителей 15-го числа"
                                                value={paymentData.promiseReason}
                                                onChange={(e) => setPaymentData({...paymentData, promiseReason: e.target.value})}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            <button 
                                onClick={handlePaymentSubmit}
                                disabled={paymentData.amount <= 0}
                                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-emerald-500/30 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed mt-4"
                            >
                                Подтвердить оплату
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
