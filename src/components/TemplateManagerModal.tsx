import { useState, useEffect } from 'react';
import { FormData } from '../types';
import * as tplStore from '../store/templateStore';
import { SavedTemplate } from '../store/templateStore';

interface Props {
  open: boolean;
  onClose: () => void;
  currentFormData: FormData;
  userName: string;
  onLoadTemplate: (formData: FormData) => void;
}

const TAG_COLORS: Record<string, string> = {
  SberNBA: 'bg-green-100 text-green-700',
  Данные: 'bg-blue-100 text-blue-700',
  Hadoop: 'bg-purple-100 text-purple-700',
  Базовый: 'bg-gray-100 text-gray-600',
  НФТ: 'bg-orange-100 text-orange-700',
};

export default function TemplateManagerModal({ open, onClose, currentFormData, userName, onLoadTemplate }: Props) {
  const [templates, setTemplates] = useState<SavedTemplate[]>([]);
  const [tab, setTab] = useState<'my' | 'save'>('my');
  const [saveName, setSaveName] = useState('');
  const [saveDesc, setSaveDesc] = useState('');
  const [saveTags, setSaveTags] = useState('');
  const [saved, setSaved] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  useEffect(() => {
    if (open) {
      setTemplates(tplStore.getTemplates());
      setSaved(false);
    }
  }, [open]);

  if (!open) return null;

  const handleSave = () => {
    if (!saveName.trim()) return;
    const tags = saveTags
      .split(',')
      .map(t => t.trim())
      .filter(Boolean);
    tplStore.saveTemplate({
      name: saveName.trim(),
      description: saveDesc.trim(),
      createdBy: userName,
      formData: currentFormData,
      tags,
    });
    setTemplates(tplStore.getTemplates());
    setSaved(true);
    setSaveName('');
    setSaveDesc('');
    setSaveTags('');
    setTimeout(() => setSaved(false), 2500);
    setTab('my');
  };

  const handleLoad = (tpl: SavedTemplate) => {
    tplStore.incrementUsage(tpl.id);
    onLoadTemplate(tpl.formData);
    onClose();
  };

  const handleDelete = (id: string) => {
    tplStore.deleteTemplate(id);
    setTemplates(tplStore.getTemplates());
    setDeleteConfirm(null);
  };

  const handleRename = (id: string) => {
    if (!editName.trim()) return;
    tplStore.updateTemplate(id, { name: editName.trim() });
    setTemplates(tplStore.getTemplates());
    setEditingId(null);
  };

  const formatDate = (ts: number) =>
    new Date(ts).toLocaleDateString('ru-RU', { day: '2-digit', month: 'short', year: 'numeric' });

  const myTemplates = templates.filter(t => t.createdBy === userName);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-sm">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
              </svg>
            </div>
            <div>
              <h2 className="font-bold text-gray-900 text-base">Шаблоны форм</h2>
              <p className="text-xs text-gray-400">Сохраняйте и загружайте предзаполненные формы</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 px-6">
          <button
            onClick={() => setTab('my')}
            className={`py-3 px-1 mr-6 text-sm font-medium border-b-2 transition-colors ${
              tab === 'my' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Мои шаблоны
            {myTemplates.length > 0 && (
              <span className="ml-2 bg-indigo-100 text-indigo-600 rounded-full text-xs px-1.5 py-0.5 font-semibold">
                {myTemplates.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setTab('save')}
            className={`py-3 px-1 text-sm font-medium border-b-2 transition-colors ${
              tab === 'save' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Сохранить текущую форму
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* TAB: My Templates */}
          {tab === 'my' && (
            <div>
              {myTemplates.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6z" />
                    </svg>
                  </div>
                  <h3 className="font-semibold text-gray-700 mb-1">Шаблонов пока нет</h3>
                  <p className="text-sm text-gray-400 mb-4">Сохраните текущую форму как шаблон для быстрого повторного использования</p>
                  <button
                    onClick={() => setTab('save')}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Создать шаблон
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {myTemplates.slice().reverse().map(tpl => (
                    <div key={tpl.id} className="border border-gray-200 rounded-xl p-4 hover:border-indigo-200 hover:bg-indigo-50/30 transition-all group">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          {editingId === tpl.id ? (
                            <div className="flex items-center gap-2 mb-2">
                              <input
                                value={editName}
                                onChange={e => setEditName(e.target.value)}
                                className="flex-1 px-2 py-1 text-sm border border-indigo-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                                autoFocus
                                onKeyDown={e => {
                                  if (e.key === 'Enter') handleRename(tpl.id);
                                  if (e.key === 'Escape') setEditingId(null);
                                }}
                              />
                              <button onClick={() => handleRename(tpl.id)} className="text-xs text-indigo-600 hover:text-indigo-800 font-medium">Сохранить</button>
                              <button onClick={() => setEditingId(null)} className="text-xs text-gray-400 hover:text-gray-600">Отмена</button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-semibold text-gray-900 text-sm truncate">{tpl.name}</h4>
                              <button
                                onClick={() => { setEditingId(tpl.id); setEditName(tpl.name); }}
                                className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-600 transition-opacity"
                                title="Переименовать"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                            </div>
                          )}

                          {tpl.description && (
                            <p className="text-xs text-gray-500 mb-2 line-clamp-2">{tpl.description}</p>
                          )}

                          {/* Meta */}
                          <div className="flex flex-wrap items-center gap-2 text-xs text-gray-400">
                            <span>Создан {formatDate(tpl.createdAt)}</span>
                            {tpl.usageCount > 0 && (
                              <span className="flex items-center gap-0.5">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                </svg>
                                Применён {tpl.usageCount} раз
                              </span>
                            )}
                          </div>

                          {/* Tags */}
                          {tpl.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {tpl.tags.map(tag => (
                                <span key={tag} className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${TAG_COLORS[tag] || 'bg-gray-100 text-gray-600'}`}>
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Form summary */}
                          <div className="flex flex-wrap gap-2 mt-2">
                            {tpl.formData.tribe && (
                              <span className="text-xs bg-blue-50 text-blue-600 rounded px-1.5 py-0.5">
                                Трайб: {tpl.formData.tribe}
                              </span>
                            )}
                            {tpl.formData.clusters.length > 0 && (
                              <span className="text-xs bg-purple-50 text-purple-600 rounded px-1.5 py-0.5">
                                {tpl.formData.clusters.length} кластер(ов)
                              </span>
                            )}
                            {tpl.formData.specificationItems.length > 0 && (
                              <span className="text-xs bg-green-50 text-green-600 rounded px-1.5 py-0.5">
                                {tpl.formData.specificationItems.length} предмет(ов)
                              </span>
                            )}
                            {tpl.formData.contracts.length > 0 && (
                              <span className="text-xs bg-orange-50 text-orange-600 rounded px-1.5 py-0.5">
                                Договор №{tpl.formData.contracts[0]?.contractNumber}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col gap-1.5 flex-shrink-0">
                          <button
                            onClick={() => handleLoad(tpl)}
                            className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-medium rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-1"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            Загрузить
                          </button>

                          {deleteConfirm === tpl.id ? (
                            <div className="flex gap-1">
                              <button onClick={() => handleDelete(tpl.id)} className="px-2 py-1 bg-red-600 text-white text-xs rounded-lg hover:bg-red-700">Удалить</button>
                              <button onClick={() => setDeleteConfirm(null)} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-lg hover:bg-gray-200">Нет</button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setDeleteConfirm(tpl.id)}
                              className="px-3 py-1.5 border border-red-200 text-red-500 text-xs font-medium rounded-lg hover:bg-red-50 transition-colors"
                            >
                              Удалить
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB: Save */}
          {tab === 'save' && (
            <div className="space-y-4">
              {saved && (
                <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl p-3 text-green-700 text-sm font-medium">
                  <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Шаблон успешно сохранён!
                </div>
              )}

              {/* Current form preview */}
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Текущая форма (будет сохранена)</p>
                <div className="flex flex-wrap gap-2">
                  {currentFormData.jiraLink && (
                    <span className="text-xs bg-blue-50 text-blue-600 rounded px-2 py-0.5 border border-blue-100">
                      🔗 Jira ссылка заполнена
                    </span>
                  )}
                  {currentFormData.tribe && (
                    <span className="text-xs bg-green-50 text-green-600 rounded px-2 py-0.5 border border-green-100">
                      🏢 Трайб: {currentFormData.tribe}
                    </span>
                  )}
                  {currentFormData.clusters.length > 0 && (
                    <span className="text-xs bg-purple-50 text-purple-600 rounded px-2 py-0.5 border border-purple-100">
                      🗂 {currentFormData.clusters.length} кластер(ов)
                    </span>
                  )}
                  {currentFormData.contracts.length > 0 && (
                    <span className="text-xs bg-orange-50 text-orange-600 rounded px-2 py-0.5 border border-orange-100">
                      📋 {currentFormData.contracts.length} договор(ов)
                    </span>
                  )}
                  {currentFormData.specificationItems.length > 0 && (
                    <span className="text-xs bg-indigo-50 text-indigo-600 rounded px-2 py-0.5 border border-indigo-100">
                      📝 {currentFormData.specificationItems.length} предмет(ов)
                    </span>
                  )}
                  {!currentFormData.tribe && !currentFormData.jiraLink && currentFormData.clusters.length === 0 && (
                    <span className="text-xs text-gray-400">Форма пустая — можно сохранить как заготовку</span>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Название шаблона *</label>
                <input
                  type="text"
                  value={saveName}
                  onChange={e => setSaveName(e.target.value)}
                  placeholder="Например: SberNBA договор Hadoop Q3 2025"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Описание</label>
                <textarea
                  value={saveDesc}
                  onChange={e => setSaveDesc(e.target.value)}
                  placeholder="Для чего этот шаблон, какие особенности..."
                  rows={3}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Теги (через запятую)</label>
                <input
                  type="text"
                  value={saveTags}
                  onChange={e => setSaveTags(e.target.value)}
                  placeholder="SberNBA, Данные, Hadoop..."
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <button
                onClick={handleSave}
                disabled={!saveName.trim()}
                className="w-full py-3 rounded-xl bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                </svg>
                Сохранить как шаблон
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
