
  create policy "Enable all access for authenticated users"
  on "public"."market_data_daily"
  as permissive
  for all
  to authenticated
using (true)
with check (true);



  create policy "Enable all access for service_role"
  on "public"."market_data_daily"
  as permissive
  for all
  to service_role
using (true)
with check (true);



  create policy "Enable all access for authenticated users"
  on "public"."market_data_observation"
  as permissive
  for all
  to authenticated
using (true)
with check (true);



  create policy "Enable all access for service_role"
  on "public"."market_data_observation"
  as permissive
  for all
  to service_role
using (true)
with check (true);



  create policy "Enable all access for authenticated users"
  on "public"."monitoring_config"
  as permissive
  for all
  to authenticated
using (true)
with check (true);



  create policy "Enable all access for service_role"
  on "public"."monitoring_config"
  as permissive
  for all
  to service_role
using (true)
with check (true);



  create policy "Enable all access for authenticated users"
  on "public"."portfolio_snapshots"
  as permissive
  for all
  to authenticated
using (true)
with check (true);



  create policy "Enable all access for service_role"
  on "public"."portfolio_snapshots"
  as permissive
  for all
  to service_role
using (true)
with check (true);



