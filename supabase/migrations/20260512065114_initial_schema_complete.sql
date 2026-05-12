create extension if not exists "pg_cron" with schema "pg_catalog";


  create table "public"."market_data_daily" (
    "id" uuid not null default gen_random_uuid(),
    "ticker" text not null,
    "ts" timestamp with time zone not null,
    "open" numeric not null,
    "high" numeric not null,
    "low" numeric not null,
    "close" numeric not null,
    "volume" bigint,
    "adj_close" numeric,
    "sma_200" numeric,
    "sma_50_h" numeric,
    "sma_50_l" numeric,
    "atr_14" numeric,
    "extras" jsonb default '{}'::jsonb,
    "raw_json" jsonb
      );


alter table "public"."market_data_daily" enable row level security;


  create table "public"."market_data_observation" (
    "id" uuid not null default gen_random_uuid(),
    "ticker" text not null,
    "ts" timestamp with time zone not null,
    "open" numeric not null,
    "high" numeric not null,
    "low" numeric not null,
    "close" numeric not null,
    "rescue_sma_10" numeric,
    "chandelier_stop" numeric,
    "is_para_mode" boolean default false
      );


alter table "public"."market_data_observation" enable row level security;


  create table "public"."monitoring_config" (
    "ticker" text not null,
    "frequency" text not null default 'daily'::text,
    "sell_threshold" numeric,
    "is_active" boolean default true,
    "signal_fired" boolean default false,
    "post_sell_check_at" timestamp with time zone,
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."monitoring_config" enable row level security;


  create table "public"."portfolio_snapshots" (
    "ticker" text not null,
    "name" text,
    "isin" text,
    "quantity" numeric not null default 0,
    "average_price_paid" numeric,
    "current_price" numeric,
    "total_cost_eur" numeric,
    "current_value_eur" numeric,
    "fx_impact" numeric,
    "last_sync" timestamp with time zone default now(),
    "raw_snapshot" jsonb
      );


alter table "public"."portfolio_snapshots" enable row level security;

CREATE INDEX idx_obs_ticker_ts ON public.market_data_observation USING btree (ticker, ts DESC);

CREATE UNIQUE INDEX market_data_daily_pkey ON public.market_data_daily USING btree (id);

CREATE UNIQUE INDEX market_data_daily_ticker_ts_key ON public.market_data_daily USING btree (ticker, ts);

CREATE UNIQUE INDEX market_data_observation_pkey ON public.market_data_observation USING btree (id);

CREATE UNIQUE INDEX market_data_observation_ticker_ts_key ON public.market_data_observation USING btree (ticker, ts);

CREATE UNIQUE INDEX monitoring_config_pkey ON public.monitoring_config USING btree (ticker);

CREATE UNIQUE INDEX portfolio_snapshots_pkey ON public.portfolio_snapshots USING btree (ticker);

alter table "public"."market_data_daily" add constraint "market_data_daily_pkey" PRIMARY KEY using index "market_data_daily_pkey";

alter table "public"."market_data_observation" add constraint "market_data_observation_pkey" PRIMARY KEY using index "market_data_observation_pkey";

alter table "public"."monitoring_config" add constraint "monitoring_config_pkey" PRIMARY KEY using index "monitoring_config_pkey";

alter table "public"."portfolio_snapshots" add constraint "portfolio_snapshots_pkey" PRIMARY KEY using index "portfolio_snapshots_pkey";

alter table "public"."market_data_daily" add constraint "market_data_daily_ticker_ts_key" UNIQUE using index "market_data_daily_ticker_ts_key";

alter table "public"."market_data_observation" add constraint "market_data_observation_ticker_ts_key" UNIQUE using index "market_data_observation_ticker_ts_key";

grant delete on table "public"."market_data_daily" to "anon";

grant insert on table "public"."market_data_daily" to "anon";

grant references on table "public"."market_data_daily" to "anon";

grant select on table "public"."market_data_daily" to "anon";

grant trigger on table "public"."market_data_daily" to "anon";

grant truncate on table "public"."market_data_daily" to "anon";

grant update on table "public"."market_data_daily" to "anon";

grant delete on table "public"."market_data_daily" to "authenticated";

grant insert on table "public"."market_data_daily" to "authenticated";

grant references on table "public"."market_data_daily" to "authenticated";

grant select on table "public"."market_data_daily" to "authenticated";

grant trigger on table "public"."market_data_daily" to "authenticated";

grant truncate on table "public"."market_data_daily" to "authenticated";

grant update on table "public"."market_data_daily" to "authenticated";

grant delete on table "public"."market_data_daily" to "service_role";

grant insert on table "public"."market_data_daily" to "service_role";

grant references on table "public"."market_data_daily" to "service_role";

grant select on table "public"."market_data_daily" to "service_role";

grant trigger on table "public"."market_data_daily" to "service_role";

grant truncate on table "public"."market_data_daily" to "service_role";

grant update on table "public"."market_data_daily" to "service_role";

grant delete on table "public"."market_data_observation" to "anon";

grant insert on table "public"."market_data_observation" to "anon";

grant references on table "public"."market_data_observation" to "anon";

grant select on table "public"."market_data_observation" to "anon";

grant trigger on table "public"."market_data_observation" to "anon";

grant truncate on table "public"."market_data_observation" to "anon";

grant update on table "public"."market_data_observation" to "anon";

grant delete on table "public"."market_data_observation" to "authenticated";

grant insert on table "public"."market_data_observation" to "authenticated";

grant references on table "public"."market_data_observation" to "authenticated";

grant select on table "public"."market_data_observation" to "authenticated";

grant trigger on table "public"."market_data_observation" to "authenticated";

grant truncate on table "public"."market_data_observation" to "authenticated";

grant update on table "public"."market_data_observation" to "authenticated";

grant delete on table "public"."market_data_observation" to "service_role";

grant insert on table "public"."market_data_observation" to "service_role";

grant references on table "public"."market_data_observation" to "service_role";

grant select on table "public"."market_data_observation" to "service_role";

grant trigger on table "public"."market_data_observation" to "service_role";

grant truncate on table "public"."market_data_observation" to "service_role";

grant update on table "public"."market_data_observation" to "service_role";

grant delete on table "public"."monitoring_config" to "anon";

grant insert on table "public"."monitoring_config" to "anon";

grant references on table "public"."monitoring_config" to "anon";

grant select on table "public"."monitoring_config" to "anon";

grant trigger on table "public"."monitoring_config" to "anon";

grant truncate on table "public"."monitoring_config" to "anon";

grant update on table "public"."monitoring_config" to "anon";

grant delete on table "public"."monitoring_config" to "authenticated";

grant insert on table "public"."monitoring_config" to "authenticated";

grant references on table "public"."monitoring_config" to "authenticated";

grant select on table "public"."monitoring_config" to "authenticated";

grant trigger on table "public"."monitoring_config" to "authenticated";

grant truncate on table "public"."monitoring_config" to "authenticated";

grant update on table "public"."monitoring_config" to "authenticated";

grant delete on table "public"."monitoring_config" to "service_role";

grant insert on table "public"."monitoring_config" to "service_role";

grant references on table "public"."monitoring_config" to "service_role";

grant select on table "public"."monitoring_config" to "service_role";

grant trigger on table "public"."monitoring_config" to "service_role";

grant truncate on table "public"."monitoring_config" to "service_role";

grant update on table "public"."monitoring_config" to "service_role";

grant delete on table "public"."portfolio_snapshots" to "anon";

grant insert on table "public"."portfolio_snapshots" to "anon";

grant references on table "public"."portfolio_snapshots" to "anon";

grant select on table "public"."portfolio_snapshots" to "anon";

grant trigger on table "public"."portfolio_snapshots" to "anon";

grant truncate on table "public"."portfolio_snapshots" to "anon";

grant update on table "public"."portfolio_snapshots" to "anon";

grant delete on table "public"."portfolio_snapshots" to "authenticated";

grant insert on table "public"."portfolio_snapshots" to "authenticated";

grant references on table "public"."portfolio_snapshots" to "authenticated";

grant select on table "public"."portfolio_snapshots" to "authenticated";

grant trigger on table "public"."portfolio_snapshots" to "authenticated";

grant truncate on table "public"."portfolio_snapshots" to "authenticated";

grant update on table "public"."portfolio_snapshots" to "authenticated";

grant delete on table "public"."portfolio_snapshots" to "service_role";

grant insert on table "public"."portfolio_snapshots" to "service_role";

grant references on table "public"."portfolio_snapshots" to "service_role";

grant select on table "public"."portfolio_snapshots" to "service_role";

grant trigger on table "public"."portfolio_snapshots" to "service_role";

grant truncate on table "public"."portfolio_snapshots" to "service_role";

grant update on table "public"."portfolio_snapshots" to "service_role";


  create policy "Allow read for authenticated users"
  on "public"."market_data_daily"
  as permissive
  for select
  to authenticated
using (true);



  create policy "Allow read for authenticated users"
  on "public"."market_data_observation"
  as permissive
  for select
  to authenticated
using (true);



  create policy "Allow read for authenticated users"
  on "public"."monitoring_config"
  as permissive
  for select
  to authenticated
using (true);



  create policy "Allow read for authenticated users"
  on "public"."portfolio_snapshots"
  as permissive
  for select
  to authenticated
using (true);



