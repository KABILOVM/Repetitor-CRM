
import React, { useState, useRef } from 'react';
import { Database, CheckCircle, Terminal, Download, Upload, FileJson, AlertCircle, FileUp, FileDown, UserX } from 'lucide-react';
import { storage, StorageKeys } from '../services/storage';
import * as XLSX from 'xlsx';
import { 
    StudentStatus, PipelineStage, Student, Group, Transaction, 
    UserRole, UserProfile, SubjectStatusInfo, Invoice, Branch
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
        return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return ru;
};

export const ImportData: React.FC = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dbFileInputRef = useRef<HTMLInputElement>(null);

  const user = storage.get<UserProfile>(StorageKeys.USER_PROFILE, { role: UserRole.Admin, fullName: '', email: '', permissions: [] });
  
  const addLog = (msg: string) => setLogs(prev => [...prev, `${new Date().toLocaleTimeString()} - ${msg}`]);

  const handleClearData = async () => {
    if (confirm('ВНИМАНИЕ! Вы уверены? Будут безвозвратно удалены абсолютно все данные. Профиль администратора сохранится.')) {
        setIsProcessing(true);
        addLog('Начало полной очистки...');
        try {
            const keys = Object.values(StorageKeys);
            for (const key of keys) {
                if (key === StorageKeys.USER_PROFILE) continue;
                let defaultValue: any = [];
                if (key === StorageKeys.ATTENDANCE || key === StorageKeys.ATTANCE) defaultValue = {};
                storage.set(key, defaultValue);
                addLog(`Очищен раздел: ${key}`);
            }
            addLog('База данных очищена.');
            storage.notify('Все данные удалены', 'success');
            setTimeout(() => window.location.reload(), 1000);
        } catch (error) { 
            addLog(`Ошибка: ${error}`);
        } finally { setIsProcessing(false); }
    }
  };

  const handleClearStudentsOnly = async () => {
    if (confirm('Вы уверены, что хотите удалить ТОЛЬКО учеников? Данные о финансах, группах и сотрудниках останутся.')) {
        setIsProcessing(true);
        addLog('Удаление списка учеников...');
        try {
            storage.set(StorageKeys.STUDENTS, []);
            storage.set(StorageKeys.ATTENDANCE, {});
            storage.set(StorageKeys.ATTANCE, {});
            addLog('Список учеников и журнал посещаемости очищены.');
            storage.notify('Ученики удалены', 'success');
            setTimeout(() => window.location.reload(), 1000);
        } catch (error) {
            addLog(`Ошибка: ${error}`);
        } finally { setIsProcessing(false); }
    }
  };

  const handleExportDatabase = () => {
      addLog('Экспорт JSON...');
      const fullDb: Record<string, any> = {};
      Object.values(StorageKeys).forEach(key => {
          if (key !== StorageKeys.USER_PROFILE) fullDb[key] = storage.get(key, []);
      });
      const blob = new Blob([JSON.stringify(fullDb, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.body.appendChild(document.createElement('a'));
      link.href = url;
      link.download = `Backup_${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      document.body.removeChild(link);
      addLog('Готово.');
  };

  const handleImportDatabase = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (!confirm('Это перезапишет все текущие данные. Продолжить?')) return;
      setIsProcessing(true);
      const reader = new FileReader();
      reader.onload = (evt) => {
          try {
              const importedDb = JSON.parse(evt.target?.result as string);
              Object.entries(importedDb).forEach(([key, value]) => {
                  if (Object.values(StorageKeys).includes(key) && key !== StorageKeys.USER_PROFILE) storage.set(key, value);
              });
              addLog('Восстановление завершено.');
              setTimeout(() => window.location.reload(), 1000);
          } catch (e) { addLog('Ошибка формата.'); }
          finally { setIsProcessing(false); }
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
      addLog('Генерация расширенного шаблона 2025-2026...');
      
      const baseRow: any = {
          'Филиал': 'Душанбе (Ватан)',
          'ФИО': 'Алиев Алишер Рустамович',
          'Курс (предметы через запятую)': 'Математика, Химия',
          'Статус': 'Активен',
          'Продукт (программа/кластер)': 'Кластер 1',
          'Группа': 'МАТ-101',
          'Договор': 'Д-2024/001',
          'Статус обзвона': 'Пробный урок',
          'Способ оплаты': 'Наличные',
          'Номер ученика': '+992 900 11 22 33',
          'Школа': 'Гимназия №1',
          'Класс': '11 класс',
          'Год рождения': '20.05.2007',
          'Дата начала курса': '01.02.2024',
      };

      // Добавляем колонки оплат для 2025 и 2026
      [2025, 2026].forEach(year => {
          for (let month = 1; month <= 12; month++) {
              const monthStr = month.toString().padStart(2, '0');
              baseRow[`Оплата ${monthStr}.${year}`] = '';
          }
      });

      const ws = XLSX.utils.json_to_sheet([baseRow]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Students");
      XLSX.writeFile(wb, "Repetitor_TJ_Import_Full_2025_2026.xlsx");
      addLog('Шаблон скачан.');
  };

  const handleExportAllStudents = () => {
    addLog('Экспорт всех учеников...');
    const allStudents = storage.get<Student[]>(StorageKeys.STUDENTS, []);
    const allGroups = storage.get<Group[]>(StorageKeys.GROUPS, []);
    const ws = XLSX.utils.json_to_sheet(allStudents.map(s => ({
        'Филиал': s.branch || '',
        'ФИО': s.fullName || '',
        'Курс': (s.subjects || []).join(', '),
        'Статус': s.status || '',
        'Группа': (s.groupIds || []).map(id => allGroups.find(g => g.id === id)?.name).join(', '),
        'Телефон': s.phone || '',
        'Договор': s.contractNumber || '',
        'Баланс': s.balance || 0
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Students");
    XLSX.writeFile(wb, `Students_Export_${new Date().toISOString().split('T')[0]}.xlsx`);
    addLog('Экспорт завершен.');
  };

  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setIsProcessing(true);
      addLog(`Обработка файла: ${file.name}...`);

      const reader = new FileReader();
      reader.onload = (evt) => {
          try {
              const bstr = evt.target?.result;
              const wb = XLSX.read(bstr, { type: 'binary' });
              const ws = wb.Sheets[wb.SheetNames[0]];
              const data = XLSX.utils.sheet_to_json(ws) as any[];

              if (data.length === 0) {
                  addLog('Ошибка: Файл пуст.');
                  setIsProcessing(false);
                  return;
              }

              // Загружаем текущие данные из базы
              const currentStudents = storage.get<Student[]>(StorageKeys.STUDENTS, []);
              const allGroups = storage.get<Group[]>(StorageKeys.GROUPS, []);
              const currentTransactions = storage.get<Transaction[]>(StorageKeys.TRANSACTIONS, []);
              const currentInvoices = storage.get<Invoice[]>(StorageKeys.INVOICES, []);
              
              addLog(`Текущих учеников в базе: ${currentStudents.length}`);

              // Создаем рабочие копии
              let updatedStudents = [...currentStudents];
              let newTransactions: Transaction[] = [];
              let updatedInvoices = [...currentInvoices];

              let updatedCount = 0;
              let createdCount = 0;
              let paymentsCount = 0;

              data.forEach((row, index) => {
                  const fullName = row['ФИО']?.toString().trim();
                  const phone = row['Номер ученика']?.toString().trim() || row['Телефон']?.toString().trim() || '';
                  const contractNumber = row['Договор']?.toString().trim();
                  
                  if (!fullName) {
                      addLog(`Пропущена строка ${index + 2}: нет ФИО`);
                      return;
                  }

                  // Ищем существующего ученика в нашем аккумуляторе
                  const existingIndex = updatedStudents.findIndex(s => 
                    s.fullName.toLowerCase() === fullName.toLowerCase() && 
                    (s.phone === phone || !s.phone || !phone)
                  );

                  const subStr = (row['Курс (предметы через запятую)'] || row['Курс'] || '').toString();
                  const rowSubjects = subStr.split(',').map((s: string) => s.trim()).filter(Boolean);
                  
                  const groupNamesStr = row['Группа']?.toString().trim() || '';
                  const rowGroupNames = groupNamesStr.split(',').map((n: string) => n.trim().toLowerCase());
                  const groupIds: number[] = [];
                  rowGroupNames.forEach(gn => {
                      const found = allGroups.find(g => g.name.toLowerCase() === gn);
                      if (found) groupIds.push(found.id);
                  });

                  const paymentMethod = row['Способ оплаты'] || 'Наличные';
                  const startDate = parseExcelDate(row['Дата начала курса']);

                  let targetStudent: Student;

                  if (existingIndex > -1) {
                      // ОБНОВЛЕНИЕ СУЩЕСТВУЮЩЕГО
                      targetStudent = { ...updatedStudents[existingIndex] }; 
                      targetStudent.status = row['Статус'] || targetStudent.status;
                      targetStudent.branch = row['Филиал'] || targetStudent.branch;
                      targetStudent.cluster = row['Продукт (программа/кластер)'] || targetStudent.cluster;
                      if (contractNumber) targetStudent.contractNumber = contractNumber;
                      
                      targetStudent.subjects = Array.from(new Set([...(targetStudent.subjects || []), ...rowSubjects]));
                      targetStudent.groupIds = Array.from(new Set([...(targetStudent.groupIds || []), ...groupIds]));

                      if (startDate) targetStudent.startDate = startDate;
                      
                      updatedStudents[existingIndex] = targetStudent;
                      updatedCount++;
                  } else {
                      // СОЗДАНИЕ НОВОГО
                      const sId = Date.now() + Math.floor(Math.random() * 100000) + index;
                      targetStudent = {
                          id: sId,
                          fullName,
                          phone,
                          status: (row['Статус'] || StudentStatus.Presale) as StudentStatus,
                          pipelineStage: (row['Статус обзвона'] || PipelineStage.New) as PipelineStage,
                          balance: 0,
                          monthlyFee: 0,
                          consecutiveAbsences: 0,
                          source: row['Откуда узнали про Repetitor.tj'] || 'Импорт Excel',
                          branch: row['Филиал'] || undefined,
                          cluster: row['Продукт (программа/кластер)'] || undefined,
                          contractNumber: contractNumber || undefined,
                          subjects: rowSubjects,
                          groupIds,
                          startDate,
                          createdAt: new Date().toISOString(),
                          lastModifiedBy: user.fullName,
                          lastModifiedAt: new Date().toISOString()
                      };
                      updatedStudents.push(targetStudent);
                      createdCount++;
                  }

                  // Парсинг оплат по всем колонкам в строке
                  Object.keys(row).forEach(key => {
                      if (key.startsWith('Оплата ') && row[key]) {
                          const amount = Number(row[key]);
                          if (amount > 0) {
                              const monthYear = key.replace('Оплата ', '').trim(); 
                              const parts = monthYear.split('.');
                              if (parts.length === 2) {
                                  const [m, y] = parts;
                                  const dateStr = `${y}-${m}-01`;
                                  const monthKey = `${y}-${m}`;

                                  newTransactions.push({
                                      id: Date.now() + Math.random(),
                                      studentId: targetStudent.id,
                                      studentName: targetStudent.fullName,
                                      amount: amount,
                                      date: dateStr,
                                      type: 'Payment',
                                      purpose: `Импорт истории оплаты за ${monthYear} (Excel)`,
                                      paymentMethod,
                                      createdBy: user.fullName
                                  });
                                  
                                  // Помечаем инвойс как оплаченный в системе, чтобы он не висел в долгах
                                  const unpaidInvIdx = updatedInvoices.findIndex(inv => inv.studentId === targetStudent.id && inv.status === 'Ожидает' && inv.month === monthKey);
                                  if (unpaidInvIdx > -1) {
                                      updatedInvoices[unpaidInvIdx] = { ...updatedInvoices[unpaidInvIdx], status: 'Оплачен' };
                                  }
                                  paymentsCount++;
                              }
                          }
                      }
                  });
              });

              // Финальное сохранение
              storage.set(StorageKeys.STUDENTS, updatedStudents);
              storage.set(StorageKeys.TRANSACTIONS, [...newTransactions, ...currentTransactions]);
              storage.set(StorageKeys.INVOICES, updatedInvoices);

              addLog(`Импорт успешно завершен!`);
              addLog(`- Всего в базе: ${updatedStudents.length} учеников`);
              addLog(`- Оплат импортировано: ${paymentsCount} (только в историю)`);

              storage.notify(`Успешно: +${createdCount} нов., ${updatedCount} обн.`, 'success');
              
              if (fileInputRef.current) fileInputRef.current.value = '';
          } catch (e) {
              addLog(`Критическая ошибка: ${String(e)}`);
              console.error(e);
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
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">История оплат 2025-2026 без влияния на текущий баланс</p>
        </div>
        <div className="flex gap-2">
            <button onClick={handleExportAllStudents} className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-300 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-slate-50 shadow-sm"><FileDown size={18} className="text-emerald-500" /> Экспорт</button>
            <button onClick={handleExportTemplate} className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-300 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-slate-50 shadow-sm"><Download size={18} className="text-blue-500" /> Шаблон 25-26</button>
            <button onClick={() => fileInputRef.current?.click()} disabled={isProcessing} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all shadow-lg shadow-blue-500/20 active:scale-95"><Upload size={18} /> Импорт Excel</button>
            <input type="file" ref={fileInputRef} onChange={handleImportExcel} className="hidden" accept=".xlsx, .xls, .csv" />
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
            <div className="bg-white dark:bg-slate-800 rounded-[32px] border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100 bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between">
                    <h3 className="text-sm font-bold uppercase text-slate-500 flex items-center gap-2 tracking-widest"><Terminal size={18} className="text-blue-500" /> Лог выполнения</h3>
                </div>
                <div className="p-6 bg-slate-900 min-h-[350px] font-mono text-[11px] text-emerald-400 overflow-y-auto max-h-[500px] custom-scrollbar">
                    {logs.length > 0 ? logs.map((log, i) => (
                        <div key={i} className="mb-1"><span className="opacity-50">#</span> {log}</div>
                    )) : <div className="h-full flex items-center justify-center text-slate-600 italic">Ожидание файла...</div>}
                    {isProcessing && <div className="mt-2 animate-pulse text-blue-400">Синхронизация данных...</div>}
                </div>
            </div>
        </div>

        <div className="space-y-6">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-[32px] border border-blue-100 space-y-4">
                <div className="flex items-center gap-3"><Database className="text-blue-600" size={24} /><h4 className="font-bold text-blue-800 uppercase tracking-tight">Full Backup</h4></div>
                <p className="text-xs text-blue-700/70 font-medium">Рекомендуется делать бэкап перед каждым импортом.</p>
                <div className="grid grid-cols-1 gap-2">
                    <button onClick={handleExportDatabase} className="w-full py-2.5 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all flex items-center justify-center gap-2"><FileJson size={14}/> Скачать JSON</button>
                    <button onClick={() => dbFileInputRef.current?.click()} className="w-full py-2.5 bg-white border-2 border-blue-200 text-blue-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-50 transition-all flex items-center justify-center gap-2"><FileUp size={14}/> Восстановить</button>
                    <input type="file" ref={dbFileInputRef} onChange={handleImportDatabase} className="hidden" accept=".json" />
                </div>
            </div>

            <div className="bg-emerald-50 dark:bg-emerald-900/20 p-6 rounded-[32px] border border-emerald-100 shadow-sm">
                <h4 className="font-bold text-emerald-800 mb-3 flex items-center gap-2"><CheckCircle size={18} /> Финансы</h4>
                <p className="text-[11px] text-emerald-700 leading-relaxed font-medium">Платежи за 2025-2026 гг. будут добавлены в историю транзакций для отчетности, но не изменят текущий баланс учеников.</p>
            </div>

            <div className="bg-rose-50 p-6 rounded-[32px] border border-rose-100 space-y-4">
                <div className="flex items-center gap-3"><AlertCircle className="text-rose-600" size={24} /><h4 className="font-bold text-rose-800 uppercase tracking-tight">Очистка</h4></div>
                <div className="space-y-2">
                    <button onClick={handleClearStudentsOnly} className="w-full py-3 bg-white border-2 border-rose-200 text-rose-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-50 transition-all flex items-center justify-center gap-2"><UserX size={16}/> Удалить только учеников</button>
                    <button onClick={handleClearData} className="w-full py-3 bg-rose-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-700 transition-all shadow-sm">Удалить абсолютно всё</button>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};
