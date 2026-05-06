import { useState, useCallback, useRef, useEffect } from 'react';
import { FormData, Cluster, Contract, SpecificationItem, Stage, FunctionalRequirement, Employee, FieldFlag } from '../types';

const STEPS = [
  'Jira ссылка',
  'Трайб и кластеры',
  'Ответственные и требования',
  'Договор',
  'Предметы спецификации',
  'Этапы',
  'Функциональные требования',
  'Сотрудники',
];

interface Props {
  formData: FormData;
  userId?: string;
  userName: string;
  userColor?: string;
  activeFlags: FieldFlag[];
  currentStep: number;
  onStepChange: (step: number) => void;
  onFormChange: (updater: (prev: FormData) => FormData) => void;
  onFocusField: (fieldId: string | null) => void;
  onAddFlag: (fieldId: string, stepIndex: number, type: 'error' | 'warning' | 'info', comment: string) => void;
  otherUsersPresence: { userId: string; userName: string; userColor: string; activeField: string | null }[];
}

// ── Flag dot indicator — defined OUTSIDE main component ──
function FlagDot({ flags, fieldId }: { flags: FieldFlag[]; fieldId: string }) {
  const fieldFlags = flags.filter(f => f.fieldId === fieldId && !f.resolved);
  if (fieldFlags.length === 0) return null;
  const type = fieldFlags[0].type;
  return (
    <span
      title={fieldFlags.map(f => f.comment).join('; ')}
      className={`inline-flex items-center justify-center w-4 h-4 rounded-full text-white text-xs ml-1 flex-shrink-0 ${
        type === 'error' ? 'bg-red-500' : type === 'warning' ? 'bg-yellow-500' : 'bg-blue-500'
      }`}
    >
      !
    </span>
  );
}

// ── Quick flag popup — defined OUTSIDE main component ──
function QuickFlagMenu({
  fieldId,
  stepIndex,
  onAddFlag,
  onClose,
}: {
  fieldId: string;
  stepIndex: number;
  onAddFlag: (fieldId: string, stepIndex: number, type: 'error' | 'warning' | 'info', comment: string) => void;
  onClose: () => void;
}) {
  const [comment, setComment] = useState('');
  const [type, setType] = useState<'error' | 'warning' | 'info'>('warning');
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    // Use mousedown to catch it before blur fires
    document.addEventListener('mousedown', handler, true);
    return () => document.removeEventListener('mousedown', handler, true);
  }, [onClose]);

  return (
    <div
      ref={menuRef}
      className="absolute right-0 top-full mt-1 z-50 bg-white border border-gray-200 rounded-xl shadow-2xl p-3 w-64"
      onMouseDown={e => e.stopPropagation()}
    >
      <p className="text-xs font-semibold text-gray-600 mb-2">Добавить флаг к полю</p>
      <div className="flex gap-1 mb-2">
        {(['error', 'warning', 'info'] as const).map(t => (
          <button
            key={t}
            type="button"
            onMouseDown={e => { e.preventDefault(); setType(t); }}
            className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              type === t
                ? t === 'error'
                  ? 'bg-red-100 text-red-700 border-red-300'
                  : t === 'warning'
                  ? 'bg-yellow-100 text-yellow-700 border-yellow-300'
                  : 'bg-blue-100 text-blue-700 border-blue-300'
                : 'bg-gray-50 text-gray-500 border-gray-200'
            }`}
          >
            {t === 'error' ? '🔴' : t === 'warning' ? '🟡' : '🔵'}{' '}
            {t === 'error' ? 'Ошибка' : t === 'warning' ? 'Внимание' : 'Инфо'}
          </button>
        ))}
      </div>
      <textarea
        value={comment}
        onChange={e => setComment(e.target.value)}
        placeholder="Комментарий..."
        className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 resize-none focus:outline-none focus:border-blue-400 mb-2"
        rows={2}
        autoFocus
      />
      <div className="flex gap-1">
        <button
          type="button"
          onMouseDown={e => {
            e.preventDefault();
            if (comment.trim()) {
              onAddFlag(fieldId, stepIndex, type, comment.trim());
              onClose();
            }
          }}
          disabled={!comment.trim()}
          className="flex-1 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          Добавить
        </button>
        <button
          type="button"
          onMouseDown={e => { e.preventDefault(); onClose(); }}
          className="flex-1 py-1.5 rounded-lg bg-gray-200 text-gray-600 text-xs font-medium hover:bg-gray-300 transition-colors"
        >
          Отмена
        </button>
      </div>
    </div>
  );
}

// ── Field wrapper with flag button — defined OUTSIDE main component ──
function FieldWrapper({
  fieldId,
  flags,
  children,
  onAddFlag,
  stepIndex,
}: {
  fieldId: string;
  flags: FieldFlag[];
  children: React.ReactNode;
  onAddFlag: (fieldId: string, stepIndex: number, type: 'error' | 'warning' | 'info', comment: string) => void;
  stepIndex: number;
}) {
  const [showMenu, setShowMenu] = useState(false);
  const fieldFlags = flags.filter(f => f.fieldId === fieldId && !f.resolved);
  const hasFlags = fieldFlags.length > 0;

  return (
    <div className={`relative group ${hasFlags ? 'ring-2 ring-red-300 rounded-xl' : ''}`}>
      {children}
      {/* Flag button: use onMouseDown + preventDefault to avoid stealing focus */}
      <button
        type="button"
        onMouseDown={e => {
          e.preventDefault();
          e.stopPropagation();
          setShowMenu(v => !v);
        }}
        className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity w-5 h-5 rounded bg-white/90 hover:bg-orange-100 text-gray-500 hover:text-orange-600 flex items-center justify-center text-xs z-10 shadow-sm border border-gray-200"
        title="Добавить флаг к этому полю"
      >
        🚩
      </button>
      {hasFlags && (
        <div className="mt-1 space-y-1">
          {fieldFlags.map(f => (
            <div
              key={f.id}
              className={`text-xs px-2.5 py-1.5 rounded-lg ${
                f.type === 'error'
                  ? 'bg-red-50 text-red-700 border border-red-200'
                  : f.type === 'warning'
                  ? 'bg-yellow-50 text-yellow-700 border border-yellow-200'
                  : 'bg-blue-50 text-blue-700 border border-blue-200'
              }`}
            >
              🚩 <strong>{f.userName}:</strong> {f.comment}
            </div>
          ))}
        </div>
      )}
      {showMenu && (
        <QuickFlagMenu
          fieldId={fieldId}
          stepIndex={stepIndex}
          onAddFlag={onAddFlag}
          onClose={() => setShowMenu(false)}
        />
      )}
    </div>
  );
}

// ── Field label with flag dot — defined OUTSIDE main component ──
function FieldLabel({ flags, id, label }: { flags: FieldFlag[]; id: string; label: string }) {
  return (
    <label className="flex items-center text-sm font-medium text-gray-700 mb-1.5 select-none">
      {label}
      <FlagDot flags={flags} fieldId={id} />
    </label>
  );
}

// ── Combined label + wrapper — defined OUTSIDE main component ──
function FW({
  id,
  label,
  flags,
  onAddFlag,
  stepIndex,
  children,
}: {
  id: string;
  label: string;
  flags: FieldFlag[];
  onAddFlag: (fieldId: string, stepIndex: number, type: 'error' | 'warning' | 'info', comment: string) => void;
  stepIndex: number;
  children: React.ReactNode;
}) {
  return (
    <div>
      {label && <FieldLabel flags={flags} id={id} label={label} />}
      <FieldWrapper fieldId={id} flags={flags} onAddFlag={onAddFlag} stepIndex={stepIndex}>
        {children}
      </FieldWrapper>
    </div>
  );
}

// ── Other user typing indicator — defined OUTSIDE main component ──
function OtherTyping({
  fieldId,
  otherUsersPresence,
}: {
  fieldId: string;
  otherUsersPresence: { userId: string; userName: string; userColor: string; activeField: string | null }[];
}) {
  const active = otherUsersPresence.filter(u => u.activeField === fieldId);
  if (!active.length) return null;
  return (
    <div className="flex items-center gap-1 mt-1 flex-wrap">
      {active.map(u => (
        <div
          key={u.userId}
          className="flex items-center gap-1 text-xs rounded-full px-2 py-0.5 text-white"
          style={{ backgroundColor: u.userColor }}
        >
          <span>✍️</span>
          <span>{u.userName.split(' ')[0]} редактирует</span>
        </div>
      ))}
    </div>
  );
}

// ── Step sidebar — defined OUTSIDE main component ──
function StepSidebar({
  currentStep,
  onStepChange,
  formData,
  flags,
}: {
  currentStep: number;
  onStepChange: (i: number) => void;
  formData: FormData;
  flags: FieldFlag[];
}) {
  const completed: boolean[] = [
    !!formData.jiraLink?.trim(),
    !!formData.tribe?.trim() && formData.clusters.length > 0,
    !!formData.tribeResponsible?.trim() && !!formData.contractorResponsible?.trim() && !!formData.contractor?.trim(),
    formData.contracts.length > 0,
    formData.specificationItems.length > 0,
    formData.specificationItems.length > 0 &&
      formData.specificationItems.every(
        item =>
          item.stages.length > 0 &&
          item.stages.every(s => !!s.stage?.trim() && !!s.stageCost?.trim() && s.stageStartDate && s.stageEndDate)
      ),
    formData.specificationItems.length > 0 &&
      formData.specificationItems.every(
        item =>
          item.stages.length > 0 &&
          item.stages.every(
            s => s.functionalRequirements.length > 0 && s.functionalRequirements.every(fr => !!fr.description?.trim())
          )
      ),
    formData.specificationItems.length > 0 &&
      formData.specificationItems.every(
        item =>
          item.stages.length > 0 &&
          item.stages.every(s => s.employees.length > 0 && s.employees.every(e => !!e.stageFio?.trim() && !!e.role?.trim()))
      ),
  ];

  const completedCount = completed.filter(Boolean).length;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-800 text-sm">Шаги</h3>
        <span className="text-xs text-gray-400">
          {completedCount}/{STEPS.length}
        </span>
      </div>

      <div className="space-y-0.5">
        {STEPS.map((label, i) => {
          const isActive = currentStep === i;
          const isCompleted = completed[i];
          const hasFlag = flags.some(f => f.stepIndex === i && !f.resolved);
          return (
            <button
              key={i}
              type="button"
              onClick={() => onStepChange(i)}
              className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl transition-all text-left ${
                isActive ? 'bg-blue-50 border border-blue-200' : 'border border-transparent hover:bg-gray-50'
              }`}
            >
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : hasFlag
                    ? 'bg-red-100 text-red-600'
                    : isCompleted
                    ? 'bg-green-100 text-green-600'
                    : 'bg-gray-100 text-gray-500'
                }`}
              >
                {hasFlag ? '!' : isCompleted ? '✓' : i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className={`text-xs font-medium truncate ${isActive ? 'text-blue-800' : 'text-gray-700'}`}>
                  {label}
                </div>
                <div
                  className={`text-xs truncate ${
                    hasFlag ? 'text-red-500' : isCompleted ? 'text-green-600' : isActive ? 'text-blue-500' : 'text-gray-400'
                  }`}
                >
                  {hasFlag ? '⚠ Замечания' : isCompleted ? 'Готово' : 'Не заполнено'}
                </div>
              </div>
              {isActive && (
                <svg className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-4 pt-3 border-t border-gray-100">
        <div className="flex justify-between text-xs text-gray-500 mb-1.5">
          <span>Прогресс</span>
          <span className="font-semibold text-blue-600">{Math.round((completedCount / STEPS.length) * 100)}%</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-500"
            style={{ width: `${(completedCount / STEPS.length) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}

export { STEPS };

// ── Input class constant ──
const IW = 'w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors';
const CARD = 'bg-white rounded-2xl shadow-sm border border-gray-100 p-5';
const ADD_BTN = 'inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors';
const REMOVE_BTN = 'rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors flex-shrink-0';
const EMPTY_BOX = 'text-center py-8 text-gray-400 text-sm bg-gray-50 rounded-xl border-2 border-dashed border-gray-200';

// ── Main form component ──
export default function SpecForm({
  formData,
  activeFlags,
  currentStep,
  onStepChange,
  onFormChange,
  onFocusField,
  onAddFlag,
  otherUsersPresence,
}: Props) {
  const [expandedClusters, setExpandedClusters] = useState<number[]>([]);
  const [expandedSpecItems, setExpandedSpecItems] = useState<number[]>([]);
  const [expandedStages, setExpandedStages] = useState<number[]>([]);

  // ─── Form field handlers ───
  const handleChange = useCallback(
    (field: keyof FormData, value: string) => {
      onFormChange(prev => ({ ...prev, [field]: value }));
    },
    [onFormChange]
  );

  // Clusters
  const addCluster = useCallback(() => {
    const nc: Cluster = { id: Date.now(), productName: '', productCode: '', strategicTheme: '' };
    onFormChange(prev => ({ ...prev, clusters: [...prev.clusters, nc] }));
    setExpandedClusters(prev => [...prev, nc.id]);
  }, [onFormChange]);

  const removeCluster = useCallback(
    (id: number) => {
      onFormChange(prev => ({ ...prev, clusters: prev.clusters.filter(c => c.id !== id) }));
      setExpandedClusters(prev => prev.filter(x => x !== id));
    },
    [onFormChange]
  );

  const updateCluster = useCallback(
    (id: number, field: string, value: string) => {
      onFormChange(prev => ({ ...prev, clusters: prev.clusters.map(c => (c.id === id ? { ...c, [field]: value } : c)) }));
    },
    [onFormChange]
  );

  // Contracts
  const addContract = useCallback(() => {
    const nc: Contract = { id: Date.now(), contractNumber: '', contractDate: null };
    onFormChange(prev => ({ ...prev, contracts: [...prev.contracts, nc] }));
  }, [onFormChange]);

  const removeContract = useCallback(
    (id: number) => {
      onFormChange(prev => ({ ...prev, contracts: prev.contracts.filter(c => c.id !== id) }));
    },
    [onFormChange]
  );

  const updateContract = useCallback(
    (id: number, field: string, value: string | null) => {
      onFormChange(prev => ({ ...prev, contracts: prev.contracts.map(c => (c.id === id ? { ...c, [field]: value } : c)) }));
    },
    [onFormChange]
  );

  // Spec Items
  const addSpecItem = useCallback(() => {
    const ns: SpecificationItem = { id: Date.now(), subject: '', ci: '', stages: [] };
    onFormChange(prev => ({ ...prev, specificationItems: [...prev.specificationItems, ns] }));
    setExpandedSpecItems(prev => [...prev, ns.id]);
  }, [onFormChange]);

  const removeSpecItem = useCallback(
    (id: number) => {
      onFormChange(prev => ({ ...prev, specificationItems: prev.specificationItems.filter(s => s.id !== id) }));
      setExpandedSpecItems(prev => prev.filter(x => x !== id));
    },
    [onFormChange]
  );

  const updateSpecItem = useCallback(
    (id: number, field: string, value: string) => {
      onFormChange(prev => ({
        ...prev,
        specificationItems: prev.specificationItems.map(s => (s.id === id ? { ...s, [field]: value } : s)),
      }));
    },
    [onFormChange]
  );

  // Stages
  const addStage = useCallback(
    (specItemId: number) => {
      const ns: Stage = {
        id: Date.now(),
        stage: '',
        stageCost: '',
        stageStartDate: null,
        stageEndDate: null,
        functionalRequirements: [],
        employees: [],
      };
      onFormChange(prev => ({
        ...prev,
        specificationItems: prev.specificationItems.map(s =>
          s.id === specItemId ? { ...s, stages: [...s.stages, ns] } : s
        ),
      }));
      setExpandedStages(prev => [...prev, ns.id]);
    },
    [onFormChange]
  );

  const removeStage = useCallback(
    (specItemId: number, stageId: number) => {
      onFormChange(prev => ({
        ...prev,
        specificationItems: prev.specificationItems.map(s =>
          s.id === specItemId ? { ...s, stages: s.stages.filter(st => st.id !== stageId) } : s
        ),
      }));
      setExpandedStages(prev => prev.filter(x => x !== stageId));
    },
    [onFormChange]
  );

  const updateStage = useCallback(
    (specItemId: number, stageId: number, field: string, value: string | null) => {
      onFormChange(prev => ({
        ...prev,
        specificationItems: prev.specificationItems.map(s =>
          s.id === specItemId
            ? { ...s, stages: s.stages.map(st => (st.id === stageId ? { ...st, [field]: value } : st)) }
            : s
        ),
      }));
    },
    [onFormChange]
  );

  // FRs
  const addFR = useCallback(
    (specItemId: number, stageId: number) => {
      const nfr: FunctionalRequirement = { id: Date.now(), description: '' };
      onFormChange(prev => ({
        ...prev,
        specificationItems: prev.specificationItems.map(s =>
          s.id === specItemId
            ? {
                ...s,
                stages: s.stages.map(st =>
                  st.id === stageId ? { ...st, functionalRequirements: [...st.functionalRequirements, nfr] } : st
                ),
              }
            : s
        ),
      }));
    },
    [onFormChange]
  );

  const removeFR = useCallback(
    (specItemId: number, stageId: number, frId: number) => {
      onFormChange(prev => ({
        ...prev,
        specificationItems: prev.specificationItems.map(s =>
          s.id === specItemId
            ? {
                ...s,
                stages: s.stages.map(st =>
                  st.id === stageId
                    ? { ...st, functionalRequirements: st.functionalRequirements.filter(f => f.id !== frId) }
                    : st
                ),
              }
            : s
        ),
      }));
    },
    [onFormChange]
  );

  const updateFR = useCallback(
    (specItemId: number, stageId: number, frId: number, value: string) => {
      onFormChange(prev => ({
        ...prev,
        specificationItems: prev.specificationItems.map(s =>
          s.id === specItemId
            ? {
                ...s,
                stages: s.stages.map(st =>
                  st.id === stageId
                    ? {
                        ...st,
                        functionalRequirements: st.functionalRequirements.map(f =>
                          f.id === frId ? { ...f, description: value } : f
                        ),
                      }
                    : st
                ),
              }
            : s
        ),
      }));
    },
    [onFormChange]
  );

  // Employees
  const addEmployee = useCallback(
    (specItemId: number, stageId: number) => {
      const ne: Employee = {
        id: Date.now(),
        stageFio: '',
        role: '',
        rateWithTax: '',
        hoursPerStage: '',
        verification: '',
        workStartDate: null,
        workEndDate: null,
      };
      onFormChange(prev => ({
        ...prev,
        specificationItems: prev.specificationItems.map(s =>
          s.id === specItemId
            ? { ...s, stages: s.stages.map(st => (st.id === stageId ? { ...st, employees: [...st.employees, ne] } : st)) }
            : s
        ),
      }));
    },
    [onFormChange]
  );

  const removeEmployee = useCallback(
    (specItemId: number, stageId: number, empId: number) => {
      onFormChange(prev => ({
        ...prev,
        specificationItems: prev.specificationItems.map(s =>
          s.id === specItemId
            ? {
                ...s,
                stages: s.stages.map(st =>
                  st.id === stageId ? { ...st, employees: st.employees.filter(e => e.id !== empId) } : st
                ),
              }
            : s
        ),
      }));
    },
    [onFormChange]
  );

  const updateEmployee = useCallback(
    (specItemId: number, stageId: number, empId: number, field: string, value: string | null) => {
      onFormChange(prev => ({
        ...prev,
        specificationItems: prev.specificationItems.map(s =>
          s.id === specItemId
            ? {
                ...s,
                stages: s.stages.map(st =>
                  st.id === stageId
                    ? { ...st, employees: st.employees.map(e => (e.id === empId ? { ...e, [field]: value } : e)) }
                    : st
                ),
              }
            : s
        ),
      }));
    },
    [onFormChange]
  );

  // Fill sample data
  const fillSampleData = useCallback(() => {
    const sampleCluster: Cluster = {
      id: Date.now(),
      productName: 'SberNBA.Data Connect',
      productCode: '9900EK002631',
      strategicTheme: '#ДАННЫЕ_',
    };
    const sampleContract: Contract = { id: Date.now() + 1, contractNumber: '5066854', contractDate: '2024-11-01' };
    const stageId = Date.now() + 2;
    const specItemId = Date.now() + 3;
    const frId = Date.now() + 4;
    const empId = Date.now() + 5;
    const newData: FormData = {
      jiraLink: 'https://jira.example.com/browse/PROJECT-123',
      tribe: 'SberNBA',
      tribeResponsible: 'Нечаев Илья Борисович',
      contractor: 'ООО «ГлоуБайт Лаборатория данных»',
      contractorResponsible: 'Теплов Сергей Геннадьевич',
      nonFunctionalRequirements:
        '1) Разработка ПО должна вестись с использованием системы контроля версий.\n2) Проектирование должно осуществляться в соответствии с процессом «Проектирование и внедрение технологий».',
      clusters: [sampleCluster],
      contracts: [sampleContract],
      specificationItems: [
        {
          id: specItemId,
          subject: 'ППО «Модуль Витрины данных МассПерс» для ФП «Специализированные витрины hd» (CI02320571)',
          ci: '2320571',
          stages: [
            {
              id: stageId,
              stage: '1',
              stageCost: '2400',
              stageStartDate: '2025-06-30',
              stageEndDate: '2025-07-31',
              functionalRequirements: [
                { id: frId, description: 'HQUNITDATA-728 экспорт документа word с данными из экселя' },
              ],
              employees: [
                {
                  id: empId,
                  stageFio: 'Егорова Мария Сергеевна',
                  role: 'Главный разработчик Hadoop',
                  rateWithTax: '240',
                  hoursPerStage: '10',
                  verification: '24',
                  workStartDate: '2025-06-30',
                  workEndDate: '2025-07-31',
                },
              ],
            },
          ],
        },
      ],
    };
    onFormChange(() => newData);
    setExpandedClusters([sampleCluster.id]);
    setExpandedSpecItems([specItemId]);
    setExpandedStages([stageId]);
  }, [onFormChange]);

  return (
    <div className="flex gap-5">
      {/* ── Step Sidebar ── */}
      <div className="w-52 flex-shrink-0">
        <StepSidebar currentStep={currentStep} onStepChange={onStepChange} formData={formData} flags={activeFlags} />
      </div>

      {/* ── Form content ── */}
      <div className="flex-1 min-w-0">
        {/* Page header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Создание спецификации</h1>
            <p className="text-gray-500 text-sm mt-0.5">
              Шаг {currentStep + 1} из {STEPS.length}:{' '}
              <span className="text-blue-600 font-medium">{STEPS[currentStep]}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={fillSampleData}
            className="inline-flex items-center gap-2 rounded-xl bg-white border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm transition-all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Тест. данные
          </button>
        </div>

        {/* ── STEP 0: Jira ── */}
        {currentStep === 0 && (
          <div className={CARD}>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              </div>
              <div>
                <h2 className="font-semibold text-gray-900">Ссылка из Jira</h2>
                <p className="text-gray-500 text-sm">Укажите ссылку на задачу в Jira</p>
              </div>
            </div>
            <div className="bg-blue-50 rounded-xl p-3 mb-4 text-sm text-blue-700">
              💡 Ссылка помогает автоматически заполнить данные спецификации
            </div>
            <FW id="jiraLink" label="Ссылка из Jira *" flags={activeFlags} onAddFlag={onAddFlag} stepIndex={currentStep}>
              <input
                type="url"
                value={formData.jiraLink}
                onChange={e => handleChange('jiraLink', e.target.value)}
                onFocus={() => onFocusField('jiraLink')}
                onBlur={() => onFocusField(null)}
                placeholder="https://jira.example.com/browse/PROJECT-123"
                className={IW}
              />
              <OtherTyping fieldId="jiraLink" otherUsersPresence={otherUsersPresence} />
            </FW>
          </div>
        )}

        {/* ── STEP 1: Tribe & Clusters ── */}
        {currentStep === 1 && (
          <div className="space-y-4">
            <div className={CARD}>
              <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-green-50 flex items-center justify-center">
                  <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                Трайб
              </h2>
              <FW id="tribe" label="Название трайба *" flags={activeFlags} onAddFlag={onAddFlag} stepIndex={currentStep}>
                <input
                  type="text"
                  value={formData.tribe}
                  onChange={e => handleChange('tribe', e.target.value)}
                  onFocus={() => onFocusField('tribe')}
                  onBlur={() => onFocusField(null)}
                  className={IW}
                />
                <OtherTyping fieldId="tribe" otherUsersPresence={otherUsersPresence} />
              </FW>
            </div>

            <div className={CARD}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-purple-50 flex items-center justify-center">
                    <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>
                  Кластеры
                </h2>
                <button type="button" onClick={addCluster} className={ADD_BTN}>
                  + Добавить кластер
                </button>
              </div>
              {formData.clusters.length === 0 && <div className={EMPTY_BOX}>Нет кластеров. Нажмите «Добавить кластер».</div>}
              <div className="space-y-3">
                {formData.clusters.map(c => (
                  <div key={c.id} className="border border-gray-200 rounded-xl overflow-hidden">
                    <div
                      className="flex items-center justify-between px-4 py-3 bg-gray-50 cursor-pointer select-none"
                      onClick={() =>
                        setExpandedClusters(prev =>
                          prev.includes(c.id) ? prev.filter(x => x !== c.id) : [...prev, c.id]
                        )
                      }
                    >
                      <span className="font-medium text-sm text-gray-800">{c.productName || 'Новый кластер'}</span>
                      <div className="flex items-center gap-2">
                        <svg
                          className={`w-4 h-4 text-gray-400 transition-transform ${expandedClusters.includes(c.id) ? 'rotate-180' : ''}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            removeCluster(c.id);
                          }}
                          className={REMOVE_BTN}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>
                    {expandedClusters.includes(c.id) && (
                      <div className="p-4 grid gap-3 md:grid-cols-2">
                        <div>
                          <label className="text-xs font-medium text-gray-600 block mb-1">Название продукта ЕК</label>
                          <input type="text" value={c.productName} onChange={e => updateCluster(c.id, 'productName', e.target.value)} className={IW} />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-600 block mb-1">Код продукта ЕК</label>
                          <input type="text" value={c.productCode} onChange={e => updateCluster(c.id, 'productCode', e.target.value)} className={IW} />
                        </div>
                        <div className="md:col-span-2">
                          <label className="text-xs font-medium text-gray-600 block mb-1">Стратегическая тема</label>
                          <input type="text" value={c.strategicTheme} onChange={e => updateCluster(c.id, 'strategicTheme', e.target.value)} className={IW} />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 2: Responsible ── */}
        {currentStep === 2 && (
          <div className={CARD}>
            <h2 className="font-semibold text-gray-900 mb-5 flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-orange-50 flex items-center justify-center">
                <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              Ответственные и требования
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              <FW id="tribeResponsible" label="Ответственный от трайба *" flags={activeFlags} onAddFlag={onAddFlag} stepIndex={currentStep}>
                <input type="text" value={formData.tribeResponsible} onChange={e => handleChange('tribeResponsible', e.target.value)} onFocus={() => onFocusField('tribeResponsible')} onBlur={() => onFocusField(null)} className={IW} />
                <OtherTyping fieldId="tribeResponsible" otherUsersPresence={otherUsersPresence} />
              </FW>
              <FW id="contractorResponsible" label="Ответственный от подрядчика *" flags={activeFlags} onAddFlag={onAddFlag} stepIndex={currentStep}>
                <input type="text" value={formData.contractorResponsible} onChange={e => handleChange('contractorResponsible', e.target.value)} onFocus={() => onFocusField('contractorResponsible')} onBlur={() => onFocusField(null)} className={IW} />
                <OtherTyping fieldId="contractorResponsible" otherUsersPresence={otherUsersPresence} />
              </FW>
              <div className="md:col-span-2">
                <FW id="contractor" label="Подрядчик *" flags={activeFlags} onAddFlag={onAddFlag} stepIndex={currentStep}>
                  <input type="text" value={formData.contractor} onChange={e => handleChange('contractor', e.target.value)} onFocus={() => onFocusField('contractor')} onBlur={() => onFocusField(null)} className={IW} />
                  <OtherTyping fieldId="contractor" otherUsersPresence={otherUsersPresence} />
                </FW>
              </div>
              <div className="md:col-span-2">
                <FW id="nonFunctionalRequirements" label="Нефункциональные требования" flags={activeFlags} onAddFlag={onAddFlag} stepIndex={currentStep}>
                  <textarea
                    value={formData.nonFunctionalRequirements}
                    onChange={e => handleChange('nonFunctionalRequirements', e.target.value)}
                    onFocus={() => onFocusField('nonFunctionalRequirements')}
                    onBlur={() => onFocusField(null)}
                    rows={4}
                    className={IW}
                    placeholder="Опишите технические требования, стандарты и ограничения"
                  />
                  <OtherTyping fieldId="nonFunctionalRequirements" otherUsersPresence={otherUsersPresence} />
                </FW>
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 3: Contracts ── */}
        {currentStep === 3 && (
          <div className={CARD}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center">
                  <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                Договор
              </h2>
              <button type="button" onClick={addContract} className={ADD_BTN}>
                + Добавить договор
              </button>
            </div>
            {formData.contracts.length === 0 && <div className={EMPTY_BOX}>Нет договоров. Нажмите «Добавить договор».</div>}
            <div className="space-y-4">
              {formData.contracts.map(c => (
                <div key={c.id} className="border border-gray-200 rounded-xl p-4">
                  <div className="flex justify-between items-center mb-4">
                    <span className="font-medium text-gray-800 text-sm">Договор № {c.contractNumber || '—'}</span>
                    <button type="button" onClick={() => removeContract(c.id)} className={REMOVE_BTN}>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <FW id={`contract_${c.id}_number`} label="Номер договора *" flags={activeFlags} onAddFlag={onAddFlag} stepIndex={currentStep}>
                      <input type="text" value={c.contractNumber} onChange={e => updateContract(c.id, 'contractNumber', e.target.value)} className={IW} />
                    </FW>
                    <FW id={`contract_${c.id}_date`} label="Дата заключения *" flags={activeFlags} onAddFlag={onAddFlag} stepIndex={currentStep}>
                      <input type="date" value={c.contractDate || ''} onChange={e => updateContract(c.id, 'contractDate', e.target.value)} className={IW} />
                    </FW>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── STEP 4: Spec Items ── */}
        {currentStep === 4 && (
          <div className={CARD}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-purple-50 flex items-center justify-center">
                  <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                Предметы спецификации
              </h2>
              <button type="button" onClick={addSpecItem} className={ADD_BTN}>
                + Добавить предмет
              </button>
            </div>
            {formData.specificationItems.length === 0 && <div className={EMPTY_BOX}>Нет предметов спецификации</div>}
            <div className="space-y-4">
              {formData.specificationItems.map(s => (
                <div key={s.id} className="border border-gray-200 rounded-xl overflow-hidden">
                  <div
                    className="flex items-center justify-between px-4 py-3 bg-gray-50 cursor-pointer select-none"
                    onClick={() =>
                      setExpandedSpecItems(prev =>
                        prev.includes(s.id) ? prev.filter(x => x !== s.id) : [...prev, s.id]
                      )
                    }
                  >
                    <span className="font-medium text-sm text-gray-800 truncate flex-1 mr-2">{s.subject || 'Новый предмет'}</span>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <svg
                        className={`w-4 h-4 text-gray-400 transition-transform ${expandedSpecItems.includes(s.id) ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          removeSpecItem(s.id);
                        }}
                        className={REMOVE_BTN}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  {expandedSpecItems.includes(s.id) && (
                    <div className="p-4 space-y-3">
                      <FW id={`spec_${s.id}_subject`} label="Предмет спецификации *" flags={activeFlags} onAddFlag={onAddFlag} stepIndex={currentStep}>
                        <textarea value={s.subject} onChange={e => updateSpecItem(s.id, 'subject', e.target.value)} rows={2} className={IW} />
                      </FW>
                      <FW id={`spec_${s.id}_ci`} label="CI ФП/АС *" flags={activeFlags} onAddFlag={onAddFlag} stepIndex={currentStep}>
                        <input type="text" value={s.ci} onChange={e => updateSpecItem(s.id, 'ci', e.target.value)} className={IW} />
                      </FW>
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-700">Этапы</span>
                          <button
                            type="button"
                            onClick={() => addStage(s.id)}
                            className="inline-flex items-center gap-1 rounded-lg bg-green-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-green-700 transition-colors"
                          >
                            + Этап
                          </button>
                        </div>
                        <div className="space-y-2">
                          {s.stages.map(st => (
                            <div key={st.id} className="border border-gray-100 rounded-xl overflow-hidden">
                              <div
                                className="flex items-center justify-between px-3 py-2 bg-blue-50 cursor-pointer select-none"
                                onClick={() =>
                                  setExpandedStages(prev =>
                                    prev.includes(st.id) ? prev.filter(x => x !== st.id) : [...prev, st.id]
                                  )
                                }
                              >
                                <span className="text-xs font-medium text-blue-700">Этап: {st.stage || '—'}</span>
                                <button
                                  type="button"
                                  onClick={e => {
                                    e.stopPropagation();
                                    removeStage(s.id, st.id);
                                  }}
                                  className="text-gray-400 hover:text-red-500 transition-colors p-0.5 ml-2"
                                >
                                  ✕
                                </button>
                              </div>
                              {expandedStages.includes(st.id) && (
                                <div className="p-3 grid gap-2 md:grid-cols-2">
                                  <div>
                                    <label className="text-xs font-medium text-gray-600 block mb-1">Этап *</label>
                                    <input type="text" value={st.stage} onChange={e => updateStage(s.id, st.id, 'stage', e.target.value)} className={IW} />
                                  </div>
                                  <div>
                                    <label className="text-xs font-medium text-gray-600 block mb-1">Стоимость с НДС *</label>
                                    <input type="text" value={st.stageCost} onChange={e => updateStage(s.id, st.id, 'stageCost', e.target.value)} className={IW} />
                                  </div>
                                  <div>
                                    <label className="text-xs font-medium text-gray-600 block mb-1">Дата начала *</label>
                                    <input type="date" value={st.stageStartDate || ''} onChange={e => updateStage(s.id, st.id, 'stageStartDate', e.target.value)} className={IW} />
                                  </div>
                                  <div>
                                    <label className="text-xs font-medium text-gray-600 block mb-1">Дата окончания *</label>
                                    <input type="date" value={st.stageEndDate || ''} onChange={e => updateStage(s.id, st.id, 'stageEndDate', e.target.value)} className={IW} />
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                          {s.stages.length === 0 && (
                            <div className="text-xs text-gray-400 text-center py-3 bg-gray-50 rounded-xl">Нет этапов</div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── STEP 5: Stages overview ── */}
        {currentStep === 5 && (
          <div className={CARD}>
            <h2 className="font-semibold text-gray-900 mb-5">Этапы (детальный обзор)</h2>
            {formData.specificationItems.length === 0 && (
              <div className={EMPTY_BOX}>Нет предметов спецификации. Добавьте на шаге «Предметы спецификации».</div>
            )}
            <div className="space-y-5">
              {formData.specificationItems.map(s => (
                <div key={s.id} className="border border-gray-200 rounded-xl p-4">
                  <h3 className="font-medium text-gray-800 mb-3 text-sm">{s.subject || 'Предмет'}</h3>
                  {s.stages.length === 0 && (
                    <div className="text-xs text-gray-400 text-center py-3 bg-gray-50 rounded-xl">
                      Нет этапов — добавьте на шаге «Предметы спецификации»
                    </div>
                  )}
                  <div className="space-y-3">
                    {s.stages.map(st => (
                      <div key={st.id} className="bg-gray-50 rounded-xl p-3 grid gap-3 md:grid-cols-2">
                        <div>
                          <label className="text-xs font-medium text-gray-600 block mb-1">Этап *</label>
                          <input type="text" value={st.stage} onChange={e => updateStage(s.id, st.id, 'stage', e.target.value)} className={IW} />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-600 block mb-1">Стоимость с НДС *</label>
                          <input type="text" value={st.stageCost} onChange={e => updateStage(s.id, st.id, 'stageCost', e.target.value)} className={IW} />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-600 block mb-1">Дата начала *</label>
                          <input type="date" value={st.stageStartDate || ''} onChange={e => updateStage(s.id, st.id, 'stageStartDate', e.target.value)} className={IW} />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-600 block mb-1">Дата окончания *</label>
                          <input type="date" value={st.stageEndDate || ''} onChange={e => updateStage(s.id, st.id, 'stageEndDate', e.target.value)} className={IW} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── STEP 6: Functional Requirements ── */}
        {currentStep === 6 && (
          <div className={CARD}>
            <h2 className="font-semibold text-gray-900 mb-5">Функциональные требования</h2>
            {formData.specificationItems.length === 0 && <div className={EMPTY_BOX}>Нет предметов спецификации</div>}
            <div className="space-y-5">
              {formData.specificationItems.map(s => (
                <div key={s.id} className="border border-gray-200 rounded-xl p-4">
                  <h3 className="font-medium text-gray-800 mb-3 text-sm">{s.subject || 'Предмет'}</h3>
                  {s.stages.map(st => (
                    <div key={st.id} className="bg-gray-50 rounded-xl p-3 mb-3">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-medium text-gray-700">Этап: {st.stage || '—'}</span>
                        <button
                          type="button"
                          onClick={() => addFR(s.id, st.id)}
                          className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-blue-700 transition-colors"
                        >
                          + ФТ
                        </button>
                      </div>
                      {st.functionalRequirements.length === 0 && (
                        <div className="text-xs text-gray-400 mb-2">Нет функциональных требований</div>
                      )}
                      <div className="space-y-2">
                        {st.functionalRequirements.map(fr => (
                          <div key={fr.id} className="flex gap-2 items-start">
                            <div className="flex-1">
                              <FW id={`fr_${fr.id}`} label="" flags={activeFlags} onAddFlag={onAddFlag} stepIndex={currentStep}>
                                <textarea
                                  value={fr.description}
                                  onChange={e => updateFR(s.id, st.id, fr.id, e.target.value)}
                                  rows={2}
                                  className={IW}
                                  placeholder="Описание функционального требования *"
                                />
                              </FW>
                            </div>
                            <button type="button" onClick={() => removeFR(s.id, st.id, fr.id)} className={REMOVE_BTN + ' mt-0.5'}>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── STEP 7: Employees ── */}
        {currentStep === 7 && (
          <div className={CARD}>
            <h2 className="font-semibold text-gray-900 mb-5">Сотрудники</h2>
            {formData.specificationItems.length === 0 && <div className={EMPTY_BOX}>Нет предметов спецификации</div>}
            <div className="space-y-5">
              {formData.specificationItems.map(s => (
                <div key={s.id} className="border border-gray-200 rounded-xl p-4">
                  <h3 className="font-medium text-gray-800 mb-3 text-sm">{s.subject || 'Предмет'}</h3>
                  {s.stages.map(st => (
                    <div key={st.id} className="bg-gray-50 rounded-xl p-3 mb-3">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-medium text-gray-700">Этап: {st.stage || '—'}</span>
                        <button
                          type="button"
                          onClick={() => addEmployee(s.id, st.id)}
                          className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-blue-700 transition-colors"
                        >
                          + Сотрудник
                        </button>
                      </div>
                      {st.employees.length === 0 && <div className="text-xs text-gray-400 mb-2">Нет сотрудников</div>}
                      <div className="space-y-3">
                        {st.employees.map(emp => (
                          <div key={emp.id} className="border border-gray-200 rounded-xl p-3 bg-white">
                            <div className="flex justify-between items-center mb-3">
                              <span className="text-xs font-semibold text-gray-700">{emp.stageFio || 'Новый сотрудник'}</span>
                              <button type="button" onClick={() => removeEmployee(s.id, st.id, emp.id)} className={REMOVE_BTN}>
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                            <div className="grid gap-2 md:grid-cols-2">
                              <div>
                                <label className="text-xs font-medium text-gray-600 block mb-1">ФИО *</label>
                                <input type="text" value={emp.stageFio} onChange={e => updateEmployee(s.id, st.id, emp.id, 'stageFio', e.target.value)} className={IW} />
                              </div>
                              <div>
                                <label className="text-xs font-medium text-gray-600 block mb-1">Роль *</label>
                                <input type="text" value={emp.role} onChange={e => updateEmployee(s.id, st.id, emp.id, 'role', e.target.value)} className={IW} />
                              </div>
                              <div>
                                <label className="text-xs font-medium text-gray-600 block mb-1">Ставка с НДС *</label>
                                <input type="text" value={emp.rateWithTax} onChange={e => updateEmployee(s.id, st.id, emp.id, 'rateWithTax', e.target.value)} className={IW} />
                              </div>
                              <div>
                                <label className="text-xs font-medium text-gray-600 block mb-1">Ч/д по этапу *</label>
                                <input type="text" value={emp.hoursPerStage} onChange={e => updateEmployee(s.id, st.id, emp.id, 'hoursPerStage', e.target.value)} className={IW} />
                              </div>
                              <div>
                                <label className="text-xs font-medium text-gray-600 block mb-1">Проверка</label>
                                <input type="text" value={emp.verification} onChange={e => updateEmployee(s.id, st.id, emp.id, 'verification', e.target.value)} className={IW} />
                              </div>
                              <div />
                              <div>
                                <label className="text-xs font-medium text-gray-600 block mb-1">Дата начала работ *</label>
                                <input type="date" value={emp.workStartDate || ''} onChange={e => updateEmployee(s.id, st.id, emp.id, 'workStartDate', e.target.value)} className={IW} />
                              </div>
                              <div>
                                <label className="text-xs font-medium text-gray-600 block mb-1">Дата окончания работ *</label>
                                <input type="date" value={emp.workEndDate || ''} onChange={e => updateEmployee(s.id, st.id, emp.id, 'workEndDate', e.target.value)} className={IW} />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Bottom navigation ── */}
        <div className="mt-6 bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4 flex items-center justify-between">
          <button
            type="button"
            onClick={() => onStepChange(Math.max(0, currentStep - 1))}
            disabled={currentStep === 0}
            className="inline-flex items-center gap-2 rounded-xl bg-white border border-gray-200 px-5 py-2.5 font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Назад
          </button>

          <div className="flex items-center gap-2">
            {STEPS.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => onStepChange(i)}
                className={`h-2 rounded-full transition-all ${i === currentStep ? 'bg-blue-600 w-4' : i < currentStep ? 'bg-green-400 w-2' : 'bg-gray-200 w-2'}`}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={() => onStepChange(Math.min(STEPS.length - 1, currentStep + 1))}
            disabled={currentStep === STEPS.length - 1}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 font-medium text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm text-sm"
          >
            Далее
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
