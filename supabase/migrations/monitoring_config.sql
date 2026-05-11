create table monitoring_config (
    ticker text primary key, -- Der bereinigte Ticker (z.B. S)
    frequency text not null default 'daily', -- 'daily' oder 'hourly'
    sell_threshold numeric, -- Dein Zielverkaufspreis
    
    -- Status-Flags für die Logik
    is_active boolean default true,
    signal_fired boolean default false,
    post_sell_check_at timestamptz, -- Zeitstempel für den 1h-Check nach Verkauf
    
    updated_at timestamptz default now()
);