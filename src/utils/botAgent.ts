import { FormData, ChatMessage, FieldFlag } from '../types';

export const BOT_USER_ID = 'bot_agent';
export const BOT_NAME = 'AI Ассистент';
export const BOT_COLOR = '#7C3AED';

// Small delay to simulate "thinking"
export function botDelay(min = 600, max = 1800): Promise<void> {
  return new Promise(r => setTimeout(r, min + Math.random() * (max - min)));
}

export interface BotContext {
  formData: FormData;
  flags: FieldFlag[];
  messages: ChatMessage[];
  currentStep: number;
  steps: string[];
}

function getFormCompleteness(fd: FormData): { pct: number; missing: string[] } {
  const missing: string[] = [];
  if (!fd.jiraLink?.trim()) missing.push('Jira ссылка');
  if (!fd.tribe?.trim()) missing.push('Название трайба');
  if (fd.clusters.length === 0) missing.push('Кластеры');
  if (!fd.tribeResponsible?.trim()) missing.push('Ответственный от трайба');
  if (!fd.contractorResponsible?.trim()) missing.push('Ответственный от подрядчика');
  if (!fd.contractor?.trim()) missing.push('Подрядчик');
  if (fd.contracts.length === 0) missing.push('Договор');
  else {
    fd.contracts.forEach((c, i) => {
      if (!c.contractNumber?.trim()) missing.push(`Договор ${i + 1}: номер`);
      if (!c.contractDate) missing.push(`Договор ${i + 1}: дата`);
    });
  }
  if (fd.specificationItems.length === 0) missing.push('Предметы спецификации');
  else {
    fd.specificationItems.forEach((si, i) => {
      if (!si.subject?.trim()) missing.push(`Предмет ${i + 1}: описание`);
      if (!si.ci?.trim()) missing.push(`Предмет ${i + 1}: CI`);
      if (si.stages.length === 0) missing.push(`Предмет ${i + 1}: этапы`);
      else {
        si.stages.forEach((st, j) => {
          if (!st.stage?.trim()) missing.push(`Этап ${j + 1}: номер`);
          if (!st.stageCost?.trim()) missing.push(`Этап ${j + 1}: стоимость`);
          if (!st.stageStartDate) missing.push(`Этап ${j + 1}: дата начала`);
          if (!st.stageEndDate) missing.push(`Этап ${j + 1}: дата окончания`);
          if (st.functionalRequirements.length === 0)
            missing.push(`Этап ${j + 1}: функциональные требования`);
          if (st.employees.length === 0) missing.push(`Этап ${j + 1}: сотрудники`);
          else {
            st.employees.forEach((e, k) => {
              if (!e.stageFio?.trim()) missing.push(`Сотрудник ${k + 1}: ФИО`);
              if (!e.role?.trim()) missing.push(`Сотрудник ${k + 1}: роль`);
            });
          }
        });
      }
    });
  }

  const totalFields = 15 + fd.specificationItems.length * 8;
  const pct = Math.max(0, Math.round(((totalFields - missing.length) / totalFields) * 100));
  return { pct, missing };
}

function validateDates(fd: FormData): string[] {
  const issues: string[] = [];
  fd.specificationItems.forEach((si, i) => {
    si.stages.forEach((st, j) => {
      if (st.stageStartDate && st.stageEndDate) {
        const start = new Date(st.stageStartDate);
        const end = new Date(st.stageEndDate);
        if (start > end) {
          issues.push(`Предмет ${i + 1}, Этап ${j + 1}: дата начала позже даты окончания`);
        }
      }
      st.employees.forEach((e, k) => {
        if (e.workStartDate && e.workEndDate) {
          const start = new Date(e.workStartDate);
          const end = new Date(e.workEndDate);
          if (start > end) {
            issues.push(
              `Предмет ${i + 1}, Этап ${j + 1}, Сотрудник ${k + 1}: даты работ некорректны`
            );
          }
        }
      });
    });
  });
  return issues;
}

function validateCosts(fd: FormData): string[] {
  const issues: string[] = [];
  fd.specificationItems.forEach((si, i) => {
    si.stages.forEach((st, j) => {
      const cost = parseFloat(st.stageCost);
      if (!isNaN(cost) && cost <= 0) {
        issues.push(`Предмет ${i + 1}, Этап ${j + 1}: стоимость должна быть больше 0`);
      }
      st.employees.forEach((e, k) => {
        const rate = parseFloat(e.rateWithTax);
        const hours = parseInt(e.hoursPerStage);
        if (!isNaN(rate) && rate <= 0)
          issues.push(
            `Предмет ${i + 1}, Этап ${j + 1}, Сотрудник ${k + 1}: ставка должна быть > 0`
          );
        if (!isNaN(hours) && hours <= 0)
          issues.push(
            `Предмет ${i + 1}, Этап ${j + 1}, Сотрудник ${k + 1}: часы должны быть > 0`
          );
      });
    });
  });
  return issues;
}

// Keywords → intents
const INTENTS: Array<{ patterns: RegExp[]; handler: (ctx: BotContext, msg: string) => string }> = [
  {
    patterns: [/привет|здравствуй|добрый|хай|hi\b|hello/i],
    handler: (ctx) =>
      `Привет! 👋 Я AI Ассистент, помогаю с заполнением спецификации. Вот что я умею:\n\n` +
      `• **@bot проверь** — анализ заполненности формы\n` +
      `• **@bot ошибки** — поиск ошибок и несоответствий\n` +
      `• **@bot статус** — краткий отчёт о прогрессе\n` +
      `• **@bot подскажи [шаг]** — подсказка по текущему шагу\n` +
      `• **@bot флаги** — обзор активных флагов\n` +
      `• **@bot помощь** — список команд\n\n` +
      `Сейчас вы на шаге ${ctx.currentStep + 1}: **${ctx.steps[ctx.currentStep]}**`,
  },
  {
    patterns: [/помощь|команды|что умеешь|help/i],
    handler: () =>
      `📋 **Мои команды:**\n\n` +
      `\`@bot привет\` — приветствие\n` +
      `\`@bot проверь\` — полная проверка формы\n` +
      `\`@bot ошибки\` — только ошибки\n` +
      `\`@bot статус\` — прогресс заполнения\n` +
      `\`@bot подскажи\` — подсказка по текущему шагу\n` +
      `\`@bot флаги\` — активные флаги\n` +
      `\`@bot договор\` — проверка договора\n` +
      `\`@bot сотрудники\` — проверка сотрудников\n\n` +
      `Пишите мне через **@bot** в начале сообщения!`,
  },
  {
    patterns: [/статус|прогресс|сколько|процент/i],
    handler: (ctx) => {
      const { pct, missing } = getFormCompleteness(ctx.formData);
      const fd = ctx.formData;
      const bar = '█'.repeat(Math.round(pct / 10)) + '░'.repeat(10 - Math.round(pct / 10));
      return (
        `📊 **Статус заполнения формы**\n\n` +
        `Прогресс: ${bar} ${pct}%\n\n` +
        `📌 Статистика:\n` +
        `• Кластеров: ${fd.clusters.length}\n` +
        `• Договоров: ${fd.contracts.length}\n` +
        `• Предметов спецификации: ${fd.specificationItems.length}\n` +
        `• Этапов: ${fd.specificationItems.reduce((a, s) => a + s.stages.length, 0)}\n` +
        `• Сотрудников: ${fd.specificationItems.reduce(
          (a, s) => a + s.stages.reduce((b, st) => b + st.employees.length, 0),
          0
        )}\n\n` +
        (missing.length > 0
          ? `⚠️ Незаполнено полей: ${missing.length}`
          : `✅ Все обязательные поля заполнены!`)
      );
    },
  },
  {
    patterns: [/проверь|проверка|анализ|analyze|check/i],
    handler: (ctx) => {
      const { pct, missing } = getFormCompleteness(ctx.formData);
      const dateIssues = validateDates(ctx.formData);
      const costIssues = validateCosts(ctx.formData);
      const allIssues = [...missing.map(m => `• Не заполнено: ${m}`), ...dateIssues.map(d => `• 📅 ${d}`), ...costIssues.map(c => `• 💰 ${c}`)];

      if (allIssues.length === 0) {
        return `✅ **Форма заполнена корректно!**\n\nПрогресс: ${pct}%\nВсе обязательные поля заполнены, даты и суммы корректны. Можно отправлять на согласование! 🎉`;
      }

      const preview = allIssues.slice(0, 8);
      const extra = allIssues.length - preview.length;
      return (
        `🔍 **Результаты проверки** (заполнено ${pct}%)\n\n` +
        `Найдено проблем: **${allIssues.length}**\n\n` +
        preview.join('\n') +
        (extra > 0 ? `\n...и ещё ${extra} проблем` : '') +
        `\n\nИспользуйте 🚩 флаги чтобы отметить проблемные поля для коллеги.`
      );
    },
  },
  {
    patterns: [/ошибк|проблем|issue|error|incorrect/i],
    handler: (ctx) => {
      const dateIssues = validateDates(ctx.formData);
      const costIssues = validateCosts(ctx.formData);
      const allIssues = [...dateIssues, ...costIssues];

      if (allIssues.length === 0) {
        return `✅ **Логических ошибок не найдено!**\n\nДаты корректны, суммы положительны. Форма выглядит хорошо!`;
      }

      return (
        `⚠️ **Найдены проблемы:**\n\n` +
        allIssues.map(i => `• ${i}`).join('\n') +
        `\n\nПожалуйста, исправьте перед отправкой.`
      );
    },
  },
  {
    patterns: [/подскажи|подсказка|как заполн|что делать|текущ/i],
    handler: (ctx) => {
      const hints: Record<number, string> = {
        0:
          `**Jira ссылка** 🔗\n\n` +
          `Укажите ссылку на задачу в формате:\n` +
          `\`https://jira.company.com/browse/PROJECT-123\`\n\n` +
          `Это поможет связать спецификацию с задачей и автоматически заполнить часть данных.`,
        1:
          `**Трайб и кластеры** 🏢\n\n` +
          `• **Трайб** — название организационной единицы (например, "SberNBA")\n` +
          `• **Кластер** — группа продуктов. Заполните:\n` +
          `  - Название продукта ЕК\n` +
          `  - Код продукта ЕК (формат: 9900EKXXXXXX)\n` +
          `  - Стратегическую тему (например, "#ДАННЫЕ_")`,
        2:
          `**Ответственные** 👥\n\n` +
          `Укажите ФИО в формате "Фамилия Имя Отчество":\n` +
          `• Ответственный от трайба — представитель заказчика\n` +
          `• Подрядчик — полное юридическое название компании\n` +
          `• Ответственный от подрядчика — ФИО контактного лица`,
        3:
          `**Договор** 📄\n\n` +
          `• Номер договора — числовой идентификатор (например, "5066854")\n` +
          `• Дата — дата заключения договора\n\n` +
          `Если договоров несколько, добавьте каждый отдельно.`,
        4:
          `**Предметы спецификации** 📋\n\n` +
          `• **Предмет** — полное название ПО/системы (обычно длинное описание)\n` +
          `• **CI** — числовой идентификатор функциональной платформы\n\n` +
          `К каждому предмету можно добавить этапы.`,
        5:
          `**Этапы** 📅\n\n` +
          `• **Номер этапа** — просто "1", "2", "3" и т.д.\n` +
          `• **Стоимость с НДС** — в тысячах рублей\n` +
          `• **Даты** — начало и конец этапа\n\n` +
          `⚠️ Дата начала должна быть раньше даты окончания!`,
        6:
          `**Функциональные требования** ✅\n\n` +
          `Описывайте каждое требование отдельно. Формат:\n` +
          `\`PROJECT-XXX Краткое описание задачи\`\n\n` +
          `Рекомендуется делать требования атомарными — одно требование = одна задача.`,
        7:
          `**Сотрудники** 👨‍💼\n\n` +
          `• **ФИО** — полностью, в формате "Фамилия Имя Отчество"\n` +
          `• **Роль** — должность и локация (например, "Главный разработчик Hadoop (Москва)")\n` +
          `• **Ставка с НДС** — в тысячах рублей за день\n` +
          `• **Ч/д по этапу** — количество человеко-дней\n` +
          `• **Проверка** — число для верификации (обычно производное от ставки)`,
      };

      const hint = hints[ctx.currentStep];
      return hint || `Подсказки для шага ${ctx.currentStep + 1} пока нет. Попробуйте \`@bot помощь\`.`;
    },
  },
  {
    patterns: [/флаг|flag|метк|замеч/i],
    handler: (ctx) => {
      const active = ctx.flags.filter(f => !f.resolved);
      const resolved = ctx.flags.filter(f => f.resolved);

      if (ctx.flags.length === 0) {
        return `🏳️ **Флагов нет**\n\nФлаги используются для отметки проблемных полей. Нажмите кнопку 🚩 рядом с полем или в панели "Флаги".`;
      }

      let result = `🚩 **Активные флаги: ${active.length}** (решено: ${resolved.length})\n\n`;
      if (active.length > 0) {
        result += active
          .map(
            f =>
              `${f.type === 'error' ? '🔴' : f.type === 'warning' ? '🟡' : '🔵'} **${f.userName}** · Шаг ${f.stepIndex + 1}: ${f.comment}`
          )
          .join('\n');
      }
      return result;
    },
  },
  {
    patterns: [/договор|контракт|contract/i],
    handler: (ctx) => {
      const fd = ctx.formData;
      if (fd.contracts.length === 0) {
        return `📄 **Договоры не добавлены**\n\nПерейдите на Шаг 4 "Договор" и добавьте хотя бы один договор.`;
      }
      const issues: string[] = [];
      fd.contracts.forEach((c, i) => {
        if (!c.contractNumber?.trim()) issues.push(`Договор ${i + 1}: не указан номер`);
        if (!c.contractDate) issues.push(`Договор ${i + 1}: не указана дата`);
      });

      if (issues.length === 0) {
        return (
          `✅ **Договоры заполнены корректно**\n\n` +
          fd.contracts
            .map((c, i) => `${i + 1}. №${c.contractNumber} от ${c.contractDate || '—'}`)
            .join('\n')
        );
      }
      return `⚠️ **Проблемы с договорами:**\n\n` + issues.map(i => `• ${i}`).join('\n');
    },
  },
  {
    patterns: [/сотрудник|employee|исполнитель|команд|team/i],
    handler: (ctx) => {
      const fd = ctx.formData;
      const allEmployees = fd.specificationItems.flatMap(si =>
        si.stages.flatMap(st => st.employees)
      );

      if (allEmployees.length === 0) {
        return `👥 **Сотрудники не добавлены**\n\nПерейдите на Шаг 8 "Сотрудники" и добавьте исполнителей к каждому этапу.`;
      }

      const issues: string[] = [];
      allEmployees.forEach(e => {
        if (!e.stageFio?.trim()) issues.push(`Не заполнено ФИО сотрудника`);
        if (!e.role?.trim()) issues.push(`${e.stageFio || 'Сотрудник'}: не указана роль`);
        const rate = parseFloat(e.rateWithTax);
        if (!isNaN(rate) && rate <= 0)
          issues.push(`${e.stageFio || 'Сотрудник'}: ставка должна быть > 0`);
      });

      const roles = [...new Set(allEmployees.map(e => e.role).filter(Boolean))];

      return (
        `👥 **Сотрудников: ${allEmployees.length}**\n\n` +
        `Роли: ${roles.slice(0, 5).join(', ')}${roles.length > 5 ? ` +${roles.length - 5}` : ''}\n\n` +
        (issues.length > 0
          ? `⚠️ Проблемы:\n` + issues.slice(0, 5).map(i => `• ${i}`).join('\n')
          : `✅ Все сотрудники заполнены корректно`)
      );
    },
  },
];

// Fallback unknown intent
const FALLBACK_RESPONSES = [
  `Не совсем понял вопрос 🤔 Попробуйте:\n• \`@bot проверь\` — проверка формы\n• \`@bot статус\` — прогресс\n• \`@bot помощь\` — все команды`,
  `Хм, не распознал команду. Напишите \`@bot помощь\` чтобы увидеть что я умею!`,
  `Не уверен, что имелось в виду. Попробуйте \`@bot проверь\` для анализа формы или \`@bot подскажи\` для помощи по текущему шагу.`,
];

export function processUserMessage(userText: string, ctx: BotContext): string | null {
  // Must contain @bot
  const botMention = /@bot\b/i;
  if (!botMention.test(userText)) return null;

  // Extract the part after @bot
  const query = userText.replace(/@bot\b/gi, '').trim();

  for (const intent of INTENTS) {
    if (intent.patterns.some(p => p.test(query))) {
      return intent.handler(ctx, query);
    }
  }

  // Empty query or no match
  if (!query) {
    return `Привет! 👋 Чем могу помочь? Напишите \`@bot помощь\` чтобы увидеть список команд.`;
  }

  return FALLBACK_RESPONSES[Math.floor(Math.random() * FALLBACK_RESPONSES.length)];
}
