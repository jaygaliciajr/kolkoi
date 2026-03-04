alter table if exists public.post_proofs
add column if not exists reject_reason text;
