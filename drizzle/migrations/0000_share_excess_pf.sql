-- Partilhar PF excedentes: transferência real entre duas fichas da mesma mesa.
-- Regras (validadas aqui, no servidor, e não só na tela):
--   * quem chama é o dono da ficha de origem (ou o Mestre dessa ficha);
--   * as duas fichas estão na mesma mesa (campaign_members);
--   * a ficha de origem tem Sincronia > 2 com o alvo, identificado pelo PRIMEIRO NOME
--     (sync "Ego" ou "Ego Aurefield" casa com qualquer ficha cujo nome comece com "Ego");
--   * existem PF excedentes e a Ação Padrão ainda não foi gasta;
--   * o alvo recebe até o que cabe em pf_max; o que sobrar continua como excedente;
--   * a Ação Padrão da origem é marcada como gasta.
-- O estado de regra (excess, rounds, standard...) fica no item kind='state' de sheets.abilities.

CREATE OR REPLACE FUNCTION public.share_excess_pf(p_from uuid, p_to uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_from public.sheets%ROWTYPE;
  v_to public.sheets%ROWTYPE;
  v_state jsonb;
  v_excess integer;
  v_room integer;
  v_amount integer;
  v_left integer;
  v_key text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Entre na sua conta para partilhar PF.'; END IF;
  IF p_from IS NULL OR p_to IS NULL OR p_from = p_to THEN RAISE EXCEPTION 'Escolha outro personagem como alvo.'; END IF;

  -- trava as duas fichas sempre na mesma ordem (evita deadlock em partilhas simultâneas)
  PERFORM 1 FROM public.sheets WHERE id IN (p_from, p_to) ORDER BY id FOR UPDATE;
  SELECT * INTO v_from FROM public.sheets WHERE id = p_from;
  IF NOT FOUND THEN RAISE EXCEPTION 'Ficha de origem não encontrada.'; END IF;
  SELECT * INTO v_to FROM public.sheets WHERE id = p_to;
  IF NOT FOUND THEN RAISE EXCEPTION 'Ficha do alvo não encontrada.'; END IF;

  IF v_from.user_id <> auth.uid() AND NOT public.is_master_of_sheet(p_from) THEN
    RAISE EXCEPTION 'Você não pode partilhar PF desta ficha.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.campaign_members a
    JOIN public.campaign_members b ON b.campaign_id = a.campaign_id
    WHERE a.character_id = p_from AND b.character_id = p_to
  ) THEN
    RAISE EXCEPTION 'O alvo não está na mesma mesa.';
  END IF;

  v_key := lower(split_part(btrim(v_to.name), ' ', 1));
  -- IFs separados: o Postgres não garante ordem de avaliação em um único OR, e sync pode estar salvo como objeto vazio.
  IF v_key = '' OR jsonb_typeof(v_from.sync) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'Sincronia insuficiente: é preciso mais de 2 de Sincronia com o alvo.';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM jsonb_array_elements(v_from.sync) s
    WHERE lower(split_part(btrim(coalesce(s->>'name', '')), ' ', 1)) = v_key
      AND coalesce((s->>'level')::numeric, 0) > 2
  ) THEN
    RAISE EXCEPTION 'Sincronia insuficiente: é preciso mais de 2 de Sincronia com o alvo.';
  END IF;

  BEGIN
    SELECT (a->>'description')::jsonb INTO v_state
    FROM jsonb_array_elements(v_from.abilities) a WHERE a->>'kind' = 'state' LIMIT 1;
  EXCEPTION WHEN others THEN
    v_state := NULL;
  END;
  IF v_state IS NULL OR jsonb_typeof(v_state) <> 'object' THEN v_state := '{}'::jsonb; END IF;

  v_excess := coalesce((v_state->>'excess')::integer, 0);
  IF v_excess <= 0 THEN RAISE EXCEPTION 'Você não tem PF excedentes para partilhar.'; END IF;
  IF coalesce((v_state->>'standard')::boolean, false) THEN RAISE EXCEPTION 'Você já gastou a Ação Padrão.'; END IF;

  v_room := greatest(0, v_to.pf_max - v_to.pf_current);
  IF v_room <= 0 THEN RAISE EXCEPTION 'O alvo está com os PF cheios e não pode receber o excedente.'; END IF;

  v_amount := least(v_excess, v_room);
  v_left := v_excess - v_amount;

  UPDATE public.sheets SET pf_current = pf_current + v_amount WHERE id = p_to;

  v_state := v_state || jsonb_build_object('excess', v_left, 'standard', true);
  IF v_left = 0 THEN v_state := v_state || jsonb_build_object('rounds', 0); END IF;

  UPDATE public.sheets SET abilities =
    coalesce((
      SELECT jsonb_agg(t.a ORDER BY t.ord)
      FROM jsonb_array_elements(v_from.abilities) WITH ORDINALITY AS t(a, ord)
      WHERE t.a->>'kind' IS DISTINCT FROM 'state'
    ), '[]'::jsonb)
    || jsonb_build_array(jsonb_build_object('kind', 'state', 'name', '__rule_state__', 'description', v_state::text))
  WHERE id = p_from;

  RETURN v_amount;
END;
$$;

REVOKE ALL ON FUNCTION public.share_excess_pf(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.share_excess_pf(uuid, uuid) TO authenticated;
