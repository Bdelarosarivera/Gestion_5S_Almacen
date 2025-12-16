import React, { useState, useEffect } from 'react';
import { ViewState, AuditRecord, ActionItem, AppConfig } from './types';
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
  LayoutDashboard, 
  Plus, 
  FileText, 
  BarChart3, 
  Settings, 
  Home, 
  Camera 
} from 'lucide-react';

// Initial default config based on constants
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

  // Load from local storage
  useEffect(() => {
    const savedRecords = localStorage.getItem('audit_records');
    const savedActions = localStorage.getItem('audit_actions');
    const savedConfig = localStorage.getItem('audit_config');

    if (savedRecords) try { setRecords(JSON.parse(savedRecords)); } catch (e) { console.error(e); }
    if (savedActions) try { setActions(JSON.parse(savedActions)); } catch (e) { console.error(e); }
    if (savedConfig) {
      try { 
        const parsedConfig = JSON.parse(savedConfig);
        const existingIds = new Set(parsedConfig.questions.map((q: any) => q.id));
        const questionsToAdd = QUESTIONS.filter(q => !existingIds.has(q.id));
        if (questionsToAdd.length > 0) {
            parsedConfig.questions = [...parsedConfig.questions, ...questionsToAdd];
        }
        setConfig(parsedConfig); 
      } catch (e) { console.error(e); }
    }
  }, []);

  useEffect(() => { localStorage.setItem('audit_records', JSON.stringify(records)); }, [records]);
  useEffect(() => { localStorage.setItem('audit_actions', JSON.stringify(actions)); }, [actions]);
  useEffect(() => { localStorage.setItem('audit_config', JSON.stringify(config)); }, [config]);

  const handleSaveAudit = (record: AuditRecord, newActions: ActionItem[]) => {
    if (editingRecord) {
      setRecords(prev => prev.map(r => r.id === record.id ? record : r));
      setEditingRecord(null);
    } else {
      setRecords(prev => [record, ...prev]);
      setActions(prev => [...newActions, ...prev]);
      if (newActions.length > 0) {
        alert(`Se han generado ${newActions.length} acciones correctivas automáticamente.`);
      }
    }
    setView('dashboard');
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
    if (confirm("¿Está seguro de eliminar este registro? Esto NO eliminará las acciones generadas.")) {
      setRecords(prev => prev.filter(r => r.id !== id));
    }
  };

  const handleCancelForm = () => {
    setEditingRecord(null);
    setView('home');
  };

  const renderContent = () => {
    switch (view) {
      case 'home':
        return (
          <div className="flex flex-col items-center justify-center space-y-8 animate-fade-in py-8">
            <h2 className="text-4xl font-bold text-blue-400 text-center mb-8 drop-shadow-lg">
              Sistema de Auditoría 5S
            </h2>
            
            <div className="flex flex-col gap-6 w-full max-w-md px-4">
              <button
                onClick={() => { setEditingRecord(null); setView('form'); }}
                className="group relative flex flex-col items-center justify-center bg-[#1e293b] border border-green-500/30 text-green-400 p-6 rounded-2xl shadow-[0_0_15px_rgba(74,222,128,0.1)] hover:shadow-[0_0_25px_rgba(74,222,128,0.3)] hover:bg-[#0f172a] transition-all transform hover:-translate-y-1 h-32 w-full"
              >
                <Plus className="w-10 h-10 mb-2" strokeWidth={2.5} />
                <span className="text-xl font-bold tracking-wide">Nueva Auditoría</span>
              </button>

              <button
                onClick={() => setView('history')}
                className="group relative flex flex-col items-center justify-center bg-[#1e293b] border border-blue-500/30 text-blue-400 p-6 rounded-2xl shadow-[0_0_15px_rgba(96,165,250,0.1)] hover:shadow-[0_0_25px_rgba(96,165,250,0.3)] hover:bg-[#0f172a] transition-all transform hover:-translate-y-1 h-32 w-full"
              >
                <ClipboardList className="w-10 h-10 mb-2" strokeWidth={2.5} />
                <span className="text-xl font-bold tracking-wide">Ver Auditorías</span>
              </button>

              <button
                onClick={() => setView('dashboard')}
                className="group relative flex flex-col items-center justify-center bg-[#1e293b] border border-purple-500/30 text-purple-400 p-6 rounded-2xl shadow-[0_0_15px_rgba(192,132,252,0.1)] hover:shadow-[0_0_25px_rgba(192,132,252,0.3)] hover:bg-[#0f172a] transition-all transform hover:-translate-y-1 h-32 w-full"
              >
                <BarChart3 className="w-10 h-10 mb-2" strokeWidth={2.5} />
                <span className="text-xl font-bold tracking-wide">Dashboard</span>
              </button>

              <button
                onClick={() => setView('consolidated')}
                className="group relative flex flex-col items-center justify-center bg-[#1e293b] border border-orange-500/30 text-orange-400 p-6 rounded-2xl shadow-[0_0_15px_rgba(251,146,60,0.1)] hover:shadow-[0_0_25px_rgba(251,146,60,0.3)] hover:bg-[#0f172a] transition-all transform hover:-translate-y-1 h-32 w-full"
              >
                <FileText className="w-10 h-10 mb-2" strokeWidth={2.5} />
                <span className="text-xl font-bold tracking-wide">Consolidado</span>
              </button>
            </div>
          </div>
        );
      case 'form':
        return <AuditForm initialData={editingRecord} config={config} onSave={handleSaveAudit} onCancel={handleCancelForm} />;
      case 'dashboard':
        return <Dashboard records={records} actions={actions} onViewConsolidated={() => setView('consolidated')} onViewActions={() => setView('actions')} />;
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
    <div className="min-h-screen bg-[#121212] font-sans text-gray-100 selection:bg-blue-500 selection:text-white">
      {/* Header - Dark Blue */}
      <header className="bg-[#0f172a] border-b border-gray-800 shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 lg:px-6 h-16 flex items-center justify-between">
          <div 
            className="flex items-center gap-3 cursor-pointer"
            onClick={() => setView('home')}
          >
            <div className="bg-blue-600/20 p-2 rounded-lg backdrop-blur-sm border border-blue-500/30">
               <ClipboardList className="w-5 h-5 text-blue-400" />
            </div>
            <h1 className="text-lg font-bold text-gray-100 tracking-wide hidden sm:block">
              AuditCheck Pro
            </h1>
          </div>

          <nav className="flex items-center gap-1 md:gap-4">
            <NavButton label="Inicio" active={view === 'home'} onClick={() => setView('home')} icon={<Home className="w-4 h-4" />} />
            <NavButton label="+ Nueva" active={view === 'form'} onClick={() => { setEditingRecord(null); setView('form'); }} icon={<Plus className="w-4 h-4" />} />
            <NavButton label="Lista" active={view === 'history'} onClick={() => setView('history')} icon={<ClipboardList className="w-4 h-4" />} />
            <NavButton label="Dashboard" active={view === 'dashboard'} onClick={() => setView('dashboard')} icon={<BarChart3 className="w-4 h-4" />} />
            
            <div className="h-6 w-px bg-gray-700 mx-1"></div>
            
            <button 
                onClick={() => setView('settings')}
                className={`p-2 rounded-lg transition-colors ${view === 'settings' ? 'bg-blue-600/20 text-blue-400' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}
                title="Configuración"
            >
                <Settings className="w-5 h-5" />
            </button>
            <button 
                onClick={() => setView('ai-editor')}
                className={`p-2 rounded-lg transition-colors ${view === 'ai-editor' ? 'bg-purple-600/20 text-purple-400' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}
                title="Cámara IA"
            >
                <Camera className="w-5 h-5" />
            </button>
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 lg:px-6 py-6 pb-20">
        {renderContent()}
      </main>
      
      <footer className="py-6 text-center text-gray-600 text-sm border-t border-gray-800 mt-8">
        &copy; {new Date().getFullYear()} AuditCheck Pro System
      </footer>
    </div>
  );
};

const NavButton: React.FC<{
  label: string; 
  active: boolean; 
  onClick: () => void;
  icon: React.ReactNode;
}> = ({ label, active, onClick, icon }) => (
  <button
    onClick={onClick}
    className={`
      flex flex-col sm:flex-row items-center gap-1.5 px-3 py-2 rounded-lg transition-all duration-200
      ${active 
        ? 'bg-blue-600/20 text-blue-400 font-medium border border-blue-500/20' 
        : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
      }
    `}
  >
    {icon}
    <span className="text-[10px] sm:text-sm">{label}</span>
  </button>
);

export default App;