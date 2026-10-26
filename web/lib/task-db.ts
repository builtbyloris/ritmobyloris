import type { TaskPriority } from "@/lib/planner";

export type TaskCategory = "Studio" | "Lavoro" | "Personale";

export type RitmoTask = {
  id: string;
  title: string;
  category: TaskCategory;
  estimatedPomodoros: number;
  completedPomodoros: number;
  completed: boolean;
  completedAt?: number | null;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
  plannedDate: string | null;
  priority: TaskPriority;
  sortOrder: number;
};

type TaskRow = {
  id: string; title: string; category: TaskCategory; estimated_pomodoros: number;
  completed_pomodoros: number; completed: boolean; completed_at: number | null;
  is_active: boolean; created_at: number; updated_at: number;
  planned_date?: string | null; priority?: TaskPriority; sort_order?: number;
};

export const DB_NAME = "ritmo-local";
export const DB_VERSION = 3;
export const TASK_STORE = "tasks";
export const TIMER_STORE = "timer";
export const SESSION_STORE = "sessions";
export const PREFERENCES_STORE = "preferences";

const now = Date.now();

export const demoTasks: RitmoTask[] = [
  task("Ripassare JOIN", "Studio", 1, 1, true, false, 0),
  task("Analisi SQL — F1Nsight", "Studio", 2, 0, false, true, 1),
  task("Preparare presentazione ITS", "Lavoro", 1, 0, false, false, 2),
  task("Leggere 20 pagine", "Personale", 1, 0, false, false, 3),
  task("Rivedere appunti di Reti", "Studio", 2, 0, false, false, 4),
  task("Pianificare settimana prossima", "Personale", 1, 0, false, false, 5),
];

function task(
  title: string,
  category: TaskCategory,
  estimatedPomodoros: number,
  completedPomodoros: number,
  completed: boolean,
  isActive: boolean,
  order: number,
): RitmoTask {
  return {
    id: `demo-${order + 1}`,
    title,
    category,
    estimatedPomodoros,
    completedPomodoros,
    completed,
    completedAt: null,
    isActive,
    createdAt: now + order,
    updatedAt: now + order,
    plannedDate: null,
    priority: "Media",
    sortOrder: order,
  };
}

export function openTaskDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(TASK_STORE)) {
        const store = database.createObjectStore(TASK_STORE, { keyPath: "id" });
        store.createIndex("updatedAt", "updatedAt");
        store.createIndex("isActive", "isActive");
      }
      if (!database.objectStoreNames.contains(TIMER_STORE)) {
        database.createObjectStore(TIMER_STORE, { keyPath: "id" });
      }
      if (!database.objectStoreNames.contains(SESSION_STORE)) {
        const sessions = database.createObjectStore(SESSION_STORE, { keyPath: "id" });
        sessions.createIndex("completedAt", "completedAt");
        sessions.createIndex("taskId", "taskId");
      }
      if (!database.objectStoreNames.contains(PREFERENCES_STORE)) {
        database.createObjectStore(PREFERENCES_STORE, { keyPath: "id" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Impossibile aprire IndexedDB"));
  });
}

export async function readTasks(): Promise<RitmoTask[]> {
  const userId = await ensureCloudReady();
  const { data, error } = await getSupabaseBrowserClient().from("ritmo_tasks").select("*").eq("user_id", userId).order("created_at");
  if (error) throw error;
  return (data ?? []).map((row: TaskRow) => ({
    id: row.id, title: row.title, category: row.category as TaskCategory,
    estimatedPomodoros: row.estimated_pomodoros, completedPomodoros: row.completed_pomodoros,
    completed: row.completed, completedAt: row.completed_at, isActive: row.is_active,
    createdAt: row.created_at, updatedAt: row.updated_at,
    plannedDate: row.planned_date ?? null,
    priority: row.priority ?? "Media",
    sortOrder: row.sort_order ?? 0,
  }));
}

export async function seedTasksIfNeeded(): Promise<RitmoTask[]> {
  return readTasks();
}

export async function persistTask(item: RitmoTask): Promise<void> {
  const userId = await ensureCloudReady();
  const { error } = await getSupabaseBrowserClient().from("ritmo_tasks").upsert(taskToRow(userId, item));
  if (error) throw error;
}

export async function persistTasks(items: RitmoTask[]): Promise<void> {
  if (!items.length) return;
  const userId = await ensureCloudReady();
  const { error } = await getSupabaseBrowserClient().from("ritmo_tasks").upsert(items.map((item) => taskToRow(userId, item)));
  if (error) throw error;
}

export async function removeTask(id: string): Promise<void> {
  const userId = await ensureCloudReady();
  const { error } = await getSupabaseBrowserClient().from("ritmo_tasks").delete().eq("user_id", userId).eq("id", id);
  if (error) throw error;
}

export function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("Transazione IndexedDB non riuscita"));
    transaction.onabort = () => reject(transaction.error ?? new Error("Transazione IndexedDB annullata"));
  });
}
import { ensureCloudReady, taskToRow } from "@/lib/cloud-migration";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
