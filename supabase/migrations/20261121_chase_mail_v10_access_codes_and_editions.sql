-- ============================================================
-- Chase Mail Version 10 — Account Editions, Access Codes & Executive Roles
-- Safe & Non-Destructive: Preserves all existing records!
-- ============================================================

-- 1. Ensure edition, role, and customization columns exist on mail_accounts
do $$
begin
  if not exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' and table_name = 'mail_accounts' and column_name = 'is_admin'
  ) then
    alter table public.mail_accounts add column is_admin boolean default false;
  end if;

  if not exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' and table_name = 'mail_accounts' and column_name = 'admin_role'
  ) then
    alter table public.mail_accounts add column admin_role text default 'user';
  end if;

  if not exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' and table_name = 'mail_accounts' and column_name = 'gold_trim'
  ) then
    alter table public.mail_accounts add column gold_trim boolean default false;
  end if;

  if not exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' and table_name = 'mail_accounts' and column_name = 'status'
  ) then
    alter table public.mail_accounts add column status text default 'active';
  end if;
end $$;

-- 2. Enhanced Registration RPC with edition selection & code validation
create or replace function public.register_chase_mail_account(
  p_handle text,
  p_display_name text,
  p_edition text default 'community',
  p_access_code text default ''
)
returns public.mail_accounts
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_clean_handle text;
  v_clean_edition text := lower(coalesce(p_edition, 'community'));
  v_code text := upper(trim(coalesce(p_access_code, '')));
  v_is_admin boolean := false;
  v_role text := 'user';
  v_gold_trim boolean := false;
  v_result public.mail_accounts;
begin
  if v_uid is null then
    raise exception 'Authentication required to provision Chase Mail account.';
  end if;

  -- Validate handle: lowercase alphanumeric and hyphens/underscores only
  v_clean_handle := lower(trim(p_handle));
  if length(v_clean_handle) < 3 or length(v_clean_handle) > 32 then
    raise exception 'Username must be between 3 and 32 characters.';
  end if;

  if v_clean_handle !~ '^[a-z0-9_-]+$' then
    raise exception 'Username can only contain letters, numbers, hyphens, and underscores.';
  end if;

  -- Prevent claiming reserved names without administrative authorization
  if v_clean_handle in ('admin', 'support', 'security', 'billing', 'official', 'postmaster', 'hostmaster', 'chase', 'chasestudios') 
     and v_code not in ('STUDIO-EXEC-2026', 'CHASE-STUDIOS-SUPERADMIN-2026') then
    raise exception 'That handle is reserved by Chase Studios.';
  end if;

  -- Validate access code for protected editions
  if v_clean_edition = 'studio' then
    if v_code in ('STUDIO-EXEC-2026', 'CHASE-STUDIOS-SUPERADMIN-2026') then
      v_is_admin := true;
      v_role := 'executive';
      v_gold_trim := true;
    else
      raise exception 'Valid Studio Registration Access Code required.';
    end if;
  elsif v_clean_edition = 'royal' then
    if v_code in ('ROYAL-CHASE-2026', 'CHASE-STUDIOS-SUPERADMIN-2026') then
      v_gold_trim := true;
    else
      raise exception 'Valid Royal Edition Access Code required.';
    end if;
  elsif v_clean_edition = 'vanguard' then
    if v_code not in ('VANGUARD-CHASE-2026', 'CHASE-STUDIOS-SUPERADMIN-2026') then
      raise exception 'Valid Vanguard Edition Access Code required.';
    end if;
  elsif v_clean_edition = 'prime' then
    if v_code not in ('PRIME-CHASE-2026', 'CHASE-STUDIOS-SUPERADMIN-2026') then
      raise exception 'Valid Prime Edition Access Code required.';
    end if;
  else
    v_clean_edition := 'community';
  end if;

  -- Check if user already has an account
  if exists (select 1 from public.mail_accounts where user_id = v_uid) then
    raise exception 'You already have a registered Chase Mail account.';
  end if;

  -- Check handle uniqueness
  if exists (select 1 from public.mail_accounts where handle = v_clean_handle) then
    raise exception 'Username is already taken. Please choose another.';
  end if;

  -- Insert new account
  insert into public.mail_accounts (
    user_id,
    handle,
    display_name,
    edition,
    is_admin,
    admin_role,
    gold_trim,
    status
  ) values (
    v_uid,
    v_clean_handle,
    trim(p_display_name),
    v_clean_edition,
    v_is_admin,
    v_role,
    v_gold_trim,
    'active'
  )
  returning * into v_result;

  return v_result;
end;
$$;

grant execute on function public.register_chase_mail_account(text, text, text, text) to authenticated;
