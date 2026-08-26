// Self-hosted billing (Stripe) was removed with the Enterprise cluster,
// so there is nothing left to prefetch for the plan-required step
// (useIsPlanRequired() is now permanently false). Kept as a no-op so
// OnboardingStepLayout doesn't need to change how it mounts this effect.
export const PrefetchPlanRequiredStepEffect = () => {
  return null;
};
