-- ═══════════════════════════════════════════════════════════════
--  MIGRACIÓN: Cambios pendientes (fotos, ciudad/estado, actividad)
--  ─────────────────────────────────────────────────────────────
--  Corre este script UNA VEZ en el SQL Editor de tu Supabase.
--  No borra nada de lo que ya tienes.
-- ═══════════════════════════════════════════════════════════════

-- ── Nuevos campos en militantes ───────────────────────────────
alter table militantes add column if not exists foto_path text default '';
alter table militantes add column if not exists ciudad    text default '';
alter table militantes add column if not exists estado    text default '';
alter table militantes add column if not exists actividad_id uuid;

-- ── Catálogo de actividades (como grupos_base) ────────────────
create table if not exists actividades (
  id         uuid primary key default gen_random_uuid(),
  nombre     text not null unique,
  creado_en  timestamptz not null default now()
);

alter table militantes
  add constraint if not exists fk_militantes_actividad
  foreign key (actividad_id) references actividades(id) on delete set null;

-- ── Bucket de Storage para fotos de perfil ────────────────────
insert into storage.buckets (id, name, public)
values ('avatares', 'avatares', false)
on conflict (id) do nothing;

drop policy if exists "avatares_select" on storage.objects;
create policy "avatares_select" on storage.objects
  for select using (bucket_id = 'avatares');

drop policy if exists "avatares_insert" on storage.objects;
create policy "avatares_insert" on storage.objects
  for insert with check (bucket_id = 'avatares');

drop policy if exists "avatares_update" on storage.objects;
create policy "avatares_update" on storage.objects
  for update using (bucket_id = 'avatares');

drop policy if exists "avatares_delete" on storage.objects;
create policy "avatares_delete" on storage.objects
  for delete using (bucket_id = 'avatares');

-- ═══════════════════════════════════════════════════════════════
--  ✓ Listo. Ya puedes usar fotos, ciudad/estado y actividades.
-- ═══════════════════════════════════════════════════════════════
