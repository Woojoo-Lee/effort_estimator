import { useCallback, useRef, useState } from "react";

export function useToast() {
  const [toast, setToast] = useState({
    message: "",
    tone: "blue",
  });

  const timerRef = useRef(null);

  const showToast = useCallback((message, tone = "blue", duration = 3000) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    setToast({ message, tone });

    timerRef.current = setTimeout(() => {
      setToast({ message: "", tone: "blue" });
    }, duration);
  }, []);

  return {
    toast,
    showToast,
  };
}