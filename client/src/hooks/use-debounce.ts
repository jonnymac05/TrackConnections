import { useState, useEffect } from "react";

/**
 * A hook that delays updating a value until a specified delay has passed.
 * Useful for search inputs to avoid sending too many requests while typing.
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // Set a timeout to update the debounced value after the delay
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Clear the timeout if the value changes again within the delay period
    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}