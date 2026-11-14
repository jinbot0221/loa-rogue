-- Preserve existing accounts, sessions, progress and unique identifiers.
-- Old email addresses remain valid login identifiers; new signups use usernames.
ALTER TABLE users RENAME COLUMN email TO username;
