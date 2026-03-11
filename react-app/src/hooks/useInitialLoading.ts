import { useEffect, useState } from "react";

export default function useInitialLoading(delayMs = 250) {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setIsLoading(false);
    }, delayMs);

    return () => window.clearTimeout(timeoutId);
  }, [delayMs]);

  return isLoading;
}
