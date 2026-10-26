"use client";

import { useCallback, useEffect, useState } from "react";
import {
  persistTask,
  persistTasks,
  removeTask,
  RitmoTask,
  seedTasksIfNeeded,
  TaskCategory,
} from "@/lib/task-db";

type TaskInput = {
  title: string;
  category: TaskCategory;
  estimatedPomodoros: number;
  completedPomodoros: number;
};

export function useTasks() {
  const [tasks, setTasks] = useState<RitmoTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reloadTasks = useCallback(async () => {
    const values = await seedTasksIfNeeded();
    setTasks(values);
    return values;
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        await reloadTasks();
      } catch {
        setError("Non riesco ad accedere ai dati locali.");
      } finally {
        setLoading(false);
      }
    })();
  }, [reloadTasks]);

  const createTask = useCallback(async (input: TaskInput) => {
    const timestamp = Date.now();
    const item: RitmoTask = {
      id: crypto.randomUUID(),
      ...input,
      completed: input.completedPomodoros >= input.estimatedPomodoros,
      completedAt: input.completedPomodoros >= input.estimatedPomodoros ? timestamp : null,
      isActive: false,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    setTasks((current) => [...current, item]);
    await persistTask(item);
    return item;
  }, []);

  const updateTask = useCallback(async (id: string, input: TaskInput) => {
    const existing = tasks.find((item) => item.id === id);
    if (!existing) return;
    const changed: RitmoTask = {
      ...existing,
      ...input,
      completed: input.completedPomodoros >= input.estimatedPomodoros,
      completedAt: input.completedPomodoros >= input.estimatedPomodoros ? existing.completedAt ?? Date.now() : null,
      updatedAt: Date.now(),
    };
    setTasks((current) => current.map((item) => item.id === id ? changed : item));
    if (changed) await persistTask(changed);
  }, [tasks]);

  const toggleTask = useCallback(async (id: string) => {
    const existing = tasks.find((item) => item.id === id);
    if (!existing) return;
    const completed = !existing.completed;
    const changed: RitmoTask = {
      ...existing,
      completed,
      completedAt: completed ? Date.now() : null,
      isActive: completed ? false : existing.isActive,
      completedPomodoros: completed ? existing.estimatedPomodoros : Math.min(existing.completedPomodoros, existing.estimatedPomodoros - 1),
      updatedAt: Date.now(),
    };
    setTasks((current) => current.map((item) => item.id === id ? changed : item));
    if (changed) await persistTask(changed);
  }, [tasks]);

  const deleteTask = useCallback(async (id: string) => {
    setTasks((current) => current.filter((item) => item.id !== id));
    await removeTask(id);
  }, []);

  const setActiveTask = useCallback(async (id: string) => {
    const next = tasks.map((item) => ({
      ...item,
      isActive: item.id === id && !item.completed,
      updatedAt: item.id === id ? Date.now() : item.updatedAt,
    }));
    setTasks(next);
    await persistTasks(next);
  }, [tasks]);

  return { tasks, loading, error, createTask, updateTask, toggleTask, deleteTask, setActiveTask, reloadTasks };
}
