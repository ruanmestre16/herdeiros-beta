REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.is_campaign_master(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_campaign_member(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_master_of_sheet(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.shares_campaign_sheet(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.shares_campaign_user(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.set_campaign_password(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.join_campaign(text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.join_campaign_invite(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.master_update_sheet(uuid, integer, integer, boolean) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.is_campaign_master(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_campaign_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_master_of_sheet(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.shares_campaign_sheet(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.shares_campaign_user(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_campaign_password(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_campaign(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_campaign_invite(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.master_update_sheet(uuid, integer, integer, boolean) TO authenticated;