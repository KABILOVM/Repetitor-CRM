
import React, { useState, useEffect, useMemo } from 'react';
import { storage, StorageKeys } from '../services/storage';
import { PipelineStage, StudentStatus, Student, Branch, Cluster, UserRole, UserProfile, BranchEntity } from '../types';
import { Phone, CalendarCheck, FileText, MessageSquare, X, ArrowRight, CheckCircle, GraduationCap, ClipboardList, Wallet, Undo2, User, Save, MapPin } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { StudentProfileModal } from '../components/StudentProfileModal';
import { CustomSelect } from '../components/CustomSelect';
import { useData } from '../hooks/useData';

// --- Kanban Components ---
interface KanbanColumnProps {
    title: string;
    stage: PipelineStage;
    color: string;
    students: Student[];
    onMove: (student: Student) => void;
    onEdit: (student: Student) => void;
    onDrop: (e: React.DragEvent, stage: PipelineStage) => void;
}

const KanbanColumn = ({ title, stage, color, students, onMove, onEdit, onDrop }: KanbanColumnProps) => {
    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    return (
        <div 
            className="flex-1 min-w-[300px] bg-slate-100 dark:bg-slate-800/50 rounded-xl p-4 flex flex-col gap-3 h-full shadow-inner"
            onDragOver={handleDragOver}
            onDrop={(e) => onDrop(e, stage)}
        >
            <div className={`flex items-center justify-between pb-2 border-b-2 ${color}`}>
                <h3 className="font-bold text-slate-700 dark:text-slate-200 text-[11px] uppercase tracking-widest">{title}</h3>
                <span className="bg-white dark:bg-slate-700 px-2 py-0.5 rounded-full text-xs font-black text-slate-500 dark:text-slate-300 shadow-sm border dark:border-slate-600">
                    {students.length}
                </span>
            </div>
            <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar p-1">
                <AnimatePresence>
                    {students.map(student => (
                        <motion.div
                            layoutId={String(student.id)}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            key={student.id}
                            draggable
                            onDragStart={(e) => {
                                (e as any).dataTransfer.setData("studentId", String(student.id));
                            }}
                            className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-lg hover:border-blue-400 transition-all cursor-grab active:cursor-grabbing group relative"
                        >
                            <div className="flex justify-between items-start mb-2">
                                <div className="min-w-0 flex-1">
                                    <span className="font-bold text-slate-800 dark:text-slate-100 block truncate text-sm uppercase tracking-tight">{student.fullName}</span>
                                    <span className="text-[9px] font-bold uppercase text-slate-400 tracking-wider">
                                        {student.subjects?.join(' • ') || 'Курс не выбран'}
                                    </span>
                                </div>
                                <button onClick={() => onEdit(student)} className="text-slate-300 hover:text-blue-500 transition-colors shrink-0" title="Профиль">
                                    <User size={16} />
                                </button>
                            </div>
                            
                            <div className="flex flex-col gap-1.5 mt-2">
                                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-bold">
                                    <Phone size={12} className="text-slate-400" />
                                    {student.phone}
                                </div>
                                {student.branch && (
                                    <div className="flex items-center gap-1 text-[9px] font-bold uppercase text-slate-400 bg-slate-50 dark:bg-slate-700/50 p-1 px-2 rounded-lg border dark:border-slate-600 w-fit">
                                        <MapPin size={10} className="text-blue-500"/> {student.branch}
                                    </div>
                                )}
                            </div>

                            <div className="mt-4 pt-3 border-t border-slate-50 dark:border-slate-700 flex justify-end">
                                <button 
                                    onClick={() => onMove(student)}
                                    className="flex items-center gap-1.5 text-[10px] bg-blue-50 hover:bg-blue-600 dark:bg-blue-900/30 dark:hover:bg-blue-600 px-3 py-1.5 rounded-lg text-blue-600 dark:text-blue-400 hover:text-white font-bold uppercase tracking-widest transition-all"
                                >
                                {stage === PipelineStage.Payment ? 'Активировать' : 'Далее'} <ArrowRight size={12} />
                                </button>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
                {students.length === 0 && (
                    <div className="text-center py-20 opacity-20 flex flex-col items-center">
                        <div className="mx-auto w-12 h-12 border-2 border-dashed border-slate-400 rounded-2xl mb-3"></div>
                        <span className="text-[10px] font-bold uppercase tracking-widest">Перетащите сюда</span>
                    </div>
                )}
            </div>
        </div>
    );
}

export const CRM: React.FC = () => {
  const [students, setStudents] = useData<Student[]>(StorageKeys.STUDENTS, []);
  const [branches] = useData<BranchEntity[]>(StorageKeys.BRANCHES, []);
  const user = storage.get<UserProfile>(StorageKeys.USER_PROFILE, { role: UserRole.GeneralDirector, fullName: 'Admin', email: '', permissions: [] });
  
  const [showScripts, setShowScripts] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<string>('All');
  
  const [undoData, setUndoData] = useState<{ studentId: number, prevStage: PipelineStage, prevStatus: StudentStatus | string, prevDetails?: any } | null>(null);
  const [undoTimer, setUndoTimer] = useState<number>(0);

  const isSuperUser = [UserRole.GeneralDirector, UserRole.Director, UserRole.Developer, UserRole.Financier].includes(user.role);
  const dynamicBranchList = useMemo(() => branches.filter(b => b.isActive).map(b => b.name).sort(), [branches]);

  const pipelineStudents = useMemo(() => {
      let leads = students.filter(s => s.status === StudentStatus.Presale);
      if (isSuperUser) {
          if (selectedBranch !== 'All') leads = leads.filter(s => s.branch === selectedBranch);
      } else if (user.branch) {
          leads = leads.filter(s => s.branch === user.branch);
      }
      return leads;
  }, [students, user, selectedBranch, isSuperUser]);

  useEffect(() => {
      if (undoTimer > 0) {
          const timer = setTimeout(() => setUndoTimer(prev => prev - 1), 1000);
          return () => clearTimeout(timer);
      } else if (undoTimer === 0 && undoData) {
          setUndoData(null);
      }
  }, [undoTimer, undoData]);

  const updateStudent = (updatedStudent: Student) => {
      const updatedList = students.map(s => s.id === updatedStudent.id ? updatedStudent : s);
      setStudents(updatedList);
  };

  const handleAdvanceStage = (student: Student) => {
      let nextStage: PipelineStage | null = null;
      switch (student.pipelineStage) {
          case PipelineStage.New: nextStage = PipelineStage.Call; break;
          case PipelineStage.Call: nextStage = PipelineStage.Trial; break;
          case PipelineStage.Trial: nextStage = PipelineStage.Contract; break;
          case PipelineStage.Contract: nextStage = PipelineStage.Payment; break;
          case PipelineStage.Payment: handleActivation(student); return;
          default: nextStage = PipelineStage.New;
      }
      if (nextStage) updateStudent({ ...student, pipelineStage: nextStage });
  };

  const handleActivation = (student: Student) => {
      const today = new Date().toISOString().split('T')[0];
      
      // Seed subject details for current subjects
      const updatedDetails = { ...(student.subjectDetails || {}) };
      (student.subjects || []).forEach(sub => {
          if (!updatedDetails[sub]) {
              updatedDetails[sub] = { startDate: today };
          } else if (!updatedDetails[sub].startDate) {
              updatedDetails[sub].startDate = today;
          }
      });

      setUndoData({ 
        studentId: student.id, 
        prevStage: student.pipelineStage as PipelineStage, 
        prevStatus: student.status,
        prevDetails: student.subjectDetails
      });
      setUndoTimer(5);
      
      updateStudent({ 
        ...student, 
        status: StudentStatus.Active, 
        startDate: today,
        subjectDetails: updatedDetails
      });
      
      storage.logAction('Активация', `Ученик ${student.fullName} активирован`, student.id);
  };

  const handleUndo = () => {
      if (!undoData) return;
      const student = students.find(s => s.id === undoData.studentId);
      if (student) {
          updateStudent({ 
            ...student, 
            status: undoData.prevStatus, 
            pipelineStage: undoData.prevStage, 
            startDate: undefined,
            subjectDetails: undoData.prevDetails
          });
          setUndoData(null);
          setUndoTimer(0);
      }
  };

  const handleDrop = (e: React.DragEvent, targetStage: PipelineStage) => {
      const studentId = Number(e.dataTransfer.getData("studentId"));
      const student = students.find(s => s.id === studentId);
      if (student && student.pipelineStage !== targetStage) {
          updateStudent({ ...student, pipelineStage: targetStage });
      }
  };

  const handleDelete = (id: number) => {
    const updatedList = students.filter(s => s.id !== id);
    setStudents(updatedList);
    setEditingStudent(null);
    storage.notify('Лид удален', 'info');
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col relative antialiased">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
        <div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white uppercase tracking-tight">Воронка оформления</h2>
            <p className="text-sm text-slate-500 font-medium mt-0.5 tracking-tight">Путь от записи до первого занятия</p>
            {isSuperUser && (
                <div className="flex items-center gap-2 mt-3">
                    <div className="w-56">
                        <CustomSelect 
                            value={selectedBranch === 'All' ? 'Все филиалы' : selectedBranch} 
                            onChange={(val) => setSelectedBranch(val === 'Все филиалы' ? 'All' : val)}
                            options={['Все филиалы', ...dynamicBranchList]}
                            icon={MapPin}
                        />
                    </div>
                </div>
            )}
        </div>
        <button onClick={() => setShowScripts(true)} className="bg-emerald-600 text-white px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-emerald-700 flex items-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"><ClipboardList size={18} /> Памятка</button>
      </div>
      
      <div className="flex-1 flex gap-4 overflow-x-auto pb-4 custom-scrollbar">
        <KanbanColumn title="1. Новая запись" stage={PipelineStage.New} color="border-slate-400" students={pipelineStudents.filter(s => s.pipelineStage === PipelineStage.New)} onMove={handleAdvanceStage} onEdit={setEditingStudent} onDrop={handleDrop} />
        <KanbanColumn title="2. Тестирование" stage={PipelineStage.Call} color="border-amber-400" students={pipelineStudents.filter(s => s.pipelineStage === PipelineStage.Call)} onMove={handleAdvanceStage} onEdit={setEditingStudent} onDrop={handleDrop} />
        <KanbanColumn title="3. Пробный урок" stage={PipelineStage.Trial} color="border-purple-400" students={pipelineStudents.filter(s => s.pipelineStage === PipelineStage.Trial)} onMove={handleAdvanceStage} onEdit={setEditingStudent} onDrop={handleDrop} />
        <KanbanColumn title="4. Договор" stage={PipelineStage.Contract} color="border-blue-400" students={pipelineStudents.filter(s => s.pipelineStage === PipelineStage.Contract)} onMove={handleAdvanceStage} onEdit={setEditingStudent} onDrop={handleDrop} />
        <KanbanColumn title="5. Оплата" stage={PipelineStage.Payment} color="border-emerald-500" students={pipelineStudents.filter(s => s.pipelineStage === PipelineStage.Payment)} onMove={handleAdvanceStage} onEdit={setEditingStudent} onDrop={handleDrop} />
      </div>

      {editingStudent && (
        <StudentProfileModal 
            student={editingStudent} 
            onClose={() => setEditingStudent(null)} 
            onSave={(s) => { 
                updateStudent(s); 
                setEditingStudent(null); 
                storage.notify('Изменения сохранены', 'success');
            }} 
            onDelete={handleDelete}
        />
      )}
      <AnimatePresence>{undoData && <motion.div initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }} className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-8 py-4 rounded-full shadow-2xl flex items-center gap-6 z-[100] border border-white/10"><div className="flex flex-col"><span className="font-bold text-sm uppercase tracking-tight">Ученик активирован!</span><span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Отмена: {undoTimer}с</span></div><button onClick={handleUndo} className="bg-white text-slate-900 px-4 py-2 rounded-full text-xs font-black uppercase hover:bg-slate-200 transition-all flex items-center gap-1 tracking-tighter">Отменить</button></motion.div>}</AnimatePresence>
    </div>
  );
};
