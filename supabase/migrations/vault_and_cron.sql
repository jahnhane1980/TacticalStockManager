-- Aktiviert die Vault-Erweiterung für die sichere Speicherung von API-Keys
create extension if not exists "vault" with schema "vault";

-- Optional: Falls du Cronjobs direkt in der DB steuern willst
create extension if not exists "pg_cron";