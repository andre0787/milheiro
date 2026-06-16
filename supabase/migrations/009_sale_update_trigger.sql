CREATE OR REPLACE FUNCTION fn_sale_update_profit()
RETURNS TRIGGER AS $$
DECLARE
  current_cpm DECIMAL(12,2);
  sale_cost DECIMAL(12,2);
BEGIN
  -- Get current CPM from balance
  SELECT cpm INTO current_cpm
  FROM balances
  WHERE program_id = NEW.program_id AND holder_id = NEW.holder_id;

  IF current_cpm IS NULL OR current_cpm = 0 THEN
    NEW.profit_auto := NEW.sale_value;
  ELSE
    sale_cost := ROUND((NEW.points_sold::DECIMAL * current_cpm) / 1000, 2);
    NEW.profit_auto := ROUND(NEW.sale_value - sale_cost, 2);
  END IF;

  NEW.profit_final := COALESCE(NEW.profit_override, NEW.profit_auto);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sale_update_profit ON sales;
CREATE TRIGGER trg_sale_update_profit
  BEFORE UPDATE ON sales
  FOR EACH ROW
  WHEN (OLD.sale_value IS DISTINCT FROM NEW.sale_value
     OR OLD.points_sold IS DISTINCT FROM NEW.points_sold
     OR OLD.profit_override IS DISTINCT FROM NEW.profit_override
     OR OLD.program_id IS DISTINCT FROM NEW.program_id
     OR OLD.holder_id IS DISTINCT FROM NEW.holder_id)
  EXECUTE FUNCTION fn_sale_update_profit();
