-- ═══════════════════════════════════════════════════════════════
--  GESTOR DE FINANZAS · Script de instalación
--  ─────────────────────────────────────────────────────────────
--  Este script se ejecuta UNA SOLA VEZ al crear tu proyecto.
--
--  Cómo usarlo:
--  1. Entra a tu proyecto en supabase.com
--  2. En el menú lateral, abre "SQL Editor"
--  3. Pega TODO este archivo y presiona "Run"
--  4. Listo — regresa a la app y conéctate
-- ═══════════════════════════════════════════════════════════════

-- ── Grupos base ──────────────────────────────────────────────
create table if not exists grupos_base (
  id         uuid primary key default gen_random_uuid(),
  nombre     text not null unique,
  creado_en  timestamptz not null default now()
);

-- ── Etiquetas (personalizadas, con color) ────────────────────
create table if not exists etiquetas (
  id         uuid primary key default gen_random_uuid(),
  nombre     text not null unique,
  color      text not null default '#5B8DD9',
  creado_en  timestamptz not null default now()
);

-- ── Militantes / simpatizantes ───────────────────────────────
create table if not exists militantes (
  id               uuid primary key default gen_random_uuid(),
  nombre           text not null,
  telefono         text default '',
  correo           text default '',
  condicion        text not null default 'militante_trabajador',
    -- valores: 'simpatizante' | 'militante_estudiante' | 'militante_trabajador'
  grupo_base_id    uuid references grupos_base(id) on delete set null,
  color_individual text not null default '#5B8DD9',
  cuota_monto      numeric(10,2) not null default 0,
  cuota_dia        int not null default 1 check (cuota_dia between 1 and 31),
  fecha_alta       date not null default current_date,
  referencia       text default '',
  actividad        text default '',
  notas            text default '',
  activo           boolean not null default true,
  creado_en        timestamptz not null default now(),
  actualizado_en   timestamptz not null default now()
);

-- Relación militante ↔ etiquetas (muchos a muchos)
create table if not exists militante_etiquetas (
  militante_id uuid references militantes(id) on delete cascade,
  etiqueta_id  uuid references etiquetas(id) on delete cascade,
  primary key (militante_id, etiqueta_id)
);

-- ── Pagos ────────────────────────────────────────────────────
create table if not exists pagos (
  id             uuid primary key default gen_random_uuid(),
  militante_id   uuid not null references militantes(id) on delete cascade,
  fecha_pago     date not null default current_date,
  meses_cubre    text[] not null,      -- ej: {'2026-05','2026-06','2026-07'}
  periodo_texto  text not null,        -- ej: 'Mayo, Junio y Julio 2026'
  monto          numeric(10,2) not null,
  forma_pago     text not null default 'transferencia',
  evidencia_path text default '',      -- ruta del archivo en Storage
  notas          text default '',
  creado_en      timestamptz not null default now()
);

-- ── Remisiones al partido ────────────────────────────────────
create table if not exists remisiones (
  id             uuid primary key default gen_random_uuid(),
  numero         serial,
  fecha_remision date not null default current_date,
  periodo        text not null,        -- ej: '2026-06'
  monto_cuotas   numeric(10,2) not null default 0,
  monto_otros    numeric(10,2) not null default 0,
  total          numeric(10,2) not null default 0,
  forma_envio    text not null default 'transferencia',
  estado         text not null default 'borrador',  -- 'borrador' | 'enviado'
  notas          text default '',
  creado_en      timestamptz not null default now()
);

-- ── Eventos manuales del calendario ──────────────────────────
create table if not exists eventos (
  id          uuid primary key default gen_random_uuid(),
  fecha       date not null,
  titulo      text not null,
  tipo        text not null default 'recordatorio',
    -- 'recordatorio' | 'reunion' | 'cobro' | 'envio' | 'otro'
  descripcion text default '',
  creado_en   timestamptz not null default now()
);

-- ── Trigger: actualizar 'actualizado_en' en militantes ───────
create or replace function actualizar_timestamp()
returns trigger as $$
begin
  new.actualizado_en = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists militantes_actualizado on militantes;
create trigger militantes_actualizado
  before update on militantes
  for each row execute function actualizar_timestamp();

-- ── Índices útiles ───────────────────────────────────────────
create index if not exists idx_pagos_militante on pagos(militante_id);
create index if not exists idx_pagos_fecha on pagos(fecha_pago);
create index if not exists idx_militantes_activo on militantes(activo);

-- ── Bucket de Storage para evidencias ────────────────────────
insert into storage.buckets (id, name, public)
values ('evidencias', 'evidencias', false)
on conflict (id) do nothing;

-- Políticas de acceso al bucket (solo con la clave de la app)
drop policy if exists "evidencias_select" on storage.objects;
create policy "evidencias_select" on storage.objects
  for select using (bucket_id = 'evidencias');

drop policy if exists "evidencias_insert" on storage.objects;
create policy "evidencias_insert" on storage.objects
  for insert with check (bucket_id = 'evidencias');

drop policy if exists "evidencias_delete" on storage.objects;
create policy "evidencias_delete" on storage.objects
  for delete using (bucket_id = 'evidencias');

-- ═══════════════════════════════════════════════════════════════
--  ✓ Instalación completa. Regresa a la app y conéctate.
-- ═══════════════════════════════════════════════════════════════
