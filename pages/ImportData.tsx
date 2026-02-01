
import React, { useState, useRef } from 'react';
import { Database, CheckCircle, RefreshCw, Trash2, Info, Upload, X, Terminal, FileSpreadsheet, Download, FileJson, AlertCircle, Save, FileUp, FileDown, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { storage, StorageKeys } from '../services/storage';
import * as XLSX from 'xlsx';
import { 
    StudentStatus, PipelineStage, Student, Group, Transaction, 
    Course, Violation, Branch, Cluster, BranchEntity, CourseProgram, ExamResult,
    LearningSection, LearningTopic, LearningLesson, UserRole, UserProfile
} from '../types';

// Utility for date formatting in Excel/UI
const toRuDate = (iso: string | undefined): string => {
    if (!iso) return '';
    const parts = iso.split('T')[0].split('-');
    if (parts.length !== 3) return iso;
    return `${parts[2]}.${parts[1]}.${parts[0]}`;
};

const fromRuDate = (ru: string | undefined): string | undefined => {
    if (!ru) return undefined;
    if (typeof ru !== 'string') return undefined;
    const parts = ru.trim().split('.');
    if (parts.length === 3) {
        // Handle DD.MM.YYYY
        return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return ru; // fallback to whatever it is (e.g. YYYY-MM-DD)
};

export const ImportData: React.FC = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dbFileInputRef = useRef<HTMLInputElement>(null);

  const user = storage.get<UserProfile>(StorageKeys.USER_PROFILE, { role: UserRole.Admin, fullName: '', email: '', permissions: [] });
  
  const addLog = (msg: string) => setLogs(prev => [...prev, `${new Date().toLocaleTimeString()} - ${msg}`]);

  const handleClearData = async () => {
    if (confirm('ВНИМАНИЕ! Вы уверены? Будут безвозвратно удалены абсолютно все данные (ученики, группы, финансы, задачи). Профиль администратора сохранится.')) {
        setIsProcessing(true);
        addLog('Начало полной очистки локальной и облачной базы...');
        
        try {
            const keys = Object.values(StorageKeys);
            for (const key of keys) {
                if (key === StorageKeys.USER_PROFILE) continue;

                let defaultValue: any = [];
                if (key === StorageKeys.ATTENDANCE || key === StorageKeys.ATTANCE) {
                    defaultValue = {};
                }
                
                storage.set(key, defaultValue);
                addLog(`Очищен раздел: ${key}`);
            }

            addLog('База данных успешно очищена. Выполняется перезагрузка...');
            storage.notify('Все данные удалены', 'success');
            
            setTimeout(() => {
                window.location.href = '/';
            }, 1500);

        } catch (error) { 
            addLog(`Критическая ошибка при очистке: ${error}`);
            storage.notify('Ошибка при очистке данных', 'error');
        } finally { 
            setIsProcessing(false); 
        }
    }
  };

  const handleExportDatabase = () => {
      addLog('Подготовка полного дампа базы данных...');
      const fullDb: Record<string, any> = {};
      
      Object.values(StorageKeys).forEach(key => {
          if (key !== StorageKeys.USER_PROFILE) {
              fullDb[key] = storage.get(key, []);
          }
      });

      const blob = new Blob([JSON.stringify(fullDb, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.body.appendChild(document.createElement('a'));
      link.href = url;
      link.download = `Repetitor_TJ_Backup_${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      document.body.removeChild(link);
      
      addLog('Экспорт базы данных успешно завершен.');
      storage.notify('База данных экспортирована', 'success');
  };

  const handleImportDatabase = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (!confirm('ВНИМАНИЕ: Импорт полной базы данных ПЕРЕЗАПИШЕТ все текущие данные. Продолжить?')) {
          if (dbFileInputRef.current) dbFileInputRef.current.value = '';
          return;
      }

      setIsProcessing(true);
      addLog(`Загрузка файла базы данных: ${file.name}...`);

      const reader = new FileReader();
      reader.onload = (evt) => {
          try {
              const content = evt.target?.result as string;
              const importedDb = JSON.parse(content);
              addLog('Файл прочитан. Применение данных...');
              Object.entries(importedDb).forEach(([key, value]) => {
                  if (Object.values(StorageKeys).includes(key) && key !== StorageKeys.USER_PROFILE) {
                      storage.set(key, value);
                  }
              });
              addLog('База данных успешно восстановлена из файла.');
              storage.notify('База данных импортирована. Перезагрузка...', 'success');
              setTimeout(() => window.location.reload(), 1500);
          } catch (error) {
              addLog('Критическая ошибка: неверный формат файла.');
          } finally {
              setIsProcessing(false);
          }
      };
      reader.readAsText(file);
  };

  const parseExcelDate = (val: any): string | undefined => {
    if (!val) return undefined;
    if (typeof val === 'number') {
        const date = XLSX.SSF.parse_date_code(val);
        return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
    }
    return fromRuDate(val.toString());
  };

  const handleExportTemplate = () => {
      addLog('Генерация расширенного шаблона Excel (ДД.ММ.ГГГГ)...');
      
      const templateData = [
          {
              'Филиал': 'Душанбе (Ватан)',
              'ФИО': 'Алиев Алишер Рустамович',
              'Курс (предметы через запятую)': 'Математика, Химия',
              'Статус': 'Активен',
              'Продукт (программа/кластер)': 'Кластер 1',
              'Группа': 'МАТ-101',
              'Договор': 'Д-2024/001',
              'Статус обзвона': 'Пробный урок',
              'Дата пред-предзаписи': '10.01.2024',
              'Дата предзаписи': '15.01.2024',
              'Примечание': 'Важный комментарий',
              'Откуда узнали про Repetitor.tj': 'Instagram',
              'Номер ученика': '+992 900 11 22 33',
              'Аккаунт repetitor.mobi': 'alisher_crm',
              'ФИО родителя (ответственного лица)': 'Алиева Мадина',
              'Номер родителя': '+992 911 22 33 44',
              'Электронная почта родителя': 'madina@mail.tj',
              'Первичная адаптация (родитель+ученик)': 'Да',
              'Язык предмета': 'Русский',
              'Цель изучения предмета': 'Подготовка к НЦТ',
              'Школа': 'Гимназия №1',
              'Класс': '11 класс',
              'Год рождения': '20.05.2007',
              'Справка о дальтонизме': 'Нет',
              'Процент скидки': '15',
              'Объяснение к скидке': 'Многодетные',
              'Дата начала курса': '01.02.2024',
              'Дата фиксации и ухода': '',
              'Дата ухода из курса': '',
              'Причина ухода / отвала из курсов': ''
          }
      ];

      const ws = XLSX.utils.json_to_sheet(templateData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Students");
      XLSX.writeFile(wb, "Repetitor_TJ_Full_Template.xlsx");
      addLog('Шаблон скачан.');
  };

  const handleExportAllStudents = () => {
    addLog('Полный экспорт учеников (формат ДД.ММ.ГГГГ)...');
    const allStudents = storage.get<Student[]>(StorageKeys.STUDENTS, []);
    const allGroups = storage.get<Group[]>(StorageKeys.GROUPS, []);

    const exportData = allStudents.map(s => {
        const groupNames = (s.groupIds || []).map(gid => allGroups.find(g => g.id === gid)?.name).filter(Boolean).join(', ');
        return {
            'Филиал': s.branch || '',
            'ФИО': s.fullName || '',
            'Курс (предметы через запятую)': (s.subjects || []).join(', '),
            'Статус': s.status || '',
            'Продукт (программа/кластер)': s.cluster || '',
            'Группа': groupNames,
            'Договор': s.contractNumber || '',
            'Статус обзвона': s.pipelineStage || '',
            'Дата пред-предзаписи': '',
            'Дата предзаписи': s.presaleDate ? toRuDate(s.presaleDate) : '',
            'Примечание': s.note || '',
            'Откуда узнали про Repetitor.tj': s.source || '',
            'Номер ученика': s.phone || '',
            'Аккаунт repetitor.mobi': s.platformAccount || '',
            'ФИО родителя (ответственного лица)': s.parentName || (s.parents?.[0]?.name || ''),
            'Номер родителя': s.parentPhone || (s.parents?.[0]?.phone || ''),
            'Электронная почта родителя': s.parentEmail || (s.parents?.[0]?.email || ''),
            'Первичная адаптация (родитель+ученик)': s.initialAdaptation || '',
            'Язык предмета': s.studyLanguage || '',
            'Цель изучения предмета': s.studyGoal || '',
            'Школа': s.school || '',
            'Класс': s.grade || '',
            'Год рождения': s.birthYear ? toRuDate(s.birthYear) : '',
            'Справка о дальтонизме': s.isColorBlind ? 'Да' : 'Нет',
            'Процент скидки': s.discountPercent || '',
            'Объяснение к скидке': s.discountReason || '',
            'Дата начала курса': s.startDate ? toRuDate(s.startDate) : '',
            'Дата фиксации и ухода': s.endDate ? toRuDate(s.endDate) : '',
            'Дата ухода из курса': s.endDate ? toRuDate(s.endDate) : '',
            'Причина ухода / отвала из курсов': s.leaveReason || ''
        };
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Students");
    XLSX.writeFile(wb, `Repetitor_Students_Full_${new Date().toISOString().split('T')[0]}.xlsx`);
    addLog(`Экспортировано ${allStudents.length} учеников.`);
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
              const ws = wb.Sheets[wb.SheetNames[0]];
              const data = XLSX.utils.sheet_to_json(ws) as any[];

              if (data.length === 0) {
                  addLog('Ошибка: Таблица пуста.');
                  setIsProcessing(false);
                  return;
              }

              const currentStudents = storage.get<Student[]>(StorageKeys.STUDENTS, []);
              const allGroups = storage.get<Group[]>(StorageKeys.GROUPS, []);
              const newStudents: Student[] = [];

              data.forEach((row, index) => {
                  const fullName = row['ФИО']?.toString().trim();
                  if (!fullName) return;

                  const groupNamesStr = row['Группа']?.toString().trim() || '';
                  const groupNames = groupNamesStr.split(',').map((n: string) => n.trim().toLowerCase());
                  const groupIds: number[] = [];
                  groupNames.forEach(gn => {
                      const found = allGroups.find(g => g.name.toLowerCase() === gn);
                      if (found) groupIds.push(found.id);
                  });

                  const colorBlindStr = row['Справка о дальтонизме']?.toString().toLowerCase();
                  const isColorBlind = colorBlindStr === 'да' || colorBlindStr === '1' || colorBlindStr === 'true';

                  const student: Student = {
                      id: Date.now() + Math.floor(Math.random() * 10000) + index,
                      fullName,
                      phone: row['Номер ученика']?.toString() || '',
                      status: (row['Статус'] || StudentStatus.Presale) as StudentStatus,
                      pipelineStage: (row['Статус обзвона'] || PipelineStage.New) as PipelineStage,
                      balance: 0,
                      monthlyFee: 0,
                      consecutiveAbsences: 0,
                      source: row['Откуда узнали про Repetitor.tj'] || 'Импорт',
                      branch: row['Филиал'] || undefined,
                      cluster: row['Продукт (программа/кластер)'] || row['Курс'] || undefined,
                      subjects: (row['Курс (предметы через запятую)'] || row['Предмет'] || '').toString().split(',').map((s: string) => s.trim()).filter(Boolean),
                      groupIds,
                      contractNumber: row['Договор']?.toString() || '',
                      presaleDate: parseExcelDate(row['Дата предзаписи']),
                      startDate: parseExcelDate(row['Дата начала курса']),
                      endDate: parseExcelDate(row['Дата фиксации и ухода']),
                      dropOffDate: parseExcelDate(row['Дата фиксации и ухода']),
                      leaveReason: row['Причина ухода / отвала из курсов']?.toString() || undefined,
                      studyLanguage: row['Язык предмета'] || 'Русский',
                      grade: row['Класс'] || undefined,
                      school: row['Школа']?.toString() || undefined,
                      birthYear: parseExcelDate(row['Год рождения']),
                      isColorBlind,
                      platformAccount: row['Аккаунт repetitor.mobi']?.toString() || undefined,
                      initialAdaptation: row['Первичная адаптация (родитель+ученик)']?.toString() || undefined,
                      studyGoal: row['Цель изучения предмета']?.toString() || undefined,
                      discountPercent: Number(row['Процент скидки']) || 0,
                      discountReason: row['Объяснение к скидке']?.toString() || undefined,
                      note: row['Примечание']?.toString() || undefined,
                      parentName: row['ФИО родителя (ответственного лица)'] || '',
                      parentPhone: row['Номер родителя']?.toString() || '',
                      parentEmail: row['Электронная почта родителя']?.toString() || '',
                      parents: [
                          {
                              name: row['ФИО родителя (ответственного лица)'] || '',
                              role: 'Мама',
                              phone: row['Номер родителя']?.toString() || '',
                              email: row['Электронная почта родителя']?.toString() || ''
                          }
                      ],
                      createdAt: new Date().toISOString()
                  };
                  newStudents.push(student);
              });

              storage.set(StorageKeys.STUDENTS, [...newStudents, ...currentStudents]);
              addLog(`Готово! Загружено ${newStudents.length} учеников. Даты обработаны как ДД.ММ.ГГГГ.`);
              storage.notify(`Успешно импортировано ${newStudents.length} учеников`, 'success');
              if (fileInputRef.current) fileInputRef.current.value = '';
          } catch (error) {
              addLog('Ошибка при разборе файла.');
          } finally {
              setIsProcessing(false);
          }
      };
      reader.readAsBinaryString(file);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-20 animate-in fade-in duration-500 antialiased font-sans">
      <header className="flex flex-col sm:flex-row items-center justify-between gap-4 px-2">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white uppercase tracking-tight">Миграция данных</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Поддержка формата ДД.ММ.ГГГГ и полей "Курс" / "Продукт"</p>
        </div>
        <div className="flex gap-2">
            <button 
                onClick={handleExportAllStudents}
                className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-slate-50 transition-all shadow-sm"
            >
                <FileDown size={18} className="text-emerald-500" /> Экспорт
            </button>
            <button 
                onClick={handleExportTemplate}
                className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-slate-50 transition-all shadow-sm"
            >
                <Download size={18} className="text-blue-500" /> Шаблон
            </button>
            <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessing}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all shadow-lg shadow-blue-500/20 active:scale-95 disabled:opacity-50"
            >
                <Upload size={18} /> Импорт
            </button>
            <input type="file" ref={fileInputRef} onChange={handleImportExcel} className="hidden" accept=".xlsx, .xls, .csv" />
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
            <div className="bg-white dark:bg-slate-800 rounded-[32px] border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between">
                    <h3 className="text-sm font-bold uppercase text-slate-500 flex items-center gap-2 tracking-widest">
                        <Terminal size={18} className="text-blue-500" /> Лог системы
                    </h3>
                </div>
                <div className="p-6 bg-slate-900 min-h-[350px] font-mono text-[11px] text-emerald-400 overflow-y-auto max-h-[500px] custom-scrollbar">
                    {logs.length > 0 ? logs.map((log, i) => (
                        <div key={i} className="mb-1 animate-in slide-in-from-left-1 duration-150"><span className="opacity-50">#</span> {log}</div>
                    )) : <div className="h-full flex items-center justify-center text-slate-600 italic">Ожидание загрузки данных...</div>}
                    {isProcessing && <div className="mt-2 animate-pulse">Обработка...</div>}
                </div>
            </div>
        </div>

        <div className="space-y-6">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-[32px] border border-blue-100 dark:border-blue-900/30 space-y-4">
                <div className="flex items-center gap-3">
                    <Database className="text-blue-600" size={24} />
                    <h4 className="font-bold text-blue-800 dark:text-blue-400 uppercase tracking-tight">Full Backup</h4>
                </div>
                <p className="text-xs text-blue-700/70 font-medium">Резервная копия всей базы в JSON (рекомендуется еженедельно).</p>
                <div className="grid grid-cols-1 gap-2">
                    <button onClick={handleExportDatabase} className="w-full py-2.5 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all flex items-center justify-center gap-2"><FileJson size={14}/> Скачать JSON</button>
                    <button onClick={() => dbFileInputRef.current?.click()} className="w-full py-2.5 bg-white dark:bg-slate-800 border-2 border-blue-200 dark:border-blue-800 text-blue-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-50 transition-all flex items-center justify-center gap-2"><FileUp size={14}/> Восстановить</button>
                    <input type="file" ref={dbFileInputRef} onChange={handleImportDatabase} className="hidden" accept=".json" />
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 p-6 rounded-[32px] border border-slate-200 dark:border-slate-700 shadow-sm">
                <h4 className="font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                    <CheckCircle size={18} className="text-emerald-500" /> Формат дат
                </h4>
                <p className="text-xs text-slate-500 leading-relaxed font-medium">Система переведена на формат <span className="font-bold text-slate-900 dark:text-slate-100">ДД.ММ.ГГГГ</span> для Excel. Пример: 25.10.2024</p>
                <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-700">
                    <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase">
                        <span>Был (ISO)</span>
                        <span>Стал (RU)</span>
                    </div>
                    <div className="flex justify-between items-center mt-1 text-xs font-black text-slate-700 dark:text-slate-200">
                        <span>2024-10-25</span>
                        <ChevronRight size={14} className="text-blue-500" />
                        <span>25.10.2024</span>
                    </div>
                </div>
            </div>

            <div className="bg-rose-50 dark:bg-rose-900/10 p-6 rounded-[32px] border border-rose-100 dark:border-rose-900/30 space-y-4">
                <div className="flex items-center gap-3">
                    <AlertCircle className="text-rose-600" size={24} />
                    <h4 className="font-bold text-rose-800 dark:text-rose-400 uppercase tracking-tight">Очистка</h4>
                </div>
                <button onClick={handleClearData} className="w-full py-3 bg-white dark:bg-slate-800 border-2 border-rose-200 dark:border-rose-800 text-rose-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-600 hover:text-white transition-all shadow-sm">Сбросить всё</button>
            </div>
        </div>
      </div>
    </div>
  );
};
