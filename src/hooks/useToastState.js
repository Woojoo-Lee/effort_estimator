import { useEstimatorStore } from "../store/useEstimatorStore";

export function useToastState() {
  return useEstimatorStore((s) => s.toast);
}