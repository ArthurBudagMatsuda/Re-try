-- Retire only the disposable launch-test mint. Older deployments must not reseed it.
CREATE TRIGGER IF NOT EXISTS reject_retired_test_mint
BEFORE INSERT ON attempts
WHEN NEW.token_address = 'H7TuvDxEKygh27zGfGcjKG8JGWgrbyKpPtvJEpGosfas'
BEGIN
  SELECT RAISE(IGNORE);
END;
--> statement-breakpoint
DELETE FROM attempts
WHERE token_address = 'H7TuvDxEKygh27zGfGcjKG8JGWgrbyKpPtvJEpGosfas';
