-- Run this once in Supabase > SQL Editor
-- (Your existing `settings` table is used as it is: columns id + value.)

-- Separates customer menu items into the Drinks and Pastries pages.
alter table menu add column if not exists category text not null default 'drinks';
alter table menu alter column category set default 'drinks';
update menu set category = 'drinks' where category is null or btrim(category) = '';
alter table menu alter column category set not null;

-- Optional customer-facing description shown on menu cards and item dialogs.
alter table menu add column if not exists description text not null default '';
alter table menu add column if not exists color text not null default '#0e4bbe';
alter table menu alter column color set default '#0e4bbe';
update menu set color = '#0e4bbe' where color is null or btrim(color) = '' or lower(color) in ('#fcfaf4', '#0f47af');
alter table menu alter column color set not null;

-- Lets the queue tell waiting / done / cancelled orders apart
alter table orders add column if not exists status text;
alter table orders alter column status set default 'waiting';

-- Remembers whether an order's ingredients were already taken out of stock
alter table orders add column if not exists deducted boolean default false;

-- Records how each order was paid so Sales can separate cash and QR payments.
alter table orders add column if not exists payment text not null default 'cash';
alter table orders drop constraint if exists orders_payment_check;
alter table orders add constraint orders_payment_check check (payment in ('cash', 'qr'));
update orders set payment = 'cash' where payment is null or payment not in ('cash', 'qr');
alter table orders add column if not exists customer_name text not null default '';

-- Stores the most recent restock date alongside each ingredient's current balance.
alter table ings add column if not exists last_restocked_at timestamptz;

-- Keeps dated stock-addition records with each ingredient for Inventory history.
alter table ings add column if not exists stock_history jsonb not null default '[]'::jsonb;
update ings set stock_history = '[]'::jsonb where stock_history is null;
alter table ings alter column stock_history set default '[]'::jsonb;
alter table ings alter column stock_history set not null;
