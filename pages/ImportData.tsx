
import React, { useState, useRef } from 'react';
import { Database, FileCode, CheckCircle, RefreshCw, Trash2, Info, FileSpreadsheet, Upload, AlertCircle, X, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { storage, StorageKeys } from '../services/storage';
import { StudentStatus, PipelineStage, Student, Teacher, Group, Transaction, Course, ExamResult, AuditLog, UserRole, Violation, Branch } from '../types';
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

  // --- Logic to map Sheet Names to Database Keys ---
  const getInternalTableName = (sheetName: string): string | null => {
      const lower = sheetName.toLowerCase().trim();
      
      // Assume the main sheet usually contains student data if no specific name match
      if (['students', 'pupils', 'users', 'children', 'student', 'ученики', 'студенты', 'лиды', 'лист1', 'sheet1'].some(k => lower.includes(k))) return 'students';
      if (['groups', 'classes', 'subjects', 'courses', 'group', 'группы', 'классы'].some(k => lower.includes(k))) return 'groups';
      if (['transactions', 'payments', 'finance', 'invoices', 'payment', 'оплаты', 'транзакции', 'финансы'].some(k => lower.includes(k))) return 'transactions';
      if (['teachers', 'instructors', 'staff', 'employees', 'teacher', 'преподаватели', 'учителя'].some(k => lower.includes(k))) return 'teachers';
      
      return 'students'; // Default fallback for single-sheet files
  };

  // --- Logic to map Column Headers to Object Properties ---
  const mapKey = (key: string): string => {
    // Clean key: remove extra spaces, lower case, remove punctuation commonly found in headers
    const k = key.toLowerCase().trim().replace(/['"`\(\)\.\r\n]/g, '').replace(/\s+/g, '');
    
    // Exact mapping based on user request
    if (k.includes('фиородителя')) return 'parentName';
    if (k.includes('номерродителя')) return 'parentPhone';
    if (k.includes('почтародителя') || k.includes('email')) return 'parentEmail';
    if (k.includes('фио')) return 'fullName';
    if (k.includes('номер') || k.includes('телефон')) return 'phone';
    
    // Academic
    if (k.includes('школа')) return 'school';
    if (k.includes('класс')) return 'grade';
    if (k.includes('годрождения')) return 'birthYear';
    if (k.includes('предмет')) return 'subject';
    if (k.includes('язык')) return 'language';
    if (k.includes('цель')) return 'studyGoal';
    if (k.includes('аккаунт')) return 'platformAccount';
    
    // Admin / Status
    if (k.includes('статус')) return 'status';
    if (k.includes('договор')) return 'contract';
    if (k.includes('откуда')) return 'source';
    if (k.includes('примечание')) return 'note';
    if (k.includes('датаначала')) return 'startDate';
    if (k.includes('датаухода')) return 'endDate';
    if (k.includes('причина')) return 'leaveReason';
    if (k.includes('обзвон')) return 'presaleStatus';
    
    // Finance / Discount
    if (k.includes('процентскидки') || k.includes('скидка')) return 'discountPercent';
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
    // 1. Students Processing
    if (newStudents.length > 0) {
        const current = storage.get(StorageKeys.STUDENTS, []);
        const processed = newStudents.map((s, idx) => {
            // Determine status based on string
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
                
                // New Fields
                parentName: s.parentName || '',
                parentPhone: cleanPhone(s.parentPhone),
                parentEmail: s.parentEmail || '',
                school: s.school ? String(s.school) : undefined,
                grade: s.grade ? String(s.grade) : undefined,
                birthYear: s.birthYear ? String(s.birthYear) : undefined,
                subjects: subjectList, // Map single imported subject to array
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
                pipelineStage: PipelineStage.New, // Default
                balance: 0, // Default 0 as balance isn't explicitly in the provided column list
                monthlyFee: 0,
                consecutiveAbsences: 0,
                source: s.source || 'Импорт'
            };
        });
        storage.set(StorageKeys.STUDENTS, [...current, ...processed]);
    }

    // 2. Groups (Standard)
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
            
            const collections: Record<string, any[]> = {
                students: [], groups: [], transactions: [], teachers: []
            };

            workbook.SheetNames.forEach(sheetName => {
                const tableName = getInternalTableName(sheetName);
                if (tableName) {
                    addLog(`Лист "${sheetName}" распознан как таблица "${tableName}"`);
                    
                    const rawData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: "" });
                    
                    if (rawData.length > 0) {
                        // Normalize keys
                        const mappedData = rawData.map((row: any) => {
                            const newRow: any = {};
                            Object.keys(row).forEach(key => {
                                newRow[mapKey(key)] = row[key];
                            });
                            return newRow;
                        });
                        collections[tableName].push(...mappedData);
                        addLog(`  -> Найдено ${mappedData.length} записей`);
                    }
                }
            });

            saveDataToStorage(
                collections.students,
                collections.groups,
                collections.transactions,
                collections.teachers
            );
            
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
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleClearData = () => {
    if (confirm('Вы уверены? Все данные будут удалены безвозвратно.')) {
        storage.clear();
        addLog('База данных полностью очищена.');
        setImportStats(null);
        window.location.reload();
    }
  };

  // --- Demo Data Generator ---
  const handleLoadDemo = () => {
      setIsProcessing(true);
      addLog('Генерация масштабных тестовых данных (1500+ учеников, все филиалы)...');
      
      const allBranches = Object.values(Branch);

      // 1. Generate Courses
      const demoCourses: Course[] = [
          { 
              id: 1, name: 'Математика', price: 500, targetStudents: 120, books: [{ id: 'b1', name: 'Сборник задач', price: 50 }],
              branchPrices: { [Branch.Khujand_Coop]: 400, [Branch.Khujand_19]: 400, [Branch.Isfara]: 350 }
          },
          { 
              id: 2, name: 'Английский язык', price: 600, targetStudents: 150, books: [{ id: 'b2', name: 'Oxford Solutions', price: 150 }],
              branchPrices: { [Branch.Khujand_Coop]: 500, [Branch.Isfara]: 450, [Branch.Tursunzade]: 500 }
          },
          { id: 3, name: 'Физика', price: 550, targetStudents: 60, books: [] },
          { id: 4, name: 'Химия', price: 550, targetStudents: 50, books: [] },
          { id: 5, name: 'Биология', price: 500, targetStudents: 50, books: [] },
          { id: 6, name: 'История', price: 400, targetStudents: 40, books: [] },
          { id: 7, name: 'Право', price: 400, targetStudents: 40, books: [] },
          { id: 8, name: 'Таджикский язык', price: 300, targetStudents: 50, books: [] }
      ];
      storage.set(StorageKeys.COURSES, demoCourses);
      addLog('Курсы и цены (с региональными тарифами) созданы.');

      // 2. Generate Teachers
      // IMPORTANT: Ensure "Васильева Елена" (login: teacher) exists for demo purposes
      const demoTeachers: Teacher[] = [
          { id: 101, fullName: 'Васильева Елена', role: UserRole.Teacher, subject: 'Математика', phone: '+992 900 00 00 01', email: 'elena@school.tj', branches: [Branch.Dushanbe_Vatan], companyId: 'repetitor_tj' },
          { id: 102, fullName: 'Собиров Далер', role: UserRole.Teacher, subject: 'Физика', phone: '+992 900 00 00 02', email: 'daler@school.tj', branches: [Branch.Dushanbe_82], companyId: 'repetitor_tj' },
          { id: 103, fullName: 'Джонс Майкл', role: UserRole.Teacher, subject: 'Английский язык', phone: '+992 900 00 00 03', email: 'mike@school.tj', branches: [Branch.Dushanbe_TSUM], companyId: 'repetitor_tj' },
          { id: 104, fullName: 'Каримова Зарина', role: UserRole.Teacher, subject: 'Химия', phone: '+992 900 00 00 04', email: 'zarina@school.tj', branches: [Branch.Khujand_Coop], companyId: 'repetitor_tj' },
          { id: 105, fullName: 'Ахмедова Аниса', role: UserRole.Teacher, subject: 'Биология', phone: '+992 900 00 00 05', email: 'anisa@school.tj', branches: [Branch.Khujand_19], companyId: 'repetitor_tj' },
          { id: 106, fullName: 'Рахимов Рустам', role: UserRole.Teacher, subject: 'История', phone: '+992 900 00 00 06', email: 'rustam@school.tj', branches: [Branch.Isfara], companyId: 'repetitor_tj' },
          { id: 107, fullName: 'Назаров Умед', role: UserRole.Teacher, subject: 'Таджикский язык', phone: '+992 900 00 00 07', email: 'umed@school.tj', branches: [Branch.Tursunzade], companyId: 'repetitor_tj' },
          { id: 108, fullName: 'Смит Сара', role: UserRole.Teacher, subject: 'Английский язык', phone: '+992 900 00 00 08', email: 'sarah@school.tj', branches: [Branch.Dushanbe_9km], companyId: 'repetitor_tj' },
          { id: 109, fullName: 'Шарипова Мадина', role: UserRole.Teacher, subject: 'Право', phone: '+992 900 00 00 09', email: 'madina@school.tj', branches: [Branch.Jabbor_Rasulov], companyId: 'repetitor_tj' },
          { id: 110, fullName: 'Петров Иван', role: UserRole.Teacher, subject: 'Математика', phone: '+992 900 00 00 10', email: 'ivan@school.tj', branches: [Branch.Dushanbe_Vatan, Branch.Dushanbe_TSUM], companyId: 'repetitor_tj' }
      ];
      storage.set(StorageKeys.TEACHERS, demoTeachers);

      // 3. Generate Groups
      const demoGroups: Group[] = [];
      let groupIdCounter = 1;
      const subjects = demoCourses.map(c => c.name);
      
      const pick = (arr: any[]) => arr[Math.floor(Math.random() * arr.length)];
      const randInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
      const getRandomDate = (start: Date, end: Date) => new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime())).toISOString().split('T')[0];

      // Create groups for EACH branch
      allBranches.forEach(branch => {
          subjects.forEach(subj => {
              // 2 groups per subject per branch
              for (let i = 1; i <= 2; i++) {
                  // Explicitly assign groups to "Васильева Елена" in Dushanbe_Vatan for Math
                  let teacherName = pick(demoTeachers).fullName;
                  if (branch === Branch.Dushanbe_Vatan && subj === 'Математика') {
                      teacherName = 'Васильева Елена';
                  }

                  const days = i === 1 ? 'Пн/Ср/Пт' : 'Вт/Чт/Сб';
                  const time = `${9 + i * 2}:00`;
                  
                  demoGroups.push({
                      id: groupIdCounter++,
                      name: `${subj.slice(0, 3).toUpperCase()}-${100 + i}`,
                      subject: subj,
                      teacher: teacherName,
                      schedule: `${days} ${time}`,
                      studentsCount: 0,
                      maxStudents: 15,
                      branch: branch
                  });
              }
          });
      });

      // 4. Generate Students
      const firstNames = ['Алишер', 'Зарина', 'Фаррух', 'Мадина', 'Рустам', 'Нигина', 'Джамшед', 'Сабина', 'Умед', 'Парвиз', 'Ситора', 'Акмал', 'Шахноза', 'Далер', 'Малика', 'Комрон', 'Азиз', 'Сардор', 'Тимур', 'Елена', 'Виктор', 'Сомон', 'Фарангис', 'Лола', 'Фируз', 'Анушервон'];
      const lastNames = ['Алиев', 'Каримов', 'Рахимов', 'Назаров', 'Собиров', 'Юсупов', 'Холов', 'Саидов', 'Гафуров', 'Бобоев', 'Шарипов', 'Маджидов', 'Турсунов', 'Исломов', 'Давлатов', 'Эргашев', 'Хакимов', 'Мирзоев', 'Олимов', 'Курбонов', 'Раджабов'];
      const sources = ['Instagram', 'Facebook', 'Google', 'Рекомендация', 'Листовка', 'Проходил мимо', 'Тик Ток'];

      const demoStudents: Student[] = [];
      const demoTransactions: Transaction[] = [];
      const demoExamResults: ExamResult[] = [];
      const demoLogs: AuditLog[] = [];
      const demoViolations: Violation[] = [];
      const totalStudents = 1500;

      const violationComments: Record<string, string[]> = {
          'Опоздание': ['Опоздал на 15 минут', 'Пришел после начала урока', 'Проспал, пришел ко второму часу', 'Систематические опоздания'],
          'Поведение': ['Разговаривал на уроке', 'Мешал другим ученикам', 'Использовал телефон на занятии', 'Грубил преподавателю', 'Спал на уроке'],
          'ДЗ': ['Не выполнил домашнее задание', 'Забыл тетрадь дома', 'Выполнил ДЗ только наполовину', 'Не готов к уроку']
      };

      for (let i = 1; i <= totalStudents; i++) {
          const assignedBranch = pick(allBranches) as Branch;
          const course = pick(demoCourses) as Course;
          
          let fee = (course.branchPrices && course.branchPrices[assignedBranch]) ? course.branchPrices[assignedBranch] : course.price;
          
          const subjects = [course.name];
          
          if (Math.random() > 0.8) {
              const secondCourse = pick(demoCourses.filter(c => c.name !== course.name));
              subjects.push(secondCourse.name);
              const secondFee = (secondCourse.branchPrices && secondCourse.branchPrices[assignedBranch]) ? secondCourse.branchPrices[assignedBranch] : secondCourse.price;
              fee += secondFee;
          }

          const statusRoll = Math.random();
          let status = StudentStatus.Presale;
          
          if (statusRoll < 0.55) status = StudentStatus.Active;
          else if (statusRoll < 0.85) status = StudentStatus.Presale;
          else if (statusRoll < 0.95) status = StudentStatus.Archived;
          else status = StudentStatus.Dropped;

          const fName = pick(firstNames);
          const lName = pick(lastNames);
          
          const today = new Date();
          const threeMonthsAgo = new Date(); threeMonthsAgo.setMonth(today.getMonth() - 3);
          const sixMonthsAgo = new Date(); sixMonthsAgo.setMonth(today.getMonth() - 6);
          
          let startDate = getRandomDate(threeMonthsAgo, today);
          let endDate = undefined;
          let dropOffDate = undefined;
          let pipelineStage = PipelineStage.New;

          if (status === StudentStatus.Active) {
              startDate = getRandomDate(sixMonthsAgo, threeMonthsAgo);
              pipelineStage = PipelineStage.Payment;
          } else if (status === StudentStatus.Archived) {
              startDate = getRandomDate(sixMonthsAgo, sixMonthsAgo);
              endDate = getRandomDate(threeMonthsAgo, today);
              pipelineStage = PipelineStage.Trial; 
          } else if (status === StudentStatus.Dropped) {
              dropOffDate = getRandomDate(threeMonthsAgo, today);
              pipelineStage = PipelineStage.Call;
          } else {
              startDate = getRandomDate(threeMonthsAgo, today);
              const stages = Object.values(PipelineStage);
              pipelineStage = stages[randInt(0, 3)]; 
          }

          const studentId = i;
          const groupIds: number[] = [];

          if (status === StudentStatus.Active) {
              subjects.forEach(sub => {
                  const suitableGroups = demoGroups.filter(g => g.subject === sub && g.branch === assignedBranch);
                  if (suitableGroups.length > 0) {
                      const targetGroup = pick(suitableGroups);
                      targetGroup.studentsCount += 1;
                      groupIds.push(targetGroup.id);
                  }
              });
          }

          const student: Student = {
              id: studentId,
              fullName: `${lName} ${fName}`,
              phone: `+992 9${randInt(0, 9)}${randInt(1000000, 9999999)}`,
              source: pick(sources),
              status: status,
              pipelineStage: pipelineStage,
              parentName: `Родитель ${fName}`,
              parentPhone: `+992 9${randInt(0, 9)}${randInt(1000000, 9999999)}`,
              subjects: subjects,
              groupIds: groupIds,
              monthlyFee: fee,
              balance: status === StudentStatus.Active ? (Math.random() > 0.8 ? -fee : 0) : 0, 
              contract: status === StudentStatus.Active,
              startDate: startDate,
              endDate: endDate,
              dropOffDate: dropOffDate,
              consecutiveAbsences: status === StudentStatus.Active ? (Math.random() > 0.9 ? randInt(3, 6) : 0) : 0,
              school: `Школа №${randInt(1, 50)}`,
              grade: `${randInt(5, 11)} класс`,
              branch: assignedBranch
          };

          demoStudents.push(student);

          demoLogs.push({
              id: Date.now() + i * 100,
              userId: 'admin',
              userName: 'System Demo',
              action: 'Создание карточки',
              details: `Добавлен студент: ${student.fullName}`,
              timestamp: new Date(new Date(startDate).getTime() - 86400000).toISOString(),
              entityId: studentId
          });

          if (status === StudentStatus.Active) {
              subjects.forEach(sub => {
                  const numExams = randInt(1, 5);
                  for (let e = 0; e < numExams; e++) {
                      const exDate = new Date(startDate);
                      exDate.setMonth(exDate.getMonth() + e);
                      if (exDate > today) break;
                      
                      demoExamResults.push({
                          id: Date.now() + i * 1000 + e,
                          studentId: student.id,
                          studentName: student.fullName,
                          subject: sub,
                          date: exDate.toISOString().split('T')[0],
                          score: randInt(40, 100),
                          maxScore: 100
                      });
                  }
              });

              const numPayments = randInt(1, 4);
              for(let p=0; p<numPayments; p++) {
                  const pDate = new Date(startDate);
                  pDate.setMonth(pDate.getMonth() + p);
                  if (pDate > today) break;

                  demoTransactions.push({
                      id: Date.now() + i * 100 + p,
                      studentId: student.id,
                      studentName: student.fullName,
                      amount: fee,
                      date: pDate.toISOString().split('T')[0],
                      type: 'Payment',
                      purpose: `Оплата за обучение`,
                      createdBy: 'Система (Демо)'
                  });
              }

              if (Math.random() > 0.85) {
                  const numViolations = randInt(1, 3);
                  for (let v = 0; v < numViolations; v++) {
                      const vType = pick(['Опоздание', 'Поведение', 'ДЗ']) as 'Опоздание' | 'Поведение' | 'ДЗ';
                      const vComment = pick(violationComments[vType]);
                      const vDate = getRandomDate(new Date(startDate), today);

                      demoViolations.push({
                          id: Date.now() + i * 10000 + v,
                          studentId: student.id,
                          studentName: student.fullName,
                          date: vDate,
                          type: vType,
                          comment: vComment
                      });
                  }
              }
          }
      }

      storage.set(StorageKeys.GROUPS, demoGroups);
      storage.set(StorageKeys.STUDENTS, demoStudents);
      storage.set(StorageKeys.TRANSACTIONS, demoTransactions);
      storage.set(StorageKeys.EXAM_RESULTS, demoExamResults);
      storage.set(StorageKeys.VIOLATIONS, demoViolations);
      storage.set(StorageKeys.AUDIT_LOGS, demoLogs);

      setImportStats({
          students: demoStudents.length,
          teachers: demoTeachers.length,
          groups: demoGroups.length,
          transactions: demoTransactions.length,
          courses: demoCourses.length,
          violations: demoViolations.length
      });
      
      addLog(`Создано ${demoStudents.length} учеников, ${demoViolations.length} нарушений, ${demoTransactions.length} транзакций.`);
      addLog('Демо-данные (1500+) успешно загружены и распределены по филиалам!');
      
      // Notify user
      storage.notify('Тестовые данные успешно загружены! (Преподаватель: teacher/123)', 'success');
      
      setIsProcessing(false);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Импорт данных</h2>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Поддержка формата вашего журнала учеников.</p>
        </div>
        <div className="flex gap-2">
             <button 
                onClick={handleLoadDemo}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-lg transition-colors border border-blue-200 dark:border-blue-800"
            >
                <Users size={16} />
                Тестовые данные (1500+)
            </button>
            <button 
                onClick={handleClearData}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-lg transition-colors border border-red-200 dark:border-red-800"
            >
                <Trash2 size={16} />
                Очистить базу
            </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Drop Zone */}
        <div className="md:col-span-2 space-y-4">
            <div 
                className={`relative border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center text-center transition-all cursor-pointer bg-white dark:bg-slate-800
                ${dragActive ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30' : 'border-slate-300 dark:border-slate-600 hover:border-slate-400 dark:hover:border-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
            >
                <input 
                    ref={fileInputRef}
                    type="file" 
                    className="hidden" 
                    accept=".xlsx, .xls, .csv" 
                    onChange={handleChange}
                />
                
                {isProcessing ? (
                    <div className="flex flex-col items-center animate-pulse">
                        <RefreshCw size={48} className="text-blue-500 animate-spin mb-4" />
                        <p className="text-lg font-medium text-slate-700 dark:text-slate-300">Обработка данных...</p>
                    </div>
                ) : (
                    <>
                        <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center mb-4 shadow-sm">
                            <Upload size={32} />
                        </div>
                        <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-2">Загрузить Excel</h3>
                        <p className="text-slate-500 dark:text-slate-400 text-sm max-w-xs">
                            Перетащите файл сюда. Система автоматически найдет столбцы ФИО, Школа, Родители и др.
                        </p>
                    </>
                )}
            </div>

            {/* Logs Area */}
            <div className="bg-slate-900 text-slate-300 p-4 rounded-xl font-mono text-xs h-48 overflow-y-auto custom-scrollbar shadow-inner">
                <div className="flex items-center gap-2 text-slate-400 border-b border-slate-700 pb-2 mb-2">
                    <FileCode size={14} />
                    <span>Системный журнал</span>
                </div>
                {logs.length === 0 && <span className="opacity-50">Ожидание файла...</span>}
                {logs.map((log, i) => (
                    <div key={i} className="mb-1">
                        <span className="text-slate-500 mr-2">[{new Date().toLocaleTimeString()}]</span>
                        {log}
                    </div>
                ))}
            </div>
        </div>

        {/* Info Panel */}
        <div className="space-y-6">
            {importStats ? (
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-emerald-200 dark:border-emerald-800">
                    <div className="flex items-center gap-2 mb-4 text-emerald-700 dark:text-emerald-400">
                        <CheckCircle size={24} />
                        <h3 className="font-bold text-lg">Готово</h3>
                    </div>
                    <div className="text-slate-600 dark:text-slate-300 text-sm mb-4 space-y-1">
                        <p>Учеников: <b>{importStats.students}</b></p>
                        <p>Групп: <b>{importStats.groups}</b></p>
                        <p>Транзакций: <b>{importStats.transactions}</b></p>
                        <p>Курсов: <b>{importStats.courses}</b></p>
                        {importStats.violations > 0 && <p className="text-red-500">Нарушений: <b>{importStats.violations}</b></p>}
                    </div>
                    <button 
                        onClick={() => navigate('/students')}
                        className="w-full bg-emerald-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors"
                    >
                        Открыть список
                    </button>
                </div>
            ) : (
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                     <h3 className="font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                        <Info size={18} className="text-blue-500"/>
                        Поддерживаемые поля
                     </h3>
                     <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-2 list-disc list-inside">
                        <li>ФИО, Телефон, Статус</li>
                        <li>ФИО Родителя, Телефон родителя</li>
                        <li>Школа, Класс, Год рождения</li>
                        <li>Предмет, Язык, Цель</li>
                        <li>Скидки, Договор, Примечание</li>
                        <li>Аккаунт платформы</li>
                     </ul>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};
