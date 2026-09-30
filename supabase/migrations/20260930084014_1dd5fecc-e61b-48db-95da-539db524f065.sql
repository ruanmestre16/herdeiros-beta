CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY DEFAULT auth.uid(),
  display_name text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ============ SHEETS ============
CREATE TABLE public.sheets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  name text NOT NULL DEFAULT '',
  concept text NOT NULL DEFAULT '',
  lineage text NOT NULL DEFAULT '',
  stage text NOT NULL DEFAULT 'normal',
  story text NOT NULL DEFAULT '',
  corpo integer NOT NULL DEFAULT 1,
  mente integer NOT NULL DEFAULT 1,
  espirito integer NOT NULL DEFAULT 1,
  gs integer NOT NULL DEFAULT 1,
  karma integer NOT NULL DEFAULT 0,
  exhaustion integer NOT NULL DEFAULT 0,
  pv_current integer NOT NULL DEFAULT 20,
  pv_max integer NOT NULL DEFAULT 20,
  pf_current integer NOT NULL DEFAULT 0,
  pf_max integer NOT NULL DEFAULT 20,
  weapon text NOT NULL DEFAULT '',
  weapon_dice text NOT NULL DEFAULT '',
  weapon_type text NOT NULL DEFAULT '',
  initiative integer,
  abilities jsonb NOT NULL DEFAULT '[]'::jsonb,
  inventory jsonb NOT NULL DEFAULT '[]'::jsonb,
  nomenclatures jsonb NOT NULL DEFAULT '[]'::jsonb,
  sync jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sheets TO authenticated;
GRANT ALL ON public.sheets TO service_role;
ALTER TABLE public.sheets ENABLE ROW LEVEL SECURITY;

-- ============ CAMPAIGNS ============
CREATE TABLE public.campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  master_id uuid NOT NULL DEFAULT auth.uid(),
  name text NOT NULL DEFAULT '',
  code text NOT NULL UNIQUE DEFAULT upper(substr(replace(gen_random_uuid()::text,'-',''),1,6)),
  invite_token text NOT NULL UNIQUE DEFAULT replace(gen_random_uuid()::text,'-',''),
  scene text NOT NULL DEFAULT '',
  round integer NOT NULL DEFAULT 1,
  turn_index integer NOT NULL DEFAULT 0,
  combat_active boolean NOT NULL DEFAULT false,
  log jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaigns TO authenticated;
GRANT ALL ON public.campaigns TO service_role;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

-- ============ CAMPAIGN SECRETS ============
CREATE TABLE public.campaign_secrets (
  campaign_id uuid PRIMARY KEY REFERENCES public.campaigns(id) ON DELETE CASCADE,
  password_hash text NOT NULL
);
GRANT ALL ON public.campaign_secrets TO service_role;
ALTER TABLE public.campaign_secrets ENABLE ROW LEVEL SECURITY;
-- Nenhuma policy: ninguém lê senhas diretamente, só as funções seguras.

-- ============ CAMPAIGN MEMBERS ============
CREATE TABLE public.campaign_members (
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  character_id uuid REFERENCES public.sheets(id) ON DELETE SET NULL,
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (campaign_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaign_members TO authenticated;
GRANT ALL ON public.campaign_members TO service_role;
ALTER TABLE public.campaign_members ENABLE ROW LEVEL SECURITY;

-- ============ NPCS ============
CREATE TABLE public.npcs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  kind text NOT NULL DEFAULT 'inimigo',
  hidden boolean NOT NULL DEFAULT true,
  pv_current integer NOT NULL DEFAULT 25,
  pv_max integer NOT NULL DEFAULT 25,
  pf_current integer NOT NULL DEFAULT 0,
  pf_max integer NOT NULL DEFAULT 20,
  corpo integer NOT NULL DEFAULT 1,
  mente integer NOT NULL DEFAULT 1,
  espirito integer NOT NULL DEFAULT 1,
  esquiva integer NOT NULL DEFAULT 10,
  bloqueio integer NOT NULL DEFAULT 3,
  notes text NOT NULL DEFAULT '',
  initiative integer,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.npcs TO authenticated;
GRANT ALL ON public.npcs TO service_role;
ALTER TABLE public.npcs ENABLE ROW LEVEL SECURITY;

-- ============ HELPER FUNCTIONS (security definer, sem recursão de RLS) ============
CREATE OR REPLACE FUNCTION public.is_campaign_master(p_campaign uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.campaigns c WHERE c.id = p_campaign AND c.master_id = auth.uid());
$$;

CREATE OR REPLACE FUNCTION public.is_campaign_member(p_campaign uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.campaigns c WHERE c.id = p_campaign AND c.master_id = auth.uid())
      OR EXISTS (SELECT 1 FROM public.campaign_members m WHERE m.campaign_id = p_campaign AND m.user_id = auth.uid());
$$;

CREATE OR REPLACE FUNCTION public.is_master_of_sheet(p_sheet uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.campaign_members m
    JOIN public.campaigns c ON c.id = m.campaign_id
    WHERE m.character_id = p_sheet AND c.master_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.shares_campaign_sheet(p_sheet uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.campaign_members m
    WHERE m.character_id = p_sheet AND public.is_campaign_member(m.campaign_id)
  );
$$;

CREATE OR REPLACE FUNCTION public.shares_campaign_user(p_user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p_user = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.campaign_members m
      WHERE m.user_id = p_user AND public.is_campaign_member(m.campaign_id)
    )
    OR EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.master_id = p_user AND public.is_campaign_member(c.id)
    );
$$;

-- ============ POLICIES ============
-- profiles
CREATE POLICY "profiles_select_shared" ON public.profiles FOR SELECT TO authenticated
  USING (public.shares_campaign_user(id));
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- sheets
CREATE POLICY "sheets_select" ON public.sheets FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.shares_campaign_sheet(id));
CREATE POLICY "sheets_insert_own" ON public.sheets FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "sheets_update" ON public.sheets FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.is_master_of_sheet(id))
  WITH CHECK (user_id = auth.uid() OR public.is_master_of_sheet(id));
CREATE POLICY "sheets_delete_own" ON public.sheets FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- campaigns
CREATE POLICY "campaigns_select_member" ON public.campaigns FOR SELECT TO authenticated
  USING (master_id = auth.uid() OR public.is_campaign_member(id));
CREATE POLICY "campaigns_insert_own" ON public.campaigns FOR INSERT TO authenticated
  WITH CHECK (master_id = auth.uid());
CREATE POLICY "campaigns_update_master" ON public.campaigns FOR UPDATE TO authenticated
  USING (master_id = auth.uid()) WITH CHECK (master_id = auth.uid());
CREATE POLICY "campaigns_delete_master" ON public.campaigns FOR DELETE TO authenticated
  USING (master_id = auth.uid());

-- campaign_members
CREATE POLICY "members_select" ON public.campaign_members FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_campaign_member(campaign_id));
CREATE POLICY "members_update_self" ON public.campaign_members FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "members_delete" ON public.campaign_members FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.is_campaign_master(campaign_id));

-- npcs
CREATE POLICY "npcs_select_member" ON public.npcs FOR SELECT TO authenticated
  USING (public.is_campaign_member(campaign_id));
CREATE POLICY "npcs_insert_master" ON public.npcs FOR INSERT TO authenticated
  WITH CHECK (public.is_campaign_master(campaign_id));
CREATE POLICY "npcs_update_master" ON public.npcs FOR UPDATE TO authenticated
  USING (public.is_campaign_master(campaign_id)) WITH CHECK (public.is_campaign_master(campaign_id));
CREATE POLICY "npcs_delete_master" ON public.npcs FOR DELETE TO authenticated
  USING (public.is_campaign_master(campaign_id));

-- ============ RPCs ============
CREATE OR REPLACE FUNCTION public.set_campaign_password(p_campaign uuid, p_password text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.campaigns c WHERE c.id = p_campaign AND c.master_id = auth.uid()) THEN
    RAISE EXCEPTION 'Apenas o Mestre da mesa pode definir a senha.';
  END IF;
  IF coalesce(trim(p_password), '') = '' THEN
    DELETE FROM public.campaign_secrets WHERE campaign_id = p_campaign;
    RETURN;
  END IF;
  INSERT INTO public.campaign_secrets (campaign_id, password_hash)
  VALUES (p_campaign, extensions.crypt(p_password, extensions.gen_salt('bf')))
  ON CONFLICT (campaign_id) DO UPDATE SET password_hash = EXCLUDED.password_hash;
END;
$$;

CREATE OR REPLACE FUNCTION public.join_campaign(p_code text, p_password text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE v_campaign uuid; v_hash text;
BEGIN
  IF auth.uid() IS NULL THEN RETURN 'Entre na sua conta para participar da mesa.'; END IF;
  SELECT c.id INTO v_campaign FROM public.campaigns c WHERE upper(c.code) = upper(trim(p_code));
  IF v_campaign IS NULL THEN RETURN 'Mesa não encontrada para esse código.'; END IF;
  SELECT s.password_hash INTO v_hash FROM public.campaign_secrets s WHERE s.campaign_id = v_campaign;
  IF v_hash IS NOT NULL AND (p_password IS NULL OR extensions.crypt(p_password, v_hash) <> v_hash) THEN
    RETURN 'Senha incorreta.';
  END IF;
  INSERT INTO public.campaign_members (campaign_id, user_id)
  VALUES (v_campaign, auth.uid()) ON CONFLICT (campaign_id, user_id) DO NOTHING;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.join_campaign_invite(p_token text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_campaign uuid;
BEGIN
  IF auth.uid() IS NULL THEN RETURN NULL; END IF;
  SELECT c.id INTO v_campaign FROM public.campaigns c WHERE c.invite_token = trim(p_token);
  IF v_campaign IS NULL THEN RAISE EXCEPTION 'Convite inválido ou expirado.'; END IF;
  INSERT INTO public.campaign_members (campaign_id, user_id)
  VALUES (v_campaign, auth.uid()) ON CONFLICT (campaign_id, user_id) DO NOTHING;
  RETURN v_campaign::text;
END;
$$;

CREATE OR REPLACE FUNCTION public.master_update_sheet(p_sheet uuid, p_pv integer, p_pf integer, p_clear_initiative boolean DEFAULT false)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_master_of_sheet(p_sheet) THEN
    RAISE EXCEPTION 'Apenas o Mestre da mesa pode alterar esta ficha.';
  END IF;
  UPDATE public.sheets SET
    pv_current = CASE WHEN p_pv IS NULL THEN pv_current ELSE greatest(0, least(pv_max, p_pv)) END,
    pf_current = CASE WHEN p_pf IS NULL THEN pf_current ELSE greatest(0, least(pf_max, p_pf)) END,
    initiative = CASE WHEN p_clear_initiative THEN NULL ELSE initiative END
  WHERE id = p_sheet;
END;
$$;

-- ============ PERFIL AUTOMÁTICO NO CADASTRO ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, coalesce(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name', split_part(coalesce(NEW.email,''), '@', 1)))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ REALTIME ============
ALTER TABLE public.campaigns REPLICA IDENTITY FULL;
ALTER TABLE public.campaign_members REPLICA IDENTITY FULL;
ALTER TABLE public.npcs REPLICA IDENTITY FULL;
ALTER TABLE public.sheets REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.campaigns;
ALTER PUBLICATION supabase_realtime ADD TABLE public.campaign_members;
ALTER PUBLICATION supabase_realtime ADD TABLE public.npcs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sheets;