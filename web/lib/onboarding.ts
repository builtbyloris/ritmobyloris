const ONBOARDING_VERSION = 1;

export function onboardingStorageKey(userId: string) {
  return `ritmo:onboarding:${userId}:v${ONBOARDING_VERSION}`;
}

export function hasCompletedOnboarding(userId: string, storage: Pick<Storage, "getItem"> = localStorage) {
  return storage.getItem(onboardingStorageKey(userId)) === "completed";
}

export function completeOnboarding(userId: string, storage: Pick<Storage, "setItem"> = localStorage) {
  storage.setItem(onboardingStorageKey(userId), "completed");
}
