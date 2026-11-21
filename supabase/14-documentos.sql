-- Brokê: documentos do entregador (CNH, documento da moto e selfie). Rode depois do 13. É seguro repetir.

alter table public.dl_entregadores add column if not exists docs_status text not null default 'sem_documentos';
alter table public.dl_entregadores drop constraint if exists dl_entregadores_docs_status_check;
alter table public.dl_entregadores add constraint dl_entregadores_docs_status_check
  check (docs_status in ('sem_documentos', 'em_analise', 'aprovado', 'reprovado'));
alter table public.dl_entregadores add column if not exists docs_motivo text;
alter table public.dl_entregadores add column if not exists cnh_nome text;
alter table public.dl_entregadores add column if not exists cnh_validade date;
alter table public.dl_entregadores add column if not exists cnh_categoria text;
alter table public.dl_entregadores add column if not exists placa text;
alter table public.dl_entregadores add column if not exists docs_enviados_em timestamptz;
alter table public.dl_entregadores add column if not exists docs_consentimento_em timestamptz;
alter table public.dl_entregadores add column if not exists docs_analise jsonb;  -- conferência automática (regras e, no futuro, IA)

-- Uma linha por arquivo enviado. O arquivo fica num bucket PRIVADO.
create table if not exists public.dl_documentos (
  id uuid primary key default gen_random_uuid(),
  entregador_id uuid not null references public.dl_entregadores (id) on delete cascade,
  tipo text not null check (tipo in ('cnh', 'crlv', 'selfie')),
  caminho text not null,
  criado_em timestamptz not null default now(),
  unique (entregador_id, tipo)
);
alter table public.dl_documentos enable row level security;
revoke all on public.dl_documentos from anon, authenticated;

-- Bucket privado, sem nenhuma política: só o servidor (service_role) lê e grava.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('dl-documentos', 'dl-documentos', false, 3145728, array['image/jpeg'])
on conflict (id) do update set public = false, file_size_limit = 3145728, allowed_mime_types = array['image/jpeg'];

-- Entregadores da plataforma já aprovados antes desta regra precisam enviar os documentos.
update public.dl_entregadores
   set aprovado = false, online = false
 where loja_id is null and aprovado = true and docs_status <> 'aprovado';
