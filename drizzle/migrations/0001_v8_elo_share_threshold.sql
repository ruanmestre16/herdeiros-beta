DO $migration$
DECLARE
  definition text;
BEGIN
  SELECT pg_get_functiondef('public.share_excess_pf(uuid,uuid)'::regprocedure) INTO definition;
  definition := replace(definition, 'coalesce((s->>''level'')::numeric, 0) > 2', 'coalesce((s->>''level'')::numeric, 0) >= 2');
  definition := replace(definition, 'Sincronia insuficiente: é preciso mais de 2 de Sincronia com o alvo.', 'Elo insuficiente: é preciso 2 ou mais de Elo com o alvo.');
  EXECUTE definition;
END;
$migration$;
REVOKE ALL ON FUNCTION public.share_excess_pf(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.share_excess_pf(uuid, uuid) TO authenticated;
COMMENT ON FUNCTION public.share_excess_pf(uuid, uuid) IS 'Livro v8: partilha de PF excedentes com Elo >= 2; preserva autorização, mesma mesa, travas ordenadas e ação padrão.';