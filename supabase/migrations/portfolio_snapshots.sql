create table portfolio_snapshots (
    ticker text primary key, -- Der T212 Ticker (z.B. S_US_EQ)
    name text,
    isin text,
    quantity numeric not null default 0,
    average_price_paid numeric,
    current_price numeric,
    
    -- Wallet Impact (EUR-Werte für die Auswertung)
    total_cost_eur numeric,
    current_value_eur numeric,
    fx_impact numeric,
    
    last_sync timestamptz default now(),
    raw_snapshot jsonb -- Das komplette Objekt aus deinem Portfolio-JSON
);