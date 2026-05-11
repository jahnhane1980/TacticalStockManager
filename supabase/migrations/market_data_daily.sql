create table market_data_daily (
    id uuid primary key default gen_random_uuid(),
    ticker text not null,
    ts timestamptz not null,
    
    -- "The Big Five" + Adjusted für saubere Charts
    open numeric not null,
    high numeric not null,
    low numeric not null,
    close numeric not null,
    volume bigint,
    adj_close numeric,
    
    -- Indikatoren aus dem Pine-Script
    sma_200 numeric,
    sma_50_h numeric, -- Decke
    sma_50_l numeric, -- Boden
    atr_14 numeric,
    
    -- Flexibler Speicher für weitere Metriken (z.B. ZigZag-Daten)
    extras jsonb default '{}'::jsonb,
    
    -- Das Original-JSON von Tiingo für Audits
    raw_json jsonb,

    unique (ticker, ts)
);

create index idx_daily_ticker_ts on market_data_daily (ticker, ts desc);