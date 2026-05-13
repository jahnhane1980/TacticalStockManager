CREATE UNIQUE INDEX market_data_daily_ticker_ts_idx ON public.market_data_daily USING btree (ticker, ts);


