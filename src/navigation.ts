export type NavigationGuard = (next: () => void) => void
export type GuardRegistrar = (guard: NavigationGuard) => () => void
