import React, { useState } from 'react';
import { X, Code, Database, FileText, CheckCircle2, Shield, Layers } from 'lucide-react';

interface ArchitectureModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ArchitectureModal: React.FC<ArchitectureModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'stack' | 'django' | 'supabase' | 'pdf'>('stack');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md">
      <div className="relative max-w-4xl w-full max-h-[90vh] glass-institutional rounded-2xl border border-[#A57F2C]/50 shadow-2xl flex flex-col overflow-hidden">
        {/* Header Modal */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-[#A57F2C]/30 bg-[#002F2A]/90">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-[#611232] border border-[#A57F2C]/40 flex items-center justify-center text-[#A57F2C]">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-stone-100">
                Arquitectura Técnica & Mapeo PDF
              </h3>
              <p className="text-[11px] text-[#A57F2C]">
                React SPA + Django REST + Supabase + IndexedDB Offline
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Pestañas */}
        <div className="flex border-b border-[#A57F2C]/25 bg-[#051a17]/90 px-4 gap-2 overflow-x-auto text-xs">
          <button
            onClick={() => setActiveTab('stack')}
            className={`py-3 px-3 font-semibold border-b-2 transition whitespace-nowrap ${
              activeTab === 'stack'
                ? 'border-[#A57F2C] text-[#A57F2C]'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            Flujo Arquitectónico
          </button>
          <button
            onClick={() => setActiveTab('django')}
            className={`py-3 px-3 font-semibold border-b-2 transition whitespace-nowrap ${
              activeTab === 'django'
                ? 'border-[#A57F2C] text-[#A57F2C]'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            Django REST Framework
          </button>
          <button
            onClick={() => setActiveTab('supabase')}
            className={`py-3 px-3 font-semibold border-b-2 transition whitespace-nowrap ${
              activeTab === 'supabase'
                ? 'border-[#A57F2C] text-[#A57F2C]'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            Esquema Supabase (SQL)
          </button>
          <button
            onClick={() => setActiveTab('pdf')}
            className={`py-3 px-3 font-semibold border-b-2 transition whitespace-nowrap ${
              activeTab === 'pdf'
                ? 'border-[#A57F2C] text-[#A57F2C]'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            Mapeo Verbatim PDF (8 páginas)
          </button>
        </div>

        {/* Contenido de la pestaña */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 text-xs sm:text-sm text-stone-200">
          {activeTab === 'stack' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-black/40 border border-[#A57F2C]/30 font-mono text-xs text-[#A57F2C]">
                Frontend React (IndexedDB Offline First) <br />
                &nbsp;&nbsp;&nbsp;&nbsp;↓ Sincronización REST (Fetch API / Resiliente) <br />
                API Django REST Framework (Endpoints /api/*) <br />
                &nbsp;&nbsp;&nbsp;&nbsp;↓ Persistencia Relacional y Storage <br />
                Supabase (PostgreSQL + RLS + Storage Buckets)
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 rounded-lg bg-[#002F2A]/50 border border-[#A57F2C]/20 space-y-1">
                  <div className="font-bold text-[#A57F2C]">1. Guardado Inmediato</div>
                  <p className="text-stone-300">
                    Cada campo modificado se persiste al instante en IndexedDB localmente y luego se envía de forma asíncrona a la API.
                  </p>
                </div>

                <div className="p-3.5 rounded-lg bg-[#611232]/50 border border-[#A57F2C]/20 space-y-1">
                  <div className="font-bold text-[#A57F2C]">2. Modo Offline Robusto</div>
                  <p className="text-stone-300">
                    Si se interrumpe la red, las respuestas y archivos se encolan en IndexedDB y se sincronizan en cuanto se restablece la conexión.
                  </p>
                </div>

                <div className="p-3.5 rounded-lg bg-[#002F2A]/50 border border-[#A57F2C]/20 space-y-1">
                  <div className="font-bold text-[#A57F2C]">3. Límite Estricto 300 Caracteres</div>
                  <p className="text-stone-300">
                    Todas las preguntas abiertas cuentan con validación en tiempo real y bloqueo tanto en frontend como en serializers del backend.
                  </p>
                </div>

                <div className="p-3.5 rounded-lg bg-[#611232]/50 border border-[#A57F2C]/20 space-y-1">
                  <div className="font-bold text-[#A57F2C]">4. Validación de Archivos</div>
                  <p className="text-stone-300">
                    Solo se admiten documentos .pdf y hojas de cálculo .xls / .xlsx de hasta 15 MB con sanitización de nombres.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'django' && (
            <div className="space-y-3">
              <p className="text-xs text-stone-300">
                El backend Django REST Framework incluye modelos con <code className="text-[#A57F2C]">max_length=300</code>, validadores de preguntas obligatorias, y endpoints CRUD:
              </p>
              <pre className="p-4 rounded-xl bg-black/60 border border-[#A57F2C]/30 text-[11px] font-mono text-emerald-300 overflow-x-auto leading-relaxed">
{`# backend_django/formulario/models.py
from django.db import models
from django.core.validators import MaxLengthValidator, FileExtensionValidator

class Respuesta(models.Model):
    formulario_id = models.CharField(max_length=100, db_index=True)
    pregunta_id = models.CharField(max_length=50)
    seccion_id = models.CharField(max_length=100)
    pregunta = models.CharField(max_length=500)
    respuesta = models.TextField(validators=[MaxLengthValidator(300)])
    fuente = models.CharField(max_length=300, blank=True, null=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('formulario_id', 'pregunta_id')`}
              </pre>
            </div>
          )}

          {activeTab === 'supabase' && (
            <div className="space-y-3">
              <p className="text-xs text-stone-300">
                Esquema PostgreSQL en Supabase con Row Level Security (RLS) para aislamiento institucional:
              </p>
              <pre className="p-4 rounded-xl bg-black/60 border border-[#A57F2C]/30 text-[11px] font-mono text-amber-200 overflow-x-auto leading-relaxed">
{`-- supabase_schema.sql
CREATE TABLE public.formularios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    folio VARCHAR(50) UNIQUE NOT NULL,
    usuario_nombre VARCHAR(300) NOT NULL,
    usuario_correo VARCHAR(300) NOT NULL,
    usuario_puesto VARCHAR(300) NOT NULL,
    usuario_entidad VARCHAR(300) NOT NULL,
    fecha_envio TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    estado VARCHAR(50) DEFAULT 'CONCLUIDO'
);

CREATE TABLE public.respuestas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    formulario_id UUID REFERENCES public.formularios(id) ON DELETE CASCADE,
    pregunta_id VARCHAR(50) NOT NULL,
    seccion_id VARCHAR(100) NOT NULL,
    pregunta TEXT NOT NULL,
    respuesta TEXT CHECK (char_length(respuesta) <= 300),
    fuente VARCHAR(300),
    fecha_actualizacion TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);`}
              </pre>
            </div>
          )}

          {activeTab === 'pdf' && (
            <div className="space-y-3">
              <p className="text-xs text-stone-300">
                El instrumento se estructura en <strong>6 Secciones Metodológicas</strong> con preguntas textuales del PDF (ejercicio 2024-2025):
              </p>
              <ul className="space-y-2 text-xs text-stone-300">
                <li className="p-2.5 rounded bg-black/40 border-l-2 border-[#A57F2C]">
                  <strong>1) Datos generales:</strong> Datos del capturista (Preguntas 1 a 5), datos del responsable del programa (Preguntas 6 a 9) e información de unidades y dependencias responsables (Preguntas 10 y 10.1).
                </li>
                <li className="p-2.5 rounded bg-black/40 border-l-2 border-[#A57F2C]">
                  <strong>2) Normatividad y objetivo del programa:</strong> Normatividad que regula al programa (Preguntas 12 y 13) y objetivo de la intervención de salud/bienestar (Pregunta 14).
                </li>
                <li className="p-2.5 rounded bg-black/40 border-l-2 border-[#A57F2C]">
                  <strong>3) Población potencial y objetivo:</strong> Definición, unidad de medida y cuantificación de la población focalizada (Preguntas 15 a 18.1).
                </li>
                <li className="p-2.5 rounded bg-black/40 border-l-2 border-[#A57F2C]">
                  <strong>4) Criterios de priorización y ámbito de atención:</strong> Criterios territoriales (ZAP, rezago, marginación, etc. - Preguntas 20 a 20.1.1) y ámbito urbano, rural o mixto (Pregunta 21).
                </li>
                <li className="p-2.5 rounded bg-black/40 border-l-2 border-[#A57F2C]">
                  <strong>5) Padrón de beneficiarios y contraloría social:</strong> Tipo de padrón, información que reporta, sistematización y frecuencia de actualización (Preguntas 22 a 22.4.1), y existencia de contraloría social (Pregunta 23).
                </li>
                <li className="p-2.5 rounded bg-black/40 border-l-2 border-[#A57F2C]">
                  <strong>6) Apoyos otorgados y población atendida:</strong> Tipo de apoyo, monto, modalidad y frecuencia (Preguntas 24 a 31); definición, cuantificación, grupos de atención (29 grupos de carencia y grupos etarios) y plantillas de desagregación estatal/municipal (Preguntas 32 a 37.1).
                </li>
              </ul>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#A57F2C]/30 bg-[#002F2A]/90 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-semibold text-stone-900 bg-[#A57F2C] hover:bg-[#c4993a] transition"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};
