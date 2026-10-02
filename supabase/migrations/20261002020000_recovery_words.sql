-- Version 2 stores a locally encrypted secret + optional mnemonic. Version 1
-- records remain valid and immutable, preserving all existing public addresses.
alter table public.wallet_backups drop constraint wallet_backups_backup_check;
alter table public.wallet_backups add constraint wallet_backups_backup_check check (
  jsonb_typeof(backup) = 'object' and backup ?& array['version', 'salt', 'nonce', 'ciphertext']
  and backup - array['version', 'salt', 'nonce', 'ciphertext'] = '{}'::jsonb
  and jsonb_typeof(backup->'version') = 'number' and jsonb_typeof(backup->'salt') = 'string'
  and jsonb_typeof(backup->'nonce') = 'string' and jsonb_typeof(backup->'ciphertext') = 'string'
  and backup->>'version' in ('1', '2') and backup->>'salt' ~ '^[a-f0-9]{32}$'
  and backup->>'nonce' ~ '^[a-f0-9]{24}$' and backup->>'ciphertext' ~ '^[a-f0-9]+$'
  and char_length(backup->>'ciphertext') % 2 = 0
  and ((backup->>'version' = '1' and char_length(backup->>'ciphertext') = 144)
    or (backup->>'version' = '2' and char_length(backup->>'ciphertext') between 144 and 2048))
  and octet_length(backup::text) < 4096
);
