-- Esquema del Inventario Federal de Programas y Acciones de Desarrollo Social.
-- Los archivos se almacenan fuera de Supabase; esta base guarda sus metadatos.

create extension if not exists pgcrypto;

create table public.formularios (
  id uuid primary key default gen_random_uuid(),
  folio varchar(60) not null unique,
  usuario_nombre varchar(300),
  usuario_puesto varchar(300),
  usuario_correo varchar(300),
  usuario_telefono varchar(300),
  usuario_entidad varchar(300),
  fecha_captura date default current_date,
  estado varchar(40) not null default 'EN_CAPTURA',
  fecha_creacion timestamptz not null default now(),
  fecha_finalizacion timestamptz,
  metadatos jsonb not null default '{}'::jsonb
);

create table public.respuestas (
  id uuid primary key default gen_random_uuid(),
  formulario_id uuid not null references public.formularios(id) on delete cascade,
  pregunta_id varchar(50) not null,
  seccion_id varchar(100) not null,
  pregunta text not null,
  respuesta jsonb,
  fuente varchar(300),
  estado varchar(30) not null default 'guardado',
  fecha_actualizacion timestamptz not null default now(),
  unique (formulario_id, pregunta_id)
);

create table public.archivos (
  id uuid primary key default gen_random_uuid(),
  formulario_id uuid not null references public.formularios(id) on delete cascade,
  nombre varchar(255) not null,
  tipo varchar(120) not null,
  tamanio bigint not null check (tamanio > 0 and tamanio <= 15728640),
  extension varchar(10) not null check (lower(extension) in ('.pdf', '.xls', '.xlsx')),
  proveedor_almacenamiento varchar(40) not null default 'google_drive',
  almacenamiento_id text,
  ruta_almacenamiento text,
  fecha_carga timestamptz not null default now(),
  estado varchar(30) not null default 'pendiente'
);

create index idx_formularios_folio on public.formularios(folio);
create index idx_formularios_fecha on public.formularios(fecha_creacion desc);
create index idx_respuestas_formulario on public.respuestas(formulario_id);
create index idx_archivos_formulario on public.archivos(formulario_id);

alter table public.formularios enable row level security;
alter table public.respuestas enable row level security;
alter table public.archivos enable row level security;
