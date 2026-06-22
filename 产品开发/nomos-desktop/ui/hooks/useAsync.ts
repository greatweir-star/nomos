import { useState, useEffect, useCallback, useRef } from "react";

type AsyncState<T> =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: T }
  | { status: "error"; error: unknown };

export function useAsync<T>(
  fn: (() => Promise<T>) | null,
  deps: unknown[] = [],
): {
  state: AsyncState<T>;
  reload: () => void;
} {
  const [state, setState] = useState<AsyncState<T>>({ status: "idle" });
  const counterRef = useRef(0);

  const run = useCallback(() => {
    if (!fn) return;
    const id = ++counterRef.current;
    setState({ status: "loading" });
    fn().then(
      (data) => {
        if (counterRef.current === id) setState({ status: "success", data });
      },
      (error) => {
        if (counterRef.current === id) setState({ status: "error", error });
      },
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fn, ...deps]);

  useEffect(() => {
    run();
  }, [run]);

  return { state, reload: run };
}
