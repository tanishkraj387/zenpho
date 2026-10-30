-- Authenticated shop purchase RPC.
-- The frontend requests an item key; the database validates price, balance,
-- and ownership before updating coins and inventory atomically.

create or replace function public.buy_item(p_item_key text)
returns table (
  item_key text,
  quantity integer,
  coins integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid;
  item_price integer;
  current_coins integer;
  next_quantity integer;
  next_coins integer;
begin
  current_user_id := auth.uid();

  if current_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select price
  into item_price
  from public.inventory_items
  where inventory_items.item_key = p_item_key
    and inventory_items.is_active;

  if item_price is null then
    raise exception 'Item is not available';
  end if;

  select player_resources.coins
  into current_coins
  from public.player_resources
  where player_resources.user_id = current_user_id
  for update;

  if current_coins is null then
    raise exception 'Player resources not found';
  end if;

  if current_coins < item_price then
    raise exception 'Not enough coins';
  end if;

  update public.player_resources
  set coins = player_resources.coins - item_price
  where player_resources.user_id = current_user_id
  returning player_resources.coins into next_coins;

  insert into public.player_inventory (user_id, item_key, quantity)
  values (current_user_id, p_item_key, 1)
  on conflict (user_id, item_key)
  do update set quantity = public.player_inventory.quantity + 1
  returning public.player_inventory.quantity into next_quantity;

  item_key := p_item_key;
  quantity := next_quantity;
  coins := next_coins;
  return next;
end;
$$;

revoke all on function public.buy_item(text) from public;
grant execute on function public.buy_item(text) to authenticated;
