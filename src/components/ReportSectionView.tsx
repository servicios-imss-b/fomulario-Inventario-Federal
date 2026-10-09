import { useState } from 'react';
import { Building2, Database, FileSearch, Gauge, Layers3, Table2 } from 'lucide-react';
import type { ArchivoAdjunto } from '../types/form';
import { FileUploadSection } from './FileUploadSection';

type ReportTab = 'infraestructura' | 'avance' | 'pendientes' | 'archivos';
type InfrastructureView = 'clues' | 'entidad' | 'faltantes';

interface ReportSectionViewProps {
  archivos: ArchivoAdjunto[];
  isOnline: boolean;
  onUpload: (archivo: ArchivoAdjunto) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

const reportTabs: { id: ReportTab; label: string; icon: typeof Database }[] = [
  { id: 'infraestructura', label: 'Infraestructura y materiales', icon: Building2 },
  { id: 'avance', label: 'Tablero de avance', icon: Gauge },
  { id: 'pendientes', label: 'CLUES pendientes', icon: FileSearch },
  { id: 'archivos', label: 'Archivos', icon: Database },
];

const infrastructureViews: { id: InfrastructureView; label: string; icon: typeof Table2 }[] = [
  { id: 'clues', label: 'Por CLUES', icon: Building2 },
  { id: 'entidad', label: 'Por entidad', icon: Layers3 },
  { id: 'faltantes', label: 'Faltantes', icon: FileSearch },
];

export function ReportSectionView({ archivos, isOnline, onUpload, onDelete }: ReportSectionViewProps) {
  const [activeTab, setActiveTab] = useState<ReportTab>('infraestructura');
  const [infrastructureView, setInfrastructureView] = useState<InfrastructureView>('clues');
  const activeReportTab = reportTabs.find((tab) => tab.id === activeTab);

  if (activeTab === 'archivos') {
    return (
      <section className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        <ReportHeader />
        <ReportTabBar activeTab={activeTab} onChange={setActiveTab} />
        <FileUploadSection archivos={archivos} isOnline={isOnline} onUpload={onUpload} onDelete={onDelete} />
      </section>
    );
  }

  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-6 text-slate-900 sm:px-6 sm:py-8">
      <ReportHeader />
      <ReportTabBar activeTab={activeTab} onChange={setActiveTab} />

      {activeTab === 'infraestructura' && (
        <div className="mb-4 flex flex-wrap gap-2" role="tablist" aria-label="Vistas de infraestructura">
          {infrastructureViews.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={infrastructureView === id}
              onClick={() => setInfrastructureView(id)}
              className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition ${infrastructureView === id ? 'bg-[#006b5b] text-white' : 'bg-white/80 text-slate-700 hover:bg-white'}`}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>
      )}

      <div className="border-y border-slate-900/15 bg-white/85 px-5 py-12 text-center shadow-sm backdrop-blur-sm sm:px-10">
        {activeReportTab && <activeReportTab.icon className="mx-auto h-8 w-8 text-[#006b5b]" aria-hidden="true" />}
        <h3 className="mt-3 text-lg font-semibold text-slate-900">
          {activeTab === 'avance' ? 'Tablero de avance' : activeTab === 'pendientes' ? 'Informe de CLUES pendientes' : infrastructureViews.find((view) => view.id === infrastructureView)?.label}
        </h3>
        <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          La vista sigue la organización del reporte de infraestructura. La consulta y los agregados aparecerán cuando se defina la estructura final de las tablas; por ahora esta pantalla no realiza llamadas a la base de datos.
        </p>
        <div className="mx-auto mt-6 inline-flex items-center gap-2 rounded-full border border-slate-900/10 bg-slate-50 px-3 py-1.5 text-xs text-slate-500">
          <Database className="h-3.5 w-3.5" />
          Esperando estructura de datos
        </div>
      </div>
    </section>
  );
}

function ReportHeader() {
  return (
    <header className="mb-5 border-b border-slate-900/15 pb-5 text-slate-900">
      <p className="text-[11px] font-bold uppercase text-[#006b5b]">Panel de seguimiento</p>
      <h2 className="mt-1 text-2xl font-bold">Reporte de datos</h2>
      <p className="mt-1 max-w-2xl text-sm text-slate-600">
        Consulta de infraestructura, avance y registros pendientes.
      </p>
    </header>
  );
}

function ReportTabBar({ activeTab, onChange }: { activeTab: ReportTab; onChange: (tab: ReportTab) => void }) {
  return (
    <nav className="mb-5 flex flex-wrap gap-2" aria-label="Secciones del reporte">
      {reportTabs.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          aria-current={activeTab === id ? 'page' : undefined}
          onClick={() => onChange(id)}
          className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition sm:px-4 sm:text-sm ${activeTab === id ? 'bg-[#006b5b] text-white' : 'bg-white/80 text-slate-700 hover:bg-white'}`}
        >
          <Icon className="h-4 w-4" />
          {label}
        </button>
      ))}
    </nav>
  );
}