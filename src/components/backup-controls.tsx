"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { useOrganizerStore } from "@/components/organizer-store";

export function BackupControls() {
  const { createBackup, restoreBackup, storageReadFailed } =
    useOrganizerStore();
  const [backupStatus, setBackupStatus] = useState("");
  const [backupDownload, setBackupDownload] = useState<{
    url: string;
    filename: string;
  } | null>(null);
  const backupInput = useRef<HTMLInputElement>(null);

  useEffect(
    () => () => {
      if (backupDownload) URL.revokeObjectURL(backupDownload.url);
    },
    [backupDownload],
  );

  async function handleExportBackup() {
    setBackupStatus("");
    try {
      const backup = await createBackup();
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(backup, null, 2)], {
          type: "application/json",
        }),
      );
      setBackupDownload({
        url,
        filename: `myspace-backup-${new Date().toISOString().slice(0, 10)}.json`,
      });
      setBackupStatus("Backup ready to download, including saved idea images.");
    } catch (cause) {
      console.error("Could not export a myspace backup.", cause);
      setBackupStatus(
        cause instanceof Error ? cause.message : "The backup could not be created.",
      );
    }
  }

  async function handleImportBackup(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (
      !file ||
      !window.confirm("Importing replaces all current myspace data. Continue?")
    ) {
      return;
    }

    setBackupStatus("");
    try {
      const value: unknown = JSON.parse(await file.text());
      const restored = await restoreBackup(value);
      setBackupStatus(
        restored
          ? "Backup restored."
          : "The backup was not restored. Check the storage message and try again.",
      );
    } catch (cause) {
      console.error("Could not import a myspace backup.", cause);
      setBackupStatus(
        cause instanceof Error ? cause.message : "This backup could not be imported.",
      );
    }
  }

  return (
    <div className="mt-5 border-t border-white/[0.08] pt-4">
      <h3 className="text-sm font-medium text-[#f0ece6]">Data backup</h3>
      <p className="mt-1 text-xs leading-5 text-[#969190]">
        Backups include your saved items and images. Import replaces current data.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          className="min-h-10 rounded-full border border-white/15 px-3 text-xs text-[#d9d4d0] hover:bg-white/[0.07] disabled:cursor-not-allowed disabled:opacity-50"
          disabled={storageReadFailed}
          onClick={handleExportBackup}
          type="button"
        >
          Prepare backup
        </button>
        {backupDownload && (
          <a
            className="inline-flex min-h-10 items-center rounded-full bg-[#9fb5e3] px-3 text-xs font-medium text-[#111318] hover:bg-[#b4c6e9]"
            download={backupDownload.filename}
            href={backupDownload.url}
          >
            Download backup file
          </a>
        )}
        <button
          className="min-h-10 rounded-full border border-white/15 px-3 text-xs text-[#d9d4d0] hover:bg-white/[0.07]"
          onClick={() => backupInput.current?.click()}
          type="button"
        >
          Import backup
        </button>
        <input
          accept="application/json,.json"
          aria-label="Choose a myspace backup file"
          className="sr-only"
          onChange={handleImportBackup}
          ref={backupInput}
          type="file"
        />
      </div>
      {backupStatus && (
        <p
          aria-live="polite"
          className="mt-2 text-xs text-[#b8b4b1]"
          role="status"
        >
          {backupStatus}
        </p>
      )}
    </div>
  );
}
