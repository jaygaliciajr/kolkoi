create index if not exists idx_content_submissions_status
  on public.content_submissions (status);

create index if not exists idx_post_proofs_status
  on public.post_proofs (status);

create index if not exists idx_payment_milestones_status
  on public.payment_milestones (status);

create index if not exists idx_payment_transactions_created_at
  on public.payment_transactions (created_at);
