"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { type ApiError, toApiError } from "../errors";
import type { MutationStatus } from "../types";
import type { QueryKey } from "./query-cache";
import { useQueryClient } from "./query-provider";

export interface UseMutationOptions<TData, TVars> {
  mutationFn: (vars: TVars) => Promise<TData>;
  onSuccess?: (data: TData, vars: TVars) => void;
  onError?: (error: ApiError, vars: TVars) => void;
  onSettled?: () => void;
  /** Key prefixes to invalidate on success (e.g. `[["notifications"]]`). */
  invalidateKeys?: QueryKey[];
}

interface MutationState<TData> {
  status: MutationStatus;
  data: TData | undefined;
  error: ApiError | undefined;
}

export interface UseMutationResult<TData, TVars> {
  mutate: (vars: TVars) => void;
  mutateAsync: (vars: TVars) => Promise<TData>;
  status: MutationStatus;
  isPending: boolean;
  isSuccess: boolean;
  isError: boolean;
  data: TData | undefined;
  error: ApiError | undefined;
  reset: () => void;
}

const INITIAL = { status: "idle", data: undefined, error: undefined } as const;

/**
 * Run an async write with tracked lifecycle state. State transitions happen in
 * event-driven callbacks (never in an effect), so this stays clean under the
 * project's `react-hooks/set-state-in-effect` rule. On success it invalidates
 * the listed query-key prefixes so dependent `useQuery`s refetch.
 */
export function useMutation<TData, TVars = void>({
  mutationFn,
  onSuccess,
  onError,
  onSettled,
  invalidateKeys,
}: UseMutationOptions<TData, TVars>): UseMutationResult<TData, TVars> {
  const client = useQueryClient();
  const [state, setState] = useState<MutationState<TData>>(INITIAL);

  // Avoid setting state after the component unmounts mid-flight.
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const mutateAsync = useCallback(
    async (vars: TVars): Promise<TData> => {
      if (mounted.current) {
        setState({ status: "pending", data: undefined, error: undefined });
      }
      try {
        const data = await mutationFn(vars);
        if (invalidateKeys) {
          for (const key of invalidateKeys) client.invalidatePrefix(key);
        }
        if (mounted.current) {
          setState({ status: "success", data, error: undefined });
        }
        onSuccess?.(data, vars);
        return data;
      } catch (raw) {
        const error = toApiError(raw);
        if (mounted.current) {
          setState({ status: "error", data: undefined, error });
        }
        onError?.(error, vars);
        throw error;
      } finally {
        onSettled?.();
      }
    },
    [client, mutationFn, onSuccess, onError, onSettled, invalidateKeys],
  );

  const mutate = useCallback(
    (vars: TVars) => {
      void mutateAsync(vars).catch(() => {
        /* surfaced via state.error */
      });
    },
    [mutateAsync],
  );

  const reset = useCallback(() => setState(INITIAL), []);

  return {
    mutate,
    mutateAsync,
    status: state.status,
    isPending: state.status === "pending",
    isSuccess: state.status === "success",
    isError: state.status === "error",
    data: state.data,
    error: state.error,
    reset,
  };
}
