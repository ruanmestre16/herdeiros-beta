-- HERDEIROS · Biblioteca do Mestre · Etapa 1
-- PRÉ-REQUISITO: executar 20261030170000_campaign_center.sql primeiro.
-- O Mestre vê todos os materiais; membros só veem os revelados à mesa.
-- Arquivos privados ficam em Supabase Storage. Nunca em public/ do site.

CREATE TABLE IF NOT EXISTS public.campaign_library_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  category text NOT NULL CHECK (category IN ('nota','pista','mapa','imagem','documento','link')),
  visibility text NOT NULL DEFAULT 'mestre' CHECK (visibility IN ('mestre','mesa')),
  title text NOT NULL CHECK (length(trim(title)) > 0 AND length(title) <= 160),
  description text NOT NULL DEFAULT '' CHECK (length(description) <= 3000),
  content text NOT NULL DEFAULT '' CHECK (length(content) <= 16000),
  external_url text CHECK (external_url IS NULL OR (length(external_url) <= 2048 AND external_url LIKE 'https://%')),
  storage_path text UNIQUE CHECK (storage_path IS NULL OR length(storage_path) <= 250),
  file_name text CHECK (file_name IS NULL OR length(file_name) <= 220),
  file_mime text CHECK (file_mime IS NULL OR file_mime IN ('image/png','image/jpeg','image/webp','application/pdf','text/plain')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT library_item_kind CHECK (
    (category IN ('nota','pista') AND external_url IS NULL AND storage_path IS NULL) OR
    (category = 'link' AND external_url IS NOT NULL AND storage_path IS NULL) OR
    (category IN ('imagem','mapa','documento') AND storage_path IS NOT NULL AND external_url IS NULL)
  ),
  CONSTRAINT library_asset_in_campaign CHECK (
    storage_path IS NULL OR split_part(storage_path, '/', 1) = campaign_id::text
  )
);

CREATE INDEX IF NOT EXISTS library_campaign_date_idx ON public.campaign_library_items(campaign_id, created_at DESC);
CREATE INDEX IF NOT EXISTS library_shared_idx ON public.campaign_library_items(campaign_id, visibility);
ALTER TABLE public.campaign_library_items ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.campaign_library_items FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaign_library_items TO authenticated;

DROP POLICY IF EXISTS library_items_select ON public.campaign_library_items;
CREATE POLICY library_items_select ON public.campaign_library_items FOR SELECT TO authenticated
USING (public.is_campaign_master(campaign_id) OR (visibility = 'mesa' AND public.is_campaign_member(campaign_id)));
DROP POLICY IF EXISTS library_items_insert ON public.campaign_library_items;
CREATE POLICY library_items_insert ON public.campaign_library_items FOR INSERT TO authenticated
WITH CHECK (public.is_campaign_master(campaign_id));
DROP POLICY IF EXISTS library_items_update ON public.campaign_library_items;
CREATE POLICY library_items_update ON public.campaign_library_items FOR UPDATE TO authenticated
USING (public.is_campaign_master(campaign_id)) WITH CHECK (public.is_campaign_master(campaign_id));
DROP POLICY IF EXISTS library_items_delete ON public.campaign_library_items;
CREATE POLICY library_items_delete ON public.campaign_library_items FOR DELETE TO authenticated
USING (public.is_campaign_master(campaign_id));

-- Bucket PRIVADO. Restringimos uploads a formatos não executáveis.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('herdeiros-campaign-library', 'herdeiros-campaign-library', false, 15728640,
        ARRAY['image/png','image/jpeg','image/webp','application/pdf','text/plain'])
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- CAMINHO: campaign_id/uuid.ext. Mestre pode enviar/ler/apagar apenas na própria mesa.
DROP POLICY IF EXISTS library_storage_insert ON storage.objects;
CREATE POLICY library_storage_insert ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'herdeiros-campaign-library' AND EXISTS (
  SELECT 1 FROM public.campaigns c
  WHERE c.id::text = (storage.foldername(storage.objects.name))[1] AND public.is_campaign_master(c.id)
));

DROP POLICY IF EXISTS library_storage_select ON storage.objects;
CREATE POLICY library_storage_select ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'herdeiros-campaign-library' AND (
  EXISTS (SELECT 1 FROM public.campaigns c
    WHERE c.id::text = (storage.foldername(storage.objects.name))[1] AND public.is_campaign_master(c.id))
  OR EXISTS (
    SELECT 1 FROM public.campaign_library_items i
    WHERE i.storage_path = storage.objects.name AND i.campaign_id::text = (storage.foldername(storage.objects.name))[1]
      AND i.visibility = 'mesa' AND public.is_campaign_member(i.campaign_id)
  )
));

DROP POLICY IF EXISTS library_storage_delete ON storage.objects;
CREATE POLICY library_storage_delete ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'herdeiros-campaign-library' AND EXISTS (
  SELECT 1 FROM public.campaigns c
  WHERE c.id::text = (storage.foldername(storage.objects.name))[1] AND public.is_campaign_master(c.id)
));
-- Sem política de UPDATE: o usuário não sobrescreve arquivos que outros já receberam.
-- IMPORTANTE: links de acesso assinados são temporários, mas não podem ser revogados
-- instantaneamente após "Ocultar". São emitidos com validade de 60 segundos.

-- Atualização em tempo real, se a publicação já estiver criada.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'campaign_library_items') THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.campaign_library_items;
    END IF;
  END IF;
END $$;
