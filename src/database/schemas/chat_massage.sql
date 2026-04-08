create table chat_messages (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  session_id uuid, 
  role text check (role in ('user', 'assistant')),
  content text,
  
  attachment_url text,      
  attachment_type text,     
  metadata jsonb,           
  
  created_at timestamp with time zone default now()
);

-- Enable RLS so users only see their own chats
alter table chat_messages enable row level security;
create policy "Users can view their own messages" on chat_messages 
  for select using (auth.uid() = user_id);