
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Student, StudentStatus, Branch, Cluster, AuditLog, Transaction, ExamResult, Course, Group, StudentBook, PipelineStage, Violation, UserProfile, UserRole, ParentInfo, Company, Employee, CourseProgram, SubjectStatusInfo, BranchEntity } from '../types';
import { storage, StorageKeys } from '../services/storage';
import { X, User, GraduationCap, CreditCard, Award, Trash2, History, Save, AlertTriangle, Activity, Calendar, FileText, Percent, Eye, Check, StickyNote, Globe, Shield, Clock, Book, Calculator, Filter, Plus, FileSignature, PackageCheck, Camera, Upload, AlertCircle, Pencil, Image, Users, Info, ChevronDown, BookOpen, FlaskConical, Atom, Dna, Scroll, Gavel, Code, HelpCircle, TrendingUp, Wallet, Banknote, Landmark, Music, Dumbbell, Brain, Rocket, Languages, PenTool, MapPin, DoorOpen, RotateCcw, CheckCircle, ChevronRight, Layers, HelpCircle as OtherIcon, Undo2, UserCheck, FilterX, ShieldAlert } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { DateRangePicker } from './DateRangePicker';
import { Checkbox } from './Checkbox';
import { CustomSelect } from './CustomSelect';
import { PaymentModal } from './PaymentModal';

const STUDY_LANGUAGES = ["Русский", "Таджикский", "Английский"];
const PARENT_ROLES = ["Мама", "Папа", "Другое"];

const DISCOUNT_DURATIONS = [
    '1 month',
    '3 months',
    '6 months',
    '9 months',
    'Full year (12)'
];

const ICON_MAP: Record<string, React.ElementType> = {
    'Calculator': Calculator, 'FlaskConical': FlaskConical, 'Atom': Atom, 'Dna': Dna,
    'Globe': Globe, 'Scroll': Scroll, 'Gavel': Gavel, 'Code': Code, 'BookOpen': BookOpen,
    'Music': Music, 'Dumbbell': Dumbbell, 'Brain': Brain, 'Rocket': Rocket,
    'Languages': Languages, 'PenTool': PenTool
};

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
    if (n.includes('физ')) return { icon: Atom, color: 'text-indigo-500', bg: 'bg-blue-100 dark:bg-blue-900/30' };
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

const getScoreColor = (percent: number, isExtra: boolean = false): string => {
    if (isExtra) return 'bg-slate-400 text-white';
    if (percent >= 80) return 'bg-emerald-500 text-white';
    if (percent >= 50) return 'bg-amber-500 text-white';
    return 'bg-red-500 text-white';
};

const InputGroup = ({ label, value, onChange, type = "text", placeholder = "", className = "", disabled = false, error = false, ...props }: any) => (
    <div className={className}>
      <label className={`block text-[11px] font-semibold mb-1 transition-colors ${error ? 'text-red-600 dark:text-red-400' : 'text-slate-500 dark:text-slate-400'}`}>
          {label} {error && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <input
        type={type}
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className={`w-full border rounded-lg p-2 text-sm outline-none transition-all duration-300 h-[38px]
            ${error 
                ? 'border-red-500 ring-4 ring-red-500/10 bg-red-50 dark:bg-red-900/20 text-red-900 dark:text-red-100 placeholder-red-300' 
                : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 placeholder-slate-400'
            }
            ${disabled ? 'opacity-60 cursor-not-allowed bg-slate-100 dark:bg-slate-800' : ''}
        `}
        {...props}
      />
      {error && <p className="text-[10px] text-red-600 dark:text-red-400 mt-1 font-semibold animate-in fade-in slide-in-from-top-1">Обязательное поле для заполнения</p>}
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

    const isGroupFull = selectedGroup ? (Number(selectedGroup.studentsCount) || 0) >= (Number(selectedGroup.maxStudents) || 0) : false;

    return (
        <div className="relative w-full group" ref={containerRef}>
            {selectedGroup && !isOpen && (
                <div className="absolute bottom-full left-0 mb-2 w-max max-w-[220px] p-2 bg-slate-900 dark:bg-slate-800 text-white text-xs rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[200] animate-in fade-in slide-in-from-bottom-2 border border-slate-700 dark:border-slate-600">
                    <div className="font-bold border-b border-slate-700 dark:border-slate-600 pb-1 mb-1 text-slate-300 flex items-center gap-1">
                        <Clock size={10} /> Расписание
                    </div>
                    <div className="font-mono text-emerald-400 mb-1 text-xs">{getGroupSchedule(selectedGroup)}</div>
                    <div className="text-slate-300 truncate">{selectedGroup.teacher}</div>
                    {selectedGroup.room && <div className="text-slate-400 mt-1 flex items-center gap-1"><DoorOpen size={10}/> {selectedGroup.room}</div>}
                    <div className="absolute -bottom-1 left-4 w-2 h-2 bg-slate-900 dark:bg-slate-800 transform rotate-45 border-r border-b border-slate-700 dark:border-slate-600"></div>
                </div>
            )}

            <button
                type="button"
                onClick={() => !disabled && setIsOpen(!isOpen)}
                className={`
                    w-full flex items-center justify-between px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border rounded-lg shadow-sm h-[38px] truncate outline-none relative
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
                                <span className="text-slate-500 dark:text-slate-400 truncate hidden sm:inline">— {String(selectedGroup.teacher).split(' ')[0]}</span>
                            </span>
                        )
                        : placeholder}
                </span>
                <ChevronDown size={14} className={`ml-2 text-slate-400 transition-transform duration-300 flex-shrink-0 ${isOpen ? 'rotate-180 text-blue-500' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute top-full left-0 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                    <div className="max-h-64 overflow-y-auto custom-scrollbar p-1">
                        {groups.map(group => {
                            const isSelected = group.id === selectedGroupId;
                            const isFull = Number(group.studentsCount || 0) >= Number(group.maxStudents || 0);
                            const scheduleStr = getGroupSchedule(group);
                            
                            return (
                                <button
                                    type="button"
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
                                                : 'bg-slate-100 text-slate-500 dark:text-slate-700 dark:text-slate-400'
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
    onDelete?: (id: number) => void;
}

interface HeatmapRow {
    subject: string;
    months: ({ percent: number; count: number; rawAvg: number; rawMax: number, isExtra?: boolean } | null)[];
}

const ExamLineChartTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white dark:bg-slate-700 p-3 border border-slate-200 dark:border-slate-600 rounded-lg shadow-lg">
          <p className="text-sm font-bold text-slate-700 dark:text-slate-100 mb-1">{label}</p>
          <p className="text-sm text-blue-600 dark:text-blue-400">Ср. балл: {data.avgScoreActual}/{data.avgMaxScoreActual} ({data.score}%)</p>
          {data.hasExtra && <p className="text-[10px] text-amber-500 font-bold uppercase mt-1 flex items-center gap-1"><ShieldAlert size={10}/> Содержит результаты вне программы</p>}
        </div>
      );
    }
    return null;
};

// Helper function to compress image
const compressImage = (dataUrl: string, maxWidth = 400, maxHeight = 400): Promise<string> => {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;
            if (width > height) {
                if (width > maxWidth) {
                    height *= maxWidth / width;
                    width = maxWidth;
                }
            } else {
                if (height > maxHeight) {
                    width *= maxHeight / height;
                    height = maxHeight;
                }
            }
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(img, 0, 0, width, height);
            // Convert to JPEG with 0.8 quality for optimal compression/quality ratio
            resolve(canvas.toDataURL('image/jpeg', 0.8));
        };
        img.src = dataUrl;
    });
};

export const StudentProfileModal: React.FC<StudentProfileModalProps> = ({ student, onClose, onSave, onDelete }) => {
    const user = storage.get<UserProfile>(StorageKeys.USER_PROFILE, { role: UserRole.GeneralDirector, fullName: 'Admin', email: '', permissions: [] });
    const company = storage.getCompanyConfig(user.companyId || 'repetitor_tj');
    
    const SOURCES = company.dictionaries.sources;
    const GRADES = company.dictionaries.grades;
    const LEAVE_REASONS = company.dictionaries.leaveReasons;

    // Helper to normalize objects for comparison (removes nulls and ensures empty arrays)
    const normalizeStudent = (s: any): string => {
        const clean = JSON.parse(JSON.stringify(s));
        // Remove transient or decorative fields that shouldn't block closing
        delete clean.lastModifiedAt;
        delete clean.lastModifiedBy;
        // Ensure defaults for comparison
        if (!clean.subjects) clean.subjects = [];
        if (!clean.groupIds) clean.groupIds = [];
        if (!clean.assignedBooks) clean.assignedBooks = [];
        if (!clean.subjectDiscounts) clean.subjectDiscounts = {};
        if (!clean.subjectDetails) clean.subjectDetails = {};
        if (clean.phone === '+992 ') clean.phone = '';
        return JSON.stringify(clean);
    };

    const [editingStudent, setEditingStudent] = useState<Student>(() => ({ 
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
              }],
        subjectDiscounts: student.subjectDiscounts || {},
        subjectDetails: student.subjectDetails || {}
    }));
    
    const [originalSnapshot, setOriginalSnapshot] = useState<string>('');

    // Capture snapshot AFTER initial state is fully constructed
    useEffect(() => {
        setOriginalSnapshot(normalizeStudent(editingStudent));
    }, []);

    const [errors, setErrors] = useState<Record<string, boolean>>({});
    const [showPhotoMenu, setShowPhotoMenu] = useState(false);
    const [showSubjectMenu, setShowSubjectMenu] = useState(false);
    const [violationFilter, setViolationFilter] = useState('All');
    const [showViolationFilterMenu, setShowViolationFilterMenu] = useState(false);
    const violationFilterRef = useRef<HTMLDivElement>(null);

    const [showHistory, setShowHistory] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);

    const [showViolationModal, setShowViolationModal] = useState(false);
    const [newViolationData, setNewViolationData] = useState<Partial<Violation>>({
        type: 'Поведение',
        date: new Date().toISOString().split('T')[0],
        subject: '',
        reporter: user.fullName
    });

    const [discountDuration, setDiscountDuration] = useState<string>(
        editingStudent.discountDuration ? `${editingStudent.discountDuration} мес.` : 'Весь год (12)'
    );

    const courses = storage.get<Course[]>(StorageKeys.COURSES, []);
    const programs = storage.get<CourseProgram[]>(StorageKeys.COURSE_PROGRAMS, []);
    const groups = storage.get<Group[]>(StorageKeys.GROUPS, []);
    const employees = storage.get<Employee[]>(StorageKeys.EMPLOYEES, []);
    const allAttendance = storage.get<Record<string, any>>(StorageKeys.ATTENDANCE, {});

    // Fixed: Added branches and dynamicBranchList from storage for selection
    const branchesData = storage.get<BranchEntity[]>(StorageKeys.BRANCHES, []);
    const dynamicBranchList = useMemo(() => branchesData.filter(b => b.isActive).map(b => b.name).sort(), [branchesData]);
    
    const fileInputRef = useRef<HTMLInputElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const [showCamera, setShowCamera] = useState(false);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const photoMenuRef = useRef<HTMLDivElement>(null);
    const subjectMenuRef = useRef<HTMLDivElement>(null);

    // --- Attendance Courses Filter State ---
    const [selectedAttendanceCourses, setSelectedAttendanceCourses] = useState<string[]>([]);

    // --- Undo Logic for Subject Deletion ---
    const [undoSubjectData, setUndoSubjectData] = useState<{ 
        subjects: string[], 
        groupIds: number[], 
        subjectDiscounts: Record<string, number>,
        subjectDetails: Record<string, SubjectStatusInfo>,
        removedSubject: string
    } | null>(null);
    const [undoTimer, setUndoTimer] = useState(0);

    useEffect(() => {
        let timer: any;
        if (undoTimer > 0) {
            timer = setTimeout(() => setUndoTimer(prev => prev - 1), 1000);
        } else if (undoTimer === 0 && undoSubjectData) {
            setUndoSubjectData(null);
        }
        return () => clearTimeout(timer);
    }, [undoTimer, undoSubjectData]);

    const handleUndoSubjectDeletion = () => {
        if (!undoSubjectData) return;
        setEditingStudent(prev => ({
            ...prev,
            subjects: undoSubjectData.subjects,
            groupIds: undoSubjectData.groupIds,
            subjectDiscounts: undoSubjectData.subjectDiscounts,
            subjectDetails: undoSubjectData.subjectDetails
        }));
        setUndoSubjectData(null);
        setUndoTimer(0);
        storage.notify(`Курс "${undoSubjectData.removedSubject}" восстановлен`, 'info');
    };

    const isCustomReason = useMemo(() => {
        if (!editingStudent.leaveReason) return false;
        return editingStudent.leaveReason === 'Другое' || !LEAVE_REASONS.includes(editingStudent.leaveReason);
    }, [editingStudent.leaveReason, LEAVE_REASONS]);

    const checkChangesAndClose = (e?: React.MouseEvent) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        
        const currentSnapshot = normalizeStudent(editingStudent);
        
        if (originalSnapshot && currentSnapshot !== originalSnapshot) {
            if (!confirm('Есть несохраненные изменения. Вы уверены, что хотите закрыть окно без сохранения?')) {
                return;
            }
        }
        onClose();
    };

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                if (showPaymentModal) setShowPaymentModal(false);
                else if (showHistory) setShowHistory(false);
                else checkChangesAndClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [editingStudent, showPaymentModal, showHistory, originalSnapshot]);

    // Balance sync after payment
    useEffect(() => {
        if (!showPaymentModal && editingStudent.id) {
            const allStudents = storage.get<Student[]>(StorageKeys.STUDENTS, []);
            const updatedInGlobal = allStudents.find(s => Number(s.id) === Number(editingStudent.id));
            if (updatedInGlobal && Number(updatedInGlobal.balance) !== Number(editingStudent.balance)) {
                setEditingStudent(prev => ({ ...prev, balance: Number(updatedInGlobal.balance) }));
            }
        }
    }, [showPaymentModal]);

    const getSubjectBasePrice = (subjectName: string): number => {
        const course = courses.find(c => c.name === subjectName);
        if (!course) return 0;
        if (editingStudent.branch && course.branchConfig && course.branchConfig[editingStudent.branch]?.isActive) {
            return course.branchConfig[editingStudent.branch].price;
        }
        if (editingStudent.branch && course.branchPrices && course.branchPrices[editingStudent.branch]) {
            return course.branchPrices[editingStudent.branch];
        }
        return course.price || 0;
    };

    const subjectFinanceData = useMemo(() => {
        return (editingStudent.subjects || []).map(sub => {
            const basePrice = getSubjectBasePrice(sub);
            const discount = editingStudent.subjectDiscounts?.[sub] ?? (editingStudent.discountPercent || 0);
            const finalPrice = Math.round(basePrice * (1 - discount / 100));
            return {
                name: sub,
                basePrice,
                discount,
                finalPrice
            };
        });
    }, [editingStudent.subjects, editingStudent.subjectDiscounts, editingStudent.discountPercent, editingStudent.branch, courses]);

    const totalMonthlyFee = useMemo(() => {
        return subjectFinanceData.reduce((sum, item) => sum + item.finalPrice, 0);
    }, [subjectFinanceData]);

    const [activeTab, setActiveTab] = useState<'info' | 'academic' | 'attendance' | 'exams' | 'violations' | 'finance'>('info');
    const [examFilter, setExamFilter] = useState<string>('Все');

    useEffect(() => {
        if (editingStudent.monthlyFee !== totalMonthlyFee) {
            setEditingStudent(prev => ({ ...prev, monthlyFee: totalMonthlyFee }));
        }
    }, [totalMonthlyFee]);

    const handleSubjectDiscountChange = (subject: string, val: string) => {
        const numVal = Math.min(100, Math.max(0, Number(val)));
        setEditingStudent(prev => ({
            ...prev,
            subjectDiscounts: {
                ...(prev.subjectDiscounts || {}),
                [subject]: numVal
            }
        }));
    };

    const handleSubjectDateChange = (subject: string, type: 'startDate' | 'endDate', date: string) => {
        setEditingStudent(prev => ({
            ...prev,
            subjectDetails: {
                ...(prev.subjectDetails || {}),
                [subject]: {
                    ...(prev.subjectDetails?.[subject] || {}),
                    [type]: date
                }
            }
        }));
    };

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
    const [allExams, setAllExams] = useState<ExamResult[]>(() => storage.get(StorageKeys.EXAM_RESULTS, []));
    const [allViolations, setAllViolations] = useState<Violation[]>(() => storage.get<Violation[]>(StorageKeys.VIOLATIONS, []));
    
    const isSuperUser = [UserRole.GeneralDirector, UserRole.Director, UserRole.Developer, UserRole.Financier].includes(user.role);
    const isTeacher = user.role === UserRole.Teacher;

    const studentTransactions = useMemo(() => allTransactions.filter(t => t.studentId === editingStudent.id).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()), [allTransactions, editingStudent.id]);
    const rawExams = useMemo(() => allExams.filter(e => e.studentId === editingStudent.id || e.studentName === editingStudent.fullName).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()), [allExams, editingStudent.id, editingStudent.fullName]);
    const studentViolations = useMemo(() => allViolations.filter(v => v.studentId === editingStudent.id || v.studentName === editingStudent.fullName).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()), [allViolations, editingStudent.id, editingStudent.fullName]);

    const historyLogs = useMemo(() => {
        return allLogs
            .filter(l => l.entityId === editingStudent.id)
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }, [allLogs, editingStudent.id]);

    // --- Attendance Data Extraction with Course Filtering ---
    const studentAttendanceStats = useMemo(() => {
        const records: any[] = [];
        const courseStats: Record<string, { present: number, absent: number, late: number, total: number }> = {};
        const availableCourses = new Set<string>();

        Object.entries(allAttendance).forEach(([key, record]: [string, any]) => {
            if (record.attendance[editingStudent.id]) {
                const [groupId, date] = key.split('_');
                const group = groups.find(g => g.id === Number(groupId));
                const status = record.attendance[editingStudent.id];
                const subject = group?.subject || 'Неизвестно';

                availableCourses.add(subject);

                if (!courseStats[subject]) {
                    courseStats[subject] = { present: 0, absent: 0, late: 0, total: 0 };
                }
                courseStats[subject].total++;
                if (status === 'П') courseStats[subject].present++;
                if (status === 'Н') courseStats[subject].absent++;
                if (status === 'О') courseStats[subject].late++;

                // Фильтруем историю на лету
                if (selectedAttendanceCourses.length === 0 || selectedAttendanceCourses.includes(subject)) {
                    records.push({ date, status, subject, topic: record.topic });
                }
            }
        });

        // Расчет итогов на основе фильтра
        const filteredRecords = records;
        const total = filteredRecords.length;
        const present = filteredRecords.filter(r => r.status === 'П').length;
        const absent = filteredRecords.filter(r => r.status === 'Н').length;
        const late = filteredRecords.filter(r => r.status === 'О').length;

        return {
            history: filteredRecords.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
            availableCourses: Array.from(availableCourses).sort(),
            totals: { total, present, absent, late, percent: total > 0 ? Math.round((present / total) * 100) : 0 },
            byCourse: Object.entries(courseStats).map(([name, s]) => ({
                name,
                ...s,
                percent: s.total > 0 ? Math.round((s.present / s.total) * 100) : 0
            }))
        };
    }, [allAttendance, editingStudent.id, groups, selectedAttendanceCourses]);

    const toggleAttendanceCourse = (course: string) => {
        setSelectedAttendanceCourses(prev => 
            prev.includes(course) 
                ? prev.filter(s => s !== course) 
                : [...prev, course]
        );
    };

    const [showAddExamModal, setShowAddExamModal] = useState(false);
    const [newExamData, setNewExamData] = useState<Partial<ExamResult>>({
        date: new Date().toISOString().split('T')[0],
        subject: '',
        score: 0,
        maxScore: 100
    });

    const handleSaveExam = () => {
        if (!newExamData.subject) {
            storage.notify('Выберите курс обучения', 'error');
            return;
        }
        const exam: ExamResult = {
            id: Date.now(),
            studentId: editingStudent.id,
            studentName: editingStudent.fullName,
            subject: newExamData.subject || '',
            date: newExamData.date || new Date().toISOString().split('T')[0],
            score: Number(newExamData.score),
            maxScore: Number(newExamData.maxScore) || 100,
            isExtra: !editingStudent.subjects?.includes(newExamData.subject)
        };

        const updated = [exam, ...allExams];
        setAllExams(updated);
        storage.set(StorageKeys.EXAM_RESULTS, updated);
        
        setShowAddExamModal(false);
        setNewExamData({ 
            date: new Date().toISOString().split('T')[0],
            subject: '',
            score: 0,
            maxScore: 100
        });
        storage.notify('Результат экзамена добавлен', 'success');
    };

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
            storage.notify("Не удалось получить доступ к камере", 'error');
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

    const capturePhoto = async () => {
        if (videoRef.current) {
            const canvas = document.createElement('canvas');
            canvas.width = videoRef.current.videoWidth;
            canvas.height = videoRef.current.videoHeight;
            canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0);
            
            // Apply compression before saving
            const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
            const compressed = await compressImage(dataUrl);
            
            setEditingStudent(prev => ({ ...prev, avatar: compressed }));
            stopCamera();
            setShowPhotoMenu(false);
        }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = async () => {
                const originalData = reader.result as string;
                const compressedData = await compressImage(originalData);
                setEditingStudent(prev => ({ ...prev, avatar: compressedData }));
            };
            reader.readAsDataURL(file);
            setShowPhotoMenu(false);
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
            const today = new Date().toISOString().split('T')[0];
            const isStudentActive = editingStudent.status === StudentStatus.Active;
            setEditingStudent(prev => ({
                ...prev,
                subjects: [...(prev.subjects || []), subject],
                subjectDetails: {
                    ...(prev.subjectDetails || {}),
                    [subject]: { 
                        ...(prev.subjectDetails?.[subject] || {}),
                        startDate: isStudentActive ? today : prev.subjectDetails?.[subject]?.startDate 
                    }
                }
            }));
        }
        setShowSubjectMenu(false);
    };

    const handleRemoveSubject = (e: React.MouseEvent, subject: string) => {
        e.preventDefault();
        e.stopPropagation();
        
        if (confirm(`Вы уверены, что хотите убрать курс "${subject}" у ученика? Это также отвяжет его от соответствующих групп.`)) {
            const today = new Date().toISOString().split('T')[0];
            const subjectGroups = groups.filter(g => g.subject === subject).map(g => g.id);
            
            // Backup for Undo
            setUndoSubjectData({
                subjects: [...(editingStudent.subjects || [])],
                groupIds: [...(editingStudent.groupIds || [])],
                subjectDiscounts: { ...(editingStudent.subjectDiscounts || {}) },
                subjectDetails: { ...(editingStudent.subjectDetails || {}) },
                removedSubject: subject
            });
            setUndoTimer(5);

            setEditingStudent(prev => {
                const updatedSubjects = (prev.subjects || []).filter(s => s !== subject);
                const updatedGroupIds = (prev.groupIds || []).filter(gid => !subjectGroups.includes(gid));
                const updatedDiscounts = { ...(prev.subjectDiscounts || {}) };
                const updatedDetails = { ...(prev.subjectDetails || {}) };
                
                // Фиксируем дату ухода при удалении курса
                if (updatedDetails[subject]) {
                    updatedDetails[subject] = { ...updatedDetails[subject], endDate: today };
                } else {
                    updatedDetails[subject] = { endDate: today };
                }
                
                delete updatedDiscounts[subject];

                return {
                    ...prev,
                    subjects: updatedSubjects,
                    groupIds: updatedGroupIds,
                    subjectDiscounts: updatedDiscounts,
                    subjectDetails: updatedDetails
                };
            });
            
            storage.notify(`Курс "${subject}" убран из программы ученика. Дата ухода зафиксирована.`, 'info');
        } else {
            storage.notify('Удаление курса отменено', 'info');
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

    const handleDurationChange = (val: string) => {
        setDiscountDuration(val);
        const match = val.match(/\d+/);
        if (match) {
            setEditingStudent(prev => ({ ...prev, discountDuration: Number(match[0]) }));
        } else {
            setEditingStudent(prev => ({ ...prev, discountDuration: undefined }));
        }
    };

    const handleSaveViolation = () => {
        if (!newViolationData.comment) {
            storage.notify('Укажите причину или описание нарушения', 'error');
            return;
        }
        const violation: Violation = {
            ...newViolationData,
            id: Date.now(),
            studentId: editingStudent.id,
            studentName: editingStudent.fullName
        } as Violation;
        const updated = [violation, ...allViolations];
        setAllViolations(updated);
        storage.set(StorageKeys.VIOLATIONS, updated);
        setShowViolationModal(false);
        setNewViolationData({ 
            type: 'Поведение', 
            date: new Date().toISOString().split('T')[0],
            subject: '',
            reporter: user.fullName
        });
        storage.notify('Нарушение зафиксировано в журнале', 'success');
    };

    const handleValidateAndSave = () => {
        const newErrors: Record<string, boolean> = {};
        
        // Tab: INFO validation
        if (!editingStudent.fullName || editingStudent.fullName.trim().length < 2) newErrors.fullName = true;
        if (!editingStudent.phone || editingStudent.phone.trim() === '+992' || editingStudent.phone.trim().length < 9) newErrors.phone = true;
        if (!editingStudent.birthYear) newErrors.birthYear = true;
        if (!editingStudent.source || editingStudent.source === 'Не указано') newErrors.source = true;
        if (!editingStudent.grade) newErrors.grade = true;
        
        if (editingStudent.parents && editingStudent.parents.length > 0) {
            if (!editingStudent.parents[0].name || editingStudent.parents[0].name.trim().length < 2) newErrors.parentName = true;
            if (!editingStudent.parents[0].phone || editingStudent.parents[0].phone.trim() === '+992' || editingStudent.parents[0].phone.trim().length < 9) newErrors.parentPhone = true;
        } else {
            newErrors.parentName = true;
            newErrors.parentPhone = true;
        }

        // Tab: ACADEMIC validation
        if (!editingStudent.branch) newErrors.branch = true;
        
        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            
            // Auto-navigate to first tab with errors
            const infoErrors = ['fullName', 'phone', 'birthYear', 'parentName', 'parentPhone', 'source', 'grade'];
            const academicErrors = ['branch'];
            
            if (infoErrors.some(k => newErrors[k])) {
                setActiveTab('info');
            } else if (academicErrors.some(k => newErrors[k])) {
                setActiveTab('academic');
            }

            storage.notify('Пожалуйста, заполните обязательные поля, отмеченные красным цветом', 'warning');
            
            // Scroll to top of content area to show where errors might be
            const contentArea = document.querySelector('.custom-scrollbar');
            if (contentArea) contentArea.scrollTo({ top: 0, behavior: 'smooth' });
            
            return;
        }

        onSave(editingStudent);
        onClose();
    };

    const examSubjects = useMemo(() => Array.from(new Set(rawExams.map(e => e.subject))), [rawExams]);
    
    const examData = useMemo(() => {
        const dailyAggregates: Record<string, { totalScore: number, totalMaxScore: number, count: number, hasExtra: boolean }> = {};
        rawExams.forEach(e => {
            if (!dailyAggregates[e.date]) {
                dailyAggregates[e.date] = { totalScore: 0, totalMaxScore: 0, count: 0, hasExtra: false };
            }
            dailyAggregates[e.date].totalScore += e.score;
            dailyAggregates[e.date].totalMaxScore += e.maxScore;
            dailyAggregates[e.date].count += 1;
            if (e.isExtra) dailyAggregates[e.date].hasExtra = true;
        });

        return Object.entries(dailyAggregates)
            .map(([date, agg]) => ({
                date: date,
                score: Math.round((agg.totalScore / agg.totalMaxScore) * 100),
                avgScoreActual: Math.round(agg.totalScore / agg.count),
                avgMaxScoreActual: Math.round(agg.totalMaxScore / agg.count),
                hasExtra: agg.hasExtra
            }))
            .sort((a, b) => new Date(a.date).getTime() - new Date(a.date).getTime());
    }, [rawExams]);

    const heatmapMonths = useMemo(() => {
        if (rawExams.length === 0) return [];
        const uniqueMonthKeys = Array.from(new Set(rawExams.map(e => e.date.slice(0, 7)))).sort();
        return uniqueMonthKeys.map(mKey => {
            const [y, m] = String(mKey).split('-').map(Number);
            const d = new Date(y, m - 1, 1);
            return { 
                key: mKey, 
                label: d.toLocaleString('ru-RU', { month: 'short' }).toUpperCase() 
            };
        });
    }, [rawExams]);

    const heatmapData: HeatmapRow[] = useMemo(() => {
        const subjectsList = editingStudent.subjects || [];
        // Включаем предметы из экзаменов, которых нет в списке (для полноты картины)
        const allPossibleSubjects = Array.from(new Set([...subjectsList, ...examSubjects])).sort();
        
        return allPossibleSubjects.map(sub => {
            const subjectExams = rawExams.filter(e => e.subject === sub);
            const monthsData = heatmapMonths.map(m => {
                const examsInMonth = subjectExams.filter(e => e.date.startsWith(m.key));
                if (examsInMonth.length === 0) return null;
                
                const totalScore = examsInMonth.reduce((acc, e) => acc + e.score, 0);
                const totalMax = examsInMonth.reduce((acc, e) => acc + e.maxScore, 0);
                const avgPercent = Math.round((totalScore / totalMax) * 100);
                // Если хоть один экзамен в месяце был вне программы, помечаем весь месяц как extra для этого предмета
                const isExtra = examsInMonth.some(e => e.isExtra);
                
                return { 
                    percent: avgPercent, 
                    count: examsInMonth.length, 
                    rawAvg: Math.round(totalScore / examsInMonth.length),
                    rawMax: Math.round(totalMax / examsInMonth.length),
                    isExtra
                };
            });
            return { subject: sub, months: monthsData };
        });
    }, [editingStudent.subjects, rawExams, heatmapMonths, examSubjects]);

    const filteredViolations = useMemo(() => {
        return studentViolations.filter(v => violationFilter === 'All' || v.type === violationFilter || (violationFilter === 'Успеваемость' && v.type === 'ДЗ'));
    }, [studentViolations, violationFilter]);

    const examHistoryDisplay = useMemo(() => {
        if (examFilter !== 'Все') {
            return rawExams.filter(e => e.subject === examFilter).map(exam => {
                const subjectExams = rawExams.filter(e => e.subject === exam.subject).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                const sequenceNumber = subjectExams.findIndex(e => e.id === exam.id) + 1;
                
                const percent = (exam.score / exam.maxScore) * 100;
                const scoreColor = getScoreColor(percent, exam.isExtra);
                const colorClass = String(scoreColor).split(' ')[0].replace('bg-', 'text-');
                
                return (
                    <div key={exam.id} className={`flex justify-between items-center p-3 hover:bg-slate-50 dark:hover:bg-slate-700/30 rounded-xl border transition-colors shadow-sm ${exam.isExtra ? 'border-slate-100 bg-slate-50/50' : 'border-slate-100 dark:border-slate-700'}`}>
                        <div>
                            <div className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                                {exam.subject} №{sequenceNumber}
                                {exam.isExtra && <span className="px-1.5 py-0.5 rounded-md bg-slate-200 text-slate-500 text-[8px] uppercase font-black">Вне программы</span>}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">{exam.date}</div>
                        </div>
                        <div className="text-right">
                            <div className={`text-sm font-black ${colorClass}`}>
                                {exam.score}/{exam.maxScore} ({Math.round(percent)}%)
                            </div>
                        </div>
                    </div>
                );
            });
        } else {
            const subjectSequenceMap: Record<string, ExamResult[]> = {};
            examSubjects.forEach(sub => {
                subjectSequenceMap[sub] = rawExams.filter(e => e.subject === sub).sort((a,b) => new Date(a.date).getTime() - new Date(a.date).getTime());
            });

            const maxSeq = Math.max(0, ...Object.values(subjectSequenceMap).map(arr => arr.length));
            const seqResults = [];
            for(let i = 0; i < maxSeq; i++) {
                const itemsInSeq = (Object.values(subjectSequenceMap) as ExamResult[][]).map(arr => arr[i]).filter(Boolean);
                if (itemsInSeq.length > 0) {
                    // Для общей истории считаем только основные экзамены
                    const mainItems = itemsInSeq.filter(e => !e.isExtra);
                    if (mainItems.length > 0) {
                        const totalS = mainItems.reduce((a,b) => a + b.score, 0);
                        const totalM = mainItems.reduce((a,b) => a + b.maxScore, 0);
                        const avgP = Math.round((totalS/totalM) * 100);
                        seqResults.push({
                            seq: i + 1,
                            avgScore: Math.round(totalS/mainItems.length),
                            avgMax: Math.round(totalM/mainItems.length),
                            percent: avgP,
                            count: mainItems.length,
                            totalCount: itemsInSeq.length
                        });
                    }
                }
            }

            return seqResults.map(res => {
                const scoreColor = getScoreColor(res.percent);
                const colorClass = String(scoreColor).split(' ')[0].replace('bg-', 'text-');
                
                return (
                    <div key={res.seq} className="flex justify-between items-center p-3 hover:bg-slate-50 dark:hover:bg-slate-700/30 rounded-xl border border-slate-100 dark:border-slate-700 transition-colors shadow-sm">
                        <div>
                            <div className="text-sm font-black text-slate-800 dark:text-white">Экзамен №{res.seq} (Все курсы)</div>
                            <div className="text-[10px] text-slate-400">Средний балл по {res.count} основным курсам</div>
                        </div>
                        <div className="text-right">
                            <div className={`text-sm font-black ${colorClass}`}>
                                {res.avgScore}/{res.avgMax} ({res.percent}%)
                            </div>
                        </div>
                    </div>
                );
            });
        }
    }, [rawExams, examFilter, examSubjects]);

    // Error helper for tabs
    const tabHasError = (tabId: string) => {
        if (tabId === 'info') {
            return ['fullName', 'phone', 'birthYear', 'parentName', 'parentPhone', 'source', 'grade'].some(k => errors[k]);
        }
        if (tabId === 'academic') {
            return ['branch'].some(k => errors[k]);
        }
        return false;
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="w-full max-w-4xl bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200 relative border border-slate-100 dark:border-slate-700">
                <div className="bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700 p-6 flex items-start justify-between z-[60] flex-shrink-0">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800 dark:text-white tracking-tight">
                            {editingStudent.id ? editingStudent.fullName : 'Новый ученик'}
                        </h2>
                        <div className="flex items-center gap-2 mt-2">
                             <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${getStatusColor(editingStudent.status as StudentStatus)}`}>
                                {editingStudent.status}
                             </span>
                             {editingStudent.id ? <span className="text-xs text-slate-400 font-mono">ID: {editingStudent.id}</span> : null}
                        </div>
                    </div>
                    <button 
                        type="button" 
                        onClick={(e) => checkChangesAndClose(e)} 
                        className="p-3 bg-slate-50 dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 rounded-full text-slate-400 transition-all active:scale-90 group relative z-[70] border border-slate-100 dark:border-slate-600 shadow-sm"
                    >
                        <X size={28} className="pointer-events-none" />
                    </button>
                </div>

                <div className="px-6 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex-shrink-0 overflow-x-auto hide-scrollbar">
                    <div className="flex gap-2 p-1">
                        <button onClick={() => setActiveTab('info')} className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 relative ${activeTab === 'info' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-white/50 dark:hover:bg-slate-700/50'}`}>
                            <User size={16} className="pointer-events-none" /> Общее
                            {tabHasError('info') && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-red-500 border-2 border-white dark:border-slate-800 animate-pulse"></span>}
                        </button>
                        <button onClick={() => setActiveTab('academic')} className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 relative ${activeTab === 'academic' ? 'bg-white dark:bg-slate-700 text-purple-600 dark:text-purple-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-white/50 dark:hover:bg-slate-700/50'}`}>
                            <GraduationCap size={16} className="pointer-events-none" /> Обучение
                            {tabHasError('academic') && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-red-500 border-2 border-white dark:border-slate-800 animate-pulse"></span>}
                        </button>
                        <button onClick={() => setActiveTab('attendance')} className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${activeTab === 'attendance' ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-white/50 dark:hover:bg-slate-700/50'}`}>
                            <UserCheck size={16} className="pointer-events-none" /> Посещаемость
                        </button>
                        <button onClick={() => setActiveTab('exams')} className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${activeTab === 'exams' ? 'bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-white/50 dark:hover:bg-slate-700/50'}`}>
                            <Award size={16} className="pointer-events-none" /> Экзамены
                        </button>
                        <button onClick={() => setActiveTab('violations')} className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${activeTab === 'violations' ? 'bg-white dark:bg-slate-700 text-red-600 dark:text-red-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-white/50 dark:hover:bg-slate-700/50'}`}>
                            <AlertTriangle size={16} className="pointer-events-none" /> Нарушения
                        </button>
                        {!isTeacher && (
                            <button onClick={() => setActiveTab('finance')} className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${activeTab === 'finance' ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-white/50 dark:hover:bg-slate-700/50'}`}>
                                <CreditCard size={16} className="pointer-events-none" /> Финансы
                            </button>
                        )}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-slate-50/50 dark:bg-slate-900/20 pb-24 relative">
                    {activeTab === 'info' && (
                        <div className="space-y-6 animate-in fade-in duration-300">
                             <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 space-y-4 shadow-sm">
                                <h3 className="font-bold text-slate-800 dark:text-white border-b border-slate-100 dark:border-slate-700 pb-2 mb-2">Личные данные</h3>
                                <div className="flex items-center gap-5 mb-2">
                                    <div className="relative group shrink-0" ref={photoMenuRef}>
                                        <div className="w-24 h-24 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center overflow-hidden border-4 border-white dark:border-slate-600 shadow-md">
                                            {editingStudent.avatar ? <img src={editingStudent.avatar} alt="Avatar" className="w-full h-full object-cover" /> : <User size={36} className="text-slate-400" />}
                                        </div>
                                        {!isTeacher && (
                                            <button type="button" onClick={() => setShowPhotoMenu(!showPhotoMenu)} className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full shadow-lg border border-white dark:border-slate-600 hover:bg-blue-700 transition-colors">
                                                <Pencil size={14} className="pointer-events-none" />
                                            </button>
                                        )}
                                        {showPhotoMenu && (
                                            <div className="absolute top-full left-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                                                <div className="p-1">
                                                    <button type="button" onClick={() => fileInputRef.current?.click()} className="flex items-center gap-3 w-full px-3 py-2.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg transition-colors text-left"><Upload size={14} className="text-blue-500 pointer-events-none"/> Загрузить фото</button>
                                                    <button type="button" onClick={startCamera} className="flex items-center gap-3 w-full px-3 py-2.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg transition-colors text-left"><Camera size={14} className="text-emerald-500 pointer-events-none"/> Сделать фото</button>
                                                    {editingStudent.avatar && <button type="button" onClick={removeAvatar} className="flex items-center gap-3 w-full px-3 py-2.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors text-left border-t border-slate-100 dark:border-slate-700 mt-1"><Trash2 size={14} className="pointer-events-none" /> Удалить</button>}
                                                </div>
                                            </div>
                                        )}
                                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                                    </div>
                                    <div className="flex-1">
                                        <InputGroup label="ФИО Ученика" value={editingStudent.fullName} onChange={(v: string) => { setEditingStudent({...editingStudent, fullName: v}); clearError('fullName'); }} disabled={isTeacher} error={errors.fullName} className="mb-0" />
                                        <div className="mt-2 flex gap-2">
                                            {editingStudent.status && <span className={`px-2 py-1 rounded text-xs font-bold ${getStatusColor(editingStudent.status as StudentStatus)} border`}>{editingStudent.status}</span>}
                                            {editingStudent.id ? <span className="px-2 py-1 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 rounded text-xs font-bold border border-slate-200 dark:border-slate-600">ID: {editingStudent.id || 'NEW'}</span> : null}
                                        </div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <InputGroup label="Телефон" value={editingStudent.phone} onChange={(v: string) => { setEditingStudent({...editingStudent, phone: v}); clearError('phone'); }} disabled={isTeacher} error={errors.phone} placeholder="+992 00 000 0000" />
                                    <div className="w-full">
                                        <DateRangePicker label="Дата рождения" startDate={editingStudent.birthYear || ''} onChange={(start: string) => { setEditingStudent({...editingStudent, birthYear: start}); clearError('birthYear'); }} mode="single" align="left" className={errors.birthYear ? 'ring-2 ring-red-500/20 rounded-lg' : ''} />
                                        {errors.birthYear && <p className="text-[10px] text-red-600 dark:text-red-400 mt-1 font-semibold animate-in fade-in slide-in-from-top-1">Укажите дату рождения</p>}
                                    </div>
                                </div>
                                <div className="mt-2">
                                    <InputGroup label="Аккаунт Repetitor.mobi" value={editingStudent.platformAccount} onChange={(v: string) => setEditingStudent({...editingStudent, platformAccount: v})} disabled={isTeacher} placeholder="Логин / Email" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div><CustomSelect label="Статус (Воронка)" value={editingStudent.pipelineStage || PipelineStage.New} onChange={(val) => setEditingStudent({...editingStudent, pipelineStage: val as PipelineStage})} options={Object.values(PipelineStage)} disabled={isTeacher} /></div>
                                    <div className="flex items-center gap-2 mt-6"><Checkbox label={<span className="flex items-center gap-1"><Eye size={14} className="text-slate-400 pointer-events-none"/> Справка о дальтонизме</span>} checked={!!editingStudent.isColorBlind} onChange={(checked: boolean) => setEditingStudent({...editingStudent, isColorBlind: checked})} disabled={isTeacher} /></div>
                                </div>
                            </div>
                            
                            <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 space-y-4 shadow-sm">
                                <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-700 pb-2 mb-2">
                                    <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2"><Users size={16} className="pointer-events-none"/> Родители / Ответственные лица</h3>
                                    {!isTeacher && <button type="button" onClick={addParent} className="text-blue-600 dark:text-blue-400 text-xs font-bold flex items-center gap-1 hover:underline"><Plus size={14} className="pointer-events-none"/> Добавить</button>}
                                </div>
                                {editingStudent.parents?.map((parent, index) => {
                                    const iCustomRole = !['Мама', 'Папа'].includes(parent.role);
                                    return (
                                        <div key={index} className={`space-y-3 p-3 rounded-lg border transition-all relative group ${index === 0 && (errors.parentName || errors.parentPhone) ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800 shadow-sm shadow-red-500/5' : 'bg-slate-50 dark:bg-slate-700/30 border-slate-100 dark:border-slate-700'}`}>
                                            <div className="flex justify-between items-start gap-4">
                                                <div className="flex-1 flex gap-2">
                                                    <div className="w-1/3"><CustomSelect value={iCustomRole ? 'Другое' : parent.role} onChange={(val) => handleParentChange(index, 'role', val === 'Другое' ? '' : val)} options={PARENT_ROLES} disabled={isTeacher} /></div>
                                                    {iCustomRole && <div className="flex-1"><input type="text" value={parent.role} onChange={(e) => handleParentChange(index, 'role', e.target.value)} placeholder="Укажите роль (напр. Брат)" disabled={isTeacher} className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500 h-[38px]" /></div>}
                                                </div>
                                                {!isTeacher && index > 0 && <button type="button" onClick={() => removeParent(index)} className="text-slate-400 hover:text-red-500 p-1" title="Удалить"><Trash2 size={16} className="pointer-events-none"/></button>}
                                            </div>
                                            <div className="grid grid-cols-1 gap-2"><InputGroup label={`ФИО ${index === 0 ? 'основного родителя' : ''}`} value={parent.name} onChange={(v: string) => { handleParentChange(index, 'name', v); if (index === 0) clearError('parentName'); }} disabled={isTeacher} error={index === 0 && errors.parentName} className="mb-0" /></div>
                                            <div className="grid grid-cols-2 gap-4"><InputGroup label="Телефон" value={parent.phone} onChange={(v: string) => { handleParentChange(index, 'phone', v); if (index === 0) clearError('parentPhone'); }} disabled={isTeacher} error={index === 0 && errors.parentPhone} placeholder="+992..." /><InputGroup label="Email" value={parent.email} onChange={(v: string) => handleParentChange(index, 'email', v)} disabled={isTeacher} /></div>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 space-y-4 shadow-sm">
                                <h3 className="font-bold text-slate-800 dark:text-white border-b border-slate-100 dark:border-slate-700 pb-2 mb-2">Образование и Источник</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <InputGroup label="Школа" value={editingStudent.school} onChange={(v: string) => {setEditingStudent({...editingStudent, school: v}); clearError('school');}} disabled={isTeacher} error={errors.school} placeholder="Номер школы" />
                                    <CustomSelect label="Класс / Ступень" value={editingStudent.grade || ''} onChange={(v) => {setEditingStudent({...editingStudent, grade: v}); clearError('grade');}} options={GRADES} disabled={isTeacher} error={errors.grade} placeholder="Выберите класс..." />
                                </div>
                                <div><CustomSelect label="Откуда о нас узнали?" value={editingStudent.source} onChange={(v) => {setEditingStudent({...editingStudent, source: v}); clearError('source');}} options={SOURCES} disabled={isTeacher} error={errors.source} placeholder="Выберите источник..." /></div>
                            </div>
                            <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 space-y-4 shadow-sm">
                                <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-slate-700 pb-2 mb-2"><StickyNote size={16} className="pointer-events-none" /> Примечание</h3>
                                <textarea className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2 text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 h-24 disabled:opacity-60 disabled:cursor-not-allowed" placeholder="Дополнительная информация о студенте..." value={editingStudent.note || ''} onChange={(e) => setEditingStudent({...editingStudent, note: e.target.value})} disabled={isTeacher}></textarea>
                            </div>
                        </div>
                    )}

                    {activeTab === 'academic' && (
                        <div className="space-y-6 animate-in fade-in duration-300 pb-20">
                            <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                                <div className="flex justify-between items-center mb-4 border-b border-slate-100 dark:border-slate-700 pb-2"><h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2"><Calendar size={18} className="text-blue-500 pointer-events-none"/> Даты и статус</h3></div>
                                <div className="grid grid-cols-2 gap-4 mb-4">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1.5">
                                            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Статус обучения</span>
                                            {!isTeacher && (
                                                <div className="relative group">
                                                    <Info size={14} className="text-blue-500 cursor-help opacity-70 hover:opacity-100 transition-opacity pointer-events-none" />
                                                    <div className="absolute left-0 top-full mt-2 w-64 p-3 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs rounded-xl shadow-xl z-50 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none group-hover:pointer-events-auto border border-slate-200 dark:border-slate-700">
                                                        <div className="space-y-2">
                                                            <div><span className="font-bold text-emerald-600 dark:text-emerald-400">Активен</span>: Учится, баланс списывается.</div>
                                                            <div><span className="font-bold text-slate-500 dark:text-slate-400">Неактивен</span>: Архив (ушел), история сохраняется.</div>
                                                            <div><span className="font-bold text-blue-600 dark:text-blue-400">Предзапись</span>: Новый лид, воронка продаж.</div>
                                                            <div><span className="font-bold text-rose-600 dark:text-rose-400">Отвалился</span>: Лид, который отказался.</div>
                                                            <div><span className="font-bold text-amber-600 dark:text-amber-400">Пауза</span>: Временная пауза.</div>
                                                        </div>
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
                                        <div className="flex items-center gap-2 mb-1.5">
                                            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Филиал</span>
                                            {!isTeacher && isSuperUser && (
                                                <div className="relative group">
                                                    <MapPin size={12} className="text-slate-400 cursor-help opacity-70 hover:opacity-100 transition-opacity pointer-events-none" />
                                                    <div className="absolute right-0 top-full mt-2 w-48 p-2 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs rounded-lg shadow-xl z-50 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none group-hover:pointer-events-auto border border-slate-200 dark:border-slate-700">
                                                        Привязка ученика к конкретной локации учебного центра.
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        <CustomSelect 
                                            value={editingStudent.branch || ''} 
                                            onChange={(v) => {setEditingStudent({...editingStudent, branch: v as Branch}); clearError('branch');}} 
                                            // Fixed: Use dynamic branch list from storage
                                            options={dynamicBranchList} 
                                            disabled={!isSuperUser} 
                                            error={errors.branch}
                                            placeholder="Выберите филиал..."
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4 mb-4">
                                    <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-100 dark:border-blue-800 relative group"><label className="block text-[11px] font-semibold text-blue-600 dark:text-blue-400 mb-1">Дата предзаписи</label><div className="relative"><DateRangePicker startDate={editingStudent.presaleDate || ''} onChange={(d: string) => setEditingStudent({...editingStudent, presaleDate: d})} mode="single" className="w-full" /></div></div>
                                    <div className="bg-emerald-50 dark:bg-emerald-900/20 p-3 rounded-lg border border-emerald-100 dark:border-emerald-800"><label className="block text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 mb-1">Дата начала обучения</label><div className="relative"><DateRangePicker startDate={editingStudent.startDate || ''} onChange={(d: string) => setEditingStudent({...editingStudent, startDate: d})} mode="single" className="w-full" /></div></div>
                                    {(editingStudent.status === StudentStatus.Archived || editingStudent.endDate) && <div className="bg-slate-200 dark:bg-slate-700 p-3 rounded-lg border border-slate-300 dark:border-slate-600 animate-in fade-in"><label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">Дата ухода</label><div className="relative"><DateRangePicker startDate={editingStudent.endDate || ''} onChange={(d: string) => setEditingStudent({...editingStudent, endDate: d})} mode="single" className="w-full" /></div></div>}
                                    {(editingStudent.status === StudentStatus.Dropped || editingStudent.dropOffDate) && <div className="bg-rose-50 dark:bg-rose-900/20 p-3 rounded-lg border border-rose-100 dark:border-rose-800 animate-in fade-in"><label className="block text-[11px] font-semibold text-rose-600 dark:text-rose-400 mb-1">Дата отвала</label><div className="relative"><DateRangePicker startDate={editingStudent.dropOffDate || ''} onChange={(d: string) => setEditingStudent({...editingStudent, dropOffDate: d})} mode="single" className="w-full" /></div></div>}
                                </div>
                                {(editingStudent.status === StudentStatus.Archived || editingStudent.status === StudentStatus.Dropped) && (
                                    <div className="mb-6 animate-in fade-in space-y-2">
                                        <CustomSelect 
                                            label="Причина ухода / отвала" 
                                            value={isCustomReason ? 'Другое' : (editingStudent.leaveReason || '')} 
                                            onChange={(v) => {
                                                if (v === 'Другое') {
                                                    setEditingStudent({...editingStudent, leaveReason: 'Другое'});
                                                } else {
                                                    setEditingStudent({...editingStudent, leaveReason: v});
                                                }
                                            }} 
                                            options={[...LEAVE_REASONS, 'Другое']} 
                                            disabled={isTeacher} 
                                        />
                                        {isCustomReason && (
                                            <input
                                                type="text"
                                                value={editingStudent.leaveReason === 'Другое' ? '' : editingStudent.leaveReason}
                                                onChange={(e) => setEditingStudent({...editingStudent, leaveReason: e.target.value})}
                                                placeholder="Укажите причину..."
                                                className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2 text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500 transition-all animate-in slide-in-from-top-1 fade-in duration-200"
                                                autoFocus
                                            />
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-6 relative overflow-visible">
                                <h3 className="font-bold text-slate-800 dark:text-white border-b border-slate-100 dark:border-slate-700 pb-2 mb-2">Учебная программа</h3>
                                <div className="mb-6">
                                    <InputGroup 
                                        label="Номер договора" 
                                        value={editingStudent.contractNumber || ''} 
                                        onChange={(v: string) => setEditingStudent({...editingStudent, contractNumber: v})} 
                                        placeholder="№ 1234-56" 
                                        disabled={isTeacher} 
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-6 mb-6">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1.5">
                                            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Продукт</span>
                                            <div className="relative group">
                                                <Info size={14} className="text-blue-500 cursor-help opacity-70 hover:opacity-100 transition-opacity pointer-events-none" />
                                                <div className="absolute left-0 top-full mt-2 w-64 p-3 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs rounded-xl shadow-xl z-50 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none group-hover:pointer-events-auto border border-slate-200 dark:border-slate-700">
                                                    <div className="space-y-2">
                                                        {programs.map(p => (
                                                          <div key={p.id}><span className="font-bold text-slate-800 dark:text-white">{p.name}</span></div>
                                                        ))}
                                                        {programs.length === 0 && <div>Нет созданных продуктов</div>}
                                                    </div>
                                                    <div className="absolute -top-1 left-1 w-2 h-2 bg-white dark:bg-slate-800 transform rotate-45 border-t border-l border-slate-200 dark:border-slate-700"></div>
                                                </div>
                                            </div>
                                        </div>
                                        <CustomSelect 
                                          value={editingStudent.cluster || ''} 
                                          onChange={(v) => setEditingStudent({...editingStudent, cluster: v as any})} 
                                          options={programs.map(p => p.name)} 
                                          disabled={isTeacher} 
                                          placeholder="Выберите продукт..."
                                        />
                                    </div>
                                    <CustomSelect 
                                      label="Язык обучения" 
                                      value={editingStudent.studyLanguage || ''} 
                                      onChange={(v) => setEditingStudent({...editingStudent, studyLanguage: v})} 
                                      options={STUDY_LANGUAGES} 
                                      disabled={isTeacher} 
                                    />
                                </div>
                                
                                <div className="pt-2">
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-3">Курсы и группы</label>
                                    <div className="space-y-4 mb-3">
                                        {editingStudent.subjects && editingStudent.subjects.length > 0 ? editingStudent.subjects.map(subject => {
                                            const availableGroupsForSubject = groups.filter(g => g.subject === subject && (isSuperUser || !user.branch || g.branch === user.branch));
                                            const assignedGroupId = editingStudent.groupIds?.find(id => availableGroupsForSubject.some(g => g.id === id));
                                            const courseObj = courses.find(c => c.name === subject);
                                            const { icon: SubjectIcon, color, bg } = getSubjectIcon(subject, courseObj);
                                            const details = editingStudent.subjectDetails?.[subject] || {};
                                            
                                            return (
                                                <div key={subject} className="flex flex-col gap-3 p-4 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl shadow-sm hover:border-blue-400 transition-colors relative z-10">
                                                    <div className="flex items-center justify-between gap-4">
                                                        <div className="flex items-center gap-3 flex-1 min-w-0">
                                                            <div className={`p-2 rounded-lg ${bg}`}>
                                                                <SubjectIcon size={18} className={`${color} pointer-events-none`} />
                                                            </div>
                                                            <span className="text-sm font-bold text-slate-800 dark:text-white truncate">{subject}</span>
                                                        </div>
                                                        <div className="w-1/2 min-w-[120px]">
                                                            <GroupSelector 
                                                                groups={availableGroupsForSubject}
                                                                selectedGroupId={assignedGroupId}
                                                                onChange={(gid) => handleGroupChangeForSubject(subject, gid.toString())}
                                                                disabled={isTeacher}
                                                            />
                                                        </div>
                                                        {!isTeacher && (
                                                            <button 
                                                                type="button"
                                                                onClick={(e) => { e.preventDefault(); handleRemoveSubject(e, subject); }}
                                                                className="text-rose-400 hover:text-red-600 p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all active:scale-95 flex-shrink-0 relative z-[50]"
                                                                title="Убрать курс"
                                                            >
                                                                <Trash2 size={18} className="pointer-events-none" />
                                                            </button>
                                                        )}
                                                    </div>
                                                    
                                                    {/* Row for specific subject dates */}
                                                    <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-50 dark:border-slate-600">
                                                        <div className="flex flex-col gap-1">
                                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Дата начала курса</label>
                                                            <DateRangePicker 
                                                                startDate={details.startDate || ''} 
                                                                onChange={(d) => handleSubjectDateChange(subject, 'startDate', d)} 
                                                                mode="single" 
                                                                className="!h-[32px] scale-90 origin-left" 
                                                            />
                                                        </div>
                                                        <div className="flex flex-col gap-1">
                                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 text-right">Дата окончания курса</label>
                                                            <DateRangePicker 
                                                                startDate={details.endDate || ''} 
                                                                onChange={(d) => handleSubjectDateChange(subject, 'endDate', d)} 
                                                                mode="single" 
                                                                align="right"
                                                                className="!h-[32px] scale-90 origin-right ml-auto" 
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        }) : (
                                            <div className="text-center text-slate-400 text-xs italic py-6 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
                                                Курсы не выбраны
                                            </div>
                                        )}
                                    </div>
                                    {!isTeacher && (
                                        <div className="relative mt-4" ref={subjectMenuRef}>
                                            <button type="button" onClick={() => setShowSubjectMenu(!showSubjectMenu)} className="w-full flex items-center justify-center gap-2 border border-dashed border-blue-300 dark:border-blue-700 rounded-xl p-3.5 text-sm bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 outline-none hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors font-bold"><Plus size={16} className="pointer-events-none" /> Добавить курс</button>
                                            {showSubjectMenu && (
                                                <div className="absolute top-full left-0 w-full mt-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 max-h-60 overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95 duration-100">
                                                    <div className="p-1">
                                                        {courses.filter(c => !editingStudent.subjects?.includes(c.name)).map(c => {
                                                                const { icon: Icon, color } = getSubjectIcon(c.name, c);
                                                                return (
                                                                    <button type="button" key={c.id} onClick={() => handleAddSubject(c.name)} className="w-full text-left px-3 py-2.5 text-sm rounded-lg transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/50 flex items-center gap-3 text-slate-700 dark:text-slate-200">
                                                                        <Icon size={16} className={`${color} pointer-events-none`} /> {c.name}
                                                                    </button>
                                                                );
                                                            })
                                                        }
                                                        {courses.filter(c => !editingStudent.subjects?.includes(c.name)).length === 0 && <div className="p-2 text-center text-xs text-slate-400">Все курсы добавлены</div>}
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
                                                <div className="flex flex-col sm:flex-row gap-2 items-end sm:items-center">
                                                    <button 
                                                        type="button"
                                                        onClick={() => { if (isTeacher) return; const updated = [...(editingStudent.assignedBooks || [])]; updated[idx].isPaid = !updated[idx].isPaid; setEditingStudent({...editingStudent, assignedBooks: updated}); }} 
                                                        disabled={isTeacher} 
                                                        className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border transition-colors ${book.isPaid ? 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800' : 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-700 dark:text-slate-400 dark:border-slate-600 hover:bg-slate-200 dark:hover:bg-slate-600'}`}
                                                    >
                                                        {book.isPaid ? <Check size={10} className="pointer-events-none" /> : <X size={10} className="pointer-events-none" />}
                                                        {book.isPaid ? 'Оплачена' : 'Не оплачена'}
                                                    </button>
                                                    <button 
                                                        type="button"
                                                        onClick={() => { if (isTeacher) return; const updated = [...(editingStudent.assignedBooks || [])]; updated[idx].isIssued = !updated[idx].isIssued; if (updated[idx].isIssued && !updated[idx].issuedDate) { updated[idx].issuedDate = new Date().toISOString().split('T')[0]; } setEditingStudent({...editingStudent, assignedBooks: updated}); }} 
                                                        disabled={isTeacher} 
                                                        className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border transition-colors ${book.isIssued ? 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800' : 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-700 dark:text-slate-400 dark:border-slate-600 hover:bg-slate-200 dark:hover:bg-slate-600'}`}
                                                    >
                                                        {book.isIssued ? <Check size={10} className="pointer-events-none" /> : <X size={10} className="pointer-events-none" />}
                                                        {book.isIssued ? 'Выдана' : 'Не выдана'}
                                                    </button>
                                                </div>
                                                {!isTeacher && <button type="button" onClick={() => removeBook(idx)} className="text-slate-400 hover:text-red-500 ml-2"><Trash2 size={14} className="pointer-events-none"/></button>}
                                            </div>
                                        </div>
                                    ))}
                                    {(!editingStudent.assignedBooks || editingStudent.assignedBooks.length === 0) && <div className="text-center text-slate-400 text-xs italic py-2">Нет выданных материалов</div>}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'attendance' && (
                        <div className="space-y-6 animate-in fade-in duration-300">
                             <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                                    <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 tracking-wide">Общая посещаемость</h3>
                                    <div className="px-4 py-2 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg font-bold text-sm border border-emerald-100 dark:border-emerald-800">
                                        {studentAttendanceStats.totals.percent}% Присутствие
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                                    <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-slate-100 dark:border-slate-700 text-center">
                                        <p className="text-[11px] font-semibold text-slate-400 mb-1">Уроков (фильтр)</p>
                                        <p className="text-xl font-black text-slate-800 dark:text-white">{studentAttendanceStats.totals.total}</p>
                                    </div>
                                    <div className="p-4 bg-emerald-50 dark:bg-emerald-900/10 rounded-xl border border-emerald-100 dark:border-emerald-800 text-center">
                                        <p className="text-[11px] font-semibold text-emerald-600 mb-1">Был (П)</p>
                                        <p className="text-xl font-black text-emerald-600">{studentAttendanceStats.totals.present}</p>
                                    </div>
                                    <div className="p-4 bg-rose-50 dark:bg-rose-900/10 rounded-xl border border-rose-100 dark:border-rose-800 text-center">
                                        <p className="text-[11px] font-semibold text-rose-600 mb-1">Нет (Н)</p>
                                        <p className="text-xl font-black text-rose-600">{studentAttendanceStats.totals.absent}</p>
                                    </div>
                                    <div className="p-4 bg-amber-50 dark:bg-amber-900/10 rounded-xl border border-amber-100 dark:border-amber-800 text-center">
                                        <p className="text-[11px] font-semibold text-amber-600 mb-1">Опоздал (О)</p>
                                        <p className="text-xl font-black text-amber-600">{studentAttendanceStats.totals.late}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Filters Bar */}
                            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col gap-3">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-[11px] font-bold text-slate-500 flex items-center gap-2">
                                        <Filter size={14} className="text-blue-500"/> Фильтр по курсам
                                    </h4>
                                    {selectedAttendanceCourses.length > 0 && (
                                        <button 
                                            onClick={() => setSelectedAttendanceCourses([])}
                                            className="text-[11px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                                        >
                                            <FilterX size={12}/> Сбросить
                                        </button>
                                    )}
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {(editingStudent.subjects || []).map(sub => {
                                        const isSelected = selectedAttendanceCourses.includes(sub);
                                        const hasData = studentAttendanceStats.availableCourses.includes(sub);
                                        return (
                                            <button
                                                key={sub}
                                                onClick={() => toggleAttendanceCourse(sub)}
                                                className={`px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all border
                                                    ${isSelected 
                                                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-500/20' 
                                                        : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:border-blue-400'
                                                    }
                                                    ${!hasData && !isSelected ? 'opacity-40 grayscale' : ''}
                                                `}
                                            >
                                                {sub}
                                            </button>
                                        );
                                    })}
                                    {(editingStudent.subjects || []).length === 0 && (
                                        <span className="text-[11px] text-slate-400 italic">Курсы не назначены</span>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col">
                                    <h4 className="text-sm font-bold text-slate-500 mb-4">Аналитика по курсам</h4>
                                    <div className="space-y-3 flex-1 overflow-y-auto custom-scrollbar max-h-60 pr-1">
                                        {studentAttendanceStats.byCourse.map(s => (
                                            <div key={s.name} className={`p-3 rounded-xl border transition-all ${selectedAttendanceCourses.includes(s.name) ? 'bg-blue-50/50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800 ring-1 ring-blue-500/20' : 'bg-slate-50 dark:bg-slate-700/50 border-slate-100 dark:border-slate-700'}`}>
                                                <div className="flex justify-between items-center mb-2">
                                                    <span className="font-bold text-slate-700 dark:text-slate-200 text-xs">{s.name}</span>
                                                    <span className={`text-xs font-black ${s.percent >= 80 ? 'text-emerald-600' : s.percent >= 50 ? 'text-amber-600' : 'text-rose-600'}`}>{s.percent}%</span>
                                                </div>
                                                <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-600 rounded-full overflow-hidden">
                                                    <div className={`h-full transition-all duration-1000 ${s.percent >= 80 ? 'bg-emerald-500' : s.percent >= 50 ? 'bg-amber-500' : 'bg-rose-500'}`} style={{ width: `${s.percent}%` }}></div>
                                                </div>
                                                <div className="flex gap-3 mt-2 text-[10px] font-semibold text-slate-400">
                                                    <span>Всего: {s.total}</span>
                                                    <span className="text-emerald-500">Был: {s.present}</span>
                                                    <span className="text-rose-500">Нет: {s.absent}</span>
                                                </div>
                                            </div>
                                        ))}
                                        {studentAttendanceStats.byCourse.length === 0 && <p className="text-center py-10 text-slate-400 italic text-sm">Данных о посещаемости пока нет</p>}
                                    </div>
                                </div>
                                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col h-full">
                                    <h4 className="text-sm font-bold text-slate-500 mb-4">
                                        История посещений {selectedAttendanceCourses.length > 0 && `(${selectedAttendanceCourses.length})`}
                                    </h4>
                                    <div className="space-y-2 flex-1 overflow-y-auto custom-scrollbar max-h-60 pr-1">
                                        {studentAttendanceStats.history.map((r, i) => (
                                            <div key={i} className="flex justify-between items-center p-2.5 bg-slate-50 dark:bg-slate-700/30 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                                                <div className="min-w-0">
                                                    <div className="text-[10px] font-semibold text-slate-400 mb-0.5">{r.date} • {r.subject}</div>
                                                    <div className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate pr-2">{r.topic || 'Тема не указана'}</div>
                                                </div>
                                                <div className={`w-7 h-7 rounded-lg font-black text-xs flex items-center justify-center shrink-0 shadow-sm ${r.status === 'П' ? 'bg-emerald-500 text-white' : r.status === 'Н' ? 'bg-rose-500 text-white' : 'bg-amber-500 text-white'}`}>
                                                    {r.status}
                                                </div>
                                            </div>
                                        ))}
                                        {studentAttendanceStats.history.length === 0 && (
                                            <div className="text-center py-10">
                                                <FilterX size={32} className="mx-auto text-slate-200 mb-2" />
                                                <p className="text-slate-400 italic text-sm">Ничего не найдено</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'exams' && (
                        <div className="space-y-6 animate-in fade-in duration-300">
                            <div className="flex gap-2 overflow-x-auto pb-2 hide-scrollbar">
                                {['Все', ...examSubjects].map(sub => (
                                    <button
                                        type="button"
                                        key={sub}
                                        onClick={() => setExamFilter(sub)}
                                        className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${examFilter === sub ? 'bg-amber-500 text-white shadow-md' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'}`}
                                    >
                                        {sub}
                                    </button>
                                ))}
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm h-64">
                                    <h4 className="text-sm font-bold text-slate-500 mb-4">Динамика успеваемости (Основные курсы)</h4>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={examData}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                            <XAxis dataKey="date" hide />
                                            <YAxis domain={[0, 100]} hide />
                                            <Tooltip content={<ExamLineChartTooltip />} />
                                            <Line type="monotone" dataKey="score" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4, fill: '#f59e0b' }} activeDot={{ r: 6 }} />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm h-64 overflow-y-auto custom-scrollbar relative flex flex-col">
                                    <div className="flex justify-between items-center px-5 py-4 sticky top-0 bg-white dark:bg-slate-800 z-10 border-b border-slate-50 dark:border-slate-700/50 shadow-sm shrink-0">
                                        <h4 className="text-sm font-bold text-slate-500">История экзаменов</h4>
                                        <button type="button" onClick={() => setShowAddExamModal(true)} className="text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 p-1.5 rounded-lg transition-colors border border-transparent hover:border-blue-100" title="Добавить результат"><Plus size={18} className="pointer-events-none" /></button>
                                    </div>
                                    <div className="p-5 pt-3 space-y-2 flex-1">
                                        {examHistoryDisplay}
                                        {rawExams.length === 0 && (
                                            <div className="flex flex-col items-center justify-center py-10 text-slate-400 opacity-50 italic text-sm">
                                                <History size={32} className="mb-2 pointer-events-none"/>
                                                Нет данных
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                            {heatmapMonths.length > 0 && (
                                <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm animate-in fade-in duration-500 relative overflow-visible">
                                    <div className="flex justify-between items-center mb-4">
                                        <h4 className="text-sm font-bold text-slate-500">Тепловая карта (Средний балл)</h4>
                                        <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-tight text-slate-400">
                                            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded bg-emerald-500"></div> План</div>
                                            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded bg-slate-400"></div> Вне плана</div>
                                        </div>
                                    </div>
                                    <div className="overflow-x-auto custom-scrollbar overflow-y-visible pb-4 pt-10">
                                        <div className="min-w-fit overflow-visible">
                                            <div className="flex overflow-visible">
                                                <div className="w-12 shrink-0"></div>
                                                {heatmapMonths.map(m => (
                                                    <div key={m.key} className="flex-1 min-w-[40px] text-center text-[11px] font-bold text-slate-400 uppercase">{m.label}</div>
                                                ))}
                                            </div>
                                            <div className="space-y-1 mt-2 overflow-visible">
                                                {heatmapData.map(row => {
                                                    const course = courses.find(c => c.name === row.subject);
                                                    const { icon: SubjectIcon, color, bg } = getSubjectIcon(row.subject, course);
                                                    
                                                    return (
                                                        <div key={row.subject} className="flex items-center overflow-visible">
                                                            <div className="w-12 shrink-0 pr-2 flex justify-center overflow-visible">
                                                                <div className={`p-1.5 rounded-lg ${bg} relative transition-transform hover:scale-110`}>
                                                                    <SubjectIcon size={16} className={`${color} pointer-events-none`} />
                                                                </div>
                                                            </div>
                                                            {row.months.map((m, i) => (
                                                                <div key={i} className="flex-1 h-8 min-w-[40px] flex items-center justify-center m-0.5 rounded text-[10px] font-bold text-white relative group cursor-default transition-all duration-300 hover:scale-[1.05] hover:z-[500]"
                                                                    style={{ backgroundColor: m ? (m.isExtra ? '#94a3b8' : (m.percent >= 80 ? '#10b981' : m.percent >= 50 ? '#f59e0b' : '#ef4444')) : '#f1f5f9' }}
                                                                >
                                                                    {m && m.percent}
                                                                    {m && (
                                                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 p-1.5 bg-slate-900/95 dark:bg-slate-800 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[600] whitespace-nowrap shadow-xl border border-white/10 dark:border-slate-700 animate-in fade-in zoom-in-95 duration-100 ring-1 ring-white/5">
                                                                            <div className="font-black border-b border-white/10 dark:border-slate-700 pb-0.5 mb-1 text-blue-300 dark:text-blue-300 uppercase tracking-tighter text-[9px]">
                                                                                {row.subject}
                                                                                {m.isExtra && <span className="ml-2 text-amber-400 font-black">Вне плана</span>}
                                                                            </div>
                                                                            <div className="flex flex-col gap-0.5 text-[10px]">
                                                                                <div className="flex justify-between gap-3 px-1"><span className="opacity-70">Результат:</span> <span className="font-mono text-emerald-400">{m.rawAvg}/{m.rawMax} ({m.percent}%)</span></div>
                                                                            </div>
                                                                            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-900/95 dark:bg-slate-800 transform rotate-45 border-r border-b border-white/10 dark:border-slate-700"></div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'violations' && (
                        <div className="space-y-6 animate-in fade-in duration-300">
                            <div className="flex justify-between items-center bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                                <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2"><AlertTriangle size={18} className="text-red-500 pointer-events-none"/> Журнал нарушений</h3>
                                <div className="flex gap-2">
                                    <button type="button" onClick={() => setShowViolationModal(true)} className="flex items-center gap-2 text-xs font-bold text-white bg-red-600 px-3 py-1.5 rounded-lg hover:bg-red-700 transition-colors shadow-sm">
                                        <Plus size={14} className="pointer-events-none"/> Зафиксировать
                                    </button>
                                    <div className="relative" ref={violationFilterRef}>
                                        <button type="button" onClick={() => setShowViolationFilterMenu(!showViolationFilterMenu)} className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 px-3 py-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
                                            <Filter size={12} className="pointer-events-none"/> {violationFilter === 'All' ? 'Все типы' : violationFilter}
                                        </button>
                                        {showViolationFilterMenu && (
                                            <div className="absolute right-0 top-full mt-1 w-40 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl shadow-xl z-50 overflow-hidden">
                                                {['All', 'Опоздание', 'Поведение', 'Успеваемость'].map(f => (
                                                    <button type="button" key={f} onClick={() => { setViolationFilter(f); setShowViolationFilterMenu(false); }} className="w-full text-left px-4 py-2 text-xs hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200">
                                                        {f === 'All' ? 'Все типы' : f}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-3">
                                {filteredViolations.map(v => {
                                    const reporterObj = employees.find(e => e.fullName === v.reporter);
                                    return (
                                        <div key={v.id} className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex gap-4">
                                            <div className={`w-1 shrink-0 rounded-full ${v.type === 'Поведение' ? 'bg-red-500' : v.type === 'Опоздание' ? 'bg-amber-500' : 'bg-orange-500'}`}></div>
                                            <div className="flex-1">
                                                <div className="flex justify-between items-start mb-1">
                                                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded uppercase ${v.type === 'Поведение' ? 'bg-red-100 text-red-700' : v.type === 'Опоздание' ? 'bg-amber-100 text-amber-700' : 'bg-orange-100 text-orange-700'}`}>
                                                        {v.type === 'ДЗ' ? 'Успеваемость' : v.type}
                                                    </span>
                                                    <div className="text-right">
                                                        <div className="text-xs text-slate-400 font-bold">{v.date}</div>
                                                        {v.reporter && (
                                                            <div className="text-[11px] text-slate-400 mt-1">
                                                                зафиксировал: {v.reporter} {reporterObj?.role ? `(${reporterObj.role})` : ''}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                <p className="text-sm text-slate-700 dark:text-slate-300 mt-2">{v.comment}</p>
                                                <div className="text-xs text-slate-400 mt-2 flex gap-3 pt-2 border-t border-slate-100 dark:border-slate-700">
                                                    {v.subject && <span className="flex items-center gap-1">📚 {v.subject}</span>}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                                {filteredViolations.length === 0 && (
                                    <div className="text-center py-10 text-slate-400">
                                        <Shield size={32} className="mx-auto mb-2 opacity-20 pointer-events-none"/>
                                        <p className="text-sm">Нет зафиксированных нарушений</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                    {activeTab === 'finance' && (
                        <div className="space-y-6 animate-in fade-in duration-300">
                            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                                    <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400">Финансовое состояние</h3>
                                    <button type="button" onClick={() => setShowPaymentModal(true)} disabled={isTeacher} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 shadow-sm transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"><Wallet size={18} className="pointer-events-none"/> Принять оплату</button>
                                </div>
                                <div className="flex flex-col sm:flex-row items-baseline gap-2 mb-2">
                                    <div className="text-sm text-slate-500">Текущий баланс</div>
                                    <div className={`text-4xl font-bold ${editingStudent.balance < 0 ? 'text-red-600' : 'text-emerald-600'}`}>{editingStudent.balance} <span className="text-xl font-medium text-slate-400">с.</span></div>
                                </div>
                                <div className="flex flex-col sm:flex-row justify-between items-end border-t border-slate-100 dark:border-slate-700 pt-4 mt-2">
                                    <div>
                                        <div className="text-sm text-slate-500 mb-1">К оплате (ежемесячно)</div>
                                        <div className="text-2xl font-bold text-slate-800 dark:text-white">{editingStudent.monthlyFee} с.</div>
                                        <div className="text-xs text-slate-400 mt-1">* Сумма всех курсов с учетом скидок</div>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-xl border border-slate-200 dark:border-slate-700">
                                <div className="flex justify-between items-center mb-4">
                                    <h4 className="font-bold text-slate-800 dark:text-white flex items-center gap-2"><Calculator size={16} className="pointer-events-none"/> Детализация стоимости</h4>
                                    <span className="text-xs text-slate-500">Настройте скидки индивидуально</span>
                                </div>
                                <div className="space-y-3 mb-6">
                                    {subjectFinanceData.length > 0 ? subjectFinanceData.map(item => {
                                        const { icon: SubjectIcon, color, bg } = getSubjectIcon(item.name);
                                        return (
                                            <div key={item.name} className="bg-white dark:bg-slate-700/50 p-3 rounded-xl border border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row items-center gap-4">
                                                <div className="flex items-center gap-3 flex-1 w-full sm:w-auto">
                                                    <div className={`p-2 rounded-lg ${bg}`}><SubjectIcon size={18} className={`${color} pointer-events-none`} /></div>
                                                    <span className="font-bold text-sm text-slate-800 dark:text-white">{item.name}</span>
                                                </div>
                                                <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                                                    <div className="text-right">
                                                        <span className="text-[11px] text-slate-400 font-semibold block">База</span>
                                                        <span className="text-sm font-medium text-slate-500">{item.basePrice} с.</span>
                                                    </div>
                                                    <div className="flex flex-col items-end">
                                                        <label className="text-[11px] text-slate-400 font-semibold block mb-1">Скидка %</label>
                                                        <input type="number" value={item.discount} onChange={(e) => handleSubjectDiscountChange(item.name, e.target.value)} className="w-16 border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-1 text-right text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100" min="0" max="100" disabled={isTeacher} />
                                                    </div>
                                                    <div className="text-right w-20">
                                                        <span className="text-[11px] text-slate-400 font-semibold block">Итого</span>
                                                        <span className="text-base font-bold text-slate-800 dark:text-white">{item.finalPrice} с.</span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    }) : (
                                        <div className="text-center py-4 text-slate-400 text-xs italic border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl">Курсы не выбраны.</div>
                                    )}
                                </div>
                                <div className="flex flex-col sm:flex-row justify-between items-end border-t border-slate-200 dark:border-slate-700 pt-4">
                                    <div className="w-full sm:w-1/2 mb-4 sm:mb-0">
                                        <CustomSelect label="Длительность скидки" value={discountDuration} onChange={handleDurationChange} options={DISCOUNT_DURATIONS} disabled={isTeacher} />
                                        <div className="mt-2"><InputGroup label="Основание для скидки" value={editingStudent.discountReason} onChange={(v: string) => setEditingStudent({...editingStudent, discountReason: v})} disabled={isTeacher} placeholder="Например: Сотрудник" className="w-full" /></div>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-sm font-medium text-slate-500 block mb-1">Итоговая ежемесячная оплата:</span>
                                        <span className="text-3xl font-black text-slate-800 dark:text-white">{totalMonthlyFee} с.</span>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                                <h3 className="font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2"><History size={18} className="pointer-events-none"/> История операций</h3>
                                <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
                                    {studentTransactions.length > 0 ? studentTransactions.map(t => (
                                        <div key={t.id} className="flex justify-between items-center text-sm p-2 hover:bg-slate-50 dark:hover:bg-slate-700/30 rounded border-b border-slate-50 dark:border-slate-700/50 last:border-0">
                                            <div>
                                                <span className="font-bold text-slate-700 dark:text-slate-200">{t.type === 'Payment' ? 'Оплата' : 'Возврат'}</span>
                                                <span className="text-slate-400 text-xs ml-2">{t.date}</span>
                                                <div className="text-[11px] text-slate-400">{t.purpose}</div>
                                            </div>
                                            <span className="font-bold text-emerald-600">{t.type === 'Payment' ? '+' : '-'}{t.amount} с.</span>
                                        </div>
                                    )) : <p className="text-center text-slate-400 text-xs py-4">Нет операций</p>}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-6 border-t border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 flex justify-between items-center rounded-b-2xl flex-shrink-0">
                    <div className="flex gap-4 items-center">
                        <button type="button" onClick={() => setShowHistory(true)} className="text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 font-bold text-sm flex items-center gap-2 transition-colors"><History size={18} className="pointer-events-none" /> История изменений</button>
                        {editingStudent.id && !isTeacher && (
                            <button 
                                type="button" 
                                onClick={() => { if(confirm(`Вы уверены, что хотите удалить ученика ${editingStudent.fullName}? Данное действие необратимо.`)) { onDelete?.(editingStudent.id); onClose(); } }}
                                className="text-rose-500 hover:text-rose-600 font-bold text-sm flex items-center gap-2 transition-colors px-4 py-2 hover:bg-rose-50 dark:hover:bg-rose-900/10 rounded-xl"
                            >
                                <Trash2 size={18} className="pointer-events-none" /> Удалить ученика
                            </button>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <button type="button" onClick={(e) => checkChangesAndClose(e)} className="px-6 py-2.5 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 font-bold text-sm transition-colors border-2 border-slate-200 dark:border-slate-700 rounded-xl">Отмена</button>
                        <button type="button" onClick={handleValidateAndSave} className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-blue-500/20 transition-all active:scale-95 ml-auto"><Save size={20} className="pointer-events-none" /> Сохранить</button>
                    </div>
                </div>

                {/* --- Undo Course Notification --- */}
                <AnimatePresence>
                    {undoSubjectData && (
                        <motion.div 
                            initial={{ y: 100, opacity: 0 }}
                            animate={{ y: -40, opacity: 1 }}
                            exit={{ y: 100, opacity: 0 }}
                            className="absolute bottom-20 left-1/2 -translate-x-1/2 z-[200] w-[90%] max-w-sm pointer-events-auto"
                        >
                            <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-2xl border border-white/10 flex items-center justify-between gap-4 ring-4 ring-black/10">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white shadow-lg">
                                        <Undo2 size={20} className="pointer-events-none" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold">Курс "${undoSubjectData.removedSubject}" убран</p>
                                        <p className="text-[11px] text-slate-400 font-black">Восстановить ({undoTimer}с)</p>
                                    </div>
                                </div>
                                <button 
                                    type="button"
                                    onClick={(e) => { e.preventDefault(); handleUndoSubjectDeletion(); }}
                                    className="px-4 py-2 bg-white text-slate-900 rounded-xl text-xs font-black uppercase hover:bg-blue-50 transition-colors shadow-sm"
                                >
                                    Отменить
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {showHistory && (
                    <div className="absolute inset-0 bg-black/20 backdrop-blur-[2px] z-[120] flex items-end sm:items-center justify-center animate-in fade-in duration-200">
                        <div className="w-full h-[60%] sm:h-[80%] sm:w-[90%] bg-slate-100 dark:bg-slate-900 rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-300">
                            <div className="p-4 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                                <h3 className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2"><RotateCcw size={18} className="pointer-events-none" /> Журнал действий</h3>
                                <button type="button" onClick={() => setShowHistory(false)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full text-slate-400"><X size={20} className="pointer-events-none" /></button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                {historyLogs.length > 0 ? historyLogs.map(log => (
                                    <div key={log.id} className="relative pl-6 border-l-2 border-slate-200 dark:border-slate-700 pb-4 last:pb-0">
                                        <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-white dark:bg-slate-800 border-2 border-blue-600"></div>
                                        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                                            <div className="flex justify-between items-start mb-1">
                                                <h4 className="font-bold text-slate-800 dark:text-white text-sm">{log.action}</h4>
                                                <span className="text-xs text-slate-400 font-mono">{new Date(log.timestamp).toLocaleString()}</span>
                                            </div>
                                            <p className="text-sm text-slate-600 dark:text-slate-300 mb-3">{log.details}</p>
                                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[11px] font-bold border border-blue-100 dark:border-blue-800">by {log.userName}</span>
                                        </div>
                                    </div>
                                )) : <div className="flex flex-col items-center justify-center h-full text-slate-400"><History size={48} className="mb-4 opacity-20 pointer-events-none"/><p>История изменений пуста</p></div>}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <PaymentModal 
                isOpen={showPaymentModal}
                onClose={() => setShowPaymentModal(false)}
                targetStudent={editingStudent}
            />

            {showViolationModal && (
                <div className="absolute inset-0 bg-black/50 z-[160] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-sm p-6 relative">
                        <button type="button" onClick={() => setShowViolationModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"><X size={20} className="pointer-events-none"/></button>
                        <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2"><AlertTriangle size={24} className="text-red-600 pointer-events-none"/> Нарушение</h3>
                        <div className="space-y-4">
                            <div><label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide">Тип нарушения</label><select value={newViolationData.type} onChange={(e) => setNewViolationData({...newViolationData, type: e.target.value as any})} className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2 text-sm bg-white dark:bg-slate-700"><option value="Опоздание">Опоздание</option><option value="Поведение">Поведение</option><option value="Успеваемость">Успеваемость</option></select></div>
                            <div><label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide">Дата</label><DateRangePicker startDate={newViolationData.date || ''} onChange={(d: string) => setNewViolationData({...newViolationData, date: d})} mode="single" className="w-full" /></div>
                            <div><label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide">Курс (урок)</label><select value={newViolationData.subject || ''} onChange={(e) => setNewViolationData({...newViolationData, subject: e.target.value})} className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2 text-sm bg-white dark:bg-slate-700"><option value="">Выберите курс...</option>{editingStudent.subjects?.map(sub => (<option key={sub} value={sub}>{sub}</option>))}</select></div>
                            <div><label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide">Кто зафиксировал</label><input list="reporters-list" type="text" value={newViolationData.reporter || ''} onChange={(e) => setNewViolationData({...newViolationData, reporter: e.target.value})} className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2 text-sm bg-white dark:bg-slate-700" placeholder="Имя сотрудника" /><datalist id="reporters-list">{employees.map(e => <option key={e.id} value={e.fullName} />)}</datalist></div>
                            <div><label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide">Комментарий</label><textarea value={newViolationData.comment || ''} onChange={(e) => setNewViolationData({...newViolationData, comment: e.target.value})} className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2 text-sm bg-white dark:bg-slate-700 h-24 resize-none" placeholder="Опишите ситуацию..." /></div>
                            <button type="button" onClick={handleSaveViolation} className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl shadow-lg transition-all active:scale-95 mt-4">Сохранить</button>
                        </div>
                    </div>
                </div>
            )}
            {showAddExamModal && (
                <div className="absolute inset-0 bg-black/50 z-[160] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in zoom-in duration-200">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-sm p-6 relative">
                        <button type="button" onClick={() => setShowAddExamModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"><X size={20} className="pointer-events-none"/></button>
                        <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2"><Award size={24} className="text-amber-500 pointer-events-none"/> Добавить результат</h3>
                        <div className="space-y-4">
                            <div><label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide">Курс</label><select value={newExamData.subject} onChange={(e) => setNewExamData({...newExamData, subject: e.target.value})} className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2 text-sm bg-white dark:bg-slate-700"><option value="">Выберите предмет...</option>{courses.map(course => (<option key={course.id} value={course.name}>{course.name}</option>))}</select></div>
                            <div className="grid grid-cols-2 gap-4"><div><label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide">Балл</label><input type="number" value={newExamData.score || ''} onChange={(e) => setNewExamData({...newExamData, score: Number(e.target.value)})} className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2 text-sm bg-white dark:bg-slate-700" placeholder="0" /></div><div><label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide">Макс. балл</label><input type="number" value={newExamData.maxScore || ''} onChange={(e) => setNewExamData({...newExamData, maxScore: Number(e.target.value)})} className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2 text-sm bg-white dark:bg-slate-700" placeholder="100" /></div></div>
                            <div><label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide">Дата</label><DateRangePicker startDate={newExamData.date || ''} onChange={(d: string) => setNewExamData({...newExamData, date: d})} mode="single" className="w-full" /></div>
                            <button type="button" onClick={handleSaveExam} className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-3 rounded-xl shadow-lg transition-all active:scale-95 mt-4">Добавить запись</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
