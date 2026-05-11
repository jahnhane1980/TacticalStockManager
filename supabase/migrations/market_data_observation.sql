create table market_data_observation (
    id uuid primary key default gen_random_uuid(),
    ticker text not null,
    ts timestamptz not null,
    
    open numeric not null,
    high numeric not null,
    low numeric not null,
    close numeric not null,
    
    -- Taktische Indikatoren
    rescue_sma_10 numeric, -- SMA Aggressiv
    chandelier_stop numeric,
    is_para_mode boolean default false,
    
    unique (ticker, ts)
);

create index idx_obs_ticker_ts on market_data_observation (ticker, ts desc);