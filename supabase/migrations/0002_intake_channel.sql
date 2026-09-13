-- QuoteReady · 0002_intake_channel
-- How the enquiry reached the business (text / call / web_form / email / in_person).

alter table jobs add column if not exists intake_channel text not null default 'text';
create index if not exists idx_jobs_intake on jobs (intake_channel);