create or replace function get_last_timestamp(p_ticker text, p_table text)
returns timestamptz as $$
declare
    last_ts timestamptz;
begin
    if p_table = 'daily' then
        select max(ts) into last_ts from market_data_daily where ticker = p_ticker;
    else
        select max(ts) into last_ts from market_data_observation where ticker = p_ticker;
    end if;
    return last_ts;
end;
$$ language plpgsql;