alter table "public"."monitoring_config" add column "last_historical_sync" timestamp with time zone;

alter table "public"."monitoring_config" add column "last_observation_sync" timestamp with time zone;

alter table "public"."monitoring_config" add column "locked_until" timestamp with time zone;


