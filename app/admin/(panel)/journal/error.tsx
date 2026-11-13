"use client"; // Error boundaries must be Client Components

import { useEffect } from "react";
import Link from "next/link";
import Icon from "@/components/admin/Icon";
import DiaryEmpty from "@/components/admin/journal/DiaryEmpty";
import ExportMenu from "@/components/admin/journal/ExportMenu";
import { PageHeader, btnPrimary } from "@/components/admin/ui";

// Figma 4B.8 "Daily Diary · couldn't load": the store or the connection is
// down. The header stays; the card explains and retries.
export default function JournalError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <>
      <PageHeader title="Daily Diary" intro="Kilometres, fuel and driver cut for every trip, so you know what each car really earns.">
        <ExportMenu csvHref="/admin/journal/export" pdfHref="/admin/journal-report?print=1" scope="Every trip · all cars" />
        <Link href="/admin/journal?new=1" className={btnPrimary}>
          <Icon name="plus" size={16} />
          New entry
        </Link>
      </PageHeader>
      <DiaryEmpty
        role="alert"
        art="cone"
        title="Couldn’t load the Daily Diary"
        className="mt-5"
        actions={
          <button type="button" onClick={() => retry()} className={btnPrimary}>
            Try again
          </button>
        }
      >
        Check the internet connection and try again. Entries you already saved are safe.
      </DiaryEmpty>
    </>
  );
}
