
  create policy "Enable all access for anon"
  on "public"."market_data_daily"
  as permissive
  for all
  to anon
using (true)
with check (true);



  create policy "Enable all access for anon"
  on "public"."market_data_observation"
  as permissive
  for all
  to anon
using (true)
with check (true);



  create policy "Enable all access for anon"
  on "public"."monitoring_config"
  as permissive
  for all
  to anon
using (true)
with check (true);



  create policy "Enable all access for anon"
  on "public"."portfolio_snapshots"
  as permissive
  for all
  to anon
using (true)
with check (true);



