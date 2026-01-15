import { getCollection, COLLECTIONS } from './mongodb';

export interface User {
  username: string;
  password: string;
  role: 'admin' | 'user';
  permissions: string[];
  created_at: string;
  last_login: string;
  last_duration: string;
}

export interface UsersDocument {
  _id: string;
  data: Record<string, User>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const createFilter = (id: string): any => ({ _id: id });

export async function getUsers(): Promise<Record<string, User>> {
  const collection = await getCollection(COLLECTIONS.USERS);
  const record = await collection.findOne(createFilter('global_users')) as UsersDocument | null;
  
  if (record) {
    return record.data;
  }
  
  return {};
}

export async function validateUser(username: string, password: string): Promise<User | null> {
  const users = await getUsers();
  const user = users[username];
  
  if (!user) {
    return null;
  }
  
  if (user.password === password) {
    return user;
  }
  
  return null;
}

export async function updateLastLogin(username: string): Promise<void> {
  const collection = await getCollection(COLLECTIONS.USERS);
  const users = await getUsers();
  
  if (users[username]) {
    const now = new Date();
    const formattedTime = now.toLocaleString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      day: '2-digit',
      month: 'short',
    });
    
    users[username].last_login = formattedTime;
    
    await collection.replaceOne(
      createFilter('global_users'),
      { _id: 'global_users', data: users },
      { upsert: true }
    );
  }
}

export async function createUser(
  username: string,
  password: string,
  permissions: string[]
): Promise<boolean> {
  const collection = await getCollection(COLLECTIONS.USERS);
  const users = await getUsers();
  
  if (users[username]) {
    return false;
  }
  
  const now = new Date();
  const formattedDate = now.toLocaleDateString('en-GB');
  
  users[username] = {
    username,
    password,
    role: 'user',
    permissions,
    created_at: formattedDate,
    last_login: 'Never',
    last_duration: 'N/A',
  };
  
  await collection.replaceOne(
    createFilter('global_users'),
    { _id: 'global_users', data: users },
    { upsert: true }
  );
  
  return true;
}

export async function deleteUser(username: string): Promise<boolean> {
  const collection = await getCollection(COLLECTIONS.USERS);
  const users = await getUsers();
  
  if (!users[username] || users[username].role === 'admin') {
    return false;
  }
  
  delete users[username];
  
  await collection.replaceOne(
    createFilter('global_users'),
    { _id: 'global_users', data: users },
    { upsert: true }
  );
  
  return true;
}

export async function updateUser(
  username: string,
  updates: {
    password?: string;
    permissions?: string[];
    role?: 'admin' | 'user';
  }
): Promise<boolean> {
  const collection = await getCollection(COLLECTIONS.USERS);
  const users = await getUsers();
  
  if (!users[username]) {
    return false;
  }
  
  if (updates.password !== undefined) {
    users[username].password = updates.password;
  }
  if (updates.permissions !== undefined) {
    users[username].permissions = updates.permissions;
  }
  if (updates.role !== undefined && users[username].role !== 'admin') {
    users[username].role = updates.role;
  }
  
  await collection.replaceOne(
    createFilter('global_users'),
    { _id: 'global_users', data: users },
    { upsert: true }
  );
  
  return true;
}

export async function getUserByUsername(username: string): Promise<User | null> {
  const users = await getUsers();
  return users[username] || null;
}
