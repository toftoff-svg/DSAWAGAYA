-- Run this once in Supabase > SQL Editor
-- (Your existing `settings` table is used as it is: columns id + value.)

-- Lets the queue tell waiting / done / cancelled orders apart
alter table orders add column if not exists status text;
alter table orders alter column status set default 'waiting';

-- Remembers whether an order's ingredients were already taken out of stock
alter table orders add column if not exists deducted boolean default false;
