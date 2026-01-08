import React, { useState, useEffect, useCallback } from 'react';
import { ViewState, AuditRecord, ActionItem, AppConfig, Rating } from './types';
import { QUESTIONS, AREA_MAPPING, AREAS } from './constants';
import { AuditForm } from './components/AuditForm';
import { Dashboard } from './components/Dashboard';
import { History } from './components/History';
import { AIEditor } from './components/AIEditor';
import { ConsolidatedView } from './components/ConsolidatedView';
import { ActionPlanView } from './components/ActionPlanView';
import { SettingsView } from './components/SettingsView';
import {
  ClipboardList,
  Plus,
  FileText,
  BarChart,
  Settings,
  Home,
  Camera,
  Loader2
} from 'lucide-react';

const DEFAULT_CONFIG: AppConfig = {
  questions: QUESTIONS,
  areas: AREAS,
  responsables: AREA_MAPPING.map(am => ({
    name: am.responsable,
    area: am.area
  }))
};

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>('home');
  const [records, setRecords] = useState<AuditRecord[]>([]);
  const [actions, setActions] = useState<ActionItem[]>([]);
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG);
  const [editingRecord, setEditingRecord] = useState<AuditRecord | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  /* ===========================
     CARGA INICIAL
  ============================ */
  useEffect(() => {
    try {
      const r = localStorage.getItem('audit_records');
      const a = localStorage.getItem('audit_actions');
      const c = localStorage.getItem('audit_config');

      if (r) setRecords(JSON.parse(r));
      if (a) setActions(JSON.parse(a));
      if (c) setConfig(JSON.parse(c));
    } catch (err) {
      console.error('Error cargando datos locales:', err);
    } finally {
      setIsInitializing(false);
    }
  }, []);

  /* ===========================
     PERSISTENCIA
  ============================ */
  useEffect(() => {
    if (isInitializing) return;
    localStorage.setItem('audit_records', JSON.stringify(records));
    localStorage.setItem('audit_actions', JSON.stringify(actions));
    localStorage.setItem('audit_config', JSON.stringify(config));
  }, [records, actions, config, isInitializing]);

  /* ===========================
     GUARDAR AUDITORÍA
  ============================ */
  const handleSaveAudit = useCallback(
    (record: AuditRecord, newActions: ActionItem[]) => {
      setRecords(prev =>
        editingRecord
          ? prev.map(r => (r.id === record.id ? record : r))
          : [record, ...prev]
      );

      if (!editingRecord && newActions.length > 0) {
        setActions(prev => [...newActions, ...prev]);
      }

      setEditingRecord(null);
      setView('dashboard'); // 🔥 SIN DELAYS
    },
    [editingRecord]
  );

  /* ===========================
     DEMO
  ============================ */
  const generateDemo = () => {
    const demo: AuditRecord[] = config.areas.slice(0, 10).map((area, i) => ({
      id: `demo-${i}-${Date.now()}`,
      area,
      auditor: 'Admin Demo',
      responsable:
        config.responsables.find(r => r.area === area)?.name || 'N/A',
      date: new Date().toISOString(),
      score: 60 + Math.floor(Math.random() * 35),
      answers: config.questions.map(q => ({
        questionId: q.id,
        rating: Rating.SI
      }))
    }));

    setRecords(demo);
    setView('dashboard');
  };

  /* ===========================
     NAV ICON
  ============================ */
  const NavIcon = ({ active, onClick, icon: Icon, title }: any) => (
    <button
      onClick={onClick}
      title={title}
      className={`p-2.5 rounded-xl transition-all flex flex-col items-center gap-1 ${
        active
          ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
          : 'text-gray-500 hover:bg-gray-800 hover:text-gray-300'
      }`}
    >
      <Icon className="w-5 h-5" />
      <span className="text-[9px] font-bold uppercase sm:hidden">{title}</span>
    </button>
  );

  /* ===========================
     LOADING
  ============================ */
  if (isInitializing) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
        <p className="text-blue-500 font-black tracking-widest text-xs uppercase">
          Inicializando sistema...
        </p>
      </div>
    );
  }

  /* ===========================
     UI
  ============================ */
  return (
    <div className="min-h-screen bg-[#0f172a] text-gray-100 flex flex-col">
      <header className="bg-[#1e293b]/90 backdrop-blur-xl border-b border-gray-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div
            className="flex items-center gap-3 cursor-pointer"
            onClick={() => setView('home')}
          >
            <div className="bg-blue-600 p-2 rounded-lg">
              <ClipboardList className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-black">
              Audit<span className="text-blue-500">Check</span>
            </h1>
          </div>

          <nav className="flex items-center gap-2">
            <NavIcon active={view === 'home'} onClick={() => setView('home')} icon={Home} title="Inicio" />
            <NavIcon active={view === 'form'} onClick={() => { setEditingRecord(null); setView('form'); }} icon={Plus} title="Auditar" />
            <NavIcon active={view === 'dashboard'} onClick={() => setView('dashboard')} icon={BarChart} title="Métricas" />
            <NavIcon active={view === 'history'} onClick={() => setView('history')} icon={FileText} title="Historial" />
            <NavIcon active={view === 'ai-editor'} onClick={() => setView('ai-editor')} icon={Camera} title="IA" />
            <NavIcon active={view === 'settings'} onClick={() => setView('settings')} icon={Settings} title="Ajustes" />
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 w-full flex-1">
        {view === 'form' && (
          <AuditForm
            initialData={editingRecord}
            config={config}
            onSave={handleSaveAudit}
            onCancel={() => setView('home')}
          />
        )}

        {view === 'dashboard' && (
          <Dashboard
            key={records.length} // 🔥 CLAVE DEL FIX
            records={records}
            actions={actions}
            onViewConsolidated={() => setView('consolidated')}
            onViewActions={() => setView('actions')}
            onGenerateDemo={generateDemo}
          />
        )}

        {view === 'history' && (
          <History
            records={records}
            actions={actions}
            onEdit={r => {
              setEditingRecord(r);
              setView('form');
            }}
            onDelete={id =>
              setRecords(prev => prev.filter(r => r.id !== id))
            }
          />
        )}

        {view === 'consolidated' && (
          <ConsolidatedView
            records={records}
            onBack={() => setView('dashboard')}
          />
        )}

        {view === 'actions' && (
          <ActionPlanView
            actions={actions}
            onUpdateAction={ua =>
              setActions(prev =>
                prev.map(a => (a.id === ua.id ? ua : a))
              )
            }
          />
        )}

        {view === 'settings' && (
          <SettingsView config={config} onUpdateConfig={setConfig} />
        )}

        {view === 'ai-editor' && <AIEditor />}
      </main>

      <footer className="border-t border-gray-800 py-6 text-center text-[10px] opacity-40">
        AuditCheck Pro v2.1 — Estabilidad reforzada
      </footer>
    </div>
  );
};

export default App;
