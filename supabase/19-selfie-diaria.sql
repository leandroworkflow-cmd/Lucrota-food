-- Brokê: selfie ao vivo uma vez por dia para o entregador da plataforma ficar online. Rode depois do 18. É seguro repetir.
create table if not exists public.dl_selfies_dia (
  entregador_id uuid not null references public.dl_entregadores (id) on delete cascade,
  dia date not null,
  caminho text not null,
  criado_em timestamptz not null default now(),
  primary key (entregador_id, dia)
);
alter table public.dl_selfies_dia enable row level security;
revoke all on public.dl_selfies_dia from anon, authenticated;

-- Trava no banco: quem não é de loja só passa para online com a selfie do dia (dia de Brasília).
create or replace function public.dl_exigir_selfie_dia() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.online and not coalesce(old.online, false) and new.loja_id is null then
    if not exists (
      select 1 from public.dl_selfies_dia s
      where s.entregador_id = new.id and s.dia = (now() at time zone 'America/Sao_Paulo')::date
    ) then
      raise exception 'selfie_do_dia';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists dl_entregadores_selfie_dia on public.dl_entregadores;
create trigger dl_entregadores_selfie_dia before update of online on public.dl_entregadores
  for each row execute function public.dl_exigir_selfie_dia();
