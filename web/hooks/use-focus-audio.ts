"use client";

import { useEffect, useRef } from "react";
import { setFocusAudioVolume, startFocusAudio, stopFocusAudio } from "@/lib/focus-audio";
import type { TimerState } from "@/lib/pomodoro-db";
import type { RitmoPreferences } from "@/lib/preferences-db";

export function useFocusAudio(timer: TimerState | null, preferences: RitmoPreferences | null) {
  const sound = preferences?.focusSound ?? "off";
  const shouldPlay = timer?.status === "running" && timer.mode === "focus" && sound !== "off";
  const volume = preferences?.focusSoundVolume ?? .35;
  const volumeRef = useRef(volume);

  useEffect(() => {
    volumeRef.current = volume;
    setFocusAudioVolume(volume);
  }, [volume]);

  useEffect(() => {
    if (shouldPlay) void startFocusAudio(sound, volumeRef.current);
    else stopFocusAudio();
  }, [shouldPlay, sound]);

  useEffect(() => stopFocusAudio, []);

}
