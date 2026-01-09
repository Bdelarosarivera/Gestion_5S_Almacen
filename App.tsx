
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
  Loader2,
  ListChecks
} from 'lucide-react';

const DEFAULT_CONFIG: AppConfig = {
  questions: QUESTIONS,
  areas: AREAS,
  responsables: AREA_MAPPING.map(am => ({ name: am.responsable, area: am.area }))
};

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>('home');
  const [records, setRecords] = useState<AuditRecord[]>([]);
  const [actions, setActions] = useState<ActionItem[]>([]);
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG);
  const [editingRecord, setEditingRecord] = useState<AuditRecord | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const loadData = () => {
        try {
            const r = localStorage.getItem('audit_records');
            const a = localStorage.getItem('audit_actions');
            const c = localStorage.getItem('audit_config');
            if (r) setRecords(JSON.parse(r));
            if (a) setActions(JSON.parse(a));
            if (c) setConfig(JSON.parse(c));
        } catch (e) {
            console.error("Fallo al cargar estado local:", e);
        } finally {
            setIsInitializing(false);
        }
    };
    loadData();
  }, []);

  useEffect(() => {
    if (!isInitializing) {
        localStorage.setItem('audit_records', JSON.stringify(records));
        localStorage.setItem('audit_actions', JSON.stringify(actions));
        localStorage.setItem('audit_config', JSON.stringify(config));
    }
  }, [records, actions, config, isInitializing]);

  const handleSaveAudit = useCallback((record: AuditRecord, newActions: ActionItem[]) => {
    if (editingRecord) {
      setRecords(prev => prev.map(r => r.id === record.id ? record : r));
      setEditingRecord(null);
    } else {
      setRecords(prev => [record, ...prev]);
      if (newActions.length > 0) {
        setActions(prev => [...newActions, ...prev]);
      }
    }
    setView('dashboard');
  }, [editingRecord]);

  const generateDemo = () => {
    const demo = config.areas.slice(0, 8).map((area, i) => ({
        id: `demo-${i}-${Date.now()}`,
        area,
        auditor: 'Admin Demo',
        responsable: config.responsables.find(r => r.area === area)?.name || 'N/A',
        date: new Date().toISOString(),
        score: 70 + Math.floor(Math.random() * 25),
        answers: config.questions.map(q => ({ questionId: q.id, rating: Rating.SI }))
    }));
    setRecords(demo);
    setView('dashboard');
  };

  const NavIcon = ({active, onClick, icon: Icon, title}: any) => (
    <button 
      onClick={onClick} 
      title={title}
      className={`p-2.5 rounded-xl transition-all flex flex-col items-center gap-1 ${active ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-gray-500 hover:bg-gray-800 hover:text-gray-300'}`}
    >
        <Icon className="w-5 h-5" />
        <span className="text-[9px] font-bold uppercase tracking-tighter sm:hidden">{title}</span>
    </button>
  );

  if (isInitializing) {
    return (
        <div className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center gap-4">
            <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
            <p className="text-blue-500 font-black tracking-widest text-xs uppercase">Cargando Sistema...</p>
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f172a] text-gray-100 flex flex-col">
      <header className="bg-[#1e293b]/90 backdrop-blur-xl border-b border-gray-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer group" onClick={() => setView('home')}>
            <div className="bg-blue-600 p-2 rounded-lg group-hover:scale-110 transition-transform">
                <ClipboardList className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-black tracking-tighter">Audit<span className="text-blue-500">Check</span></h1>
          </div>
          <nav className="flex items-center gap-1 sm:gap-2">
            <NavIcon active={view === 'home'} onClick={() => setView('home')} icon={Home} title="Inicio" />
            <NavIcon active={view === 'form'} onClick={() => { setEditingRecord(null); setView('form'); }} icon={Plus} title="Auditar" />
            <NavIcon active={view === 'dashboard' || view === 'consolidated'} onClick={() => setView('dashboard')} icon={BarChart} title="Métricas" />
            <NavIcon active={view === 'actions'} onClick={() => setView('actions')} icon={ListChecks} title="Planes" />
            <NavIcon active={view === 'history'} onClick={() => setView('history')} icon={FileText} title="Historial" />
            <NavIcon active={view === 'ai-editor'} onClick={() => setView('ai-editor')} icon={Camera} title="IA" />
            <NavIcon active={view === 'settings'} onClick={() => setView('settings')} icon={Settings} title="Ajustes" />
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 w-full flex-1">
        {view === 'home' && (
          <div className="max-w-xl mx-auto py-12 space-y-8 animate-fade-in">
             <div className="text-center space-y-2">
                <h2 className="text-5xl font-black text-white leading-tight">Gestión Operativa <br/><span className="text-blue-500 underline decoration-blue-500/30">Sin Papel</span></h2>
                <p className="text-gray-500 text-lg">Digitalice sus auditorías 5S y controle su planta en tiempo real.</p>
             </div>
             <div className="grid grid-cols-1 gap-4">
                <button onClick={() => { setEditingRecord(null); setView('form'); }} className="flex items-center justify-between p-8 bg-[#1e293b] border border-green-500/20 rounded-3xl hover:border-green-500/50 hover:bg-[#1e293b]/80 transition-all shadow-xl group">
                    <div className="flex items-center gap-6">
                        <div className="bg-green-600/10 p-4 rounded-2xl group-hover:bg-green-600/20 transition-colors">
                            <Plus className="w-10 h-10 text-green-500" />
                        </div>
                        <div className="text-left">
                            <p className="text-2xl font-black text-white">Nueva Auditoría</p>
                            <p className="text-sm text-gray-500">Iniciar inspección de área ahora</p>
                        </div>
                    </div>
                </button>
                <div className="grid grid-cols-2 gap-4">
                    <button onClick={() => setView('dashboard')} className="p-6 bg-[#1e293b] border border-blue-500/20 rounded-3xl hover:border-blue-500/50 transition-all text-left">
                        <BarChart className="w-8 h-8 text-blue-500 mb-4" />
                        <p className="text-lg font-bold">Indicadores</p>
                        <p className="text-xs text-gray-500">Métricas de planta</p>
                    </button>
                    <button onClick={() => setView('actions')} className="p-6 bg-[#1e293b] border border-amber-500/20 rounded-3xl hover:border-amber-500/50 transition-all text-left">
                        <ListChecks className="w-8 h-8 text-amber-500 mb-4" />
                        <p className="text-lg font-bold">Planes de Acción</p>
                        <p className="text-xs text-gray-500">Hallazgos y tareas</p>
                    </button>
                </div>
             </div>
          </div>
        )}
        {view === 'form' && <AuditForm initialData={editingRecord} config={config} onSave={handleSaveAudit} onCancel={() => setView('home')} />}
        {view === 'dashboard' && <Dashboard records={records} actions={actions} onViewConsolidated={() => setView('consolidated')} onViewActions={() => setView('actions')} onGenerateDemo={generateDemo} />}
        {view === 'history' && <History records={records} actions={actions} onEdit={(r) => { setEditingRecord(r); setView('form'); }} onDelete={(id) => setRecords(prev => prev.filter(r => r.id !== id))} />}
        {view === 'consolidated' && <ConsolidatedView records={records} onBack={() => setView('dashboard')} />}
        {view === 'actions' && <ActionPlanView actions={actions} onUpdateAction={(ua) => setActions(prev => prev.map(a => a.id === ua.id ? ua : a))} />}
        {view === 'settings' && <SettingsView config={config} onUpdateConfig={setConfig} />}
        {view === 'ai-editor' && <AIEditor />}
      </main>

      <footer className="max-w-7xl mx-auto px-4 py-8 border-t border-gray-800 w-full opacity-30 text-center">
        <p className="text-[10px] font-bold tracking-widest uppercase">AuditCheck Pro v2.5 - Acceso Rápido Habilitado</p>
      </footer>
    </div>
  );
};

export default App;
