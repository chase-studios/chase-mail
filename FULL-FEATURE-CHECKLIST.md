# Chase Mail — Consolidated Feature Checklist Through Update 8

This is a **requirements checklist**, not a claim that each feature is implemented.

## Accounts and identity
- [ ] Community / Studio / Prime / Vanguard / invitation-only Royal edition entitlements
- [ ] Preserve edition-specific branding and role restrictions
- [ ] Shared Chase Studios login / SSO (requires integration with portal)
- [x] Supabase login / signup and password-reset request
- [ ] Two-factor authentication, secure recovery, account settings and profile personalization
- [ ] Verified primary custom-domain addresses and working external mail routing

## Mail
- [x] Internal Chase Mail inbox, sent messages and compose
- [x] Drafts, contacts and message search
- [ ] Custom folders, labels, filtering and signatures
- [ ] Scheduled sending with a trusted server-side worker (not just scheduled drafts)
- [ ] Attachments and notifications
- [ ] Gmail / Outlook / Yahoo provider OAuth, inbound and outbound mail
- [ ] Unified inbox with provider-specific connection status

## Appearance and companion collection
- [x] Accent color picker with browser-local persistence
- [x] Purple / Midnight / Light themes
- [ ] Full customizable multi-color themes and account-cloud synchronization
- [x] Four selectable egg types: Starlight, Ember, Moonlight, Forest
- [x] Twelve emoji-based companion choices; hatch with random selection and rare chance
- [x] Basic pet, feed, nap and floating companion actions
- [ ] 10–15 fully original illustrated/animated companions, species-specific behaviors
- [ ] Egg inventory, collection history, rarity tiers and companion cloud save
- [ ] Optional trading with server-enforced ownership and anti-duplication

## Cloud and platform
- [ ] Cloud sync of preferences, companions and inventory using Supabase RLS
- [ ] Shared integration with Chase Studios website and games
- [ ] Tested mobile-friendly PWA install, push notifications and offline behavior
- [ ] Reliable end-to-end mail delivery, background jobs, monitoring and tests

## Known backend tables from the newer Vercel work
mail_accounts, mail_invites, mail_companions, mail_cloud_drafts, mail_connected_accounts, mail_companion_inventory, mail_user_preferences, mail_executive_profiles, mail_scheduled_outbox, mail_custom_folders. Existing database records should be preserved; do not drop or recreate these tables without inspecting schema and RLS.

## Release rule
Do not call this Update 8 complete until the missing items are implemented, integrated and tested.
