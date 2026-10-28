-- ═══════════════════════════════════════════════════════════════
--  PCR · Actualización a la app del encargado político
--  ─────────────────────────────────────────────────────────────
--  Versión 2.3 (datos completos de aspirantes: correo, edad,
--  ciudad, ocupación, escuela, motivo; antes: categoría y folio de
--  militantes, canal y descarte de aspirantes). Si ya habías corrido la versión anterior, córrelo
--  otra vez completo: solo agrega lo que falta.
--
--  Corre este archivo en el SQL Editor de tu Supabase:
--    1. supabase.com → tu proyecto → "SQL Editor"
--    2. Pega TODO este archivo y presiona "Run"
--
--  · No borra nada de lo que ya tienes (militantes, pagos,
--    remisiones y catálogos se quedan como están).
--  · Si lo corres dos veces no pasa nada: no duplica datos.
--  · Al final carga tus actas y órdenes del día de septiembre
--    y octubre de 2026 (solo si aún no hay reuniones guardadas).
-- ═══════════════════════════════════════════════════════════════


-- ═══ 0. Cambios anteriores (por si alguno no se aplicó) ═══════

alter table militantes add column if not exists foto_path    text default '';
alter table militantes add column if not exists ciudad       text default '';
alter table militantes add column if not exists estado       text default '';
alter table militantes add column if not exists actividad_id uuid;

create table if not exists actividades (
  id         uuid primary key default gen_random_uuid(),
  nombre     text not null unique,
  creado_en  timestamptz not null default now()
);

alter table militantes drop constraint if exists fk_militantes_actividad;
alter table militantes
  add constraint fk_militantes_actividad
  foreign key (actividad_id) references actividades(id) on delete set null;

insert into storage.buckets (id, name, public)
values ('avatares', 'avatares', false)
on conflict (id) do nothing;

drop policy if exists "avatares_select" on storage.objects;
create policy "avatares_select" on storage.objects for select using (bucket_id = 'avatares');
drop policy if exists "avatares_insert" on storage.objects;
create policy "avatares_insert" on storage.objects for insert with check (bucket_id = 'avatares');
drop policy if exists "avatares_update" on storage.objects;
create policy "avatares_update" on storage.objects for update using (bucket_id = 'avatares');
drop policy if exists "avatares_delete" on storage.objects;
create policy "avatares_delete" on storage.objects for delete using (bucket_id = 'avatares');


-- v2.2: datos que pide la hoja "Crecimiento Regional"
alter table militantes add column if not exists categoria      text default '';  -- media_superior | universitario | trabajador | desempleado | retirado
alter table militantes add column if not exists responsable_id uuid;
alter table militantes add column if not exists folio          text default '';
alter table militantes drop constraint if exists fk_militantes_responsable;
alter table militantes
  add constraint fk_militantes_responsable
  foreign key (responsable_id) references militantes(id) on delete set null;

-- Los que ya estaban como "Trabajador" se llevan esa categoría
update militantes set categoria = 'trabajador'
where condicion = 'militante_trabajador' and coalesce(categoria, '') = '';

-- Responsabilidades del GB (solo agrega las que no tengas ya)
insert into actividades (nombre)
select v.nombre from (values
  ('Responsable Político'), ('Encargado de Finanzas'), ('Responsable de Prensa'),
  ('Fondo de Lucha'), ('Redes Sociales'), ('Militante')
) as v(nombre)
where not exists (
  select 1 from actividades a
  where lower(a.nombre) = lower(v.nombre)
     or (v.nombre = 'Responsable de Prensa' and lower(a.nombre) like '%prensa%')
);


-- ═══ 1. Materiales de estudio (biblioteca) ════════════════════

create table if not exists materiales (
  id              uuid primary key default gen_random_uuid(),
  titulo          text not null,
  autor           text default '',
  tipo            text not null default 'texto',   -- libro | capitulo | articulo | texto | otro
  archivo_path    text default '',                 -- ruta en Storage (bucket documentos)
  archivo_nombre  text default '',
  notas           text default '',
  creado_en       timestamptz not null default now()
);


-- ═══ 2. Reuniones: orden del día + acta en un mismo registro ══

create table if not exists reuniones (
  id                     uuid primary key default gen_random_uuid(),
  fecha                  date not null,
  hora                   text not null default '21:00',
  zona_horaria           text not null default 'Hora del Pacífico',
  ambito                 text not null default 'GB',          -- GB | CG | otro
  sesion                 text not null default 'ordinaria',   -- ordinaria | extraordinaria
  lugar                  text default '',
  mesa                   text default '',
  actas_responsable      text default '',
  -- Discusión política
  discusion_tema         text default '',
  discusion_expone       text default '',
  discusion_continuacion boolean not null default false,
  material_id            uuid references materiales(id) on delete set null,
  -- Acta (se llena después de la reunión)
  acta_lista             boolean not null default false,
  asistentes             text[] not null default '{}',
  acta_notas             text default '',
  acta_archivo_path      text default '',
  acta_archivo_nombre    text default '',
  creado_en              timestamptz not null default now()
);

-- Puntos Organizativo / Varios de la orden del día
create table if not exists puntos_reunion (
  id           uuid primary key default gen_random_uuid(),
  reunion_id   uuid not null references reuniones(id) on delete cascade,
  categoria    text not null default 'varios',   -- organizativo | varios
  texto        text not null,
  responsable  text default '',
  orden        int not null default 0,
  origen       text not null default 'manual',   -- fijo | acuerdo | tarea | manual
  origen_id    uuid,                             -- acuerdo/tarea que lo originó
  resultado    text default '',                  -- lo que se dijo (opcional, en el acta)
  creado_en    timestamptz not null default now()
);

-- Acuerdos y tareas que salen de cada acta
create table if not exists acuerdos (
  id                    uuid primary key default gen_random_uuid(),
  reunion_id            uuid not null references reuniones(id) on delete cascade,
  tipo                  text not null default 'acuerdo',    -- acuerdo | tarea
  texto                 text not null,
  responsable           text default '',
  fecha_limite          date,
  estado                text not null default 'pendiente',  -- pendiente | cumplido | descartado
  cumplido_en           date,
  llevado_a_reunion_id  uuid references reuniones(id) on delete set null,
  orden                 int not null default 0,
  creado_en             timestamptz not null default now()
);

-- Puntos fijos que se repiten en cada orden del día
create table if not exists plantilla_puntos (
  id           uuid primary key default gen_random_uuid(),
  categoria    text not null default 'organizativo',
  texto        text not null,
  responsable  text default '',
  orden        int not null default 0,
  activo       boolean not null default true,
  creado_en    timestamptz not null default now()
);


-- ═══ 3. Aspirantes (nuevo ingreso) ════════════════════════════

create table if not exists aspirantes (
  id              uuid primary key default gen_random_uuid(),
  nombre          text not null,
  telefono        text default '',
  como_llego      text default '',
  estado          text not null default 'contactado',  -- contactado | en_seguimiento | incorporado | descartado
  notas           text default '',
  proxima_accion  date,
  militante_id    uuid references militantes(id) on delete set null,
  incorporado_en  date,
  creado_en       timestamptz not null default now()
);

create table if not exists contactos_aspirante (
  id           uuid primary key default gen_random_uuid(),
  aspirante_id uuid not null references aspirantes(id) on delete cascade,
  fecha        date not null default current_date,
  medio        text not null default 'llamada',   -- llamada | whatsapp | en_persona | otro
  notas        text default '',
  creado_en    timestamptz not null default now()
);

-- v2.1: de dónde llegó (etiqueta), quién lo refirió y por qué se descartó
alter table aspirantes add column if not exists canal           text default '';  -- facebook | instagram | tiktok | web | referido | otro
alter table aspirantes add column if not exists referido_por    text default '';
alter table aspirantes add column if not exists motivo_descarte text default '';
alter table aspirantes add column if not exists descartado_en   date;

-- v2.3: datos completos del formulario de la comisión
alter table aspirantes add column if not exists correo          text default '';
alter table aspirantes add column if not exists edad            text default '';  -- rango, ej. 15-17
alter table aspirantes add column if not exists estado_rep      text default '';  -- estado de la república
alter table aspirantes add column if not exists ciudad          text default '';
alter table aspirantes add column if not exists ocupacion       text default '';
alter table aspirantes add column if not exists escuela_trabajo text default '';
alter table aspirantes add column if not exists motivo          text default '';
alter table aspirantes add column if not exists fecha_registro  date;


-- ═══ 4. Actividades del grupo base (lo que hacemos) ═══════════
--  Ojo: la tabla "actividades" ya existe y es el catálogo de
--  CARGOS de cada militante. Esta es otra cosa: el registro de
--  trabajo del GB (pegas, eventos, formación…).

create table if not exists tipos_actividad (
  id         uuid primary key default gen_random_uuid(),
  nombre     text not null unique,
  color      text not null default '#5B8DD9',
  creado_en  timestamptz not null default now()
);

create table if not exists registro_actividades (
  id             uuid primary key default gen_random_uuid(),
  fecha          date not null default current_date,
  tipo_id        uuid references tipos_actividad(id) on delete set null,
  titulo         text not null,
  lugar          text default '',
  participantes  text default '',
  cantidad       numeric,
  unidad         text default '',
  acuerdo_id     uuid references acuerdos(id) on delete set null,
  notas          text default '',
  creado_en      timestamptz not null default now()
);


-- ═══ 5. Índices ═══════════════════════════════════════════════

create index if not exists idx_reuniones_fecha       on reuniones(fecha);
create index if not exists idx_puntos_reunion        on puntos_reunion(reunion_id);
create index if not exists idx_acuerdos_reunion      on acuerdos(reunion_id);
create index if not exists idx_acuerdos_estado       on acuerdos(estado);
create index if not exists idx_contactos_aspirante   on contactos_aspirante(aspirante_id);
create index if not exists idx_registro_act_fecha    on registro_actividades(fecha);


-- ═══ 6. Permisos para la app (mismo nivel que tus tablas actuales) ═

grant select, insert, update, delete on
  materiales, reuniones, puntos_reunion, acuerdos, plantilla_puntos,
  aspirantes, contactos_aspirante, tipos_actividad, registro_actividades
  to anon, authenticated;

-- Mismo esquema de acceso que tus tablas actuales. La seguridad con
-- inicio de sesión (RLS) se agrega al final, en su propia actualización.
alter table materiales            disable row level security;
alter table reuniones             disable row level security;
alter table puntos_reunion        disable row level security;
alter table acuerdos              disable row level security;
alter table plantilla_puntos      disable row level security;
alter table aspirantes            disable row level security;
alter table contactos_aspirante   disable row level security;
alter table tipos_actividad       disable row level security;
alter table registro_actividades  disable row level security;


-- ═══ 7. Almacenamiento para actas en Word/PDF y materiales ════

insert into storage.buckets (id, name, public)
values ('documentos', 'documentos', false)
on conflict (id) do nothing;

drop policy if exists "documentos_select" on storage.objects;
create policy "documentos_select" on storage.objects for select using (bucket_id = 'documentos');
drop policy if exists "documentos_insert" on storage.objects;
create policy "documentos_insert" on storage.objects for insert with check (bucket_id = 'documentos');
drop policy if exists "documentos_update" on storage.objects;
create policy "documentos_update" on storage.objects for update using (bucket_id = 'documentos');
drop policy if exists "documentos_delete" on storage.objects;
create policy "documentos_delete" on storage.objects for delete using (bucket_id = 'documentos');


-- ═══ 8. Datos iniciales ═══════════════════════════════════════

-- Plantilla de la orden del día (puntos que se repiten cada semana)
insert into plantilla_puntos (categoria, texto, responsable, orden)
select * from (values
  ('organizativo', 'Seguimiento de responsabilidades de Prensa',   'Alfredo', 1),
  ('organizativo', 'Seguimiento de responsabilidades de Finanzas', 'Daniela', 2),
  ('organizativo', 'Seguimiento de responsabilidades Políticas',   'Manuel',  3),
  ('varios',       'Boletín interno',                              'Ángela',  4),
  ('varios',       'Boletín internacional',                        'Alfredo', 5)
) as v(categoria, texto, responsable, orden)
where not exists (select 1 from plantilla_puntos);

-- Tipos de actividad
insert into tipos_actividad (nombre, color) values
  ('Propaganda / pega',        '#B22222'),
  ('Evento',                   '#5B8DD9'),
  ('Formación',                '#9B59B6'),
  ('Contacto / nuevo ingreso', '#C17D2A'),
  ('Prensa y boletos',         '#3DAF7D')
on conflict (nombre) do nothing;


-- Tus actas y órdenes del día (06-sep, 17-sep, 25-sep y 02-oct de 2026)
do $$
declare
  r1 uuid; r2 uuid; r3 uuid; r4 uuid;
  a_contactos uuid; t_evento uuid;
begin
  if exists (select 1 from reuniones) then
    return;  -- ya hay reuniones: no se vuelve a cargar nada
  end if;

  -- ── 06 sep 2026 · CG ──
  insert into reuniones (fecha, hora, ambito, sesion, mesa, actas_responsable,
                         discusion_tema, discusion_expone, acta_lista, asistentes)
  values ('2026-09-06', '22:15', 'CG', 'ordinaria', 'Alfredo', 'Manuel',
          'El manifiesto del Partido Comunista', 'Alfredo', true,
          array['Karen','Alfredo','Daniela','Manuel'])
  returning id into r1;

  insert into puntos_reunion (reunion_id, categoria, texto, responsable, orden, origen) values
    (r1, 'organizativo', 'Campaña de nuevo ingreso', 'Guillermo / Karen', 1, 'manual'),
    (r1, 'varios', 'Prepagos de prensa',  'Karen',     2, 'manual'),
    (r1, 'varios', 'Panamericana',        'Karen',     3, 'manual'),
    (r1, 'varios', 'Finanzas / carnets',  'Manuel',    4, 'manual'),
    (r1, 'varios', 'Boletín interno',     'Guillermo', 5, 'manual');

  insert into acuerdos (reunion_id, tipo, texto, estado, orden) values
    (r1, 'acuerdo', 'Se levanta pedido de prensa y propaganda: 12 periódicos, 3 revistas, 80 carteles y 200 stickers.', 'cumplido', 1),
    (r1, 'acuerdo', 'Se confirman asistentes a la Escuela Panamericana.', 'cumplido', 2),
    (r1, 'tarea',   'Distribución de propaganda el sábado 12 en la Alameda de la ciudad.', 'cumplido', 3),
    (r1, 'tarea',   'Definir la forma de pago de la propaganda (prepago o postpago).', 'cumplido', 4);

  -- ── 17 sep 2026 · GB ──
  insert into reuniones (fecha, hora, ambito, sesion, mesa, actas_responsable,
                         discusion_tema, discusion_expone, acta_lista, asistentes)
  values ('2026-09-17', '20:30', 'GB', 'ordinaria', 'Alfredo', 'Manuel',
          'Principios y estatutos, PCR', 'Guillermo', true,
          array['Karen','Alfredo','Daniela','Guillermo','Manuel'])
  returning id into r2;

  insert into puntos_reunion (reunion_id, categoria, texto, responsable, orden, origen) values
    (r2, 'organizativo', 'División del GB',               'Karen',   1, 'manual'),
    (r2, 'organizativo', 'Responsabilidades del GB',      'Karen',   2, 'manual'),
    (r2, 'organizativo', 'Campaña panamericana',          'Karen',   3, 'manual'),
    (r2, 'varios',       'Balance de la pega del sábado', 'Daniela', 4, 'manual'),
    (r2, 'varios',       'Finanzas',                      'Manuel',  5, 'manual'),
    (r2, 'varios',       'Boletín interno',               'Ángela',  6, 'manual'),
    (r2, 'varios',       'Boletín internacional',         'Alfredo', 7, 'manual');

  insert into acuerdos (reunion_id, tipo, texto, estado, orden) values
    (r2, 'acuerdo', 'El próximo GB será en presencial.', 'cumplido', 1),
    (r2, 'acuerdo', 'Se nombran a los compañeros que ocuparán los cargos de prensa (Alfredo), encargado político (Manuel) y finanzas (Daniela).', 'cumplido', 2),
    (r2, 'tarea',   'Establecer un día para la próxima reunión del GB presencial (fecha límite sábado 19).', 'cumplido', 3);

  -- ── 25 sep 2026 · GB ──
  insert into reuniones (fecha, hora, ambito, sesion, mesa, actas_responsable,
                         discusion_tema, discusion_expone, acta_lista, asistentes)
  values ('2026-09-25', '21:30', 'GB', 'ordinaria', 'Alfredo', 'Manuel',
          'En la construcción del partido qué herencia defendemos y a cuál renunciamos', 'Manuel', true,
          array['Alfredo','Daniela','Manuel'])
  returning id into r3;

  insert into puntos_reunion (reunion_id, categoria, texto, responsable, orden, origen) values
    (r3, 'organizativo', 'Seguimiento de responsabilidades de Prensa',   'Alfredo', 1, 'fijo'),
    (r3, 'organizativo', 'Seguimiento de responsabilidades de Finanzas', 'Daniela', 2, 'fijo'),
    (r3, 'organizativo', 'Seguimiento de responsabilidades Políticas',   'Manuel',  3, 'fijo'),
    (r3, 'varios',       'Seguimiento venta de boletos',                 '',        4, 'manual'),
    (r3, 'varios',       'Boletín interno',                              'Ángela',  5, 'fijo'),
    (r3, 'varios',       'Boletín internacional',                        'Alfredo', 6, 'fijo'),
    (r3, 'varios',       'Semana roja',                                  'Manuel',  7, 'manual');

  -- ── 02 oct 2026 · GB (orden del día; el acta queda pendiente) ──
  insert into reuniones (fecha, hora, ambito, sesion, mesa, actas_responsable,
                         discusion_tema, discusion_expone, discusion_continuacion, acta_lista)
  values ('2026-10-02', '21:00', 'GB', 'ordinaria', 'Ángela', 'Daniela',
          'En la construcción del partido qué herencia defendemos y a cuál renunciamos', 'Manuel', true, false)
  returning id into r4;

  insert into acuerdos (reunion_id, tipo, texto, estado, orden, llevado_a_reunion_id) values
    (r3, 'acuerdo', 'Se dará seguimiento a los nuevos contactos.', 'pendiente', 1, r4)
    returning id into a_contactos;
  insert into acuerdos (reunion_id, tipo, texto, estado, orden, llevado_a_reunion_id) values
    (r3, 'tarea', 'Se asistirá al evento "De lo fósil a lo posible: fracking sí o no" para distribuir propaganda y establecer contactos.', 'pendiente', 2, r4)
    returning id into t_evento;
  insert into acuerdos (reunion_id, tipo, texto, estado, orden) values
    (r3, 'tarea', 'Se establecerá contacto con el encargado de prensa regional para que el encargado de prensa del GB asuma su cargo.', 'pendiente', 3);

  insert into puntos_reunion (reunion_id, categoria, texto, responsable, orden, origen, origen_id) values
    (r4, 'organizativo', 'Seguimiento de responsabilidades de Prensa',   'Alfredo', 1, 'fijo',   null),
    (r4, 'organizativo', 'Seguimiento de responsabilidades de Finanzas', 'Daniela', 2, 'fijo',   null),
    (r4, 'organizativo', 'Seguimiento de responsabilidades Políticas',   'Manuel',  3, 'fijo',   null),
    (r4, 'organizativo', 'Distribución de propaganda',                   'Manuel',  4, 'tarea',  t_evento),
    (r4, 'varios',       'Seguimiento venta de boletos',                 '',        5, 'manual', null),
    (r4, 'varios',       'Reporte evento "De lo fósil a lo posible: fracking sí o no"', 'Daniela', 6, 'tarea', t_evento),
    (r4, 'varios',       'Seguimiento nuevos contactos',                 'Manuel',  7, 'acuerdo', a_contactos),
    (r4, 'varios',       'Boletín interno',                              'Ángela',  8, 'fijo',   null),
    (r4, 'varios',       'Boletín internacional',                        'Alfredo', 9, 'fijo',   null),
    (r4, 'varios',       'Semana roja',                                  'Manuel', 10, 'manual', null);
end $$;

-- ═══════════════════════════════════════════════════════════════
--  ✓ Listo. Regresa a la app y recárgala.
-- ═══════════════════════════════════════════════════════════════
