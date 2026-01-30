
import React, { useState, useRef } from 'react';
import { Database, CheckCircle, RefreshCw, Trash2, Info, Upload, X, Terminal, FileSpreadsheet, Download, FileJson, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { storage, StorageKeys } from '../services/storage';
import * as XLSX from 'xlsx';
import { 
    StudentStatus, PipelineStage, Student, Group, Transaction, 
    Course, Violation, Branch, Cluster, BranchEntity, CourseProgram, ExamResult,
    LearningSection, LearningTopic, LearningLesson, UserRole, UserProfile
} from '../types';

export const ImportData: React.FC = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const user = storage.get<UserProfile>(StorageKeys.USER_PROFILE, { role: UserRole.Admin, fullName: '', email: '', permissions: [] });
  
  const addLog = (msg: string) => setLogs(prev => [...prev, `${new Date().toLocaleTimeString()} - ${msg}`]);

  const handleClearData = async () => {
    if (confirm('Вы уверены? Будут удалены абсолютно все данные компаний, учеников и финансов.')) {
        setIsProcessing(true);
        addLog('Начало полной очистки...');
        const keysToReset = [
            StorageKeys.STUDENTS, StorageKeys.GROUPS, StorageKeys.TRANSACTIONS, StorageKeys.COURSES,
            StorageKeys.COURSE_PROGRAMS, StorageKeys.EXAM_RESULTS, StorageKeys.VIOLATIONS, StorageKeys.CALLS,
            StorageKeys.RETENTION_LOGS, StorageKeys.ATTRACTION_LOGS, StorageKeys.INVOICES, StorageKeys.ATTENDANCE,
            StorageKeys.LMS_SECTIONS, StorageKeys.LMS_TOPICS, StorageKeys.LMS_LESSONS, StorageKeys.BRANCHES,
            StorageKeys.NOTIFICATIONS
        ];
        try {
            keysToReset.forEach(key => storage.set(key, []));
            addLog('База данных успешно очищена.');
            storage.notify('Все данные удалены', 'info');
        } catch (error) { 
            addLog('Ошибка при очистке данных.'); 
        } finally { 
            setIsProcessing(false); 
        }
    }
  };

  // Вспомогательная функция для форматирования даты из Excel
  const parseExcelDate = (val: any): string | undefined => {
    if (!val) return undefined;
    if (typeof val === 'string') {
        // Если строка уже в формате YYYY-MM-DD
        if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
        // Если строка в формате DD.MM.YYYY
        const parts = val.split('.');
        if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    // Если Excel передал дату как число (серийный номер)
    if (typeof val === 'number') {
        const date = XLSX.SSF.parse_date_code(val);
        return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
    }
    return undefined;
  };

  const handleExportTemplate = () => {
      addLog('Генерация расширенного шаблона Excel...');
      
      const templateData = [
          {
              'ФИО ученика': 'Алиев Алишер Рустамович',
              'Телефон': '+992 900 11 22 33',
              'Статус': 'Предзапись',
              'Филиал': 'Душанбе (Ватан)',
              'Продукт/Кластер': 'Кластер 1',
              'Курсы (через запятую)': 'Математика, Химия',
              'Номер договора': 'Д-2024/001',
              'Группа': 'МАТ-101',
              'Дата предзаписи': '2024-01-15',
              'Дата начала обучения': '',
              'Дата ухода (архив)': '',
              'Дата отвала': '',
              'Причина ухода/отвала': '',
              'Язык обучения': 'Русский',
              'Класс': '11 класс',
              'ФИО родителя': 'Алиева Мадина',
              'Телефон родителя': '+992 911 22 33 44'
          }
      ];

      const ws = XLSX.utils.json_to_sheet(templateData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Students");

      // Добавляем лист с инструкциями
      const instructions = [
          ['Поле', 'Описание', 'Допустимые значения'],
          ['Статус', 'Текущий статус ученика', 'Активен, Предзапись, Неактивен, Пауза, Отвал'],
          ['Филиал', 'Название филиала из системы', 'Душанбе (Ватан), Душанбе (Рудаки), Худжанд, Кулоб, Бохтар'],
          ['Даты', 'Формат даты в таблице', 'ГГГГ-ММ-ДД или ДД.ММ.ГГГГ'],
          ['Продукт/Кластер', 'Название программы обучения', 'Кластер 1, Кластер 2, Кластер 3, Кластер 4, Кластер 5'],
          ['Курсы (через запятую)', 'Перечислите названия предметов в точности как в системе', 'Математика, Химия, Физика, Биология и т.д.'],
          ['Номер договора', 'Уникальный номер документа', 'Текст или число'],
          ['Группа', 'Название существующей группы в системе', 'Должно точно совпадать с названием группы в CRM']
      ];
      const ws_inst = XLSX.utils.aoa_to_sheet(instructions);
      XLSX.utils.book_append_sheet(wb, ws_inst, "Инструкция");

      XLSX.writeFile(wb, "Repetitor_Advanced_Template.xlsx");
      addLog('Расширенный шаблон скачан. Даты теперь поддерживаются.');
  };

  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setIsProcessing(true);
      addLog(`Чтение файла: ${file.name}...`);

      const reader = new FileReader();
      reader.onload = (evt) => {
          try {
              const bstr = evt.target?.result;
              const wb = XLSX.read(bstr, { type: 'binary' });
              const wsname = wb.SheetNames[0];
              const ws = wb.Sheets[wsname];
              const data = XLSX.utils.sheet_to_json(ws) as any[];

              if (data.length === 0) {
                  addLog('Файл пуст или имеет неверный формат.');
                  setIsProcessing(false);
                  return;
              }

              addLog(`Найдено записей: ${data.length}. Начинаю импорт...`);
              
              const currentStudents = storage.get<Student[]>(StorageKeys.STUDENTS, []);
              const allGroups = storage.get<Group[]>(StorageKeys.GROUPS, []);
              const newStudents: Student[] = [];

              data.forEach((row, index) => {
                  const fullName = row['ФИО ученика']?.toString().trim();
                  if (!fullName) {
                      addLog(`Строка ${index + 2}: пропущена (нет ФИО).`);
                      return;
                  }

                  const subjectsStr = row['Курсы (через запятую)']?.toString() || '';
                  const subjects = subjectsStr.split(',').map((s: string) => s.trim()).filter(Boolean);

                  // Поиск группы
                  const groupName = row['Группа']?.toString().trim();
                  let groupIds: number[] = [];
                  if (groupName) {
                      const foundGroup = allGroups.find(g => g.name.toLowerCase() === groupName.toLowerCase());
                      if (foundGroup) {
                          groupIds.push(foundGroup.id);
                      }
                  }

                  const student: Student = {
                      id: Date.now() + Math.floor(Math.random() * 1000) + index,
                      fullName,
                      phone: row['Телефон']?.toString() || '',
                      status: (row['Статус'] || StudentStatus.Presale) as StudentStatus,
                      pipelineStage: row['Статус'] === 'Активен' ? undefined : PipelineStage.New,
                      balance: 0,
                      monthlyFee: 0,
                      consecutiveAbsences: 0,
                      source: 'Импорт Excel',
                      branch: row['Филиал'] || undefined,
                      cluster: row['Продукт/Кластер'] || undefined,
                      subjects,
                      groupIds,
                      contractNumber: row['Номер договора']?.toString() || '',
                      
                      // Импорт дат
                      presaleDate: parseExcelDate(row['Дата предзаписи']),
                      startDate: parseExcelDate(row['Дата начала обучения']),
                      endDate: parseExcelDate(row['Дата ухода (архив)']),
                      dropOffDate: parseExcelDate(row['Дата отвала']),
                      leaveReason: row['Причина ухода/отвала']?.toString() || undefined,

                      studyLanguage: row['Язык обучения'] || 'Русский',
                      grade: row['Класс'] || undefined,
                      parents: [
                          {
                              name: row['ФИО родителя'] || '',
                              role: 'Мама',
                              phone: row['Телефон родителя'] || ''
                          }
                      ],
                      parentName: row['ФИО родителя'] || '',
                      parentPhone: row['Телефон родителя'] || '',
                      createdAt: new Date().toISOString()
                  };

                  newStudents.push(student);
              });

              const totalUpdated = [...newStudents, ...currentStudents];
              storage.set(StorageKeys.STUDENTS, totalUpdated);
              
              addLog(`Импорт завершен. Добавлено ${newStudents.length} учеников с историческими датами.`);
              storage.notify(`Успешно импортировано ${newStudents.length} учеников`, 'success');
              
              if (fileInputRef.current) fileInputRef.current.value = '';
          } catch (error) {
              addLog('Критическая ошибка при парсинге файла.');
              console.error(error);
          } finally {
              setIsProcessing(false);
          }
      };
      reader.readAsBinaryString(file);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-20 animate-in fade-in duration-500 antialiased font-sans">
      <header className="flex items-center justify-between gap-4 px-2">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white uppercase tracking-tight">Импорт и миграция данных</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Загрузка базы учеников с поддержкой истории дат</p>
        </div>
        <div className="flex gap-2">
            <button 
                onClick={handleExportTemplate}
                className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-slate-50 transition-all shadow-sm"
            >
                <Download size={18} className="text-blue-500" /> Шаблон Excel
            </button>
            <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessing}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all shadow-lg shadow-blue-500/20 active:scale-95 disabled:opacity-50"
            >
                <Upload size={18} /> Загрузить файл
            </button>
            <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleImportExcel} 
                className="hidden" 
                accept=".xlsx, .xls, .csv" 
            />
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
            <div className="bg-white dark:bg-slate-800 rounded-[32px] border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between">
                    <h3 className="text-sm font-bold uppercase text-slate-500 flex items-center gap-2 tracking-widest">
                        <Terminal size={18} className="text-blue-500" /> Лог выполнения
                    </h3>
                    {logs.length > 0 && (
                        <button onClick={() => setLogs([])} className="text-[10px] font-bold text-slate-400 hover:text-slate-600 uppercase">Очистить лог</button>
                    )}
                </div>
                <div className="p-6 bg-slate-900 min-h-[300px] font-mono text-[11px] text-emerald-400 overflow-y-auto max-h-[500px] custom-scrollbar selection:bg-emerald-500 selection:text-white">
                    {logs.length > 0 ? logs.map((log, i) => (
                        <div key={i} className="mb-1 animate-in slide-in-from-left-1 duration-150">
                            <span className="opacity-50">#</span> {log}
                        </div>
                    )) : (
                        <div className="h-full flex items-center justify-center text-slate-600 italic">
                            Ожидание действий...
                        </div>
                    )}
                    {isProcessing && <div className="mt-2 animate-pulse flex items-center gap-2">Processing<span className="flex gap-1"><span>.</span><span>.</span><span>.</span></span></div>}
                </div>
            </div>
        </div>

        <div className="space-y-6">
            <div className="bg-white dark:bg-slate-800 p-6 rounded-[32px] border border-slate-200 dark:border-slate-700 shadow-sm">
                <h4 className="font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                    <Info size={18} className="text-blue-500" /> Поддержка дат
                </h4>
                <ul className="space-y-4 text-xs font-medium text-slate-500 leading-relaxed">
                    <li className="flex gap-3">
                        <div className="w-5 h-5 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 font-bold">1</div>
                        Используйте формат <span className="font-bold text-slate-800">YYYY-MM-DD</span> для корректного распознавания дат.
                    </li>
                    <li className="flex gap-3">
                        <div className="w-5 h-5 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 font-bold">2</div>
                        <span className="font-bold text-slate-800">Дата предзаписи</span> — когда лид впервые обратился.
                    </li>
                    <li className="flex gap-3">
                        <div className="w-5 h-5 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 font-bold">3</div>
                        <span className="font-bold text-slate-800">Дата начала</span> — дата перехода в статус "Активен".
                    </li>
                    <li className="flex gap-3">
                        <div className="w-5 h-5 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 font-bold">4</div>
                        <span className="font-bold text-slate-800">Дата отвала</span> — дата перехода лида в отказ.
                    </li>
                </ul>
            </div>

            <div className="bg-rose-50 dark:bg-rose-900/10 p-6 rounded-[32px] border border-rose-100 dark:border-rose-900/30 space-y-4">
                <div className="flex items-center gap-3">
                    <AlertCircle className="text-rose-600" size={24} />
                    <h4 className="font-bold text-rose-800 dark:text-rose-400 uppercase tracking-tight">Опасная зона</h4>
                </div>
                <p className="text-xs text-rose-600/70 font-medium">Полная очистка базы данных удалит все записи без возможности восстановления.</p>
                <button 
                    onClick={handleClearData}
                    disabled={isProcessing}
                    className="w-full py-3 bg-white dark:bg-slate-800 border-2 border-rose-200 dark:border-rose-800 text-rose-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-600 hover:text-white transition-all shadow-sm active:scale-95 disabled:opacity-50"
                >
                    Сбросить всю базу
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};
