
import React, { useState, useEffect, useMemo } from 'react';
import { storage, StorageKeys } from '../services/storage';
import { PipelineStage, StudentStatus, Student, Branch, Cluster, UserRole, UserProfile } from '../types';
import { Phone, CalendarCheck, FileText, MessageSquare, X, ArrowRight, CheckCircle, GraduationCap, ClipboardList, Wallet, Undo2, User, Save, MapPin } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { StudentProfileModal } from '../components/StudentProfileModal';

// --- Helper Components ---

const ScriptsModal = ({ onClose }: { onClose: () => void }) => {
    const [activeScript, setActiveScript] = useState('testing');

    const scripts: Record<string, { title: string, content: React.ReactNode }> = {
        testing: {
            title: 'Тестирование',
            content: (
                <div className="space-y-4">
                    <div className="bg-slate-50 dark:bg-slate-700 p-3 rounded">
                        <p className="font-bold text-sm mb-1">Приглашение на тест:</p>
                        <p className="text-sm italic">«Здравствуйте! Чтобы подобрать для вас подходящую группу, нам нужно определить ваш текущий уровень знаний. Это бесплатно и займет около 30 минут. Когда вам удобно подойти?»</p>
                    </div>
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded border border-yellow-200 dark:border-yellow-800">
                        <p className="font-bold text-sm mb-1">Важно:</p>
                        <ul className="list-disc list-inside text-sm mt-2 space-y-1">
                            <li>Выдать бланк тестирования по предмету.</li>
                            <li>Засечь время (не более 45 мин).</li>
                            <li>Передать результаты завучу для проверки.</li>
                        </ul>
                    </div>
                </div>
            )
        },
        trial: {
            title: 'Пробный урок',
            content: (
                <div className="space-y-4 text-sm">
                    <div className="bg-slate-50 dark:bg-slate-700 p-3 rounded">
                        <p className="font-bold mb-1">Перед уроком:</p>
                        <p className="italic">«Ваша группа [Название], кабинет [Номер]. Преподаватель [Имя]. Занятие начнется в [Время]. После урока подойдите, пожалуйста, к администратору, чтобы обсудить впечатления.»</p>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-700 p-3 rounded">
                        <p className="font-bold mb-1">После урока:</p>
                        <p className="italic">«Как вам занятие? Все ли было понятно? Если вам понравилось, мы можем закрепить за вами место в этой группе.»</p>
                    </div>
                </div>
            )
        },
        contract: {
            title: 'Договор и Оплата',
            content: (
                <div className="space-y-2 text-sm">
                    <p className="font-bold">Необходимые документы:</p>
                    <ul className="list-disc list-inside space-y-1 bg-white dark:bg-slate-800 p-2 rounded border dark:border-slate-600">
                        <li>Паспорт родителя (копия)</li>
                        <li>Свидетельство о рождении/Паспорт ученика</li>
                        <li>Заполненная анкета</li>
                        <li>Подписанный договор (2 экз.)</li>
                    </ul>
                    <p className="mt-2 font-bold text-emerald-600">Правило оплаты:</p>
                    <p className="italic">«Оплата производится авансом за месяц до 5-го числа. Первая оплата вносится при подписании договора.»</p>
                </div>
            )
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-lg h-[500px] flex flex-col">
                <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                    <h3 className="font-bold text-lg text-slate-800 dark:text-white flex items-center gap-2">
                        <ClipboardList size={20} className="text-blue-500"/>
                        Памятка администратора
                    </h3>
                    <button onClick={onClose}><X size={20} className="text-slate-400 hover:text-slate-600" /></button>
                </div>
                <div className="flex border-b border-slate-200 dark:border-slate-700">
                    {Object.keys(scripts).map(key => (
                        <button 
                            key={key}
                            onClick={() => setActiveScript(key)}
                            className={`flex-1 py-3 text-sm font-medium ${activeScript === key ? 'border-b-2 border-blue-500 text-blue-600' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                        >
                            {scripts[key].title}
                        </button>
                    ))}
                </div>
                <div className="p-4 overflow-y-auto flex-1 text-slate-700 dark:text-slate-300">
                    {scripts[activeScript].content}
                </div>
            </div>
        </div>
    );
};

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
            className="flex-1 min-w-[300px] bg-slate-100 dark:bg-slate-800/50 rounded-xl p-4 flex flex-col gap-3 h-full"
            onDragOver={handleDragOver}
            onDrop={(e) => onDrop(e, stage)}
        >
            <div className={`flex items-center justify-between pb-2 border-b-2 ${color}`}>
            <h3 className="font-semibold text-slate-700 dark:text-slate-200 text-sm uppercase tracking-wide">{title}</h3>
            <span className="bg-white dark:bg-slate-700 px-2 py-0.5 rounded-full text-xs font-bold text-slate-500 dark:text-slate-300 shadow-sm">
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
                                // e.dataTransfer.setData('text/plain', String(student.id)); // Standard way
                                // For React we can also rely on local state if needed, but dataTransfer is robust
                                (e as any).dataTransfer.setData("studentId", String(student.id));
                            }}
                            className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing group relative"
                        >
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <span className="font-bold text-slate-800 dark:text-slate-100 block">{student.fullName}</span>
                                    <span className="text-[10px] uppercase text-slate-400">
                                        {student.subjects?.join(', ') || student['subject'] || 'Предмет не выбран'}
                                    </span>
                                </div>
                                <button onClick={() => onEdit(student)} className="text-slate-300 hover:text-blue-500 transition-colors" title="Профиль">
                                    <User size={16} />
                                </button>
                            </div>
                            
                            <div className="flex flex-col gap-2 mt-2">
                                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                                <Phone size={12} />
                                {student.phone}
                                </div>
                                {student.branch && (
                                    <div className="flex items-center gap-1 text-[10px] text-slate-400 bg-slate-50 dark:bg-slate-700/50 p-1 px-2 rounded w-fit">
                                        <MapPin size={10}/> {student.branch}
                                    </div>
                                )}
                                {student.note && (
                                    <div className="text-[10px] text-slate-400 bg-slate-50 dark:bg-slate-700/50 p-1.5 rounded italic">
                                        "{student.note}"
                                    </div>
                                )}
                            </div>

                            <div className="mt-4 pt-2 border-t border-slate-100 dark:border-slate-700 flex justify-end">
                                <button 
                                    onClick={() => onMove(student)}
                                    className="flex items-center gap-1 text-xs bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 px-3 py-1.5 rounded text-blue-600 dark:text-blue-400 font-bold transition-colors"
                                >
                                {stage === PipelineStage.Payment ? 'Активировать' : 'Далее'} <ArrowRight size={12} />
                                </button>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
                {students.length === 0 && (
                    <div className="text-center py-10 opacity-30">
                        <div className="mx-auto w-8 h-8 border-2 border-dashed rounded-full mb-2"></div>
                        <span className="text-xs">Перетащите сюда</span>
                    </div>
                )}
            </div>
        </div>
    );
}

export const CRM: React.FC = () => {
  const [students, setStudents] = useState<Student[]>(() => storage.get<Student[]>(StorageKeys.STUDENTS, []));
  const user = storage.get<UserProfile>(StorageKeys.USER_PROFILE, { role: UserRole.GeneralDirector, fullName: 'Admin', email: '', permissions: [] });
  
  const [showScripts, setShowScripts] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<string>('All');
  
  // Undo State
  const [undoData, setUndoData] = useState<{ studentId: number, prevStage: PipelineStage, prevStatus: StudentStatus | string } | null>(null);
  const [undoTimer, setUndoTimer] = useState<number>(0);

  const isSuperUser = [UserRole.GeneralDirector, UserRole.Director, UserRole.Developer, UserRole.Financier].includes(user.role);

  // Filter Logic
  const pipelineStudents = useMemo(() => {
      let leads = students.filter(s => s.status === StudentStatus.Presale);
      
      if (isSuperUser) {
          if (selectedBranch !== 'All') {
              leads = leads.filter(s => s.branch === selectedBranch);
          }
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
          setUndoData(null); // Clear undo option after time runs out
      }
  }, [undoTimer, undoData]);

  const updateStudent = (updatedStudent: Student) => {
      const updatedList = students.map(s => s.id === updatedStudent.id ? updatedStudent : s);
      setStudents(updatedList);
      storage.set(StorageKeys.STUDENTS, updatedList);
  };

  const handleAdvanceStage = (student: Student) => {
      let nextStage: PipelineStage | null = null;
      
      switch (student.pipelineStage) {
          case PipelineStage.New: nextStage = PipelineStage.Call; break;
          case PipelineStage.Call: nextStage = PipelineStage.Trial; break;
          case PipelineStage.Trial: nextStage = PipelineStage.Trial; break;
          case PipelineStage.Contract: nextStage = PipelineStage.Payment; break;
          case PipelineStage.Payment: 
              handleActivation(student);
              return;
          default: nextStage = PipelineStage.New;
      }

      if (nextStage) {
          updateStudent({ ...student, pipelineStage: nextStage });
      }
  };

  const handleActivation = (student: Student) => {
      const newStartDate = new Date().toISOString().split('T')[0];
      
      // Save state for undo
      setUndoData({
          studentId: student.id,
          prevStage: student.pipelineStage,
          prevStatus: student.status
      });
      setUndoTimer(5); // 5 seconds

      updateStudent({ 
          ...student, 
          status: StudentStatus.Active, 
          startDate: newStartDate,
          pipelineStage: PipelineStage.Payment // Keep stage technically as payment in background
      });
      
      storage.logAction('Активация', `Ученик ${student.fullName} переведен в Активные`, student.id);
  };

  const handleUndo = () => {
      if (!undoData) return;
      
      const student = students.find(s => s.id === undoData.studentId);
      if (student) {
          updateStudent({
              ...student,
              status: undoData.prevStatus,
              pipelineStage: undoData.prevStage,
              startDate: undefined // Reset start date
          });
          setUndoData(null);
          setUndoTimer(0);
      }
  };

  const handleDrop = (e: React.DragEvent, targetStage: PipelineStage) => {
      const studentId = Number(e.dataTransfer.getData("studentId"));
      if (!studentId) return;

      const student = students.find(s => s.id === studentId);
      if (!student) return;

      // If dropped on same stage, do nothing
      if (student.pipelineStage === targetStage) return;

      // If moving to Payment/Active via drop, we could trigger activation logic
      // But usually drag and drop is for sorting. Let's just allow moving stages freely.
      // Exception: If dragging TO Payment, it stays Lead. User must click "Activate" to finish.
      // If dragging FROM Payment backwards, it just moves back.
      
      updateStudent({ ...student, pipelineStage: targetStage });
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col relative">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
        <div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Воронка оформления (Onboarding)</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Путь ученика от записи до первого занятия</p>
            
            {isSuperUser && (
                <div className="flex items-center gap-2 mt-2">
                    <MapPin size={14} className="text-slate-400" />
                    <select 
                        value={selectedBranch} 
                        onChange={(e) => setSelectedBranch(e.target.value)}
                        className="bg-transparent text-sm font-bold text-slate-600 dark:text-slate-300 border-b border-dashed border-slate-300 dark:border-slate-600 outline-none pb-0.5 cursor-pointer hover:text-blue-600"
                    >
                        <option value="All">Все филиалы</option>
                        {Object.values(Branch).map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                </div>
            )}
        </div>
        <div className="flex gap-2">
            <button 
                onClick={() => setShowScripts(true)}
                className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-2 shadow-sm"
            >
                <ClipboardList size={18} />
                Памятка
            </button>
        </div>
      </div>
      
      <div className="flex-1 flex gap-4 overflow-x-auto pb-4 custom-scrollbar">
        <KanbanColumn 
          title="1. Новая запись" 
          stage={PipelineStage.New} 
          color="border-slate-400 dark:border-slate-500" 
          students={pipelineStudents.filter(s => s.pipelineStage === PipelineStage.New)} 
          onMove={handleAdvanceStage}
          onEdit={setEditingStudent}
          onDrop={handleDrop}
        />
        <KanbanColumn 
          title="2. Тестирование" 
          stage={PipelineStage.Call} 
          color="border-amber-400 dark:border-amber-500" 
          students={pipelineStudents.filter(s => s.pipelineStage === PipelineStage.Call)} 
          onMove={handleAdvanceStage}
          onEdit={setEditingStudent}
          onDrop={handleDrop}
        />
        <KanbanColumn 
          title="3. Пробный урок" 
          stage={PipelineStage.Trial} 
          color="border-purple-400 dark:border-purple-500" 
          students={pipelineStudents.filter(s => s.pipelineStage === PipelineStage.Trial)} 
          onMove={handleAdvanceStage}
          onEdit={setEditingStudent}
          onDrop={handleDrop}
        />
        <KanbanColumn 
          title="4. Договор" 
          stage={PipelineStage.Contract} 
          color="border-blue-400 dark:border-blue-500" 
          students={pipelineStudents.filter(s => s.pipelineStage === PipelineStage.Contract)} 
          onMove={handleAdvanceStage}
          onEdit={setEditingStudent}
          onDrop={handleDrop}
        />
        <KanbanColumn 
          title="5. Оплата (Финиш)" 
          stage={PipelineStage.Payment} 
          color="border-emerald-500" 
          students={pipelineStudents.filter(s => s.pipelineStage === PipelineStage.Payment)} 
          onMove={handleAdvanceStage}
          onEdit={setEditingStudent}
          onDrop={handleDrop}
        />
      </div>

      {/* Modals */}
      {showScripts && <ScriptsModal onClose={() => setShowScripts(false)} />}
      {editingStudent && (
          <StudentProfileModal 
            student={editingStudent} 
            onClose={() => setEditingStudent(null)} 
            onSave={(s) => { updateStudent(s); setEditingStudent(null); }} 
          />
      )}

      {/* Undo Toast */}
      <AnimatePresence>
          {undoData && (
              <motion.div 
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 100, opacity: 0 }}
                className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-4 z-50"
              >
                  <div className="flex flex-col">
                      <span className="font-bold text-sm">Ученик активирован!</span>
                      <span className="text-[10px] text-slate-400">Отмена доступна: {undoTimer}с</span>
                  </div>
                  <button 
                    onClick={handleUndo}
                    className="bg-white text-slate-900 px-3 py-1.5 rounded-full text-xs font-bold hover:bg-slate-200 flex items-center gap-1"
                  >
                      <Undo2 size={14} /> Отменить
                  </button>
              </motion.div>
          )}
      </AnimatePresence>
    </div>
  );
};
