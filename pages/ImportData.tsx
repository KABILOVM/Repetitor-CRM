
import React, { useState, useRef } from 'react';
import { Database, CheckCircle, RefreshCw, Trash2, Info, Upload, X, Terminal, FileSpreadsheet, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { storage, StorageKeys } from '../services/storage';
import { supabase } from '../services/supabase';
import { 
    StudentStatus, PipelineStage, Student, Group, Transaction, 
    Course, Violation, Branch, Cluster, BranchEntity, CourseProgram, ExamResult
} from '../types';
import * as XLSX from 'xlsx';

export const ImportData: React.FC = () => {
  const [dragActive, setDragActive] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importStats, setImportStats] = useState<Record<string, number> | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const addLog = (msg: string) => setLogs(prev => [...prev, msg]);

  const getInternalTableName = (sheetName: string): string | null => {
      const lower = sheetName.toLowerCase().trim();
      if (['students', 'pupils', 'users', 'children', 'student', 'ученики', 'студенты', 'лиды', 'лист1', 'sheet1'].some(k => lower.includes(k))) return 'students';
      if (['groups', 'classes', 'subjects', 'courses', 'group', 'группы', 'классы'].some(k => lower.includes(k))) return 'groups';
      if (['transactions', 'payments', 'finance', 'invoices', 'payment', 'оплаты', 'транзакции', 'финансы'].some(k => lower.includes(k))) return 'transactions';
      if (['teachers', 'instructors', 'staff', 'employees', 'teacher', 'преподаватели', 'учителя'].some(k => lower.includes(k))) return 'teachers';
      return 'students';
  };

  const mapKey = (key: string): string => {
    const k = key.toLowerCase().trim().replace(/['"`\(\)\.\r\n]/g, '').replace(/\s+/g, '');
    if (k.includes('фиородителя')) return 'parentName';
    if (k.includes('номерродителя')) return 'parentPhone';
    if (k.includes('почтародителя') || k.includes('email')) return 'parentEmail';
    if (k.includes('фио')) return 'fullName';
    if (k.includes('номер') || k.includes('телефон')) return 'phone';
    if (k.includes('школа')) return 'school';
    if (k.includes('класс')) return 'grade';
    if (k.includes('годрождения')) return 'birthYear';
    if (k.includes('предмет')) return 'subject';
    if (k.includes('язык')) return 'language';
    if (k.includes('цель')) return 'studyGoal';
    if (k.includes('аккаунт')) return 'platformAccount';
    if (k.includes('статус')) return 'status';
    if (k.includes('договор')) return 'contract';
    if (k.includes('откуда')) return 'source';
    if (k.includes('примечание')) return 'note';
    if (k.includes('датаначала')) return 'startDate';
    if (k.includes('датаухода')) return 'endDate';
    if (k.includes('причина')) return 'leaveReason';
    if (k.includes('обзвон')) return 'presaleStatus';
    if (k.includes('объяснение')) return 'discountReason';
    if (k.includes('дальто')) return 'isColorBlind';
    return k; 
  };

  const cleanPhone = (phone: any) => {
      if (!phone) return '';
      return String(phone).replace(/[^0-9+]/g, '');
  };

  const saveDataToStorage = (
    newStudents: any[],
    newGroups: any[],
    newTransactions: any[],
    newTeachers: any[]
  ) => {
    if (newStudents.length > 0) {
        const current = storage.get(StorageKeys.STUDENTS, []);
        const processed = newStudents.map((s, idx) => {
            let status = StudentStatus.Presale;
            const statusStr = String(s.status || '').toLowerCase();
            if (statusStr.includes('актив') || statusStr.includes('учится')) status = StudentStatus.Active;
            if (statusStr.includes('пауз')) status = StudentStatus.Paused;
            if (statusStr.includes('архив') || statusStr.includes('ушел') || statusStr.includes('неактив')) status = StudentStatus.Archived;
            if (statusStr.includes('отвал') || statusStr.includes('дроп')) status = StudentStatus.Dropped;
            const subjectList = s.subject ? [s.subject] : [];
            return {
                id: Date.now() + idx,
                fullName: s.fullName || 'Без имени',
                phone: cleanPhone(s.phone),
                parentName: s.parentName || '',
                parentPhone: cleanPhone(s.parentPhone),
                parentEmail: s.parentEmail || '',
                school: s.school ? String(s.school) : undefined,
                grade: s.grade ? String(s.grade) : undefined,
                birthYear: s.birthYear ? String(s.birthYear) : undefined,
                subjects: subjectList,
                language: s.language || '',
                studyGoal: s.studyGoal || '',
                platformAccount: s.platformAccount || '',
                contract: s.contract ? String(s.contract).toLowerCase().includes('да') || String(s.contract).includes('+') : false,
                startDate: s.startDate,
                endDate: s.endDate,
                leaveReason: s.leaveReason,
                discountPercent: s.discountPercent ? parseFloat(s.discountPercent) : 0,
                discountReason: s.discountReason,
                note: s.note,
                presaleStatus: s.presaleStatus,
                isColorBlind: s.isColorBlind ? String(s.isColorBlind).toLowerCase().includes('да') : false,
                status: status,
                pipelineStage: PipelineStage.New,
                balance: 0,
                monthlyFee: 0,
                consecutiveAbsences: 0,
                source: s.source || 'Импорт'
            };
        });
        storage.set(StorageKeys.STUDENTS, [...current, ...processed]);
    }
    if (newGroups.length > 0) {
        const current = storage.get(StorageKeys.GROUPS, []);
        const processed = newGroups.map((g, idx) => ({
            id: Date.now() + idx + 1000,
            name: g.name || `Группа ${idx + 1}`,
            subject: g.subject || 'Общий',
            teacher: g.teacher || 'Не назначен',
            schedule: g.schedule || 'Пн/Ср 10:00',
            studentsCount: Number(g.studentsCount) || 0,
            maxStudents: Number(g.maxStudents) || 10
        }));
        storage.set(StorageKeys.GROUPS, [...current, ...processed]);
    }
    setImportStats({
        students: newStudents.length,
        groups: newGroups.length,
        transactions: newTransactions.length,
        teachers: newTeachers.length,
        violations: 0
    });
    setIsProcessing(false);
  };

  const processFile = async (file: File) => {
    setIsProcessing(true);
    setLogs([]);
    setImportStats(null);
    addLog(`Начало обработки файла: ${file.name}`);
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = e.target?.result;
            const workbook = XLSX.read(data, { type: 'binary' });
            const collections: Record<string, any[]> = { students: [], groups: [], transactions: [], teachers: [] };
            workbook.SheetNames.forEach(sheetName => {
                const tableName = getInternalTableName(sheetName);
                if (tableName) {
                    addLog(`Лист "${sheetName}" распознан как таблица "${tableName}"`);
                    const rawData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: "" });
                    if (rawData.length > 0) {
                        const mappedData = rawData.map((row: any) => {
                            const newRow: any = {};
                            Object.keys(row).forEach(key => { newRow[mapKey(key)] = row[key]; });
                            return newRow;
                        });
                        collections[tableName].push(...mappedData);
                        addLog(`  -> Найдено ${mappedData.length} записей`);
                    }
                }
            });
            saveDataToStorage(collections.students, collections.groups, collections.transactions, collections.teachers);
            addLog('Импорт успешно завершен!');
        } catch (error) {
            console.error(error);
            addLog(`Ошибка при чтении файла: ${(error as Error).message}`);
            setIsProcessing(false);
        }
    };
    reader.readAsBinaryString(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) { processFile(e.dataTransfer.files[0]); }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) { processFile(e.target.files[0]); }
  };

  const handleClearData = async () => {
    if (confirm('Вы уверены? Будут удалены: Ученики, Группы, Предметы, Финансы, Расписание, Анкеты и т.д.\n\nВаш профиль и список сотрудников останутся.')) {
        setIsProcessing(true);
        addLog('Начало очистки базы данных...');
        const keysToReset = [
            StorageKeys.STUDENTS, StorageKeys.GROUPS, StorageKeys.TRANSACTIONS, StorageKeys.COURSES,
            StorageKeys.COURSE_PROGRAMS, StorageKeys.EXAM_RESULTS, StorageKeys.VIOLATIONS, StorageKeys.CALLS,
            StorageKeys.RETENTION_LOGS, StorageKeys.ATTRACTION_LOGS, StorageKeys.INVOICES, StorageKeys.ATTENDANCE,
            StorageKeys.AUDIT_LOGS, StorageKeys.LMS_SUBJECTS, StorageKeys.LMS_SECTIONS, StorageKeys.LMS_TOPICS,
            StorageKeys.LMS_LESSONS, StorageKeys.LMS_PROGRESS, StorageKeys.SURVEYS, StorageKeys.SURVEY_RESPONSES,
            StorageKeys.BRANCHES
        ];
        try {
            const { error } = await supabase.from('app_data').delete().in('key', keysToReset);
            if (error) { addLog(`Внимание: Ошибка удаления из облака: ${error.message}`); } 
            else { addLog('Данные успешно удалены из облака (Supabase).'); }
            keysToReset.forEach(key => {
                localStorage.setItem(key, JSON.stringify([]));
                (storage as any).subscribe && (storage as any).set(key, []);
            });
            addLog('Локальное хранилище очищено.');
            setImportStats(null);
            storage.notify('База данных полностью очищена.', 'success');
        } catch (error) {
            console.error(error);
            addLog(`Критическая ошибка: ${(error as Error).message}`);
            storage.notify('Ошибка при очистке. Проверьте консоль.', 'error');
        } finally { setIsProcessing(false); }
    }
  };

  const handleLoadDemo = () => {
      addLog('Инициализация масштабной генерации данных (300 учеников + история)...');
      setIsProcessing(true);
      setLogs([]);

      const firstNames = ['Алишер', 'Мадина', 'Рустам', 'Зарина', 'Далер', 'Нигина', 'Парвиз', 'Суман', 'Фирдавс', 'Мехрона', 'Джамшед', 'Мунира', 'Анвар', 'Сабрина', 'Абдулло', 'Лола', 'Тимур', 'Елена', 'Иван', 'Ольга'];
      const lastNames = ['Рахимов', 'Саидова', 'Ибрагимов', 'Каримова', 'Мансуров', 'Пулатова', 'Гафуров', 'Азизова', 'Шарипов', 'Назарова', 'Ходжаев', 'Раджабова', 'Мирзоев', 'Хакимова', 'Умаров', 'Султонова', 'Васильев', 'Петрова', 'Смирнов', 'Кузнецова'];
      const subjects = ['Математика', 'Химия', 'Биология', 'Физика', 'Английский язык', 'История', 'Право', 'Программирование', 'Таджикский язык'];
      const months = ['2025-08', '2025-09', '2025-10', '2025-11'];
      const branchNames = Object.values(Branch);
      const clusters = Object.values(Cluster);

      // 1. Generate Branches
      const demoBranches: BranchEntity[] = branchNames.map((b, i) => ({
          id: 100 + i, name: b, address: `ул. Тестовая ${i + 1}`, phone: `+992 900 00 000${i}`,
          manager: 'Менеджер Тестович', isActive: true, classrooms: [{ id: `c_${i}_1`, name: 'Кабинет 1', capacity: 15 }, { id: `c_${i}_2`, name: 'Кабинет 2', capacity: 20 }]
      }));
      storage.set(StorageKeys.BRANCHES, demoBranches);
      addLog('Филиалы созданы.');

      // 2. Generate Courses
      const demoCourses: Course[] = subjects.map((s, i) => ({
          id: i + 1, name: s, price: 350 + (i * 50), maxExamScore: 100, targetStudents: 50,
          color: ['blue', 'emerald', 'purple', 'amber', 'rose', 'cyan', 'indigo', 'slate', 'emerald'][i % 9],
          icon: ['Calculator', 'FlaskConical', 'Dna', 'Atom', 'Globe', 'Scroll', 'Gavel', 'Code', 'Languages'][i % 9],
          books: [{ id: `b_${i}`, name: `Учебник по ${s}`, price: 100 }],
          topics: [
            { id: `t_${i}_1`, title: 'Введение в предмет' },
            { id: `t_${i}_2`, title: 'Основы теории' },
            { id: `t_${i}_3`, title: 'Практическое применение' }
          ]
      }));
      storage.set(StorageKeys.COURSES, demoCourses);
      addLog('Курсы созданы.');

      // 3. Generate Programs
      const demoPrograms: CourseProgram[] = clusters.map((c, i) => {
          let clusterSubjectIds: number[] = [];
          if (c === 'Кластер 5') {
              // Специальная настройка для 5 кластера: Химия, Биология, Физика, Таджикский
              clusterSubjectIds = demoCourses
                  .filter(course => ['Химия', 'Биология', 'Физика', 'Таджикский язык'].includes(course.name))
                  .map(course => course.id);
          } else {
              clusterSubjectIds = [demoCourses[i % 9].id, demoCourses[(i + 1) % 9].id];
          }
          
          return {
              id: `prog_${i}`, name: c, description: `Программа подготовки по направлению ${c}`,
              subjectIds: clusterSubjectIds,
              icon: 'Layers', color: 'blue'
          };
      });
      storage.set(StorageKeys.COURSE_PROGRAMS, demoPrograms);
      addLog('Продукты (Кластеры) созданы.');

      // 4. Generate Groups
      const demoGroups: Group[] = [];
      branchNames.forEach((branch, bIdx) => {
          subjects.forEach((subject, sIdx) => {
              if (sIdx < 4) { // Больше групп для разнообразия
                  demoGroups.push({
                      id: 2000 + (bIdx * 10) + sIdx,
                      name: `${subject.slice(0, 3).toUpperCase()}-${branch.slice(0, 3)}-${sIdx + 1}`,
                      subject,
                      teacher: 'Преподаватель Тестовый',
                      schedule: 'Пн/Ср/Пт 14:00',
                      studentsCount: 0,
                      maxStudents: 15,
                      branch,
                      scheduleSlots: [{ id: `slot_${bIdx}_${sIdx}`, day: 'Пн', time: '14:00', endTime: '15:30', room: 'Кабинет 1' }]
                  });
              }
          });
      });
      storage.set(StorageKeys.GROUPS, demoGroups);
      addLog(`${demoGroups.length} учебных групп сформировано.`);

      // 5. Generate 300 Students
      const demoStudents: Student[] = [];
      const demoTransactions: Transaction[] = [];
      const demoExams: ExamResult[] = [];
      const demoAttendance: Record<string, any> = {};

      for (let i = 1; i <= 300; i++) {
          const fName = firstNames[Math.floor(Math.random() * firstNames.length)];
          const lName = lastNames[Math.floor(Math.random() * lastNames.length)];
          const fullName = `${lName} ${fName}`;
          const branch = branchNames[i % branchNames.length];
          const cluster = clusters[i % clusters.length];
          
          // Выбираем программу
          const program = demoPrograms.find(p => p.name === cluster);
          const programSubjectNames = demoCourses
              .filter(c => program?.subjectIds.includes(c.id))
              .map(c => c.name);

          // Вариативность: ученик может ходить на 1, 2, 3 или все предметы кластера
          const numSubjects = Math.floor(Math.random() * programSubjectNames.length) + 1;
          const studentSubjects = [...programSubjectNames]
              .sort(() => 0.5 - Math.random())
              .slice(0, numSubjects);
          
          const startDay = String(Math.floor(Math.random() * 20) + 1).padStart(2, '0');
          const startDate = `2025-08-${startDay}`;
          const presaleDate = `2025-07-${startDay}`;
          
          const assignedGroupIds = demoGroups
            .filter(g => g.branch === branch && studentSubjects.includes(g.subject))
            .map(g => g.id);

          let status = StudentStatus.Active;
          const rand = Math.random();
          if (rand > 0.85) status = StudentStatus.Archived;
          else if (rand > 0.75) status = StudentStatus.Dropped;
          else if (rand < 0.1) status = StudentStatus.Presale;

          const student: Student = {
              id: 5000 + i,
              fullName,
              phone: `+992 918 ${String(100000 + i).slice(1)}`,
              status,
              branch,
              cluster,
              subjects: studentSubjects,
              startDate: status !== StudentStatus.Presale ? startDate : undefined,
              presaleDate,
              groupIds: assignedGroupIds,
              balance: (status === StudentStatus.Active && Math.random() > 0.8) ? -350 : 0,
              monthlyFee: studentSubjects.length * 350,
              discountPercent: Math.random() > 0.9 ? 10 : 0,
              consecutiveAbsences: Math.random() > 0.95 ? 3 : 0,
              source: ['Instagram', 'Рекомендация', 'Листовка'][Math.floor(Math.random() * 3)],
              grade: `${Math.floor(Math.random() * 11) + 1} класс`,
              birthYear: `${2008 + Math.floor(Math.random() * 6)}-01-01`
          };
          demoStudents.push(student);

          if (status !== StudentStatus.Presale) {
              // Transactions
              months.forEach(month => {
                  demoTransactions.push({
                      id: Date.now() + Math.random(),
                      studentId: student.id,
                      studentName: student.fullName,
                      amount: 350 * studentSubjects.length,
                      date: `${month}-05`,
                      type: 'Payment',
                      purpose: 'Оплата за обучение',
                      paymentMethod: Math.random() > 0.5 ? 'Алиф' : 'Наличные',
                      createdBy: 'Админ Тестовый'
                  });
              });

              // Exams
              studentSubjects.forEach(sub => {
                  months.forEach((month, mIdx) => {
                      demoExams.push({
                          id: Date.now() + Math.random(),
                          studentId: student.id,
                          studentName: student.fullName,
                          subject: sub,
                          date: `${month}-25`,
                          score: 60 + Math.floor(Math.random() * 40),
                          maxScore: 100,
                          feedback: mIdx === 0 ? 'Входной тест' : 'Промежуточный срез'
                      });
                  });
              });
          }
      }

      // 6. Generate Attendance History
      addLog('Генерация истории посещений за 3 месяца...');
      demoGroups.forEach(group => {
          const groupStudents = demoStudents.filter(s => s.groupIds?.includes(group.id));
          if (groupStudents.length === 0) return;

          months.forEach(month => {
              [7, 14, 21, 28].forEach(day => {
                  const date = `${month}-${String(day).padStart(2, '0')}`;
                  const key = `${group.id}_${date}`;
                  
                  const attendanceMap: Record<number, string> = {};
                  groupStudents.forEach(s => {
                      const r = Math.random();
                      if (r > 0.9) attendanceMap[s.id] = 'Н'; // 10% absent
                      else if (r > 0.8) attendanceMap[s.id] = 'О'; // 10% late
                      else attendanceMap[s.id] = 'П'; // 80% present
                  });

                  demoAttendance[key] = {
                      topic: `Тестовая тема занятия #${day}`,
                      attendance: attendanceMap,
                      lastModifiedBy: 'Преподаватель Тестовый',
                      lastModifiedAt: new Date().toISOString()
                  };
              });
          });
      });

      // 7. Finalize & Save
      const finalGroups = demoGroups.map(g => ({
          ...g,
          studentsCount: demoStudents.filter(s => s.groupIds?.includes(g.id)).length
      }));

      storage.set(StorageKeys.STUDENTS, demoStudents);
      storage.set(StorageKeys.TRANSACTIONS, demoTransactions);
      storage.set(StorageKeys.EXAM_RESULTS, demoExams);
      storage.set(StorageKeys.GROUPS, finalGroups);
      storage.set(StorageKeys.ATTENDANCE, demoAttendance);
      
      addLog('300 учеников успешно добавлены.');
      addLog(`Создано транзакций: ${demoTransactions.length}`);
      addLog(`Создано результатов экзаменов: ${demoExams.length}`);
      addLog(`Создано записей посещаемости: ${Object.keys(demoAttendance).length}`);
      addLog('Тестовая база данных успешно сформирована.');
      
      setImportStats({ 
          students: demoStudents.length, 
          groups: finalGroups.length, 
          transactions: demoTransactions.length, 
          teachers: 5, 
          violations: 0 
      });
      setIsProcessing(false);
      storage.notify('Тестовая база создана (300 учеников + полная история)', 'success');
  };

  const handleClearDataSync = async () => {
    handleClearData();
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto antialiased">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-1">
        <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Импорт данных</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-1">Перенос данных из Excel в CRM систему</p>
        </div>
        <div className="flex items-center gap-3">
             <button 
                onClick={handleLoadDemo} 
                disabled={isProcessing} 
                className="flex items-center gap-2 px-5 py-2.5 text-[11px] font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-all border border-blue-100 uppercase tracking-wider disabled:opacity-50 shadow-sm"
            >
                <Database size={16} /> Тестовая база
            </button>
            <button 
                onClick={handleClearData} 
                disabled={isProcessing} 
                className="flex items-center gap-2 px-5 py-2.5 text-[11px] font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg transition-all border border-rose-100 uppercase tracking-wider disabled:opacity-50 shadow-sm"
            >
                {isProcessing ? <RefreshCw size={16} className="animate-spin" /> : <Trash2 size={16} />}
                Очистить базу
            </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
            <div 
                className={`relative border-2 border-dashed rounded-2xl p-16 flex flex-col items-center justify-center text-center transition-all cursor-pointer bg-white dark:bg-slate-800 shadow-sm ${dragActive ? 'border-blue-500 bg-blue-50/30 ring-4 ring-blue-500/5' : 'border-slate-200 dark:border-slate-700 hover:border-blue-400 hover:shadow-md'}`} 
                onDragEnter={handleDrag} 
                onDragLeave={handleDrag} 
                onDragOver={handleDrag} 
                onDrop={handleDrop} 
                onClick={() => fileInputRef.current?.click()}
            >
                <input ref={fileInputRef} type="file" className="hidden" accept=".xlsx, .xls, .csv" onChange={handleChange} />
                {isProcessing ? (
                    <div className="flex flex-col items-center py-4">
                        <RefreshCw size={48} className="text-blue-600 animate-spin mb-6" />
                        <p className="text-lg font-bold text-slate-900 dark:text-white uppercase tracking-wider">Обработка данных...</p>
                        <p className="text-sm text-slate-400 mt-2">Пожалуйста, не закрывайте страницу</p>
                    </div>
                ) : (
                    <>
                        <div className="w-20 h-20 bg-blue-600 text-white rounded-2xl flex items-center justify-center mb-8 shadow-xl shadow-blue-500/20">
                            <Upload size={32} strokeWidth={2.5}/>
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2 tracking-tight">Загрузить файл Excel</h3>
                        <p className="text-slate-400 text-sm max-w-xs leading-relaxed">
                            Перетащите таблицу или нажмите для выбора. <br/>
                            <span className="font-semibold text-slate-500">Маппинг столбцов произойдет автоматически.</span>
                        </p>
                    </>
                )}
            </div>

            <div className="bg-[#0B1120] rounded-2xl border border-slate-800 shadow-2xl overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 bg-slate-900/50 border-b border-slate-800">
                    <div className="flex items-center gap-3">
                        <div className="flex gap-1.5">
                            <div className="w-3 h-3 rounded-full bg-rose-500/80"></div>
                            <div className="w-3 h-3 rounded-full bg-amber-500/80"></div>
                            <div className="w-3 h-3 rounded-full bg-emerald-500/80"></div>
                        </div>
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] ml-2">System.log</span>
                    </div>
                    <Terminal size={14} className="text-slate-600" />
                </div>
                <div className="p-6 font-mono text-[11px] h-64 overflow-y-auto custom-scrollbar space-y-1.5">
                    {logs.length === 0 && <span className="text-slate-600 italic">Ожидание инициализации процесса...</span>}
                    {logs.map((log, i) => ( 
                        <div key={i} className="flex gap-3 animate-in fade-in slide-in-from-left-1 duration-200">
                            <span className="text-slate-600 shrink-0">[{new Date().toLocaleTimeString()}]</span>
                            <span className={log.includes('ошибка') || log.includes('Ошибка') ? 'text-rose-400' : log.includes('успешно') ? 'text-emerald-400' : 'text-slate-300'}>
                                {log}
                            </span>
                        </div> 
                    ))}
                </div>
            </div>
        </div>

        <div className="space-y-6">
            {importStats ? (
                <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-lg border border-slate-100 dark:border-slate-700 animate-in zoom-in duration-300">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                            <CheckCircle size={28} />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg text-slate-900 dark:text-white leading-tight">Импорт завершен</h3>
                            <p className="text-xs text-slate-400 font-medium">Данные успешно добавлены</p>
                        </div>
                    </div>
                    
                    <div className="space-y-3 mb-8">
                        {[
                            { label: 'Учеников', value: importStats.students, icon: Users },
                            { label: 'Групп', value: importStats.groups, icon: RefreshCw },
                            { label: 'Транзакций', value: importStats.transactions, icon: RefreshCw },
                        ].map((stat, i) => (
                            <div key={i} className="flex justify-between items-center bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
                                <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">{stat.label}</span>
                                <span className="font-bold text-lg text-slate-900 dark:text-white">{stat.value}</span>
                            </div>
                        ))}
                    </div>
                    
                    <button 
                        onClick={() => navigate('/students')} 
                        className="w-full bg-slate-900 hover:bg-black text-white py-4 rounded-xl font-bold text-xs uppercase tracking-widest transition-all active:scale-95 shadow-lg"
                    >
                        К списку учеников
                    </button>
                </div>
            ) : (
                <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 space-y-8">
                     <div className="flex items-center gap-3 text-slate-900 dark:text-white">
                        <Info size={20} className="text-blue-600"/> 
                        <h3 className="font-bold text-lg tracking-tight">Требования к файлу</h3>
                     </div>
                     <div className="space-y-6">
                        {[
                            { title: 'Личные данные', text: 'ФИО, Телефон, Статус' },
                            { title: 'Семья', text: 'Данные родителей' },
                            { title: 'Образование', text: 'Школа, Класс' },
                            { title: 'Программа', text: 'Предметы и Скидки' },
                            { title: 'Заметки', text: 'Дополнительные теги' },
                        ].map((item, i) => (
                            <div key={i} className="flex gap-4 group">
                                <div className="mt-1 w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0 transition-transform group-hover:scale-150"></div>
                                <div>
                                    <p className="text-[11px] font-bold text-slate-900 dark:text-white uppercase tracking-wider leading-none mb-1">{item.title}</p>
                                    <p className="text-xs text-slate-400 font-medium">{item.text}</p>
                                </div>
                            </div>
                        ))}
                     </div>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};
