import { FormData } from '../types';

export interface SavedTemplate {
  id: string;
  name: string;
  description: string;
  createdBy: string;
  createdAt: number;
  updatedAt: number;
  formData: FormData;
  tags: string[];
  usageCount: number;
}

const TEMPLATES_KEY = 'collab_templates_v2';

export function getTemplates(): SavedTemplate[] {
  try {
    const raw = localStorage.getItem(TEMPLATES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveTemplate(template: Omit<SavedTemplate, 'id' | 'createdAt' | 'updatedAt' | 'usageCount'>): SavedTemplate {
  const templates = getTemplates();
  const newTemplate: SavedTemplate = {
    ...template,
    id: `tpl_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    usageCount: 0,
  };
  localStorage.setItem(TEMPLATES_KEY, JSON.stringify([...templates, newTemplate]));
  return newTemplate;
}

export function updateTemplate(id: string, patch: Partial<SavedTemplate>): void {
  const templates = getTemplates();
  localStorage.setItem(
    TEMPLATES_KEY,
    JSON.stringify(templates.map(t => t.id === id ? { ...t, ...patch, updatedAt: Date.now() } : t))
  );
}

export function deleteTemplate(id: string): void {
  const templates = getTemplates();
  localStorage.setItem(TEMPLATES_KEY, JSON.stringify(templates.filter(t => t.id !== id)));
}

export function incrementUsage(id: string): void {
  const templates = getTemplates();
  localStorage.setItem(
    TEMPLATES_KEY,
    JSON.stringify(templates.map(t => t.id === id ? { ...t, usageCount: t.usageCount + 1 } : t))
  );
}

// Predefined demo templates
export function loadDemoTemplates(createdBy: string): void {
  const existing = getTemplates();
  if (existing.length > 0) return; // Already have templates

  const demoFormData: FormData = {
    jiraLink: 'https://jira.example.com/browse/HQUNIT-1234',
    tribe: 'SberNBA',
    tribeResponsible: 'Нечаев Илья Борисович',
    contractor: 'ООО «ГлоуБайт Лаборатория данных»',
    contractorResponsible: 'Теплов Сергей Геннадьевич',
    nonFunctionalRequirements:
      '1) Разработка ПО на стороне Исполнителя должна вестись с использованием системы контроля версий ПО.\n2) Проектирование и внедрение заявленных требований должно осуществляться в соответствии с принятым у Заказчика процессом.',
    clusters: [
      {
        id: 1001,
        productName: 'SberNBA.Data Connect',
        productCode: '9900EK002631',
        strategicTheme: '#ДАННЫЕ_',
      },
    ],
    contracts: [
      {
        id: 2001,
        contractNumber: '5066854',
        contractDate: '2024-11-01',
      },
    ],
    specificationItems: [
      {
        id: 3001,
        subject: 'ППО «Модуль Витрины данных МассПерс» (CI02320571)',
        ci: '2320571',
        stages: [
          {
            id: 4001,
            stage: '1',
            stageCost: '2400',
            stageStartDate: '2025-06-30',
            stageEndDate: '2025-07-31',
            functionalRequirements: [
              {
                id: 5001,
                description: 'HQUNITDATA-728 Экспорт документа Word с данными из Excel',
              },
            ],
            employees: [
              {
                id: 6001,
                stageFio: 'Егорова Мария Сергеевна',
                role: 'Главный разработчик Hadoop (Москва)',
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

  const minimalFormData: FormData = {
    jiraLink: '',
    tribe: '',
    tribeResponsible: '',
    contractor: '',
    contractorResponsible: '',
    nonFunctionalRequirements:
      '1) Разработка ПО на стороне Исполнителя должна вестись с использованием системы контроля версий ПО.\n2) Внедрение должно осуществляться в соответствии с принятым у Заказчика процессом.',
    clusters: [],
    contracts: [],
    specificationItems: [],
  };

  const templates: Omit<SavedTemplate, 'id' | 'createdAt' | 'updatedAt' | 'usageCount'>[] = [
    {
      name: 'SberNBA — Стандартный шаблон',
      description: 'Типовая спецификация для трайба SberNBA с заполненными ответственными и кластерами',
      createdBy,
      formData: demoFormData,
      tags: ['SberNBA', 'Данные', 'Hadoop'],
    },
    {
      name: 'Пустой шаблон с НФТ',
      description: 'Заготовка с предзаполненными нефункциональными требованиями',
      createdBy,
      formData: minimalFormData,
      tags: ['Базовый', 'НФТ'],
    },
  ];

  templates.forEach(t => {
    const all = getTemplates();
    const newT: SavedTemplate = {
      ...t,
      id: `tpl_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      usageCount: 0,
    };
    localStorage.setItem(TEMPLATES_KEY, JSON.stringify([...all, newT]));
  });
}
