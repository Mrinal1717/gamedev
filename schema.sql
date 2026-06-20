-- Create tables for Ludo Real-time Game App

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Rooms Table
create table if not exists public.ludo_rooms (
    id uuid default gen_random_uuid() primary key,
    room_code varchar(6) unique not null,
    status varchar(20) default 'waiting' not null, -- 'waiting', 'playing', 'finished'
    host_id varchar(100) not null,
    players jsonb default '[]'::jsonb not null, -- array of { id, name, color, is_ready, is_host }
    current_turn integer default 0 not null, -- index of active player (0: Red, 1: Green, 2: Yellow, 3: Blue)
    game_state jsonb default '{
        "board_state": {"red": [0,0,0,0], "green": [0,0,0,0], "yellow": [0,0,0,0], "blue": [0,0,0,0]},
        "dice_value": null,
        "dice_state": "idle",
        "rolls_left_for_six": 1,
        "winner": null,
        "consecutive_sixes": 0
    }'::jsonb not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Messages Table
create table if not exists public.ludo_messages (
    id uuid default gen_random_uuid() primary key,
    room_id uuid references public.ludo_rooms(id) on delete cascade not null,
    sender_id varchar(100) not null,
    sender_name varchar(100) not null,
    sender_color varchar(20) not null,
    text text not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Trigger for updating updated_at timestamp
create or replace function public.handle_updated_at()
returns trigger as $$
begin
    new.updated_at = timezone('utc'::text, now());
    return new;
end;
$$ language plpgsql;

create or replace trigger on_room_updated
    before update on public.ludo_rooms
    for each row
    execute function public.handle_updated_at();

-- Disable RLS or set open policies since it is an anonymous/casual gameplay setup
alter table public.ludo_rooms enable row level security;
alter table public.ludo_messages enable row level security;

-- Policies for ludo_rooms
create policy "Allow public read access to rooms" 
    on public.ludo_rooms for select 
    using (true);

create policy "Allow public insert access to rooms" 
    on public.ludo_rooms for insert 
    with check (true);

create policy "Allow public update access to rooms" 
    on public.ludo_rooms for update 
    using (true);

-- Policies for ludo_messages
create policy "Allow public read access to messages" 
    on public.ludo_messages for select 
    using (true);

create policy "Allow public insert access to messages" 
    on public.ludo_messages for insert 
    with check (true);

-- Enable real-time replication for these tables
begin;
  -- Remove existing subscription if any to avoid duplicates
  alter publication supabase_realtime remove table public.ludo_rooms;
  alter publication supabase_realtime remove table public.ludo_messages;
exception when others then
  -- Do nothing if publication doesn't exist yet or tables aren't in it
end;

alter publication supabase_realtime add table public.ludo_rooms;
alter publication supabase_realtime add table public.ludo_messages;
