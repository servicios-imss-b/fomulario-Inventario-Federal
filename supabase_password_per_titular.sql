-- Idempotent migration: one password per titular, multiple allowed key/year assignments.
-- Existing assignments and questionnaire rows remain intact.

alter table public.archivos drop constraint if exists archivos_extension_check;
alter table public.archivos add constraint archivos_extension_check
  check (lower(extension) in ('.pdf', '.doc', '.docx', '.xls', '.xlsx'));

alter table private.form_titulares add column if not exists password_hash text;
alter table private.form_titulares add column if not exists password_cipher text;
alter table private.form_titulares add column if not exists password_activo boolean not null default true;
alter table private.form_titulares add column if not exists password_updated_at timestamptz;

create or replace view private.usuarios with (security_invoker = true) as
select id, nombre, correo, password_hash, password_cipher, password_activo,
       password_updated_at, creado_en, actualizado_en
from private.form_titulares;

revoke all on private.usuarios from public, anon, authenticated;

create or replace function public.guardar_accesos_titular(
  p_usuario text,
  p_admin_password text,
  p_nombre text,
  p_correo text,
  p_assignments jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_titular_id uuid;
  v_password text;
  v_password_hash text;
  v_password_cipher text;
  v_encryption_key text;
  v_correo text := lower(trim(coalesce(p_correo, '')));
  v_nombre text := trim(coalesce(p_nombre, ''));
  v_assignment jsonb;
begin
  if not private.validar_superusuario_reporte(p_usuario, p_admin_password) then
    return jsonb_build_object('success', false, 'error', 'Acceso administrativo no autorizado.');
  end if;
  if v_nombre = '' or v_correo !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    return jsonb_build_object('success', false, 'error', 'Nombre o correo no valido.');
  end if;
  if jsonb_typeof(p_assignments) <> 'array' or jsonb_array_length(p_assignments) = 0 then
    return jsonb_build_object('success', false, 'error', 'Selecciona al menos una clave y un anio.');
  end if;

  for v_assignment in select value from jsonb_array_elements(p_assignments)
  loop
    if v_assignment ->> 'clave' not in ('S313', 'E001', 'U013', 'S200', 'U313', 'E003', 'E004', 'E006')
      or coalesce(v_assignment ->> 'anio', '') !~ '^[0-9]{4}$' then
      return jsonb_build_object('success', false, 'error', 'Una clave o anio no es valido.');
    end if;
  end loop;

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

  v_password := translate(rtrim(encode(extensions.gen_random_bytes(18), 'base64'), '='), '+/', '-_');
  v_password_hash := extensions.crypt(v_password, extensions.gen_salt('bf', 12));
  select secret_value into v_encryption_key
  from private.form_access_config
  where secret_name = 'form_password_encryption_key';
  if v_encryption_key is null then
    raise exception 'No está configurada la clave privada de contraseñas.' using errcode = '55000';
  end if;
  v_password_cipher := encode(extensions.pgp_sym_encrypt(v_password, v_encryption_key), 'base64');

  update private.form_titulares
  set password_hash = v_password_hash,
      password_cipher = v_password_cipher,
      password_activo = true,
      password_updated_at = now(),
      actualizado_en = now()
  where id = v_titular_id;

  update private.form_accesos
  set password_hash = v_password_hash, password_cipher = null, actualizado_en = now()
  where titular_id = v_titular_id;

  for v_assignment in select value from jsonb_array_elements(p_assignments)
  loop
    insert into private.form_accesos (titular_id, clave, anio, password_hash, password_cipher, activo, actualizado_en)
    values (v_titular_id, v_assignment ->> 'clave', v_assignment ->> 'anio', v_password_hash, null, true, now())
    on conflict (titular_id, clave, anio) do update
      set activo = true, password_hash = excluded.password_hash, password_cipher = null, actualizado_en = now();
  end loop;

  update private.form_accesos a
  set activo = false, actualizado_en = now()
  where a.titular_id = v_titular_id and a.activo
    and not exists (
      select 1 from jsonb_array_elements(p_assignments) x
      where x ->> 'clave' = a.clave and x ->> 'anio' = a.anio
    );

  return jsonb_build_object(
    'success', true,
    'titularId', v_titular_id,
    'nombre', left(v_nombre, 300),
    'correo', v_correo,
    'assignments', p_assignments,
    'password', v_password
  );
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
    'titularId', t.id,
    'nombre', t.nombre,
    'correo', t.correo,
    'activo', t.password_activo,
    'password', case
      when t.password_cipher is null then null
      else extensions.pgp_sym_decrypt(decode(t.password_cipher, 'base64'),
        (select secret_value from private.form_access_config where secret_name = 'form_password_encryption_key'))
    end,
    'assignments', coalesce(assignment_list.items, '[]'::jsonb)
  ) order by lower(t.nombre)), '[]'::jsonb)
  into v_accesos
  from private.form_titulares t
  left join lateral (
    select jsonb_agg(jsonb_build_object(
      'id', a.id,
      'clave', a.clave,
      'anio', a.anio,
      'activo', a.activo,
      'estadoFormulario', coalesce(f.estado, 'SIN_INICIAR'),
      'folio', coalesce(f.folio, '')
    ) order by a.clave, a.anio) as items
    from private.form_accesos a
    left join public.formularios f on f.access_credential_id = a.id
    where a.titular_id = t.id
  ) assignment_list on true
  where exists (select 1 from private.form_accesos a where a.titular_id = t.id);

  return jsonb_build_object('success', true, 'accesses', v_accesos);
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
  update private.form_accesos set activo = p_activo, actualizado_en = now() where id = p_access_id;
  if not found then return jsonb_build_object('success', false, 'error', 'No se encontró la asignación.'); end if;
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
  v_titular record;
  v_assignments jsonb;
  v_encryption_key text;
begin
  select secret_value into v_encryption_key
  from private.form_access_config
  where secret_name = 'form_password_encryption_key';

  select id, nombre, correo into v_titular
  from private.form_titulares t
  where t.password_activo
    and (
      (t.password_cipher is not null
        and extensions.pgp_sym_decrypt(decode(t.password_cipher, 'base64'), v_encryption_key) = coalesce(p_password, ''))
      or (t.password_cipher is null
        and t.password_hash = extensions.crypt(coalesce(p_password, ''), t.password_hash))
    )
  limit 1;

  if not found then
    return jsonb_build_object('success', false, 'error', 'Contraseña incorrecta o desactivada.');
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', a.id,
    'clave', a.clave,
    'anio', a.anio,
    'completed', coalesce(f.estado = 'CONCLUIDO', false),
    'folio', coalesce(f.folio, '')
  ) order by a.clave, a.anio), '[]'::jsonb)
  into v_assignments
  from private.form_accesos a
  left join public.formularios f on f.access_credential_id = a.id
  where a.titular_id = v_titular.id and a.activo;

  if jsonb_array_length(v_assignments) = 0 then
    return jsonb_build_object('success', false, 'error', 'Esta contraseña no tiene asignaciones activas.');
  end if;

  return jsonb_build_object(
    'success', true,
    'titularId', v_titular.id,
    'nombre', v_titular.nombre,
    'correo', v_titular.correo,
    'assignments', v_assignments
  );
end;
$$;

create or replace function public.seleccionar_captura_formulario(p_password text, p_access_id uuid)
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
  where a.id = p_access_id
    and a.activo
    and t.password_activo
    and t.password_hash = extensions.crypt(coalesce(p_password, ''), t.password_hash)
  limit 1;
  if not found then return jsonb_build_object('success', false, 'error', 'Contraseña o asignación no válida.'); end if;

  select f.id, f.folio, f.estado, f.metadatos
  into v_formulario_id, v_folio, v_estado, v_metadatos
  from public.formularios f where f.access_credential_id = v_acceso.id;
  if v_estado = 'CONCLUIDO' then
    return jsonb_build_object('success', true, 'completed', true, 'clave', v_acceso.clave, 'anio', v_acceso.anio, 'folio', v_folio);
  end if;

  if v_formulario_id is null then
    v_folio := 'BORRADOR-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 18));
    insert into public.formularios (
      folio, estado, titular_id, titular_nombre, titular_correo, clave_programa, anio_programa, access_credential_id
    ) values (
      v_folio, 'EN_CAPTURA', v_acceso.titular_id, v_acceso.nombre, v_acceso.correo,
      v_acceso.clave, v_acceso.anio, v_acceso.id
    ) returning id into v_formulario_id;
    v_metadatos := '{}'::jsonb;
  end if;

  insert into private.form_access_events (credential_id, formulario_id, titular_id, clave, anio)
  values (v_acceso.id, v_formulario_id, v_acceso.titular_id, v_acceso.clave, v_acceso.anio)
  returning id into v_entry_id;

  select coalesce(jsonb_object_agg(r.pregunta_id, jsonb_build_object(
    'preguntaId', r.pregunta_id, 'seccionId', r.seccion_id, 'pregunta', r.pregunta,
    'valor', r.respuesta, 'fuente', r.fuente, 'fechaActualizacion', r.fecha_actualizacion, 'estado', r.estado
  )), '{}'::jsonb) into v_respuestas
  from public.respuestas r where r.formulario_id = v_formulario_id;

  return jsonb_build_object(
    'success', true, 'completed', false, 'credentialId', v_acceso.id, 'entryId', v_entry_id,
    'titularId', v_acceso.titular_id, 'nombre', v_acceso.nombre, 'correo', v_acceso.correo,
    'clave', v_acceso.clave, 'anio', v_acceso.anio, 'formularioId', v_formulario_id,
    'folio', coalesce(v_folio, ''),
    'submittedSections', coalesce(v_metadatos -> 'submittedSections', '[]'::jsonb),
    'answers', v_respuestas
  );
end;
$$;

-- Drop old password-only signatures so a stale client cannot bypass access_id.
drop function if exists public.guardar_avance_formulario(text, jsonb);
drop function if exists public.guardar_progreso_formulario(text, jsonb);
drop function if exists public.registrar_formulario(text, jsonb);
drop function if exists public.guardar_acceso_captura(text, text, text, text, text, text);
drop function if exists public.crear_accesos_iniciales(text, text);

create or replace function public.guardar_avance_formulario(p_password text, p_access_id uuid, p_respuesta jsonb)
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
    raise exception 'Respuesta no válida.' using errcode = '22023';
  end if;
  select a.id, a.titular_id, a.clave, a.anio, t.nombre, t.correo
  into v_acceso from private.form_accesos a join private.form_titulares t on t.id = a.titular_id
  where a.id = p_access_id and a.activo and t.password_activo
    and t.password_hash = extensions.crypt(coalesce(p_password, ''), t.password_hash) limit 1;
  if not found then raise exception 'Contraseña o asignación no válida.' using errcode = '42501'; end if;
  if (v_pregunta_id = 'clave_programa' and v_valor <> v_acceso.clave)
    or (v_pregunta_id = 'anio_captura' and v_valor <> v_acceso.anio) then
    raise exception 'La clave y el año deben corresponder a la asignación.' using errcode = '42501';
  end if;
  select f.id, f.folio, f.estado into v_formulario_id, v_folio, v_estado
  from public.formularios f where f.access_credential_id = v_acceso.id for update;
  if v_estado = 'CONCLUIDO' then raise exception 'Este cuestionario ya fue concluido.' using errcode = '42501'; end if;
  if v_formulario_id is null then
    v_folio := 'BORRADOR-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 18));
    insert into public.formularios (folio, estado, titular_id, titular_nombre, titular_correo, clave_programa, anio_programa, access_credential_id)
    values (v_folio, 'EN_CAPTURA', v_acceso.titular_id, v_acceso.nombre, v_acceso.correo, v_acceso.clave, v_acceso.anio, v_acceso.id)
    returning id into v_formulario_id;
  end if;
  insert into public.respuestas (formulario_id, pregunta_id, seccion_id, pregunta, respuesta, fuente, estado, fecha_actualizacion)
  values (v_formulario_id, v_pregunta_id, coalesce(p_respuesta ->> 'seccionId', ''), coalesce(p_respuesta ->> 'pregunta', ''),
    p_respuesta -> 'valor', nullif(p_respuesta ->> 'fuente', ''), 'guardado', coalesce(nullif(p_respuesta ->> 'fechaActualizacion', '')::timestamptz, now()))
  on conflict (formulario_id, pregunta_id) do update set seccion_id = excluded.seccion_id, pregunta = excluded.pregunta,
    respuesta = excluded.respuesta, fuente = excluded.fuente, estado = 'guardado', fecha_actualizacion = excluded.fecha_actualizacion;
  update public.formularios f set
    usuario_nombre = case when v_pregunta_id = '1' then left(v_valor, 300) else f.usuario_nombre end,
    usuario_puesto = case when v_pregunta_id = '2' then left(v_valor, 300) else f.usuario_puesto end,
    usuario_correo = case when v_pregunta_id = '3' then left(v_valor, 300) else f.usuario_correo end,
    usuario_telefono = case when v_pregunta_id = '4' then left(v_valor, 300) else f.usuario_telefono end,
    fecha_captura = case when v_pregunta_id = '5' and v_valor ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then v_valor::date else f.fecha_captura end,
    metadatos = coalesce(f.metadatos, '{}'::jsonb) || jsonb_build_object(
      'total_respuestas', (select count(*) from public.respuestas r where r.formulario_id = f.id),
      'total_archivos', (select count(*) from public.archivos a where a.formulario_id = f.id))
  where f.id = v_formulario_id;
  return jsonb_build_object('success', true, 'formularioId', v_formulario_id, 'folio', v_folio);
end;
$$;

create or replace function public.guardar_progreso_formulario(p_password text, p_access_id uuid, p_submitted_sections jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare v_acceso record; v_formulario_id uuid; v_folio text; v_estado text;
begin
  if jsonb_typeof(p_submitted_sections) <> 'array' then raise exception 'Progreso no válido.' using errcode = '22023'; end if;
  select a.id, a.titular_id, a.clave, a.anio, t.nombre, t.correo
  into v_acceso from private.form_accesos a join private.form_titulares t on t.id = a.titular_id
  where a.id = p_access_id and a.activo and t.password_activo
    and t.password_hash = extensions.crypt(coalesce(p_password, ''), t.password_hash) limit 1;
  if not found then raise exception 'Contraseña o asignación no válida.' using errcode = '42501'; end if;
  select f.id, f.folio, f.estado into v_formulario_id, v_folio, v_estado
  from public.formularios f where f.access_credential_id = v_acceso.id for update;
  if v_estado = 'CONCLUIDO' then raise exception 'Este cuestionario ya fue concluido.' using errcode = '42501'; end if;
  if v_formulario_id is null then
    v_folio := 'BORRADOR-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 18));
    insert into public.formularios (folio, estado, titular_id, titular_nombre, titular_correo, clave_programa, anio_programa, access_credential_id)
    values (v_folio, 'EN_CAPTURA', v_acceso.titular_id, v_acceso.nombre, v_acceso.correo, v_acceso.clave, v_acceso.anio, v_acceso.id)
    returning id into v_formulario_id;
  end if;
  update public.formularios set metadatos = coalesce(metadatos, '{}'::jsonb) || jsonb_build_object('submittedSections', p_submitted_sections)
  where id = v_formulario_id;
  return jsonb_build_object('success', true, 'formularioId', v_formulario_id, 'folio', v_folio);
end;
$$;

create or replace function public.registrar_formulario(p_password text, p_access_id uuid, p_payload jsonb)
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
  into v_acceso from private.form_accesos a join private.form_titulares t on t.id = a.titular_id
  where a.id = p_access_id and a.activo and t.password_activo
    and t.password_hash = extensions.crypt(coalesce(p_password, ''), t.password_hash) limit 1;
  if not found then raise exception 'Contraseña o asignación no válida.' using errcode = '42501'; end if;
  if nullif(p_payload #>> '{respuestas,clave_programa,valor}', '') is distinct from v_acceso.clave
    or nullif(p_payload #>> '{respuestas,anio_captura,valor}', '') is distinct from v_acceso.anio then
    raise exception 'La clave y el año no corresponden a esta contraseña.' using errcode = '42501';
  end if;
  select f.id, f.folio, f.estado into v_formulario_id, v_folio, v_estado
  from public.formularios f where f.access_credential_id = v_acceso.id for update;
  if v_estado = 'CONCLUIDO' then raise exception 'Este cuestionario ya fue concluido y no admite cambios.' using errcode = '42501'; end if;
  if v_formulario_id is null then
    v_folio := coalesce(nullif(p_payload ->> 'folio', ''), 'INEGI-IFPADS-' || to_char(now(), 'YYYY') || '-' || lpad((floor(random() * 900000) + 100000)::text, 6, '0'));
    insert into public.formularios (
      folio, usuario_nombre, usuario_puesto, usuario_correo, usuario_telefono, usuario_entidad, fecha_captura,
      estado, fecha_finalizacion, metadatos, titular_id, titular_nombre, titular_correo, clave_programa, anio_programa, access_credential_id
    ) values (
      v_folio, left(v_usuario ->> 'nombre', 300), left(v_usuario ->> 'puesto', 300), left(v_usuario ->> 'correo', 300),
      left(v_usuario ->> 'telefono', 300), left(v_usuario ->> 'entidadDependencia', 300),
      coalesce(nullif(v_usuario ->> 'fechaCaptura', '')::date, current_date), 'CONCLUIDO', v_fecha_finalizacion,
      jsonb_build_object('total_respuestas', (select count(*) from jsonb_object_keys(coalesce(p_payload -> 'respuestas', '{}'::jsonb))),
        'total_archivos', jsonb_array_length(coalesce(p_payload -> 'archivos', '[]'::jsonb)), 'submittedSections', coalesce(p_payload -> 'submittedSections', '[]'::jsonb)),
      v_acceso.titular_id, v_acceso.nombre, v_acceso.correo, v_acceso.clave, v_acceso.anio, v_acceso.id
    ) returning id into v_formulario_id;
  else
    update public.formularios set usuario_nombre = left(v_usuario ->> 'nombre', 300), usuario_puesto = left(v_usuario ->> 'puesto', 300),
      usuario_correo = left(v_usuario ->> 'correo', 300), usuario_telefono = left(v_usuario ->> 'telefono', 300),
      usuario_entidad = left(v_usuario ->> 'entidadDependencia', 300),
      fecha_captura = coalesce(nullif(v_usuario ->> 'fechaCaptura', '')::date, current_date), estado = 'CONCLUIDO',
      fecha_finalizacion = v_fecha_finalizacion, titular_id = v_acceso.titular_id, titular_nombre = v_acceso.nombre,
      titular_correo = v_acceso.correo, clave_programa = v_acceso.clave, anio_programa = v_acceso.anio,
      metadatos = coalesce(metadatos, '{}'::jsonb) || jsonb_build_object(
        'total_respuestas', (select count(*) from jsonb_object_keys(coalesce(p_payload -> 'respuestas', '{}'::jsonb))),
        'total_archivos', jsonb_array_length(coalesce(p_payload -> 'archivos', '[]'::jsonb)),
        'submittedSections', coalesce(p_payload -> 'submittedSections', '[]'::jsonb))
    where id = v_formulario_id;
  end if;
  for v_respuesta in select key, value from jsonb_each(coalesce(p_payload -> 'respuestas', '{}'::jsonb))
  loop
    insert into public.respuestas (formulario_id, pregunta_id, seccion_id, pregunta, respuesta, fuente, estado, fecha_actualizacion)
    values (v_formulario_id, coalesce(v_respuesta.value ->> 'preguntaId', v_respuesta.key),
      coalesce(v_respuesta.value ->> 'seccionId', ''), coalesce(v_respuesta.value ->> 'pregunta', ''),
      v_respuesta.value -> 'valor', nullif(v_respuesta.value ->> 'fuente', ''), 'guardado',
      coalesce(nullif(v_respuesta.value ->> 'fechaActualizacion', '')::timestamptz, v_fecha_finalizacion))
    on conflict (formulario_id, pregunta_id) do update set seccion_id = excluded.seccion_id, pregunta = excluded.pregunta,
      respuesta = excluded.respuesta, fuente = excluded.fuente, estado = 'guardado', fecha_actualizacion = excluded.fecha_actualizacion;
  end loop;
  for v_archivo in select value from jsonb_array_elements(coalesce(p_payload -> 'archivos', '[]'::jsonb))
  loop
    v_archivo_tamanio := coalesce(nullif(v_archivo ->> 'tamanio', '')::bigint, 0);
    if v_archivo_tamanio = 0 then continue; end if;
    if v_archivo_tamanio < 0 or v_archivo_tamanio > 15728640 then raise exception 'Tamano de archivo no valido.' using errcode = '22023'; end if;
    v_archivo_extension := lower(coalesce(v_archivo ->> 'extension', ''));
    if left(v_archivo_extension, 1) <> '.' then v_archivo_extension := '.' || v_archivo_extension; end if;
    if v_archivo_extension not in ('.pdf', '.doc', '.docx', '.xls', '.xlsx') then raise exception 'Extension de archivo no permitida.' using errcode = '22023'; end if;
    insert into public.archivos (formulario_id, nombre, tipo, tamanio, extension, proveedor_almacenamiento, almacenamiento_id, ruta_almacenamiento, estado)
    values (v_formulario_id, left(coalesce(v_archivo ->> 'nombre', 'archivo'), 255), left(coalesce(v_archivo ->> 'tipo', 'application/octet-stream'), 120),
      v_archivo_tamanio, v_archivo_extension,
      coalesce(nullif(v_archivo ->> 'proveedorAlmacenamiento', ''),
        case when nullif(v_archivo ->> 'driveFileId', '') is not null then 'google_drive' else 'supabase_storage' end),
      coalesce(nullif(v_archivo ->> 'almacenamientoId', ''), nullif(v_archivo ->> 'driveFileId', '')),
      coalesce(nullif(v_archivo ->> 'storagePath', ''), nullif(v_archivo ->> 'rutaAlmacenamiento', ''), nullif(v_archivo ->> 'url', '')),
      coalesce(nullif(v_archivo ->> 'estado', ''), 'pendiente'));
  end loop;
  return jsonb_build_object('success', true, 'id', v_formulario_id, 'folio', v_folio, 'fecha', v_fecha_finalizacion);
end;
$$;

revoke all on function public.iniciar_captura_formulario(text) from public;
revoke all on function public.seleccionar_captura_formulario(text, uuid) from public;
revoke all on function public.guardar_accesos_titular(text, text, text, text, jsonb) from public;
revoke all on function public.guardar_avance_formulario(text, uuid, jsonb) from public;
revoke all on function public.guardar_progreso_formulario(text, uuid, jsonb) from public;
revoke all on function public.registrar_formulario(text, uuid, jsonb) from public;
grant execute on function public.iniciar_captura_formulario(text) to anon, authenticated;
grant execute on function public.seleccionar_captura_formulario(text, uuid) to anon, authenticated;
grant execute on function public.guardar_accesos_titular(text, text, text, text, jsonb) to anon, authenticated;
grant execute on function public.guardar_avance_formulario(text, uuid, jsonb) to anon, authenticated;
grant execute on function public.guardar_progreso_formulario(text, uuid, jsonb) to anon, authenticated;
grant execute on function public.registrar_formulario(text, uuid, jsonb) to anon, authenticated;
