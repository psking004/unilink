
import { createClient } from '@supabase/supabase-js';

// Injected at build time by vite.config.ts (from VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY,
// or SUPABASE_URL / SUPABASE_ANON_KEY). Empty values fall back to the local mock client.
const supabaseUrl: string | undefined = process.env.SUPABASE_URL || undefined;
const supabaseAnonKey: string | undefined = process.env.SUPABASE_ANON_KEY || undefined;
const isRealConfig = supabaseUrl && !supabaseUrl.includes('placeholder') && supabaseAnonKey && supabaseAnonKey !== 'placeholder-key';

// Global singleton mock store
const GLOBAL_MOCK_STORE: any = {
  profiles: JSON.parse(localStorage.getItem('unilink_profiles') || '[]'),
  auth_users: JSON.parse(localStorage.getItem('unilink_auth_users') || '[]'), 
  classes: JSON.parse(localStorage.getItem('unilink_classes') || '[]'),
  enrollments: JSON.parse(localStorage.getItem('unilink_enrollments') || '[]'),
  assignments: JSON.parse(localStorage.getItem('unilink_assignments') || '[]'),
  submissions: JSON.parse(localStorage.getItem('unilink_submissions') || '[]'),
  notifications: JSON.parse(localStorage.getItem('unilink_notifications') || '[]'),
};

const persist = (table: string) => {
  localStorage.setItem(`unilink_${table}`, JSON.stringify(GLOBAL_MOCK_STORE[table]));
};

const authListeners = new Set<(event: string, session: any) => void>();

const createMockClient = () => {
  const notifyListeners = (event: string, session: any) => {
    authListeners.forEach(cb => cb(event, session));
  };

  const getJoinedData = (table: string, baseData: any[]) => {
    if (table === 'submissions') {
      return baseData.map(item => ({
        ...item,
        profiles: GLOBAL_MOCK_STORE.profiles.find((p: any) => String(p.id) === String(item.student_id)),
        assignments: GLOBAL_MOCK_STORE.assignments.find((a: any) => String(a.id) === String(item.assignment_id))
      }));
    }
    if (table === 'assignments') {
      return baseData.map(item => ({
        ...item,
        classes: GLOBAL_MOCK_STORE.classes.find((c: any) => String(c.id) === String(item.class_id))
      }));
    }
    if (table === 'classes') {
      return baseData.map(item => ({
        ...item,
        profiles: GLOBAL_MOCK_STORE.profiles.find((p: any) => String(p.id) === String(item.teacher_id))
      }));
    }
    if (table === 'enrollments') {
      return baseData.map(item => ({
        ...item,
        profiles: GLOBAL_MOCK_STORE.profiles.find((p: any) => String(p.id) === String(item.student_id)),
        classes: GLOBAL_MOCK_STORE.classes.find((c: any) => String(c.id) === String(item.class_id))
      }));
    }
    return baseData;
  };

  const createBuilder = (table: string, data: any[]) => {
    const builder: any = {
      _data: data,
      select: (query?: string) => createBuilder(table, getJoinedData(table, builder._data)),
      eq: (col: string, val: any) => createBuilder(table, builder._data.filter((i: any) => String(i[col]) === String(val))),
      in: (col: string, vals: any[]) => createBuilder(table, builder._data.filter((i: any) => vals.map(v => String(v)).includes(String(i[col])))),
      order: (col: string, { ascending = true } = {}) => {
        const sorted = [...builder._data].sort((a, b) => {
          if (a[col] < b[col]) return ascending ? -1 : 1;
          if (a[col] > b[col]) return ascending ? 1 : -1;
          return 0;
        });
        return createBuilder(table, sorted);
      },
      single: async () => ({ data: builder._data[0] || null, error: null }),
      execute: async () => ({ data: builder._data, error: null }),
      then: (onfulfilled: any) => Promise.resolve({ data: builder._data, error: null }).then(onfulfilled)
    };
    return builder;
  };

  return {
    auth: {
      getSession: async () => ({ data: { session: JSON.parse(localStorage.getItem('unilink_session') || 'null') } }),
      signUp: async ({ email, password, options }: any) => {
        const emailLower = email.toLowerCase();
        const userId = Math.random().toString(36).substr(2, 9);
        const role = options?.data?.role || 'student';
        const newUser = {
          id: userId,
          email: emailLower,
          full_name: options?.data?.full_name || emailLower.split('@')[0].toUpperCase(),
          role: role,
          is_approved: role === 'student' || role === 'admin'
        };
        GLOBAL_MOCK_STORE.auth_users.push({ email: emailLower, password: password });
        GLOBAL_MOCK_STORE.profiles.push(newUser);
        persist('profiles');
        persist('auth_users');
        return { data: { user: { id: newUser.id, email: newUser.email } }, error: null };
      },
      signInWithPassword: async ({ email, password }: any) => {
        const emailLower = email.toLowerCase();
        const userProfile = GLOBAL_MOCK_STORE.profiles.find((p: any) => p.email === emailLower);
        if (!userProfile) {
          return { data: { session: null }, error: { message: "Invalid credentials: User not recognized." } };
        }
        
        const authUser = GLOBAL_MOCK_STORE.auth_users.find((u: any) => u.email === emailLower);
        if (authUser && authUser.password !== password) {
          return { data: { session: null }, error: { message: "Invalid credentials: Password mismatch." } };
        }

        const session = { user: { id: userProfile.id, email: userProfile.email }, access_token: 'mock-jwt' };
        localStorage.setItem('unilink_session', JSON.stringify(session));
        notifyListeners('SIGNED_IN', session);
        return { data: session, error: null };
      },
      signOut: async () => {
        localStorage.removeItem('unilink_session');
        notifyListeners('SIGNED_OUT', null);
        return { error: null };
      },
      onAuthStateChange: (callback: any) => {
        authListeners.add(callback);
        return { data: { subscription: { unsubscribe: () => authListeners.delete(callback) } } };
      }
    },
    from: (table: string) => ({
      select: (query?: string) => createBuilder(table, getJoinedData(table, GLOBAL_MOCK_STORE[table])),
      insert: async (data: any) => {
        const items = Array.isArray(data) ? data : [data];
        const newItems = items.map(i => ({
          id: i.id || Math.random().toString(36).substr(2, 9),
          created_at: new Date().toISOString(),
          submitted_at: new Date().toISOString(),
          version: i.version || 1,
          ...i
        }));
        GLOBAL_MOCK_STORE[table] = [...GLOBAL_MOCK_STORE[table], ...newItems];
        persist(table);
        return { data: newItems, error: null };
      },
      upsert: async (data: any) => {
        const items = Array.isArray(data) ? data : [data];
        const processedItems = items.map(item => {
          const index = GLOBAL_MOCK_STORE[table].findIndex((i: any) => i.id === item.id || i.email === item.email);
          if (index !== -1) {
            GLOBAL_MOCK_STORE[table][index] = { ...GLOBAL_MOCK_STORE[table][index], ...item };
            return GLOBAL_MOCK_STORE[table][index];
          } else {
            const newItem = {
              id: item.id || Math.random().toString(36).substr(2, 9),
              created_at: new Date().toISOString(),
              ...item
            };
            GLOBAL_MOCK_STORE[table].push(newItem);
            return newItem;
          }
        });
        persist(table);
        return { data: processedItems, error: null };
      },
      update: (data: any) => ({
        eq: async (col: string, val: any) => {
          GLOBAL_MOCK_STORE[table] = GLOBAL_MOCK_STORE[table].map((i: any) => 
            String(i[col]) === String(val) ? { ...i, ...data } : i
          );
          persist(table);
          return { error: null };
        }
      }),
      delete: () => {
        let filters: { col: string, val: any }[] = [];
        const builder = {
          eq: (col: string, val: any) => {
            filters.push({ col, val });
            return builder;
          },
          execute: async () => {
            GLOBAL_MOCK_STORE[table] = GLOBAL_MOCK_STORE[table].filter((item: any) => {
              return !filters.every(f => String(item[f.col]) === String(f.val));
            });
            persist(table);
            return { error: null };
          },
          then: (onfulfilled: any) => builder.execute().then(onfulfilled)
        };
        return builder;
      }
    }),
    rpc: async (fn: string, params: any) => {
      if (fn === 'purge_user_identity') {
        const id = params.target_id;
        GLOBAL_MOCK_STORE.profiles = GLOBAL_MOCK_STORE.profiles.filter((p: any) => String(p.id) !== String(id));
        GLOBAL_MOCK_STORE.auth_users = GLOBAL_MOCK_STORE.auth_users.filter((u: any, idx: number) => {
           // Basic deletion from auth_users by correlating email via profiles if possible
           return true; 
        });
        persist('profiles');
        return { error: null };
      }
      return { error: null };
    },
    storage: {
      from: () => ({
        upload: async (path: string, file: File) => ({ data: { path }, error: null }),
        getPublicUrl: (path: string) => ({ data: { publicUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf' } })
      })
    }
  } as any;
};

export const supabase = isRealConfig ? createClient(supabaseUrl!, supabaseAnonKey!) : createMockClient();
export const isMock = !isRealConfig;
export const STORAGE_BUCKET = 'assignments';
