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
import type { TaskPriority } from "@/lib/planner";

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
      plannedDate: null,
      priority: "Media",
      sortOrder: tasks.length,
    };
    setTasks((current) => [...current, item]);
    await persistTask(item);
    return item;
  }, [tasks.length]);

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

  const planTask = useCallback(async (id: string, plannedDate: string | null, priority: TaskPriority, estimatedPomodoros: number) => {
    const dayTasks = tasks.filter((item) => item.plannedDate === plannedDate);
    const changed = tasks.find((item) => item.id === id);
    if (!changed) return;
    const next: RitmoTask = {
      ...changed,
      plannedDate,
      priority,
      estimatedPomodoros,
      completedPomodoros: Math.min(changed.completedPomodoros, estimatedPomodoros),
      sortOrder: changed.plannedDate === plannedDate ? changed.sortOrder : dayTasks.length,
      updatedAt: Date.now(),
    };
    setTasks((current) => current.map((item) => item.id === id ? next : item));
    await persistTask(next);
  }, [tasks]);

  const reorderPlannedTasks = useCallback(async (plannedDate: string, orderedIds: string[]) => {
    const order = new Map(orderedIds.map((id, index) => [id, index]));
    const changed = tasks.filter((item) => item.plannedDate === plannedDate && order.has(item.id)).map((item) => ({
      ...item,
      sortOrder: order.get(item.id) ?? item.sortOrder,
      updatedAt: Date.now(),
    }));
    const byId = new Map(changed.map((item) => [item.id, item]));
    setTasks((current) => current.map((item) => byId.get(item.id) ?? item));
    await persistTasks(changed);
  }, [tasks]);

  return { tasks, loading, error, createTask, updateTask, toggleTask, deleteTask, setActiveTask, planTask, reorderPlannedTasks, reloadTasks };
}
