-- Remove only the explicitly simulated seed records; real mint history is preserved.
DELETE FROM attempts WHERE token_address GLOB 'SIMULATED_RETRY_MINT_[0-9][0-9][0-9]_NO_ONCHAIN_TOKEN';
