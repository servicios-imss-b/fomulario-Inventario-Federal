-- Apply after supabase_schema.sql, supabase_pages_rpc.sql, and supabase_reporte_rpc.sql.
-- Adds password-only access scoped to one titular, program key, and year.
-- Existing forms remain intact and are left with a null access_credential_id.

create extension if not exists pgcrypto with schema extensions;
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists private.reporte_acceso (
  usuario text primary key,
  password_hash text not null,
  intentos_fallidos integer not null default 0,
  bloqueado_hasta timestamptz
);

create table if not exists private.form_titulares (
  id uuid primary key default gen_random_uuid(),
  nombre varchar(300) not null,
  correo varchar(320) not null,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

create unique index if not exists form_titulares_correo_unico
  on private.form_titulares (lower(trim(correo)));

create table if not exists private.form_accesos (
  id uuid primary key default gen_random_uuid(),
  titular_id uuid not null references private.form_titulares(id) on delete restrict,
  clave varchar(20) not null,
  anio varchar(4) not null check (anio ~ '^[0-9]{4}$'),
  password_hash text not null,
  activo boolean not null default true,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  unique (titular_id, clave, anio)
);

create table if not exists private.form_access_events (
  id uuid primary key default gen_random_uuid(),
  credential_id uuid not null references private.form_accesos(id) on delete restrict,
  formulario_id uuid not null references public.formularios(id) on delete cascade,
  titular_id uuid not null references private.form_titulares(id) on delete restrict,
  clave varchar(20) not null,
  anio varchar(4) not null,
  entered_at timestamptz not null default now()
);

create index if not exists form_access_events_credential_entered_idx
  on private.form_access_events (credential_id, entered_at desc);

revoke all on private.reporte_acceso, private.form_titulares, private.form_accesos, private.form_access_events
  from public, anon, authenticated;

alter table private.reporte_acceso enable row level security;
alter table private.form_titulares enable row level security;
alter table private.form_accesos enable row level security;
alter table private.form_access_events enable row level security;

alter table public.formularios add column if not exists titular_id uuid;
alter table public.formularios add column if not exists titular_nombre varchar(300);
alter table public.formularios add column if not exists titular_correo varchar(320);
alter table public.formularios add column if not exists clave_programa varchar(20);
alter table public.formularios add column if not exists anio_programa varchar(4);
alter table public.formularios add column if not exists access_credential_id uuid;

update public.formularios f
set clave_programa = r.respuesta #>> '{}'
from public.respuestas r
where r.formulario_id = f.id
  and r.pregunta_id = 'clave_programa'
  and f.clave_programa is null;

update public.formularios f
set anio_programa = r.respuesta #>> '{}'
from public.respuestas r
where r.formulario_id = f.id
  and r.pregunta_id = 'anio_captura'
  and f.anio_programa is null;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'formularios_titular_id_fkey'
      AND conrelid = 'public.formularios'::regclass
  ) THEN
    ALTER TABLE public.formularios
      ADD CONSTRAINT formularios_titular_id_fkey
      FOREIGN KEY (titular_id) REFERENCES private.form_titulares(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'formularios_access_credential_id_fkey'
      AND conrelid = 'public.formularios'::regclass
  ) THEN
    ALTER TABLE public.formularios
      ADD CONSTRAINT formularios_access_credential_id_fkey
      FOREIGN KEY (access_credential_id) REFERENCES private.form_accesos(id) ON DELETE SET NULL;
  END IF;
END;
$$;

create unique index if not exists formularios_credencial_unica
  on public.formularios (access_credential_id)
  where access_credential_id is not null;

create index if not exists formularios_titular_clave_anio_idx
  on public.formularios (titular_id, clave_programa, anio_programa);

create or replace function private.validar_superusuario_reporte(p_usuario text, p_password text)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_acceso private.reporte_acceso%rowtype;
begin
  if coalesce(p_usuario, '') <> 'add.31' then return false; end if;

  select * into v_acceso
  from private.reporte_acceso
  where usuario = 'add.31'
  for update;

  if not found then return false; end if;
  if v_acceso.bloqueado_hasta is not null and v_acceso.bloqueado_hasta > now() then
    return false;
  end if;

  if v_acceso.password_hash <> extensions.crypt(coalesce(p_password, ''), v_acceso.password_hash) then
    update private.reporte_acceso
    set intentos_fallidos = intentos_fallidos + 1,
        bloqueado_hasta = case when intentos_fallidos + 1 >= 8 then now() + interval '1 minute' else null end
    where usuario = 'add.31';
    return false;
  end if;

  update private.reporte_acceso
  set intentos_fallidos = 0, bloqueado_hasta = null
  where usuario = 'add.31';
  return true;
end;
$$;

revoke all on function private.validar_superusuario_reporte(text, text) from public, anon, authenticated;

create or replace function public.crear_accesos_iniciales(p_usuario text, p_admin_password text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_titular jsonb;
  v_clave text;
  v_anio text;
  v_asignaciones jsonb := '[]'::jsonb;
  v_roster jsonb := jsonb_build_array(
    jsonb_build_object(
      'nombre', 'Reyes Pérez Bernal',
      'correo', 'reyes.perez@imssbienestar.gob.mx',
      'claves', jsonb_build_array('U013')
    ),
    jsonb_build_object(
      'nombre', 'Víctor Hugo López Aranda',
      'correo', 'victor.lopeza@imssbienestar.gob.mx',
      'claves', jsonb_build_array('U013')
    ),
    jsonb_build_object(
      'nombre', 'Mtro. Iker Virgilio Lobato González',
      'correo', 'iker.lobato@imssbienestar.gob.mx',
      'claves', jsonb_build_array('S313', 'U313', 'S200')
    ),
    jsonb_build_object(
      'nombre', 'Guillermo José Argueta Monterrosa',
      'correo', 'guillermo.argueta@imssbienestar.gob.mx',
      'claves', jsonb_build_array('S313', 'U313')
    )
  );
begin
  if not private.validar_superusuario_reporte(p_usuario, p_admin_password) then
    return jsonb_build_object('success', false, 'error', 'Acceso administrativo no autorizado.');
  end if;

  if exists (select 1 from private.form_accesos) then
    return jsonb_build_object('success', false, 'error', 'Ya existen asignaciones. Usa el formulario para añadir o restablecer accesos.');
  end if;

  for v_titular in select value from jsonb_array_elements(v_roster)
  loop
    for v_clave in select jsonb_array_elements_text(v_titular -> 'claves')
    loop
      foreach v_anio in array array['2024', '2025']
      loop
        v_asignaciones := v_asignaciones || jsonb_build_array(jsonb_build_object(
          'nombre', v_titular ->> 'nombre',
          'correo', v_titular ->> 'correo',
          'clave', v_clave,
          'anio', v_anio
        ));
      end loop;
    end loop;
  end loop;

  return jsonb_build_object('success', true, 'assignments', v_asignaciones);
end;
$$;

create or replace function public.listar_accesos_captura(p_usuario text, p_password text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_accesos jsonb;
begin
  if not private.validar_superusuario_reporte(p_usuario, p_password) then
    return jsonb_build_object('success', false, 'error', 'Acceso administrativo no autorizado.');
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', a.id,
    'titularId', t.id,
    'nombre', t.nombre,
    'correo', t.correo,
    'clave', a.clave,
    'anio', a.anio,
    'activo', a.activo,
    'tienePassword', a.password_hash is not null,
    'estadoFormulario', coalesce(f.estado, 'SIN_INICIAR'),
    'folio', coalesce(f.folio, ''),
    'entryId', latest_entry.id,
    'enteredAt', latest_entry.entered_at
  ) order by lower(t.nombre), a.clave, a.anio), '[]'::jsonb)
  into v_accesos
  from private.form_accesos a
  join private.form_titulares t on t.id = a.titular_id
  left join public.formularios f on f.access_credential_id = a.id
  left join lateral (
    select entry_event.id, entry_event.entered_at
    from private.form_access_events entry_event
    where entry_event.credential_id = a.id
    order by entry_event.entered_at desc
    limit 1
  ) latest_entry on true;

  return jsonb_build_object('success', true, 'accesses', v_accesos);
end;
$$;

create or replace function public.guardar_acceso_captura(
  p_usuario text,
  p_admin_password text,
  p_nombre text,
  p_correo text,
  p_clave text,
  p_anio text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_titular_id uuid;
  v_acceso_id uuid;
  v_password text;
  v_correo text := lower(trim(coalesce(p_correo, '')));
  v_nombre text := trim(coalesce(p_nombre, ''));
begin
  if not private.validar_superusuario_reporte(p_usuario, p_admin_password) then
    return jsonb_build_object('success', false, 'error', 'Acceso administrativo no autorizado.');
  end if;

  if v_nombre = '' or v_correo !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    return jsonb_build_object('success', false, 'error', 'Nombre o correo no valido.');
  end if;

  if p_clave not in ('S313', 'E001', 'U013', 'S200', 'U313', 'E003', 'E004', 'E006')
    or coalesce(p_anio, '') !~ '^[0-9]{4}$' then
    return jsonb_build_object('success', false, 'error', 'Clave o anio no valido.');
  end if;

  select id into v_titular_id
  from private.form_titulares
  where lower(trim(correo)) = v_correo
  for update;

  if v_titular_id is null then
    insert into private.form_titulares (nombre, correo)
    values (left(v_nombre, 300), v_correo)
    returning id into v_titular_id;
  else
    update private.form_titulares
    set nombre = left(v_nombre, 300), correo = v_correo, actualizado_en = now()
    where id = v_titular_id;
  end if;

  v_password := translate(
    rtrim(encode(extensions.gen_random_bytes(18), 'base64'), '='),
    '+/',
    '-_'
  );

  insert into private.form_accesos (titular_id, clave, anio, password_hash, activo, actualizado_en)
  values (v_titular_id, p_clave, p_anio, extensions.crypt(v_password, extensions.gen_salt('bf', 12)), true, now())
  on conflict (titular_id, clave, anio) do update
    set password_hash = excluded.password_hash,
        activo = true,
        actualizado_en = now()
  returning id into v_acceso_id;

  return jsonb_build_object(
    'success', true,
    'accessId', v_acceso_id,
    'nombre', left(v_nombre, 300),
    'correo', v_correo,
    'clave', p_clave,
    'anio', p_anio,
    'password', v_password
  );
end;
$$;

create or replace function public.cambiar_estado_acceso_captura(
  p_usuario text,
  p_admin_password text,
  p_access_id uuid,
  p_activo boolean
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.validar_superusuario_reporte(p_usuario, p_admin_password) then
    return jsonb_build_object('success', false, 'error', 'Acceso administrativo no autorizado.');
  end if;

  update private.form_accesos
  set activo = p_activo, actualizado_en = now()
  where id = p_access_id;

  if not found then
    return jsonb_build_object('success', false, 'error', 'No se encontro la asignacion.');
  end if;

  return jsonb_build_object('success', true);
end;
$$;

create or replace function public.iniciar_captura_formulario(p_password text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_acceso record;
  v_formulario_id uuid;
  v_folio text;
  v_estado text;
  v_metadatos jsonb;
  v_respuestas jsonb;
  v_entry_id uuid;
begin
  select a.id, a.titular_id, a.clave, a.anio, t.nombre, t.correo
  into v_acceso
  from private.form_accesos a
  join private.form_titulares t on t.id = a.titular_id
  where a.activo
    and a.password_hash = extensions.crypt(coalesce(p_password, ''), a.password_hash)
  limit 1;

  if not found then
    return jsonb_build_object('success', false, 'error', 'Contrasena incorrecta o desactivada.');
  end if;

  select f.id, f.folio, f.estado, f.metadatos
  into v_formulario_id, v_folio, v_estado, v_metadatos
  from public.formularios f
  where f.access_credential_id = v_acceso.id
  limit 1;

  if v_estado = 'CONCLUIDO' then
    return jsonb_build_object(
      'success', true,
      'completed', true,
      'credentialId', v_acceso.id,
      'titularId', v_acceso.titular_id,
      'nombre', v_acceso.nombre,
      'correo', v_acceso.correo,
      'clave', v_acceso.clave,
      'anio', v_acceso.anio,
      'folio', v_folio,
      'submittedSections', coalesce(v_metadatos -> 'submittedSections', '[]'::jsonb)
    );
  end if;

  if v_formulario_id is null then
    v_folio := 'BORRADOR-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 18));
    insert into public.formularios (
      folio, estado, titular_id, titular_nombre, titular_correo,
      clave_programa, anio_programa, access_credential_id
    ) values (
      v_folio, 'EN_CAPTURA', v_acceso.titular_id, v_acceso.nombre, v_acceso.correo,
      v_acceso.clave, v_acceso.anio, v_acceso.id
    ) returning id into v_formulario_id;
    v_metadatos := '{}'::jsonb;
  end if;

  insert into private.form_access_events (
    credential_id, formulario_id, titular_id, clave, anio
  ) values (
    v_acceso.id, v_formulario_id, v_acceso.titular_id, v_acceso.clave, v_acceso.anio
  ) returning id into v_entry_id;

  select coalesce(jsonb_object_agg(
    r.pregunta_id,
    jsonb_build_object(
      'preguntaId', r.pregunta_id,
      'seccionId', r.seccion_id,
      'pregunta', r.pregunta,
      'valor', r.respuesta,
      'fuente', r.fuente,
      'fechaActualizacion', r.fecha_actualizacion,
      'estado', r.estado
    )
  ), '{}'::jsonb)
  into v_respuestas
  from public.respuestas r
  where r.formulario_id = v_formulario_id;

  return jsonb_build_object(
    'success', true,
    'completed', false,
    'credentialId', v_acceso.id,
    'titularId', v_acceso.titular_id,
    'nombre', v_acceso.nombre,
    'correo', v_acceso.correo,
    'clave', v_acceso.clave,
    'anio', v_acceso.anio,
    'formularioId', v_formulario_id,
    'entryId', v_entry_id,
    'folio', coalesce(v_folio, ''),
    'submittedSections', coalesce(v_metadatos -> 'submittedSections', '[]'::jsonb),
    'answers', v_respuestas
  );
end;
$$;

create or replace function public.guardar_avance_formulario(p_password text, p_respuesta jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_acceso record;
  v_formulario_id uuid;
  v_folio text;
  v_estado text;
  v_pregunta_id text := coalesce(p_respuesta ->> 'preguntaId', '');
  v_valor text := p_respuesta ->> 'valor';
begin
  if p_respuesta is null or jsonb_typeof(p_respuesta) <> 'object' or v_pregunta_id = '' then
    raise exception 'Respuesta no valida.' using errcode = '22023';
  end if;

  select a.id, a.titular_id, a.clave, a.anio, t.nombre, t.correo
  into v_acceso
  from private.form_accesos a
  join private.form_titulares t on t.id = a.titular_id
  where a.activo
    and a.password_hash = extensions.crypt(coalesce(p_password, ''), a.password_hash)
  limit 1;

  if not found then
    raise exception 'Contrasena incorrecta o desactivada.' using errcode = '42501';
  end if;

  if (v_pregunta_id = 'clave_programa' and v_valor <> v_acceso.clave)
    or (v_pregunta_id = 'anio_captura' and v_valor <> v_acceso.anio) then
    raise exception 'La clave y el anio estan vinculados a esta contrasena.' using errcode = '42501';
  end if;

  select f.id, f.folio, f.estado
  into v_formulario_id, v_folio, v_estado
  from public.formularios f
  where f.access_credential_id = v_acceso.id
  for update;

  if v_estado = 'CONCLUIDO' then
    raise exception 'Este cuestionario ya fue concluido.' using errcode = '42501';
  end if;

  if v_formulario_id is null then
    v_folio := 'BORRADOR-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 18));
    insert into public.formularios (
      folio, estado, titular_id, titular_nombre, titular_correo,
      clave_programa, anio_programa, access_credential_id
    ) values (
      v_folio, 'EN_CAPTURA', v_acceso.titular_id, v_acceso.nombre, v_acceso.correo,
      v_acceso.clave, v_acceso.anio, v_acceso.id
    ) returning id into v_formulario_id;
  end if;

  insert into public.respuestas (
    formulario_id, pregunta_id, seccion_id, pregunta, respuesta, fuente, estado, fecha_actualizacion
  ) values (
    v_formulario_id,
    v_pregunta_id,
    coalesce(p_respuesta ->> 'seccionId', ''),
    coalesce(p_respuesta ->> 'pregunta', ''),
    p_respuesta -> 'valor',
    nullif(p_respuesta ->> 'fuente', ''),
    'guardado',
    coalesce(nullif(p_respuesta ->> 'fechaActualizacion', '')::timestamptz, now())
  )
  on conflict (formulario_id, pregunta_id) do update set
    seccion_id = excluded.seccion_id,
    pregunta = excluded.pregunta,
    respuesta = excluded.respuesta,
    fuente = excluded.fuente,
    estado = 'guardado',
    fecha_actualizacion = excluded.fecha_actualizacion;

  update public.formularios f set
    usuario_nombre = case when v_pregunta_id = '1' then left(v_valor, 300) else f.usuario_nombre end,
    usuario_puesto = case when v_pregunta_id = '2' then left(v_valor, 300) else f.usuario_puesto end,
    usuario_correo = case when v_pregunta_id = '3' then left(v_valor, 300) else f.usuario_correo end,
    usuario_telefono = case when v_pregunta_id = '4' then left(v_valor, 300) else f.usuario_telefono end,
    fecha_captura = case
      when v_pregunta_id = '5' and v_valor ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then v_valor::date
      else f.fecha_captura
    end,
    metadatos = jsonb_build_object(
      'total_respuestas', (select count(*) from public.respuestas r where r.formulario_id = f.id),
      'total_archivos', (select count(*) from public.archivos a where a.formulario_id = f.id)
    )
  where f.id = v_formulario_id;

  return jsonb_build_object('success', true, 'formularioId', v_formulario_id, 'folio', v_folio);
end;
$$;

create or replace function public.guardar_progreso_formulario(p_password text, p_submitted_sections jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_acceso record;
  v_formulario_id uuid;
  v_folio text;
  v_estado text;
begin
  if jsonb_typeof(p_submitted_sections) <> 'array' then
    raise exception 'Progreso no valido.' using errcode = '22023';
  end if;

  select a.id, a.titular_id, a.clave, a.anio, t.nombre, t.correo
  into v_acceso
  from private.form_accesos a
  join private.form_titulares t on t.id = a.titular_id
  where a.activo
    and a.password_hash = extensions.crypt(coalesce(p_password, ''), a.password_hash)
  limit 1;

  if not found then
    raise exception 'Contrasena incorrecta o desactivada.' using errcode = '42501';
  end if;

  select f.id, f.folio, f.estado
  into v_formulario_id, v_folio, v_estado
  from public.formularios f
  where f.access_credential_id = v_acceso.id
  for update;

  if v_estado = 'CONCLUIDO' then
    raise exception 'Este cuestionario ya fue concluido.' using errcode = '42501';
  end if;

  if v_formulario_id is null then
    v_folio := 'BORRADOR-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 18));
    insert into public.formularios (
      folio, estado, titular_id, titular_nombre, titular_correo,
      clave_programa, anio_programa, access_credential_id
    ) values (
      v_folio, 'EN_CAPTURA', v_acceso.titular_id, v_acceso.nombre, v_acceso.correo,
      v_acceso.clave, v_acceso.anio, v_acceso.id
    ) returning id into v_formulario_id;
  end if;

  update public.formularios
  set metadatos = coalesce(metadatos, '{}'::jsonb) || jsonb_build_object('submittedSections', p_submitted_sections)
  where id = v_formulario_id;

  return jsonb_build_object('success', true, 'formularioId', v_formulario_id, 'folio', v_folio);
end;
$$;

-- Replace the legacy anonymous finalizer; it has no titular/scope validation.
drop function if exists public.registrar_formulario(jsonb);

create or replace function public.registrar_formulario(p_password text, p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_acceso record;
  v_formulario_id uuid;
  v_folio text;
  v_estado text;
  v_usuario jsonb := coalesce(p_payload -> 'usuario', '{}'::jsonb);
  v_respuesta record;
  v_archivo jsonb;
  v_archivo_extension text;
  v_archivo_tamanio bigint;
  v_fecha_finalizacion timestamptz := coalesce(nullif(p_payload ->> 'fechaFinalizacion', '')::timestamptz, now());
begin
  if p_payload is null or jsonb_typeof(p_payload) <> 'object'
    or jsonb_typeof(coalesce(p_payload -> 'respuestas', '{}'::jsonb)) <> 'object' then
    raise exception 'Contenido del formulario no valido.' using errcode = '22023';
  end if;

  select a.id, a.titular_id, a.clave, a.anio, t.nombre, t.correo
  into v_acceso
  from private.form_accesos a
  join private.form_titulares t on t.id = a.titular_id
  where a.activo
    and a.password_hash = extensions.crypt(coalesce(p_password, ''), a.password_hash)
  limit 1;

  if not found then
    raise exception 'Contrasena incorrecta o desactivada.' using errcode = '42501';
  end if;

  if nullif(p_payload #>> '{respuestas,clave_programa,valor}', '') is distinct from v_acceso.clave
    or nullif(p_payload #>> '{respuestas,anio_captura,valor}', '') is distinct from v_acceso.anio then
    raise exception 'La clave y el anio no corresponden a esta contrasena.' using errcode = '42501';
  end if;

  select f.id, f.folio, f.estado
  into v_formulario_id, v_folio, v_estado
  from public.formularios f
  where f.access_credential_id = v_acceso.id
  for update;

  if v_estado = 'CONCLUIDO' then
    raise exception 'Este cuestionario ya fue concluido y no admite cambios.' using errcode = '42501';
  end if;

  if v_formulario_id is null then
    v_folio := coalesce(
      nullif(p_payload ->> 'folio', ''),
      'INEGI-IFPADS-' || to_char(now(), 'YYYY') || '-' || lpad((floor(random() * 900000) + 100000)::text, 6, '0')
    );
    insert into public.formularios (
      folio, usuario_nombre, usuario_puesto, usuario_correo, usuario_telefono,
      usuario_entidad, fecha_captura, estado, fecha_finalizacion, metadatos,
      titular_id, titular_nombre, titular_correo, clave_programa, anio_programa, access_credential_id
    ) values (
      v_folio,
      left(v_usuario ->> 'nombre', 300),
      left(v_usuario ->> 'puesto', 300),
      left(v_usuario ->> 'correo', 300),
      left(v_usuario ->> 'telefono', 300),
      left(v_usuario ->> 'entidadDependencia', 300),
      coalesce(nullif(v_usuario ->> 'fechaCaptura', '')::date, current_date),
      'CONCLUIDO', v_fecha_finalizacion, jsonb_build_object(
        'total_respuestas', (select count(*) from jsonb_object_keys(coalesce(p_payload -> 'respuestas', '{}'::jsonb))),
        'total_archivos', jsonb_array_length(coalesce(p_payload -> 'archivos', '[]'::jsonb)),
        'submittedSections', coalesce(p_payload -> 'submittedSections', '[]'::jsonb)
      ),
      v_acceso.titular_id, v_acceso.nombre, v_acceso.correo,
      v_acceso.clave, v_acceso.anio, v_acceso.id
    ) returning id into v_formulario_id;
  else
    update public.formularios set
      usuario_nombre = left(v_usuario ->> 'nombre', 300),
      usuario_puesto = left(v_usuario ->> 'puesto', 300),
      usuario_correo = left(v_usuario ->> 'correo', 300),
      usuario_telefono = left(v_usuario ->> 'telefono', 300),
      usuario_entidad = left(v_usuario ->> 'entidadDependencia', 300),
      fecha_captura = coalesce(nullif(v_usuario ->> 'fechaCaptura', '')::date, current_date),
      estado = 'CONCLUIDO',
      fecha_finalizacion = v_fecha_finalizacion,
      titular_id = v_acceso.titular_id,
      titular_nombre = v_acceso.nombre,
      titular_correo = v_acceso.correo,
      clave_programa = v_acceso.clave,
      anio_programa = v_acceso.anio,
      metadatos = coalesce(metadatos, '{}'::jsonb) || jsonb_build_object(
        'total_respuestas', (select count(*) from jsonb_object_keys(coalesce(p_payload -> 'respuestas', '{}'::jsonb))),
        'total_archivos', jsonb_array_length(coalesce(p_payload -> 'archivos', '[]'::jsonb)),
        'submittedSections', coalesce(p_payload -> 'submittedSections', '[]'::jsonb)
      )
    where id = v_formulario_id;
  end if;

  for v_respuesta in
    select key, value from jsonb_each(coalesce(p_payload -> 'respuestas', '{}'::jsonb))
  loop
    insert into public.respuestas (
      formulario_id, pregunta_id, seccion_id, pregunta, respuesta, fuente, estado, fecha_actualizacion
    ) values (
      v_formulario_id,
      coalesce(v_respuesta.value ->> 'preguntaId', v_respuesta.key),
      coalesce(v_respuesta.value ->> 'seccionId', ''),
      coalesce(v_respuesta.value ->> 'pregunta', ''),
      v_respuesta.value -> 'valor',
      nullif(v_respuesta.value ->> 'fuente', ''),
      'guardado',
      coalesce(nullif(v_respuesta.value ->> 'fechaActualizacion', '')::timestamptz, v_fecha_finalizacion)
    )
    on conflict (formulario_id, pregunta_id) do update set
      seccion_id = excluded.seccion_id,
      pregunta = excluded.pregunta,
      respuesta = excluded.respuesta,
      fuente = excluded.fuente,
      estado = 'guardado',
      fecha_actualizacion = excluded.fecha_actualizacion;
  end loop;

  for v_archivo in
    select value from jsonb_array_elements(coalesce(p_payload -> 'archivos', '[]'::jsonb))
  loop
    v_archivo_tamanio := coalesce(nullif(v_archivo ->> 'tamanio', '')::bigint, 0);
    if v_archivo_tamanio = 0 then continue; end if;
    if v_archivo_tamanio < 0 or v_archivo_tamanio > 15728640 then
      raise exception 'Tamano de archivo no valido.' using errcode = '22023';
    end if;

    v_archivo_extension := lower(coalesce(v_archivo ->> 'extension', ''));
    if left(v_archivo_extension, 1) <> '.' then v_archivo_extension := '.' || v_archivo_extension; end if;
    if v_archivo_extension not in ('.pdf', '.xls', '.xlsx') then
      raise exception 'Extension de archivo no permitida.' using errcode = '22023';
    end if;

    insert into public.archivos (
      formulario_id, nombre, tipo, tamanio, extension, proveedor_almacenamiento,
      almacenamiento_id, ruta_almacenamiento, estado
    ) values (
      v_formulario_id,
      left(coalesce(v_archivo ->> 'nombre', 'archivo'), 255),
      left(coalesce(v_archivo ->> 'tipo', 'application/octet-stream'), 120),
      v_archivo_tamanio,
      v_archivo_extension,
      coalesce(nullif(v_archivo ->> 'proveedorAlmacenamiento', ''), 'google_drive'),
      nullif(v_archivo ->> 'driveFileId', ''),
      nullif(v_archivo ->> 'url', ''),
      coalesce(nullif(v_archivo ->> 'estado', ''), 'pendiente')
    );
  end loop;

  return jsonb_build_object(
    'success', true,
    'id', v_formulario_id,
    'folio', v_folio,
    'fecha', v_fecha_finalizacion
  );
end;
$$;

revoke all on function public.iniciar_captura_formulario(text) from public;
revoke all on function public.guardar_avance_formulario(text, jsonb) from public;
revoke all on function public.guardar_progreso_formulario(text, jsonb) from public;
revoke all on function public.registrar_formulario(text, jsonb) from public;
grant execute on function public.iniciar_captura_formulario(text) to anon, authenticated;
grant execute on function public.guardar_avance_formulario(text, jsonb) to anon, authenticated;
grant execute on function public.guardar_progreso_formulario(text, jsonb) to anon, authenticated;
grant execute on function public.registrar_formulario(text, jsonb) to anon, authenticated;

revoke all on function public.listar_accesos_captura(text, text) from public;
revoke all on function public.crear_accesos_iniciales(text, text) from public;
revoke all on function public.guardar_acceso_captura(text, text, text, text, text, text) from public;
revoke all on function public.cambiar_estado_acceso_captura(text, text, uuid, boolean) from public;
grant execute on function public.listar_accesos_captura(text, text) to anon, authenticated;
grant execute on function public.crear_accesos_iniciales(text, text) to anon, authenticated;
grant execute on function public.guardar_acceso_captura(text, text, text, text, text, text) to anon, authenticated;
grant execute on function public.cambiar_estado_acceso_captura(text, text, uuid, boolean) to anon, authenticated;

revoke all on public.formularios, public.respuestas, public.archivos from anon, authenticated;
grant select on public.formularios, public.respuestas to authenticated;

drop policy if exists admin_read_formularios on public.formularios;
create policy admin_read_formularios on public.formularios
  for select to authenticated using ((select public.is_admin()));

drop policy if exists admin_read_respuestas on public.respuestas;
create policy admin_read_respuestas on public.respuestas
  for select to authenticated using ((select public.is_admin()));
