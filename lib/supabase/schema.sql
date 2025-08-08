-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Create profiles table
create table profiles (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  title text not null,
  subtitle text not null,
  present_text text[] not null default array[]::text[],
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create posts table
create table posts (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  slug text not null unique,
  content text,
  published boolean default false,
  tags text[] default array[]::text[],
  meta_title text,
  meta_description text,
  canonical_url text,
  og_image_url text,
  noindex boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table profiles enable row level security;
alter table posts enable row level security;

-- Create policies for profiles (allowing full access to everyone)
create policy "Allow full access to profiles"
  on profiles for all
  using (true)
  with check (true);

-- Create policies for posts
create policy "Allow read access to published posts"
  on posts for select
  using (true);

create policy "Allow full access to posts"
  on posts for all
  using (true)
  with check (true);

-- Insert initial profile data
insert into profiles (id, name, title, subtitle, present_text) values (
  '123e4567-e89b-12d3-a456-426614174000',
  'Railly Hugo',
  'Hunter',
  'Software Engineer ~ AI Master''s Student',
  array[
    'I work as a full-stack engineer at Globant, contributing to Disney O&I Engineering Team.',
    'I like to build developer tools for myself and make them open source for the community.'
  ]
);