create or replace function public.verificar_supabase()
returns boolean
language sql
stable
set search_path = ''
as $$
  select true;
$$;

revoke all on function public.verificar_supabase() from public;
grant execute on function public.verificar_supabase() to anon, authenticated;

alter table public.respuestas
  alter column fuente type varchar(500);

update public.respuestas
set estado = 'guardado'
where estado = 'pendiente_sync';

create or replace function public.registrar_formulario(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_formulario_id uuid := gen_random_uuid();
  v_folio text := coalesce(
    nullif(p_payload ->> 'folio', ''),
    'INEGI-IFPADS-' || to_char(now(), 'YYYY') || '-' || lpad((floor(random() * 900000) + 100000)::text, 6, '0')
  );
  v_usuario jsonb := coalesce(p_payload -> 'usuario', '{}'::jsonb);
  v_respuesta record;
  v_archivo jsonb;
  v_archivo_extension text;
  v_archivo_tamanio bigint;
    v_clave_programa text;
    v_anio_programa text;
    v_asignaciones jsonb;
  v_fecha_finalizacion timestamptz := coalesce(
    nullif(p_payload ->> 'fechaFinalizacion', '')::timestamptz,
    now()
  );
begin
  if p_payload is null or jsonb_typeof(p_payload) <> 'object' then
    raise exception 'El contenido del formulario no es válido.' using errcode = '22023';
  end if;

  if jsonb_typeof(coalesce(p_payload -> 'respuestas', '{}'::jsonb)) <> 'object' then
    raise exception 'Las respuestas del formulario no son válidas.' using errcode = '22023';
  end if;

    if auth.uid() is null then
      raise exception 'Inicia sesión para registrar el formulario.' using errcode = '42501';
    end if;

    v_clave_programa := nullif(p_payload #>> '{respuestas,clave_programa,valor}', '');
    v_anio_programa := nullif(p_payload #>> '{respuestas,anio_captura,valor}', '');
    v_asignaciones := coalesce(auth.jwt() #> '{app_metadata,form_access}', '[]'::jsonb);
    if jsonb_typeof(v_asignaciones) <> 'array' then
      v_asignaciones := '[]'::jsonb;
    end if;

    if v_clave_programa is null or v_anio_programa is null or not exists (
      select 1
      from jsonb_array_elements(v_asignaciones) as assignment(item)
      where assignment.item ->> 'clave' = v_clave_programa
        and assignment.item ->> 'anio' = v_anio_programa
    ) then
      raise exception 'La cuenta no tiene acceso a esa clave y ejercicio.' using errcode = '42501';
    end if;

  insert into public.formularios (
    id,
    folio,
    usuario_nombre,
    usuario_puesto,
    usuario_correo,
    usuario_telefono,
    usuario_entidad,
    fecha_captura,
    estado,
    fecha_finalizacion,
    metadatos
  ) values (
    v_formulario_id,
    v_folio,
    left(v_usuario ->> 'nombre', 300),
    left(v_usuario ->> 'puesto', 300),
    left(v_usuario ->> 'correo', 300),
    left(v_usuario ->> 'telefono', 300),
    left(v_usuario ->> 'entidadDependencia', 300),
    coalesce(nullif(v_usuario ->> 'fechaCaptura', '')::date, current_date),
    'CONCLUIDO',
    v_fecha_finalizacion,
    jsonb_build_object(
      'total_respuestas', (select count(*) from jsonb_object_keys(coalesce(p_payload -> 'respuestas', '{}'::jsonb))),
      'total_archivos', jsonb_array_length(coalesce(p_payload -> 'archivos', '[]'::jsonb))
    )
  );

  for v_respuesta in
    select key, value
    from jsonb_each(coalesce(p_payload -> 'respuestas', '{}'::jsonb))
  loop
    insert into public.respuestas (
      formulario_id,
      pregunta_id,
      seccion_id,
      pregunta,
      respuesta,
      fuente,
      estado,
      fecha_actualizacion
    ) values (
      v_formulario_id,
      coalesce(v_respuesta.value ->> 'preguntaId', v_respuesta.key),
      coalesce(v_respuesta.value ->> 'seccionId', ''),
      coalesce(v_respuesta.value ->> 'pregunta', ''),
      v_respuesta.value -> 'valor',
      nullif(v_respuesta.value ->> 'fuente', ''),
      'guardado',
      coalesce(nullif(v_respuesta.value ->> 'fechaActualizacion', '')::timestamptz, v_fecha_finalizacion)
    );
  end loop;

  for v_archivo in
    select value
    from jsonb_array_elements(coalesce(p_payload -> 'archivos', '[]'::jsonb))
  loop
    v_archivo_tamanio := coalesce(nullif(v_archivo ->> 'tamanio', '')::bigint, 0);
    if v_archivo_tamanio = 0 then
      continue;
    end if;
    if v_archivo_tamanio < 0 or v_archivo_tamanio > 15728640 then
      raise exception 'El tamaño de un archivo adjunto no es válido.' using errcode = '22023';
    end if;

    v_archivo_extension := lower(coalesce(v_archivo ->> 'extension', ''));
    if left(v_archivo_extension, 1) <> '.' then
      v_archivo_extension := '.' || v_archivo_extension;
    end if;
    if v_archivo_extension not in ('.pdf', '.doc', '.docx', '.xls', '.xlsx') then
      raise exception 'La extensión de un archivo adjunto no está permitida.' using errcode = '22023';
    end if;

    insert into public.archivos (
      formulario_id,
      nombre,
      tipo,
      tamanio,
      extension,
      proveedor_almacenamiento,
      almacenamiento_id,
      ruta_almacenamiento,
      estado
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

revoke all on function public.registrar_formulario(jsonb) from public;
revoke all on function public.registrar_formulario(jsonb) from anon;
grant execute on function public.registrar_formulario(jsonb) to authenticated;
drop function if exists public.registrar_formulario(jsonb);

create or replace function public.is_admin()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false);
$$;

revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

revoke all on public.formularios, public.respuestas, public.archivos from anon, authenticated;
grant select on public.formularios, public.respuestas to authenticated;

drop policy if exists admin_read_formularios on public.formularios;
create policy admin_read_formularios
  on public.formularios for select to authenticated
  using ((select public.is_admin()));

drop policy if exists admin_read_respuestas on public.respuestas;
create policy admin_read_respuestas
  on public.respuestas for select to authenticated
  using ((select public.is_admin()));