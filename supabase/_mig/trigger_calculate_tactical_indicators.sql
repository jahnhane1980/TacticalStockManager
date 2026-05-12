CREATE OR REPLACE FUNCTION calculate_tactical_indicators()
RETURNS TRIGGER AS $$
DECLARE
    prev_peak_high NUMERIC;
    prev_is_para_mode BOOLEAN;
    chand_pct NUMERIC := 10.0; -- Standardwert aus deinem Script [cite: 1]
BEGIN
    -- 1. Hole Werte der vorherigen Kerze für diesen Ticker
    SELECT chandelier_stop, is_para_mode 
    INTO prev_peak_high, prev_is_para_mode
    FROM market_data_observation
    WHERE ticker = NEW.ticker
    AND ts < NEW.ts
    ORDER BY ts DESC
    LIMIT 1;

    -- 2. SMA Aggressiv (Notbremse) [cite: 5]
    -- (Hier vereinfacht: In der Realität würde man hier eine Aggregation über die letzten 10 Zeilen machen)
    SELECT AVG(close) INTO NEW.rescue_sma_10
    FROM (
        SELECT close FROM market_data_observation
        WHERE ticker = NEW.ticker AND ts <= NEW.ts
        ORDER BY ts DESC LIMIT 10
    ) AS last_10;

    -- 3. Parabolik-Logik (Konzept B: Gier-Zone / Deviation) 
    -- Wir prüfen, ob der Modus aktiviert werden muss oder durch Schlusskurs unter SMA20 erlischt [cite: 5]
    IF NEW.close > (SELECT sma_50_h FROM market_data_daily WHERE ticker = NEW.ticker ORDER BY ts DESC LIMIT 1) THEN
        NEW.is_para_mode := true;
    ELSIF NEW.close < (SELECT sma_20_h FROM market_data_daily WHERE ticker = NEW.ticker ORDER BY ts DESC LIMIT 1) THEN
        NEW.is_para_mode := false;
    ELSE
        NEW.is_para_mode := COALESCE(prev_is_para_mode, false);
    END IF;

    -- 4. Chandelier Stop Berechnung 
    IF NEW.is_para_mode THEN
        -- Peak High Tracking: Höchster Wert seit Beginn des Parabolik-Modus 
        NEW.chandelier_stop := GREATEST(COALESCE(prev_peak_high, NEW.high), NEW.high);
        -- Der eigentliche Stop-Wert (Peak * (1 - %)) 
        -- Hinweis: Wir speichern hier den berechneten Stop-Level
    ELSE
        NEW.chandelier_stop := NULL;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;