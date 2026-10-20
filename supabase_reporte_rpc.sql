-- Reporte relacional sin Edge Function: ejecutar en el SQL Editor de Supabase.
-- Las credenciales del reporte viven en un esquema privado, no expuesto por la API.

create extension if not exists pgcrypto with schema extensions;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists private.reporte_acceso (
  usuario text primary key,
  password_hash text not null,
  intentos_fallidos integer not null default 0,
  bloqueado_hasta timestamptz
);

revoke all on private.reporte_acceso from public, anon, authenticated;

create or replace function public.validar_reporte_relacional(p_usuario text, p_password text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_acceso private.reporte_acceso%rowtype;
begin
  select * into v_acceso
  from private.reporte_acceso
  where usuario = coalesce(p_usuario, '')
  for update;

  if found and v_acceso.bloqueado_hasta is not null and v_acceso.bloqueado_hasta > now() then
    return jsonb_build_object('success', false, 'error', 'Demasiados intentos. Espera un minuto e inténtalo de nuevo.');
  end if;

  if not found or v_acceso.password_hash <> extensions.crypt(coalesce(p_password, ''), v_acceso.password_hash) then
    if found then
      update private.reporte_acceso
      set intentos_fallidos = intentos_fallidos + 1,
          bloqueado_hasta = case when intentos_fallidos + 1 >= 8 then now() + interval '1 minute' else null end
      where usuario = v_acceso.usuario;
    end if;
    return jsonb_build_object('success', false, 'error', 'Usuario o contraseña incorrectos.');
  end if;

  update private.reporte_acceso
  set intentos_fallidos = 0, bloqueado_hasta = null
  where usuario = v_acceso.usuario;

  return jsonb_build_object('success', true);
end;
$$;

revoke all on function public.validar_reporte_relacional(text, text) from public;
grant execute on function public.validar_reporte_relacional(text, text) to anon, authenticated;

create or replace function public.validar_reporte_relacional(p_usuario text, p_password text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_acceso private.reporte_acceso%rowtype;
begin
  select * into v_acceso
  from private.reporte_acceso
  where usuario = coalesce(p_usuario, '')
  for update;

  if found and v_acceso.bloqueado_hasta is not null and v_acceso.bloqueado_hasta > now() then
    return jsonb_build_object('success', false, 'error', 'Demasiados intentos. Espera un minuto e inténtalo de nuevo.');
  end if;

  if not found or v_acceso.password_hash <> extensions.crypt(coalesce(p_password, ''), v_acceso.password_hash) then
    if found then
      update private.reporte_acceso
      set intentos_fallidos = intentos_fallidos + 1,
          bloqueado_hasta = case when intentos_fallidos + 1 >= 8 then now() + interval '1 minute' else null end
      where usuario = v_acceso.usuario;
    end if;
    return jsonb_build_object('success', false, 'error', 'Usuario o contraseña incorrectos.');
  end if;

  update private.reporte_acceso
  set intentos_fallidos = 0, bloqueado_hasta = null
  where usuario = v_acceso.usuario;

  return jsonb_build_object('success', true);
end;
$$;

revoke all on function public.validar_reporte_relacional(text, text) from public;
grant execute on function public.validar_reporte_relacional(text, text) to anon, authenticated;

alter table public.formularios add column if not exists titular_nombre varchar(300);
alter table public.formularios add column if not exists titular_correo varchar(320);
alter table public.formularios add column if not exists clave_programa varchar(20);
alter table public.formularios add column if not exists anio_programa varchar(4);

-- Alta o cambio de credenciales (sustituye los valores antes de ejecutar; no guardes la contraseña en el repositorio):
-- insert into private.reporte_acceso (usuario, password_hash)
-- values ('USUARIO', extensions.crypt('CONTRASEÑA_FUERTE', extensions.gen_salt('bf')))
-- on conflict (usuario) do update
--   set password_hash = excluded.password_hash, intentos_fallidos = 0, bloqueado_hasta = null;

create or replace function public.obtener_reporte_relacional(p_usuario text, p_password text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_acceso private.reporte_acceso%rowtype;
  v_filas jsonb;
begin
  select * into v_acceso
  from private.reporte_acceso
  where usuario = coalesce(p_usuario, '')
  for update;

  if found and v_acceso.bloqueado_hasta is not null and v_acceso.bloqueado_hasta > now() then
    return jsonb_build_object('success', false, 'error', 'Demasiados intentos. Espera un minuto e inténtalo de nuevo.');
  end if;

  if not found or v_acceso.password_hash <> extensions.crypt(coalesce(p_password, ''), v_acceso.password_hash) then
    if found then
      update private.reporte_acceso
      set intentos_fallidos = intentos_fallidos + 1,
          bloqueado_hasta = case when intentos_fallidos + 1 >= 8 then now() + interval '1 minute' else null end
      where usuario = v_acceso.usuario;
    end if;
    return jsonb_build_object('success', false, 'error', 'Usuario o contraseña incorrectos.');
  end if;

  update private.reporte_acceso
  set intentos_fallidos = 0, bloqueado_hasta = null
  where usuario = v_acceso.usuario;

  with archivos_por_formulario as (
    select a.formulario_id,
           jsonb_agg(jsonb_build_object(
             'nombre', a.nombre,
             'tipo', a.tipo,
             'tamanio', a.tamanio,
             'extension', a.extension,
             'proveedor', a.proveedor_almacenamiento,
             'almacenamiento_id', a.almacenamiento_id,
             'ruta', a.ruta_almacenamiento,
             'fecha_carga', a.fecha_carga,
             'estado', a.estado
           ) order by a.fecha_carga) as archivos
    from public.archivos a
    group by a.formulario_id
  ),
  datos_formulario as (
    select r.formulario_id,
           max(case when r.pregunta_id = 'clave_programa' then coalesce(r.respuesta #>> '{}', '') end) as programa,
           max(case when r.pregunta_id = 'anio_captura' then coalesce(r.respuesta #>> '{}', '') end) as anio
    from public.respuestas r
    group by r.formulario_id
  )
  select coalesce(jsonb_agg(jsonb_build_object(
           'formulario_id', f.id,
           'folio', f.folio,
           'programa', coalesce(d.programa, ''),
           'anio', coalesce(d.anio, ''),
           'usuario_nombre', coalesce(f.usuario_nombre, ''),
           'usuario_puesto', coalesce(f.usuario_puesto, ''),
           'usuario_correo', coalesce(f.usuario_correo, ''),
           'titular_nombre', coalesce(f.titular_nombre, ''),
           'titular_correo', coalesce(f.titular_correo, ''),
           'clave_programa', coalesce(f.clave_programa, d.programa, ''),
           'anio_programa', coalesce(f.anio_programa, d.anio, ''),
           'usuario_telefono', coalesce(f.usuario_telefono, ''),
           'usuario_entidad', coalesce(f.usuario_entidad, ''),
           'fecha_captura', coalesce(f.fecha_captura::text, ''),
           'fecha_creacion', f.fecha_creacion,
           'fecha_finalizacion', coalesce(f.fecha_finalizacion::text, ''),
           'estado', f.estado,
           'pregunta_id', coalesce(r.pregunta_id, ''),
           'seccion_id', coalesce(r.seccion_id, ''),
           'pregunta', coalesce(r.pregunta, ''),
           'respuesta', case
             when r.respuesta is null or jsonb_typeof(r.respuesta) = 'null' then ''
             when jsonb_typeof(r.respuesta) = 'string' then r.respuesta #>> '{}'
             else r.respuesta::text
           end,
           'fuente', coalesce(r.fuente, ''),
           'fecha_actualizacion', coalesce(r.fecha_actualizacion::text, ''),
           'archivos', coalesce(ap.archivos, '[]'::jsonb)::text
         ) order by f.fecha_creacion desc, r.pregunta_id), '[]'::jsonb)
  into v_filas
  from public.formularios f
  left join public.respuestas r on r.formulario_id = f.id
  left join datos_formulario d on d.formulario_id = f.id
  left join archivos_por_formulario ap on ap.formulario_id = f.id;

  return jsonb_build_object('success', true, 'rows', v_filas);
end;
$$;

revoke all on function public.obtener_reporte_relacional(text, text) from public;
grant execute on function public.obtener_reporte_relacional(text, text) to anon, authenticated;
