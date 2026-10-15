import { createClient, SupabaseClient } from '@supabase/supabase-js';

const STORAGE_KEY_URL = 'app_supabase_url';
const STORAGE_KEY_KEY = 'app_supabase_anon_key';

export function getStoredSupabaseConfig(): { url: string; anonKey: string } {
  const envUrl = (import.meta as any).env?.VITE_SUPABASE_URL || '';
  const envKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';

  const storedUrl = localStorage.getItem(STORAGE_KEY_URL) || envUrl;
  const storedKey = localStorage.getItem(STORAGE_KEY_KEY) || envKey;

  return {
    url: storedUrl,
    anonKey: storedKey,
  };
}

export function saveSupabaseConfig(url: string, anonKey: string): void {
  if (url) localStorage.setItem(STORAGE_KEY_URL, url.trim());
  else localStorage.removeItem(STORAGE_KEY_URL);

  if (anonKey) localStorage.setItem(STORAGE_KEY_KEY, anonKey.trim());
  else localStorage.removeItem(STORAGE_KEY_KEY);
}

let cachedClient: SupabaseClient | null = null;
let currentConfigSig = '';

export function getSupabaseClient(): SupabaseClient | null {
  const { url, anonKey } = getStoredSupabaseConfig();
  if (!url || !anonKey) {
    return null;
  }

  const sig = `${url}:${anonKey}`;
  if (cachedClient && currentConfigSig === sig) {
    return cachedClient;
  }

  try {
    cachedClient = createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
    currentConfigSig = sig;
    return cachedClient;
  } catch (err) {
    console.warn('Gagal menginisialisasi Supabase client:', err);
    return null;
  }
}

export async function testSupabaseConnection(url: string, anonKey: string): Promise<{ success: boolean; message: string }> {
  if (!url || !anonKey) {
    return { success: false, message: 'URL dan Anon Key tidak boleh kosong.' };
  }

  try {
    const testClient = createClient(url, anonKey);
    // Coba query sederhana ke app_settings atau tabel bawaan
    const { error } = await testClient.from('app_settings').select('count', { count: 'exact', head: true });
    
    if (error) {
      // Jika tabel belum dibuat, periksa apakah error berupa "relation does not exist" yang berarti koneksi auth berhasil
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        return {
          success: true,
          message: 'Terhubung ke Supabase! (Catatan: Jalankan skrip SQL di menu Pengaturan untuk membuat tabel-tabel).',
        };
      }
      return { success: false, message: `Error Supabase: ${error.message}` };
    }

    return { success: true, message: 'Koneksi ke database Supabase berhasil dan siap digunakan!' };
  } catch (err: any) {
    return { success: false, message: `Gagal menghubungi server Supabase: ${err.message || 'Periksa format URL'}` };
  }
}

/**
 * Upload helper: Mengunggah file ke Supabase Storage jika terhubung,
 * atau menghasilkan Data URL lokal sebagai fallback instan.
 */
export async function uploadFileToStorage(
  file: File,
  bucketName: 'app-assets' | 'documents' = 'app-assets'
): Promise<{ url: string; isCloud: boolean }> {
  const client = getSupabaseClient();
  
  if (client) {
    try {
      const ext = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${ext}`;
      const { data, error } = await client.storage.from(bucketName).upload(fileName, file, {
        cacheControl: '3600',
        upsert: true,
      });

      if (!error && data) {
        const { data: publicData } = client.storage.from(bucketName).getPublicUrl(data.path);
        if (publicData?.publicUrl) {
          return { url: publicData.publicUrl, isCloud: true };
        }
      }
      console.warn('Upload Supabase Storage gagal, menggunakan fallback local data URL:', error?.message);
    } catch (e) {
      console.warn('Exception upload Supabase Storage, menggunakan fallback lokal:', e);
    }
  }

  // Fallback ke FileReader Data URL
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      resolve({ url: e.target?.result as string, isCloud: false });
    };
    reader.readAsDataURL(file);
  });
}
