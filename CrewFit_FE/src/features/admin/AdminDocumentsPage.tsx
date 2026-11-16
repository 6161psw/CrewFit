import { useQuery } from '@tanstack/react-query';
import { FileText, Search } from 'lucide-react';
import { useState } from 'react';
import { api, download, qs } from '../../api/client';
import type { Page } from '../../api/types';
import { Button, Chip, Empty, Loading } from '../../components/ui';
import { dateTime, fileSize } from '../../lib/format';
import { STATUS_LABEL, STATUS_TONE } from './types';

interface Doc {
  id: number;
  title: string;
  fileName: string | null;
  fileSize: number | null;
  updatedAt: string;
  submissionStatus: keyof typeof STATUS_LABEL;
  team: { id: number; name: string };
  contest: { id: number; title: string };
  downloadUrl: string;
}

/** 서류 보관함 (업로드된 파일) */
export function AdminDocumentsPage() {
  const [q, setQ] = useState('');
  const { data, isLoading } = useQuery({ queryKey: ['admin', 'documents', q], queryFn: () => api.get<Page<Doc>>(`/admin/documents${qs({ q, limit: 100 })}`) });
  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex items-center justify-between">
        <p className="text-2xl font-bold">서류 보관함</p>
        <label className="flex w-72 items-center gap-2 rounded-xl border border-line bg-surface px-3">
          <Search size={16} className="text-muted" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="팀 이름 · 파일 이름" className="w-full py-2.5 text-sm outline-none" />
        </label>
      </div>
      {isLoading ? (
        <Loading />
      ) : data?.items.length ? (
        <div className="divide-y divide-line rounded-2xl border border-line bg-surface">
          {data.items.map((d) => (
            <div key={d.id} className="flex items-center gap-4 px-5 py-3.5">
              <span className="grid size-10 place-items-center rounded-lg bg-danger-soft text-danger">
                <FileText size={18} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">
                  {d.title} · {d.fileName}
                </p>
                <p className="truncate text-xs text-sub">
                  {d.contest.title} · {d.team.name} · {fileSize(d.fileSize)} · {dateTime(d.updatedAt)}
                </p>
              </div>
              <Chip tone={STATUS_TONE[d.submissionStatus]}>{STATUS_LABEL[d.submissionStatus]}</Chip>
              <Button size="sm" variant="outline" onClick={() => download(d.downloadUrl, d.fileName ?? 'file.pdf')}>
                열기
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <Empty>아직 업로드된 서류가 없어요</Empty>
      )}
    </div>
  );
}
