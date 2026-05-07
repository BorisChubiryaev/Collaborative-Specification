import { useState, useEffect } from 'react';
import * as reqStore from '../store/requestStore';
import * as tplStore from '../store/templateStore';
import { SavedTemplate } from '../store/templateStore';
import TemplateManagerModal from './TemplateManagerModal';
import { FormData, StaffingRequirement } from '../types';

interface Props {
  userName: string;
  userColor: string;
  onEnterSession: (sessionId: string, requestId: string, initialFormData?: FormData) => void;
}

const EMPTY_FORM: FormData = {
  jiraLink: '',
  tribe: '',
  tribeResponsible: '',
  contractor: '',
  contractorResponsible: '',
  nonFunctionalRequirements: '',
  clusters: [],
  contracts: [],
  specificationItems: [],
};

export default function ClientDashboard({ userName, userColor, onEnterSession }: Props) {
  const [title, setTitle] = useState('');
  const [staffing, setStaffing] = useState<StaffingRequirement[]>([
    { role: 'Разработчик', junior: 0, middle: 0, senior: 0 }
  ]);
  const [competencies, setCompetencies] = useState('');
  const [deadline, setDeadline] = useState('');
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<SavedTemplate | null>(null);
  const [templates, setTemplates] = useState<SavedTemplate[]>([]);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'new' | 'history'>('new');

  const existingRequests = reqStore.getRequests().filter(r => r.createdBy === userName);

  useEffect(() => {
    // Load demo templates if none exist
    tplStore.loadDemoTemplates(userName);
    setTemplates(tplStore.getTemplates());
  }, [userName]);

  const handleCreate = () => {
    if (!title.trim() || !competencies.trim() || !deadline) return;
    setCreating(true);
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const req = reqStore.createRequest({
      title: title.trim(),
      staffing,
      competencies: competencies.trim(),
      deadline,
      createdBy: userName,
      createdByColor: userColor,
      status: 'open',
      sessionId,
    });

    const ch = reqStore.createChannel();
    reqStore.broadcast(ch, { type: 'NEW_REQUEST', req });
    ch?.close();

    setCreated(true);
    setCreating(false);

    const formDataToUse = selectedTemplate ? selectedTemplate.formData : EMPTY_FORM;
    setTimeout(() => {
      onEnterSession(sessionId, req.id, formDataToUse);
    }, 1400);
  };

  const handleLoadTemplateIntoNewRequest = (formData: FormData) => {
    const tpl = templates.find(t => t.formData === formData) || templates.find(t => JSON.stringify(t.formData) === JSON.stringify(formData));
    setSelectedTemplate(tpl || null);
    setShowTemplateModal(false);
  };

  const quickSelectTemplate = (tpl: SavedTemplate) => {
    setSelectedTemplate(prev => prev?.id === tpl.id ? null : tpl);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div >
          <div>
            <span className="font-bold text-gray-900 text-sm">Спецификация договора</span>
            <div className="text-xs text-gray-500">Кабинет заказчика</div >
          </div >
        </div >
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm" style={{ backgroundColor: userColor }}>
            {userName[0]}
          </div >
          <span className="text-sm font-medium text-gray-700 hidden sm:block">{userName}</span >
          <span className="text-xs bg-blue-100 text-blue-700 rounded-full px-2 py-0.5 font-medium">Заказчик</span >
        </div >
      </div >

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        {/* Welcome */}
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">
            Добро пожаловать, {userName.split(' ')[0]}!
          </h1 >
          <p className="text-gray-500 text-sm">
            Создайте заявку на разработку спецификации — менеджер получит уведомление и подключится к работе
          </p >
        </div >

        {/* Tabs */}
        <div className="flex border-b border-gray-200 mb-6">
          <button
            onClick={() => setActiveTab('new')}
            className={`py-2.5 px-1 mr-6 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'new' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Новая заявка
          </button >
          <button
            onClick={() => setActiveTab('history')}
            className={`py-2.5 px-1 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'history' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            История заявок
            {existingRequests.length > 0 && (
              <span className="ml-2 bg-gray-100 text-gray-600 rounded-full text-xs px-1.5 py-0.5">{existingRequests.length}</span>
            )}
          </button >
        </div >

        {/* TAB: New request */}
        {activeTab === 'new' && (
          <div className="space-y-4">
            {/* Template selector */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
                    <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6z" />
                    </svg>
                  </div >
                  <div>
                    <h3 className="font-semibold text-gray-800 text-sm">Шаблон формы</h3 >
                    <p className="text-xs text-gray-400">Начните с готового шаблона или заполните с нуля</p >
                  </div >
                </div >
                <button
                  onClick={() => setShowTemplateModal(true)}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg >
                  Управление
                </button >
              </div >

              {/* Quick template list */}
              <div className="space-y-2">
                {/* Empty option */}
                <button
                  onClick={() => setSelectedTemplate(null)}
                  className={`w-full text-left px-3 py-2.5 rounded-xl border-2 text-sm transition-all ${
                    !selectedTemplate
                      ? 'border-blue-400 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${!selectedTemplate ? 'border-blue-500 bg-blue-500' : 'border-gray-300'}`}>
                      {!selectedTemplate && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                    </div >
                    <div>
                      <span className="font-medium text-gray-700">Начать с нуля</span >
                      <span className="ml-2 text-xs text-gray-400">Пустая форма</span >
                    </div >
                  </div >
                </button >

                {templates.map(tpl => (
                  <button
                    key={tpl.id}
                    onClick={() => quickSelectTemplate(tpl)}
                    className={`w-full text-left px-3 py-2.5 rounded-xl border-2 text-sm transition-all ${
                      selectedTemplate?.id === tpl.id
                        ? 'border-indigo-400 bg-indigo-50'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${selectedTemplate?.id === tpl.id ? 'border-indigo-500 bg-indigo-500' : 'border-gray-300'}`}>
                        {selectedTemplate?.id === tpl.id && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                      </div >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-700 truncate">{tpl.name}</span>
                          {tpl.usageCount > 0 && (
                            <span className="text-xs text-gray-400 flex-shrink-0">×{tpl.usageCount}</span>
                          )}
                        </div >
                        {tpl.description && (
                          <p className="text-xs text-gray-400 truncate">{tpl.description}</p >
                        )}
                      </div >
                      <div className="flex gap-1 flex-shrink-0">
                        {tpl.tags.slice(0, 2).map(tag => (
                          <span key={tag} className="text-xs bg-gray-100 text-gray-500 rounded px-1 py-0.5">{tag}</span>
                        ))}
                      </div >
                    </div >
                  </button >
                ))}
              </div >

              {selectedTemplate && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <div className="flex items-center gap-2 text-xs text-indigo-600 bg-indigo-50 rounded-lg px-3 py-2">
                    <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg >
                    Форма будет предзаполнена данными из «{selectedTemplate.name}»
                  </div >
                </div >
              )}
            </div >

            {/* Create form */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg >
                </div >
                <div>
                  <h2 className="font-bold text-gray-900 text-sm">Детали заявки</h2 >
                  <p className="text-xs text-gray-400">Параметры подбора команды</p >
                </div >
              </div >

              {created ? (
                <div className="text-center py-8">
                  <div className="w-14 h-14 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <svg className="w-7 h-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg >
                  </div >
                  <h3 className="text-lg font-bold text-gray-900 mb-1">Заявка создана!</h3 >
                  <p className="text-gray-500 text-sm mb-4">Менеджер получил уведомление. Переход в рабочую сессию...</p >
                  <div className="flex justify-center gap-1">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div >
                </div >
              ) : (
                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Название заявки *</label>
                    <input
                      type="text"
                      value={title}
                      onChange={e => setTitle(e.target.value)}
                      placeholder="Например: Спецификация к договору №5066854"
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div >

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="block text-sm font-medium text-gray-700">Количество сотрудников</label>
                      <button
                        onClick={() => setStaffing([...staffing, { role: '', junior: 0, middle: 0, senior: 0 }])}
                        className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg >
                        Добавить роль
                      </button >
                    </div >
                    
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead >
                          <tr className="text-gray-500 text-[10px] uppercase tracking-wider">
                            <th className="pb-2 pl-1 font-medium">Роль</th >
                            <th className="pb-2 text-center font-medium">Junior</th >
                            <th className="pb-2 text-center font-medium">Middle</th >
                            <th className="pb-2 text-center font-medium">Senior</th >
                            <th className="pb-2 text-right pr-1 font-medium"></th >
                          </tr >
                        </thead >
                        <tbody className="divide-y divide-gray-100">
                          {staffing.map((item, idx) => (
                            <tr key={idx} className="group">
                              <td className="py-2 pr-2">
                                <input
                                  type="text"
                                  value={item.role}
                                  onChange={e => {
                                    const newStaffing = [...staffing];
                                    newStaffing[idx].role = e.target.value;
                                    setStaffing(newStaffing);
                                  }}
                                  placeholder="Роль"
                                  className="w-full bg-transparent border-none p-0 text-sm focus:ring-0 focus:outline-none"
                                />
                              </td >
                              <td className="py-2 px-1">
                                <input
                                  type="number"
                                  min="0"
                                  value={item.junior}
                                  onChange={e => {
                                    const newStaffing = [...staffing];
                                    newStaffing[idx].junior = parseInt(e.target.value) || 0;
                                    setStaffing(newStaffing);
                                  }}
                                  className="w-full text-center bg-gray-50 rounded py-1 text-xs border-none focus:ring-1 focus:ring-blue-500"
                                />
                              </td >
                              <td className="py-2 px-1">
                                <input
                                  type="number"
                                  min="0"
                                  value={item.middle}
                                  onChange={e => {
                                    const newStaffing = [...staffing];
                                    newStaffing[idx].middle = parseInt(e.target.value) || 0;
                                    setStaffing(newStaffing);
                                  }}
                                  className="w-full text-center bg-gray-50 rounded py-1 text-xs border-none focus:ring-1 focus:ring-blue-500"
                                />
                              </td >
                              <td className="py-2 px-1">
                                <input
                                  type="number"
                                  min="0"
                                  value={item.senior}
                                  onChange={e => {
                                    const newStaffing = [...staffing];
                                    newStaffing[idx].senior = parseInt(e.target.value) || 0;
                                    setStaffing(newStaffing);
                                  }}
                                  className="w-full text-center bg-gray-50 rounded py-1 text-xs border-none focus:ring-1 focus:ring-blue-500"
                                />
                              </td >
                              <td className="py-2 text-right pr-1">
                                {staffing.length > 1 && (
                                  <button
                                    onClick={() => setStaffing(staffing.filter((_, i) => i !== idx))}
                                    className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg >
                                  </button >
                                )}
                              </td >
                            </tr >
                          ))}
                        </tbody>
                      </table >
                    </div >
                  </div >

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Компетенции *</label>
                    <textarea
                      value={competencies}
                      onChange={e => setCompetencies(e.target.value)}
                      placeholder="Перечислите ключевые навыки и знания (например: React, Node.js, SQL...)"
                      rows={3}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none"
                    />
                  </div >

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Срок выполнения *</label>
                    <input
                      type="date"
                      value={deadline}
                      onChange={e => setDeadline(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div >

                  <div className="bg-blue-50 rounded-xl p-3 border border-blue-100">
                    <div className="flex items-start gap-2">
                      <svg className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg >
                      <div className="text-xs text-blue-700">
                        <p className="font-semibold mb-0.5">После создания заявки:</p>
                        <ul className="space-y-0.5 list-disc list-inside">
                          <li>Вы сразу перейдёте к заполнению формы{selectedTemplate ? ` (с шаблоном «${selectedTemplate.name}»)` : ''}</li>
                          <li>Менеджер получит уведомление в реальном времени</li>
                          <li>Доступен AI-ассистент (@bot) и чат для совместной работы</li>
                        </ul >
                      </div >
                    </div >
                  </div >

                  <button
                    onClick={handleCreate}
                    disabled={!title.trim() || !competencies.trim() || !deadline || creating}
                    className="w-full py-3 rounded-xl font-semibold text-sm text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-blue-600 hover:bg-blue-700 hover:shadow-lg flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg >
                    {selectedTemplate ? `Создать заявку с шаблоном` : 'Создать заявку'}
                  </button >
                </div >
              )}
            </div >
          </div >
        )}

        {/* TAB: History */}
        {activeTab === 'history' && (
          <div >
            {existingRequests.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-2xl border border-gray-100 shadow-sm">
                <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <svg className="w-7 h-7 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg >
                </div >
                <h3 className="font-semibold text-gray-700 mb-1">Заявок пока нет</h3>
                <p className="text-sm text-gray-400 mb-4">Создайте первую заявку во вкладке «Новая заявка»</p >
                <button
                  onClick={() => setActiveTab('new')}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700"
                >
                  Создать заявку
                </button >
              </div >
            ) : (
              <div className="space-y-3">
                {existingRequests.slice().reverse().map(req => (
                  <div key={req.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 hover:border-blue-200 transition-colors">
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <div className="font-semibold text-gray-900 text-sm mb-0.5 truncate">{req.title}</div>
                        {req.description && (
                          <p className="text-xs text-gray-400 truncate mb-1">{req.description}</p>
                        )}
                        <div className="text-xs text-gray-400">
                          {new Date(req.createdAt).toLocaleDateString('ru-RU', {
                            day: '2-digit', month: 'short', year: 'numeric',
                            hour: '2-digit', minute: '2-digit',
                          })}
                          {req.managerName && (
                            <span className="ml-2 text-purple-500">· Менеджер: {req.managerName}</span>
                          )}
                        </div >
                      </div >
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          req.status === 'open' ? 'bg-yellow-100 text-yellow-700' :
                          req.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                          'bg-green-100 text-green-700'
                        }`}>
                          {req.status === 'open' ? '⏳ Ожидает' : req.status === 'in_progress' ? '🔵 В работе' : '✅ Завершена'}
                        </span >
                        <button
                          onClick={() => onEnterSession(req.sessionId, req.id)}
                          className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 transition-colors"
                        >
                          Открыть →
                        </button >
                      </div >
                    </div >
                  </div >
                ))}
              </div >
            )}
          </div >
        )}
      </div >

      {/* Template Manager Modal */}
      <TemplateManagerModal
        open={showTemplateModal}
        onClose={() => { setShowTemplateModal(false); setTemplates(tplStore.getTemplates()); }}
        currentFormData={EMPTY_FORM}
        userName={userName}
        onLoadTemplate={handleLoadTemplateIntoNewRequest}
      />
    </div >
  );
}
