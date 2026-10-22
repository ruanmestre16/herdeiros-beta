-- Exploração (Pontos de Interesse e Domínios de Fluxo) guardada no banco + visibilidade de NPCs.
-- Regras de acesso (validadas aqui, no servidor):
--   * o Mestre da mesa vê e edita TUDO, inclusive itens ocultos e os segredos/DT dos pontos;
--   * os demais membros da mesa só leem itens com visible = true e nunca leem a DT nem o segredo;
--   * só o Mestre cria, edita e apaga.

-- ============ PONTOS DE INTERESSE ============
CREATE TABLE IF NOT EXISTS public.exploration_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'aberto' CHECK (status IN ('aberto', 'investigado')),
  by_name text NOT NULL DEFAULT '',
  success boolean,
  reveal text NOT NULL DEFAULT '',            -- o que todos veem depois de uma investigação bem-sucedida
  visible boolean NOT NULL DEFAULT true,      -- o Mestre liga e desliga
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.exploration_points TO authenticated;
GRANT ALL ON public.exploration_points TO service_role;
ALTER TABLE public.exploration_points ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS exploration_points_campaign_idx ON public.exploration_points (campaign_id);

CREATE POLICY "exploration_points_select" ON public.exploration_points FOR SELECT TO authenticated
  USING (public.is_campaign_master(campaign_id) OR (visible AND public.is_campaign_member(campaign_id)));
CREATE POLICY "exploration_points_insert_master" ON public.exploration_points FOR INSERT TO authenticated
  WITH CHECK (public.is_campaign_master(campaign_id));
CREATE POLICY "exploration_points_update_master" ON public.exploration_points FOR UPDATE TO authenticated
  USING (public.is_campaign_master(campaign_id)) WITH CHECK (public.is_campaign_master(campaign_id));
CREATE POLICY "exploration_points_delete_master" ON public.exploration_points FOR DELETE TO authenticated
  USING (public.is_campaign_master(campaign_id));

-- DT e segredo: tabela à parte, SÓ o Mestre lê (jogadores nunca recebem essas colunas)
CREATE TABLE IF NOT EXISTS public.exploration_point_secrets (
  point_id uuid PRIMARY KEY REFERENCES public.exploration_points(id) ON DELETE CASCADE,
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  dt integer NOT NULL DEFAULT 8,
  secret text NOT NULL DEFAULT ''
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.exploration_point_secrets TO authenticated;
GRANT ALL ON public.exploration_point_secrets TO service_role;
ALTER TABLE public.exploration_point_secrets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "exploration_secrets_master_all" ON public.exploration_point_secrets FOR ALL TO authenticated
  USING (public.is_campaign_master(campaign_id)) WITH CHECK (public.is_campaign_master(campaign_id));

-- ============ DOMÍNIOS DE FLUXO ============
CREATE TABLE IF NOT EXISTS public.flux_domains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  region text NOT NULL DEFAULT '',
  mode text NOT NULL DEFAULT 'Purificar' CHECK (mode IN ('Purificar', 'Selar', 'Derrotar')),
  status text NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'resolvido')),
  notes text NOT NULL DEFAULT '',
  visible boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.flux_domains TO authenticated;
GRANT ALL ON public.flux_domains TO service_role;
ALTER TABLE public.flux_domains ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS flux_domains_campaign_idx ON public.flux_domains (campaign_id);

CREATE POLICY "flux_domains_select" ON public.flux_domains FOR SELECT TO authenticated
  USING (public.is_campaign_master(campaign_id) OR (visible AND public.is_campaign_member(campaign_id)));
CREATE POLICY "flux_domains_insert_master" ON public.flux_domains FOR INSERT TO authenticated
  WITH CHECK (public.is_campaign_master(campaign_id));
CREATE POLICY "flux_domains_update_master" ON public.flux_domains FOR UPDATE TO authenticated
  USING (public.is_campaign_master(campaign_id)) WITH CHECK (public.is_campaign_master(campaign_id));
CREATE POLICY "flux_domains_delete_master" ON public.flux_domains FOR DELETE TO authenticated
  USING (public.is_campaign_master(campaign_id));

-- ============ VISIBILIDADE DOS NPCs (o Mestre liga e desliga) ============
-- show_name: jogadores veem o nome · show_hp: veem a vida · show_sheet: podem abrir a ficha (somente leitura)
ALTER TABLE public.npcs ADD COLUMN IF NOT EXISTS show_name boolean NOT NULL DEFAULT true;
ALTER TABLE public.npcs ADD COLUMN IF NOT EXISTS show_hp boolean NOT NULL DEFAULT true;
ALTER TABLE public.npcs ADD COLUMN IF NOT EXISTS show_sheet boolean NOT NULL DEFAULT true;
