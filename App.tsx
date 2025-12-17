import React, { useState, useEffect, useRef } from 'react';
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
  Camera 
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
  const isInitialLoad = useRef(true);

  // Carga inicial
  useEffect(() => {
    const savedRecords = localStorage.getItem('audit_records');
    const savedActions = localStorage.getItem('audit_actions');
    const savedConfig = localStorage.getItem('audit_config');

    if (savedRecords) try { setRecords(JSON.parse(savedRecords)); } catch (e) { console.error(e); }
    if (savedActions) try { setActions(JSON.parse(savedActions)); } catch (e) { console.error(e); }
    if (savedConfig) {
      try { 
        const parsedConfig = JSON.parse(savedConfig);
        // Mezclar con nuevas preguntas si existen
        const existingIds = new Set(parsedConfig.questions.map((q: any) => q.id));
        const questionsToAdd = QUESTIONS.filter(q => !existingIds.has(q.id));
        parsedConfig.questions = [...parsedConfig.questions, ...questionsToAdd];
        setConfig(parsedConfig); 
      } catch (e) { console.error(e); }
    }
    isInitialLoad.current = false;
  }, []);

  // Guardado persistente (solo después de la carga inicial)
  useEffect(() => {
    if (!isInitialLoad.current) {
      localStorage.setItem('audit_records', JSON.stringify(records));
    }
  }, [records]);

  useEffect(() => {
    if (!isInitialLoad.current) {
      localStorage.setItem('audit_actions', JSON.stringify(actions));
    }
  }, [actions]);

  useEffect(() => {
    if (!isInitialLoad.current) {
      localStorage.setItem('audit_config', JSON.stringify(config));
    }
  }, [config]);

  const handleSaveAudit = (record: AuditRecord, newActions: ActionItem[]) => {
    if (editingRecord) {
      setRecords(prev => prev.map(r => r.id === record.id ? record : r));
      setEditingRecord(null);
    } else {
      setRecords(prev => [record, ...prev]);
      setActions(prev => [...newActions, ...prev]);
    }
    setView('dashboard');
  };

  const loadDemoData = () => {
    const demoRecords: AuditRecord[] = config.areas.slice(0, 5).map((area, idx) => ({
        id: `demo-${idx}`,
        area,
        auditor: 'Demo Auditor',
        responsable: config.responsables.find(r => r.area === area)?.name || 'Admin',
        date: new Date().toISOString(),
        score: 70 + Math.floor(Math.random() * 30),
        answers: config.questions.map(q => ({ questionId: q.id, rating: Rating.SI }))
    }));
    setRecords(demoRecords);
    alert("Datos de prueba cargados correctamente.");
  };

  const handleUpdateAction = (updatedAction: ActionItem) => {
    setActions(prev => prev.map(a => a.id === updatedAction.id ? updatedAction : a));
  };

  const handleUpdateConfig = (newConfig: AppConfig) => {
    setConfig(newConfig);
  };

  const handleEdit = (record: AuditRecord) => {
    setEditingRecord(record);
    setView('form');
  };

  const handleDelete = (id: string) => {
    if (confirm("¿Eliminar este registro?")) {
      setRecords(prev => prev.filter(r => r.id !== id));
    }
  };

  const renderContent = () => {
    switch (view) {
      case 'home':
        return (
          <div className="flex flex-col items-center justify-center space-y-8 animate-fade-in py-8 text-center">
            <h2 className="text-4xl font-bold text-blue-400 mb-8 drop-shadow-lg">
              Sistema de Auditoría 5S
            </h2>
            <div className="flex flex-col gap-6 w-full max-w-md px-4">
              <MenuButton label="Nueva Auditoría" onClick={() => { setEditingRecord(null); setView('form'); }} color="green" icon={<Plus className="w-8 h-8" />} />
              <MenuButton label="Lista de Registros" onClick={() => setView('history')} color="blue" icon={<ClipboardList className="w-8 h-8" />} />
              <MenuButton label="Dashboard" onClick={() => setView('dashboard')} color="purple" icon={<BarChart className="w-8 h-8" />} />
              <MenuButton label="Análisis Consolidado" onClick={() => setView('consolidated')} color="orange" icon={<FileText className="w-8 h-8" />} />
            </div>
          </div>
        );
      case 'form':
        return <AuditForm initialData={editingRecord} config={config} onSave={handleSaveAudit} onCancel={() => setView('home')} />;
      case 'dashboard':
        return <Dashboard records={records} actions={actions} onViewConsolidated={() => setView('consolidated')} onViewActions={() => setView('actions')} onGenerateDemo={loadDemoData} />;
      case 'history':
        return <History records={records} actions={actions} onEdit={handleEdit} onDelete={handleDelete} />;
      case 'ai-editor':
        return <AIEditor />;
      case 'consolidated':
        return <ConsolidatedView records={records} onBack={() => setView('home')} />;
      case 'actions':
        return <ActionPlanView actions={actions} onUpdateAction={handleUpdateAction} />;
      case 'settings':
        return <SettingsView config={config} onUpdateConfig={handleUpdateConfig} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#121212] font-sans text-gray-100">
      <header className="bg-[#0f172a] border-b border-gray-800 shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setView('home')}>
            <ClipboardList className="w-6 h-6 text-blue-400" />
            <h1 className="text-lg font-bold hidden sm:block">AuditCheck Pro</h1>
          </div>
          <nav className="flex items-center gap-2">
            <NavIcon active={view === 'home'} onClick={() => setView('home')} icon={<Home className="w-5 h-5" />} title="Inicio" />
            <NavIcon active={view === 'form'} onClick={() => { setEditingRecord(null); setView('form'); }} icon={<Plus className="w-5 h-5" />} title="Nueva" />
            <NavIcon active={view === 'dashboard'} onClick={() => setView('dashboard')} icon={<BarChart className="w-5 h-5" />} title="Dashboard" />
            <NavIcon active={view === 'settings'} onClick={() => setView('settings')} icon={<Settings className="w-5 h-5" />} title="Ajustes" />
            <NavIcon active={view === 'ai-editor'} onClick={() => setView('ai-editor')} icon={<Camera className="w-5 h-5" />} title="IA" />
          </nav>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 py-6">{renderContent()}</main>
    </div>
  );
};

const MenuButton: React.FC<{label: string, onClick: () => void, color: string, icon: React.ReactNode}> = ({label, onClick, color, icon}) => {
    const colors: any = {
        green: 'border-green-500/30 text-green-400 shadow-green-500/10',
        blue: 'border-blue-500/30 text-blue-400 shadow-blue-500/10',
        purple: 'border-purple-500/30 text-purple-400 shadow-purple-500/10',
        orange: 'border-orange-500/30 text-orange-400 shadow-orange-500/10'
    };
    return (
        <button onClick={onClick} className={`flex flex-col items-center justify-center bg-[#1e293b] border p-6 rounded-2xl shadow-xl hover:bg-[#0f172a] transition-all transform hover:-translate-y-1 ${colors[color]}`}>
            {icon}
            <span className="text-lg font-bold mt-2">{label}</span>
        </button>
    );
};

const NavIcon: React.FC<{active: boolean, onClick: () => void, icon: React.ReactNode, title: string}> = ({active, onClick, icon, title}) => (
    <button onClick={onClick} title={title} className={`p-2 rounded-lg transition-colors ${active ? 'bg-blue-600/20 text-blue-400' : 'text-gray-400 hover:bg-gray-800'}`}>
        {icon}
    </button>
);

export default App;
