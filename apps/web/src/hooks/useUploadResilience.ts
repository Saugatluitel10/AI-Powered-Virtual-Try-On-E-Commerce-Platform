"use client";

import { useEffect, useRef, useCallback } from "react";

interface PendingUpload {
  id: string;
  file: File;
  url: string;
  formData: Record<string, string>;
  onSuccess: (response: unknown) => void;
  onError: (error: Error) => void;
}

const pendingUploads = new Map<string, PendingUpload>();

async function retryUpload(upload: PendingUpload): Promise<void> {
  const form = new FormData();
  form.append("file", upload.file);
  for (const [key, value] of Object.entries(upload.formData)) {
    form.append(key, value);
  }

  const res = await fetch(upload.url, { method: "POST", body: form });
  if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
  const data = await res.json();
  upload.onSuccess(data);
}

async function retryAllPending(): Promise<void> {
  const uploads = Array.from(pendingUploads.values());
  for (const upload of uploads) {
    try {
      await retryUpload(upload);
      pendingUploads.delete(upload.id);
    } catch (err) {
      upload.onError(err instanceof Error ? err : new Error("Retry failed"));
    }
  }
}

export function useUploadResilience() {
  const listenerAttached = useRef(false);

  useEffect(() => {
    if (listenerAttached.current) return;
    listenerAttached.current = true;

    const handleOnline = () => {
      if (pendingUploads.size > 0) {
        retryAllPending();
      }
    };

    const handleSWMessage = (event: MessageEvent) => {
      if (event.data?.type === "TRIGGER_UPLOAD_RETRY") {
        retryAllPending();
      }
    };

    window.addEventListener("online", handleOnline);
    navigator.serviceWorker?.addEventListener("message", handleSWMessage);

    return () => {
      window.removeEventListener("online", handleOnline);
      navigator.serviceWorker?.removeEventListener("message", handleSWMessage);
      listenerAttached.current = false;
    };
  }, []);

  const queueUpload = useCallback(
    (
      id: string,
      file: File,
      url: string,
      formData: Record<string, string>,
      onSuccess: (response: unknown) => void,
      onError: (error: Error) => void
    ) => {
      pendingUploads.set(id, { id, file, url, formData, onSuccess, onError });
    },
    []
  );

  const resilientUpload = useCallback(
    async (
      id: string,
      file: File,
      url: string,
      formData: Record<string, string> = {}
    ): Promise<unknown> => {
      return new Promise((resolve, reject) => {
        const doUpload = async () => {
          try {
            const form = new FormData();
            form.append("file", file);
            for (const [key, value] of Object.entries(formData)) {
              form.append(key, value);
            }
            const res = await fetch(url, { method: "POST", body: form });
            if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
            const data = await res.json();
            pendingUploads.delete(id);
            resolve(data);
          } catch (err) {
            if (!navigator.onLine) {
              queueUpload(id, file, url, formData, resolve, reject);
            } else {
              reject(err);
            }
          }
        };

        doUpload();
      });
    },
    [queueUpload]
  );

  return {
    resilientUpload,
    pendingCount: pendingUploads.size,
    isOnline: typeof navigator !== "undefined" ? navigator.onLine : true,
  };
}
