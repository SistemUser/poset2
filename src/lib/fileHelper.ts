import fs from 'fs/promises';
import path from 'path';

/**
 * Node.js Atomic JSON Writer with Automatic Backups.
 * Prevents race conditions, corrupted files, and incomplete writes.
 */
export async function safeWriteJson(filePath: string, data: any): Promise<void> {
  const tempPath = `${filePath}.tmp.${Date.now()}`;
  const backupDir = path.join(path.dirname(filePath), 'backups');
  
  // 1. Veriyi JSON string formatına çevir ve doğrula
  const jsonString = JSON.stringify(data, null, 2);
  
  // 2. Önce geçici (.tmp) dosyaya yaz
  await fs.writeFile(tempPath, jsonString, 'utf-8');
  
  // 3. Mevcut dosya varsa backups/ klasörüne son halini yedekle
  try {
    await fs.mkdir(backupDir, { recursive: true });
    const currentData = await fs.readFile(filePath, 'utf-8');
    await fs.writeFile(path.join(backupDir, `${path.basename(filePath)}.bak`), currentData, 'utf-8');
  } catch (e) {
    // İlk oluşturulma anında dosya yoksa yedeği atla
  }

  // 4. İşletim sistemi düzeyinde atomik yer değiştirme yap (atomic rename)
  await fs.rename(tempPath, filePath);
}

/**
 * Node.js Safe JSON Reader with fallback default values.
 */
export async function safeReadJson<T>(filePath: string, defaultValue: T): Promise<T> {
  try {
    const data = await fs.readFile(filePath, 'utf-8');
    const parsed = JSON.parse(data);
    return parsed as T;
  } catch (e) {
    return defaultValue;
  }
}
