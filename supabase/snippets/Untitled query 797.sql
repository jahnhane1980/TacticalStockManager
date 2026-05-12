-- Erlaube der Rolle 'anon' vollen Zugriff auf die Portfolio-Tabellen (nur für lokale Tests empfohlen)
CREATE POLICY "Enable all access for anon" ON "public"."portfolio_snapshots"
FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Enable all access for anon" ON "public"."market_data_daily"
FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Enable all access for anon" ON "public"."market_data_observation"
FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Enable all access for anon" ON "public"."monitoring_config"
FOR ALL TO anon USING (true) WITH CHECK (true);