-- HERDEIROS · Central de Campanhas
-- Depende das tabelas campaigns/campaign_members e das funções
-- is_campaign_master(uuid)/is_campaign_member(uuid) já existentes.
-- Nota: NÃO é necessário nem seguro copiar notas privadas para campaigns.log.

CREATE TABLE IF NOT EXISTS public.campaign_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  number integer NOT NULL CHECK (number > 0),
  title text NOT NULL DEFAULT 'Nova sessão' CHECK (length(title) <= 160),
  session_date date,
  status text NOT NULL DEFAULT 'planejada' CHECK (status IN ('planejada','em_andamento','concluida')),
  public_summary text NOT NULL DEFAULT '' CHECK (length(public_summary) <= 12000),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(campaign_id, number)
);

-- Em tabela separada: o jogador NÃO recebe nem a coluna de notas secretas.
CREATE TABLE IF NOT EXISTS public.campaign_session_secrets (
  session_id uuid PRIMARY KEY REFERENCES public.campaign_sessions(id) ON DELETE CASCADE,
  private_notes text NOT NULL DEFAULT '' CHECK (length(private_notes) <= 24000),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.campaign_objectives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (length(trim(title)) > 0 AND length(title) <= 180),
  description text NOT NULL DEFAULT '' CHECK (length(description) <= 6000),
  visibility text NOT NULL DEFAULT 'mesa' CHECK (visibility IN ('mesa','mestre')),
  status text NOT NULL DEFAULT 'aberto' CHECK (status IN ('aberto','concluido')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS campaign_sessions_campaign_idx ON public.campaign_sessions (campaign_id, number DESC);
CREATE INDEX IF NOT EXISTS campaign_objectives_campaign_idx ON public.campaign_objectives (campaign_id, created_at DESC);

ALTER TABLE public.campaign_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_session_secrets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_objectives ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.campaign_sessions, public.campaign_session_secrets, public.campaign_objectives FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaign_sessions, public.campaign_session_secrets, public.campaign_objectives TO authenticated;

DROP POLICY IF EXISTS campaign_sessions_read ON public.campaign_sessions;
CREATE POLICY campaign_sessions_read ON public.campaign_sessions FOR SELECT TO authenticated
  USING (public.is_campaign_member(campaign_id));
DROP POLICY IF EXISTS campaign_sessions_insert ON public.campaign_sessions;
CREATE POLICY campaign_sessions_insert ON public.campaign_sessions FOR INSERT TO authenticated
  WITH CHECK (public.is_campaign_master(campaign_id));
DROP POLICY IF EXISTS campaign_sessions_update ON public.campaign_sessions;
CREATE POLICY campaign_sessions_update ON public.campaign_sessions FOR UPDATE TO authenticated
  USING (public.is_campaign_master(campaign_id)) WITH CHECK (public.is_campaign_master(campaign_id));
DROP POLICY IF EXISTS campaign_sessions_delete ON public.campaign_sessions;
CREATE POLICY campaign_sessions_delete ON public.campaign_sessions FOR DELETE TO authenticated
  USING (public.is_campaign_master(campaign_id));

DROP POLICY IF EXISTS campaign_secrets_read ON public.campaign_session_secrets;
CREATE POLICY campaign_secrets_read ON public.campaign_session_secrets FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.campaign_sessions s
                WHERE s.id = session_id AND public.is_campaign_master(s.campaign_id)));
DROP POLICY IF EXISTS campaign_secrets_insert ON public.campaign_session_secrets;
CREATE POLICY campaign_secrets_insert ON public.campaign_session_secrets FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.campaign_sessions s
                     WHERE s.id = session_id AND public.is_campaign_master(s.campaign_id)));
DROP POLICY IF EXISTS campaign_secrets_update ON public.campaign_session_secrets;
CREATE POLICY campaign_secrets_update ON public.campaign_session_secrets FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.campaign_sessions s
                WHERE s.id = session_id AND public.is_campaign_master(s.campaign_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.campaign_sessions s
                     WHERE s.id = session_id AND public.is_campaign_master(s.campaign_id)));
DROP POLICY IF EXISTS campaign_secrets_delete ON public.campaign_session_secrets;
CREATE POLICY campaign_secrets_delete ON public.campaign_session_secrets FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.campaign_sessions s
                WHERE s.id = session_id AND public.is_campaign_master(s.campaign_id)));

DROP POLICY IF EXISTS campaign_objectives_read ON public.campaign_objectives;
CREATE POLICY campaign_objectives_read ON public.campaign_objectives FOR SELECT TO authenticated
  USING (public.is_campaign_master(campaign_id)
        OR (visibility = 'mesa' AND public.is_campaign_member(campaign_id)));
DROP POLICY IF EXISTS campaign_objectives_insert ON public.campaign_objectives;
CREATE POLICY campaign_objectives_insert ON public.campaign_objectives FOR INSERT TO authenticated
  WITH CHECK (public.is_campaign_master(campaign_id));
DROP POLICY IF EXISTS campaign_objectives_update ON public.campaign_objectives;
CREATE POLICY campaign_objectives_update ON public.campaign_objectives FOR UPDATE TO authenticated
  USING (public.is_campaign_master(campaign_id)) WITH CHECK (public.is_campaign_master(campaign_id));
DROP POLICY IF EXISTS campaign_objectives_delete ON public.campaign_objectives;
CREATE POLICY campaign_objectives_delete ON public.campaign_objectives FOR DELETE TO authenticated
  USING (public.is_campaign_master(campaign_id));

-- Publicação realtime só se ainda não existir; mensagens continuam sujeitas a RLS.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='campaign_sessions') THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.campaign_sessions;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='campaign_objectives') THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.campaign_objectives;
    END IF;
  END IF;
END $$;
