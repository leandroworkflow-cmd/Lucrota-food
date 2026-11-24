-- Brokê: TODO entregador envia documentos (CNH, documento do veículo, selfie, comprovante de residência, CPF e endereço).
-- Acaba o cadastro por código de loja. Rode depois do 25. É seguro repetir.

alter table public.dl_entregadores add column if not exists cpf text;
alter table public.dl_entregadores drop constraint if exists dl_entregadores_cpf_check;
alter table public.dl_entregadores add constraint dl_entregadores_cpf_check check (cpf is null or cpf ~ '^[0-9]{11}$');

-- Novo tipo de arquivo: comprovante de residência.
alter table public.dl_documentos drop constraint if exists dl_documentos_tipo_check;
alter table public.dl_documentos add constraint dl_documentos_tipo_check check (tipo in ('cnh', 'crlv', 'selfie', 'comprovante'));

-- CNH, documento do veículo e comprovante também podem ser PDF.
update storage.buckets
   set allowed_mime_types = array['image/jpeg', 'application/pdf'], file_size_limit = 3145728
 where id = 'dl-documentos';

-- Quem era entregador "de loja" vira entregador da plataforma e precisa enviar os documentos.
update public.dl_entregadores
   set loja_id = null,
       aprovado = false,
       online = false
 where docs_status <> 'aprovado';
update public.dl_entregadores set loja_id = null where loja_id is not null;
