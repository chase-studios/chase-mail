-- ============================================================
-- Chase Mail Version 10 Database Permissions & Soft-Delete Migration
-- Safe & Idempotent: Does NOT delete or alter existing data!
-- ============================================================

-- 1. Ensure deletion timestamp columns exist on mail_messages
do $$
begin
  if not exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' and table_name = 'mail_messages' and column_name = 'sender_deleted_at'
  ) then
    alter table public.mail_messages add column sender_deleted_at timestamptz default null;
  end if;

  if not exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' and table_name = 'mail_messages' and column_name = 'recipient_deleted_at'
  ) then
    alter table public.mail_messages add column recipient_deleted_at timestamptz default null;
  end if;
end $$;

-- 2. Grant column-level update permissions to authenticated users for deletion
grant update(recipient_read_at, recipient_deleted_at, sender_deleted_at) on public.mail_messages to authenticated;
grant delete on public.mail_messages to authenticated;

-- 3. Stored procedure for secure, authorized message soft-deletion
create or replace function public.delete_chase_mail_message(p_message_id uuid, p_folder text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_count int := 0;
begin
  if p_folder = 'inbox' then
    update public.mail_messages
    set recipient_deleted_at = now()
    where id = p_message_id and recipient_id = auth.uid();
    get diagnostics updated_count = row_count;
  elsif p_folder = 'sent' then
    update public.mail_messages
    set sender_deleted_at = now()
    where id = p_message_id and sender_id = auth.uid();
    get diagnostics updated_count = row_count;
  end if;

  return updated_count > 0;
end;
$$;

grant execute on function public.delete_chase_mail_message(uuid, text) to authenticated;

-- 4. Verify and reinforce Row Level Security (RLS) on mail tables
alter table public.mail_accounts enable row level security;
alter table public.mail_messages enable row level security;
alter table public.mail_drafts enable row level security;
alter table public.mail_contacts enable row level security;
alter table public.mail_external_messages enable row level security;
alter table public.mail_delivery_events enable row level security;

-- 5. Safe update policies for mail_messages
drop policy if exists "Recipients can mark messages read or deleted" on public.mail_messages;
create policy "Recipients can mark messages read or deleted"
  on public.mail_messages for update
  using (recipient_id = auth.uid() or sender_id = auth.uid())
  with check (recipient_id = auth.uid() or sender_id = auth.uid());
