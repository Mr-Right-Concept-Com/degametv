-- Submitted identity evidence must remain available to reviewers.
-- Cleanup is a privileged retention workflow, not an applicant delete capability.
drop policy if exists "Identity applicants delete own unsubmitted evidence" on storage.objects;

-- Remove the verified duplicate btree index; idx_screening_tickets_screening remains.
drop index if exists public.idx_tickets_screening_id;
