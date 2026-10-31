-- HERDEIROS: O DESPERTAR | Etapa 6: Central de Notificações
-- EXECUTAR UMA VEZ NO SQL EDITOR DO LOVABLE CLOUD (BANCO DO HERDEIROS)
-- Notificações reais, pessoais, persistentes e protegidas por RLS.
-- Sem modificar fichas, combate, NPCs, objetivos ou materiais existentes.
-- Compatível com execução repetida; novos gatilhos NÃO replicam avisos antigos.
BEGIN;

DO $$
BEGIN
  IF to_regclass('public.campaigns') IS NULL
    OR to_regclass('public.campaign_members') IS NULL
    OR to_regclass('public.campaign_sessions') IS NULL
    OR to_regclass('public.campaign_objectives') IS NULL
    OR to_regclass('public.campaign_library_items') IS NULL THEN
    RAISE EXCEPTION 'A Central depende das migracoes anteriores de Campanhas e Biblioteca. Confirme o banco do Herdeiros antes de instalar.';
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.herdeiros_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  campaign_id uuid REFERENCES public.campaigns(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('participant','combat','session','objective','library')),
  title text NOT NULL CHECK (length(title) BETWEEN 1 AND 160),
  body text NOT NULL DEFAULT '' CHECK (length(body) <= 1000),
  target text NOT NULL DEFAULT 'mesa' CHECK (target IN ('mesa','mestre','campanhas','biblioteca')),
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz
);
CREATE INDEX IF NOT EXISTS hn_recipient_date_idx
  ON public.herdeiros_notifications(recipient_id,created_at DESC);
CREATE INDEX IF NOT EXISTS hn_recipient_unread_idx
  ON public.herdeiros_notifications(recipient_id,created_at DESC) WHERE read_at IS NULL;
ALTER TABLE public.herdeiros_notifications ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.herdeiros_notifications FROM PUBLIC, anon, authenticated;
GRANT SELECT, DELETE ON public.herdeiros_notifications TO authenticated;
-- O cliente pode modificar SOMENTE read_at; não pode falsificar títulos/remetentes.
GRANT UPDATE(read_at) ON public.herdeiros_notifications TO authenticated;
GRANT ALL ON public.herdeiros_notifications TO service_role;

DROP POLICY IF EXISTS hn_select_own ON public.herdeiros_notifications;
CREATE POLICY hn_select_own ON public.herdeiros_notifications
  FOR SELECT TO authenticated USING (recipient_id = auth.uid());
DROP POLICY IF EXISTS hn_update_own ON public.herdeiros_notifications;
CREATE POLICY hn_update_own ON public.herdeiros_notifications
  FOR UPDATE TO authenticated USING (recipient_id = auth.uid())
  WITH CHECK (recipient_id = auth.uid());
DROP POLICY IF EXISTS hn_delete_own ON public.herdeiros_notifications;
CREATE POLICY hn_delete_own ON public.herdeiros_notifications
  FOR DELETE TO authenticated USING (recipient_id = auth.uid());
-- Nenhuma permissão/política INSERT para usuários finais.

-- Envia para Mestre e integrantes da campanha, excluindo opcionalmente quem fez a ação.
CREATE OR REPLACE FUNCTION public.hn_notify_campaign(
  p_campaign uuid, p_kind text, p_title text, p_body text,
  p_target text, p_except_user uuid DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.herdeiros_notifications(recipient_id,campaign_id,kind,title,body,target)
  SELECT participants.user_id, p_campaign, p_kind,
    left(p_title,160),left(coalesce(p_body,''),1000),p_target
  FROM (
    SELECT c.master_id AS user_id FROM public.campaigns c WHERE c.id=p_campaign
    UNION
    SELECT m.user_id FROM public.campaign_members m WHERE m.campaign_id=p_campaign
  ) participants
  WHERE participants.user_id IS DISTINCT FROM p_except_user;
END $$;
REVOKE ALL ON FUNCTION public.hn_notify_campaign(uuid,text,text,text,text,uuid)
  FROM PUBLIC, anon, authenticated;

-- O Mestre é avisado quando alguém entra na mesa (sem expor informações da ficha).
CREATE OR REPLACE FUNCTION public.hn_member_joined()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp
AS $$
DECLARE v_master uuid; v_campaign_name text;
BEGIN
  SELECT master_id,name INTO v_master,v_campaign_name
    FROM public.campaigns WHERE id=NEW.campaign_id;
  IF v_master IS NOT NULL AND v_master <> NEW.user_id THEN
    INSERT INTO public.herdeiros_notifications(recipient_id,campaign_id,kind,title,body,target)
    VALUES (v_master,NEW.campaign_id,'participant',
      'Novo jogador na campanha',
      'Um participante entrou em ' || left(coalesce(v_campaign_name,'sua mesa'),120) || '.',
      'mestre');
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS hn_after_member_join ON public.campaign_members;
CREATE TRIGGER hn_after_member_join AFTER INSERT ON public.campaign_members
FOR EACH ROW EXECUTE FUNCTION public.hn_member_joined();

-- Início e fim de combate. Sem publicar fichas de inimigos ocultos ou ações sigilosas.
CREATE OR REPLACE FUNCTION public.hn_combat_changed()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp
AS $$
BEGIN
  IF NEW.combat_active IS DISTINCT FROM OLD.combat_active THEN
    PERFORM public.hn_notify_campaign(NEW.id,'combat',
      CASE WHEN NEW.combat_active THEN 'Combate iniciado' ELSE 'Combate encerrado' END,
      'Mesa: ' || left(coalesce(NEW.name,'Sua campanha'),120) || '.',
      'mesa',auth.uid());
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS hn_after_combat_change ON public.campaigns;
CREATE TRIGGER hn_after_combat_change AFTER UPDATE OF combat_active ON public.campaigns
FOR EACH ROW EXECUTE FUNCTION public.hn_combat_changed();

-- Nova sessão / alteração de estado da sessão.
CREATE OR REPLACE FUNCTION public.hn_session_changed()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.hn_notify_campaign(NEW.campaign_id,'session',
      'Nova sessão registrada', 'Sessão ' || NEW.number || ': ' || left(NEW.title,150),
      'campanhas',auth.uid());
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    PERFORM public.hn_notify_campaign(NEW.campaign_id,'session',
      'Sessão atualizada', 'Sessão ' || NEW.number || ' agora está ' || replace(NEW.status,'_',' ') || '.',
      'campanhas',auth.uid());
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS hn_after_session_insert ON public.campaign_sessions;
CREATE TRIGGER hn_after_session_insert AFTER INSERT ON public.campaign_sessions
FOR EACH ROW EXECUTE FUNCTION public.hn_session_changed();
DROP TRIGGER IF EXISTS hn_after_session_update ON public.campaign_sessions;
CREATE TRIGGER hn_after_session_update AFTER UPDATE ON public.campaign_sessions
FOR EACH ROW EXECUTE FUNCTION public.hn_session_changed();

-- Objetivos: apenas se estiverem compartilhados com a mesa (nunca 'mestre').
CREATE OR REPLACE FUNCTION public.hn_objective_changed()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp
AS $$
BEGIN
  IF NEW.visibility <> 'mesa' THEN RETURN NEW; END IF;
  IF TG_OP = 'INSERT' THEN
    PERFORM public.hn_notify_campaign(NEW.campaign_id,'objective',
      'Novo objetivo da campanha','Um objetivo foi disponibilizado para a mesa.','campanhas',auth.uid());
  ELSIF OLD.visibility IS DISTINCT FROM NEW.visibility THEN
    PERFORM public.hn_notify_campaign(NEW.campaign_id,'objective',
      'Novo objetivo da campanha','Um objetivo foi disponibilizado para a mesa.','campanhas',auth.uid());
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    PERFORM public.hn_notify_campaign(NEW.campaign_id,'objective',
      'Objetivo atualizado','Um objetivo da mesa está ' || replace(NEW.status,'_',' ') || '.',
      'campanhas',auth.uid());
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS hn_after_objective_insert ON public.campaign_objectives;
CREATE TRIGGER hn_after_objective_insert AFTER INSERT ON public.campaign_objectives
FOR EACH ROW EXECUTE FUNCTION public.hn_objective_changed();
DROP TRIGGER IF EXISTS hn_after_objective_update ON public.campaign_objectives;
CREATE TRIGGER hn_after_objective_update AFTER UPDATE ON public.campaign_objectives
FOR EACH ROW EXECUTE FUNCTION public.hn_objective_changed();

-- Biblioteca: só avisa sobre material revelado à mesa. Segredos ficam secretos.
CREATE OR REPLACE FUNCTION public.hn_library_shared()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp
AS $$
BEGIN
  IF NEW.visibility <> 'mesa' THEN RETURN NEW; END IF;
  IF TG_OP = 'INSERT' THEN
    PERFORM public.hn_notify_campaign(NEW.campaign_id,'library',
      'Novo material revelado','O Mestre compartilhou um material na Biblioteca.','biblioteca',auth.uid());
  ELSIF OLD.visibility IS DISTINCT FROM NEW.visibility THEN
    PERFORM public.hn_notify_campaign(NEW.campaign_id,'library',
      'Novo material revelado','O Mestre compartilhou um material na Biblioteca.','biblioteca',auth.uid());
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS hn_after_library_insert ON public.campaign_library_items;
CREATE TRIGGER hn_after_library_insert AFTER INSERT ON public.campaign_library_items
FOR EACH ROW EXECUTE FUNCTION public.hn_library_shared();
DROP TRIGGER IF EXISTS hn_after_library_update ON public.campaign_library_items;
CREATE TRIGGER hn_after_library_update AFTER UPDATE ON public.campaign_library_items
FOR EACH ROW EXECUTE FUNCTION public.hn_library_shared();

-- Realtime para avisos imediatos. Se a publicação não puder ser alterada,
-- o app continua funcionando com atualização automática a cada 30 segundos.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname='supabase_realtime')
     AND NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname='supabase_realtime'
          AND schemaname='public' AND tablename='herdeiros_notifications'
     ) THEN
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.herdeiros_notifications;
    EXCEPTION WHEN insufficient_privilege THEN
      RAISE NOTICE 'Realtime não habilitado: o aplicativo usará atualização a cada 30 segundos.';
    END;
  END IF;
END $$;

COMMIT;
NOTIFY pgrst, 'reload schema';

SELECT 'Tabela de notificações' AS verificacao,
  CASE WHEN to_regclass('public.herdeiros_notifications') IS NOT NULL
  THEN 'OK' ELSE 'FALTANDO' END AS resultado;
