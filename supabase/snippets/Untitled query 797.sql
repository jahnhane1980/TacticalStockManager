ALTER TABLE "public"."monitoring_config" 
ADD COLUMN "last_historical_sync" timestamp with time zone,
ADD COLUMN "last_observation_sync" timestamp with time zone,
ADD COLUMN "locked_until" timestamp with time zone;