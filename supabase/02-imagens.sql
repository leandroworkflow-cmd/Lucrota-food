-- Atualização 2: fotos (logo, capa e foto de cada item). Rode no SQL Editor (é seguro repetir).

alter table public.dl_lojas add column if not exists logo_url text check (char_length(logo_url) <= 500 and logo_url ~ '^https://');
alter table public.dl_lojas add column if not exists capa_url text check (char_length(capa_url) <= 500 and capa_url ~ '^https://');
alter table public.dl_produtos add column if not exists imagem_url text check (char_length(imagem_url) <= 500 and imagem_url ~ '^https://');

-- O dono pode preencher as novas colunas (as permissões por coluna precisam listá-las)
grant insert (logo_url, capa_url) on public.dl_lojas to authenticated;
grant update (logo_url, capa_url) on public.dl_lojas to authenticated;

-- Pasta pública de fotos. Cada loja só envia para a própria pasta (nome = id do usuário).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('dl-imagens', 'dl-imagens', true, 1048576, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = true, file_size_limit = 1048576, allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

drop policy if exists "dl imagens: dono envia" on storage.objects;
create policy "dl imagens: dono envia" on storage.objects for insert to authenticated
  with check (bucket_id = 'dl-imagens' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "dl imagens: dono troca" on storage.objects;
create policy "dl imagens: dono troca" on storage.objects for update to authenticated
  using (bucket_id = 'dl-imagens' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "dl imagens: dono apaga" on storage.objects;
create policy "dl imagens: dono apaga" on storage.objects for delete to authenticated
  using (bucket_id = 'dl-imagens' and (storage.foldername(name))[1] = auth.uid()::text);
