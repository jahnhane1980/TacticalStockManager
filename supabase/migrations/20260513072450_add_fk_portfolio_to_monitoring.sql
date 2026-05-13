alter table "public"."portfolio_snapshots" add constraint "portfolio_snapshots_ticker_fkey" FOREIGN KEY (ticker) REFERENCES public.monitoring_config(ticker) ON DELETE CASCADE not valid;

alter table "public"."portfolio_snapshots" validate constraint "portfolio_snapshots_ticker_fkey";


