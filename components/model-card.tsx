'use client';

import Link from 'next/link';
import { Eye, Download, Sparkles, Clock } from 'lucide-react';
import { timeAgo, formatNumber } from '@/lib/utils';

interface ModelCardProps {
  id: string;
  name: string;
  prompt: string;
  format: string;
  thumbnailUrl?: string | null;
  userName?: string;
  userAvatar?: string | null;
  views: number;
  downloads: number;
  createdAt: string;
  status?: string;
}

export function ModelCard({
  id, name, prompt, format, thumbnailUrl, userName, userAvatar,
  views, downloads, createdAt, status,
}: ModelCardProps) {
  if (status === 'processing') {
    return (
      <div className="rounded-xl border border-border/40 bg-card overflow-hidden">
        <div className="aspect-square bg-gradient-to-br from-violet-500/10 to-cyan-500/10 flex items-center justify-center">
          <div className="text-center p-4">
            <div className="w-10 h-10 rounded-full border-2 border-violet-500 border-t-transparent animate-spin mx-auto mb-3" />
            <p className="text-xs text-muted-foreground">Generating...</p>
          </div>
        </div>
        <div className="p-4">
          <p className="text-sm font-medium truncate">{name}</p>
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{prompt}</p>
        </div>
      </div>
    );
  }

  return (
    <Link href={`/model/${id}`}>
      <div className="rounded-xl border border-border/40 bg-card overflow-hidden hover:border-violet-500/40 hover:shadow-lg hover:shadow-violet-500/5 transition-all duration-200 group cursor-pointer">
        {/* Thumbnail */}
        <div className="aspect-square bg-gradient-to-br from-violet-500/10 to-cyan-500/10 relative overflow-hidden">
          {thumbnailUrl ? (
            <img
              src={thumbnailUrl}
              alt={name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Sparkles className="w-12 h-12 text-violet-500/30" />
            </div>
          )}
          <div className="absolute top-2 right-2">
            <span className="px-2 py-0.5 text-xs font-bold rounded bg-black/60 text-white uppercase">
              {format}
            </span>
          </div>
        </div>

        {/* Info */}
        <div className="p-4">
          <p className="font-semibold text-sm truncate group-hover:text-violet-600 transition-colors">
            {name}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">
            {prompt}
          </p>

          <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/40">
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Eye className="w-3.5 h-3.5" /> {formatNumber(views)}
              </span>
              <span className="flex items-center gap-1">
                <Download className="w-3.5 h-3.5" /> {formatNumber(downloads)}
              </span>
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              {timeAgo(createdAt)}
            </div>
          </div>

          {userName && (
            <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border/20">
              {userAvatar && (
                <img src={userAvatar} alt={userName} className="w-5 h-5 rounded-full" />
              )}
              <span className="text-xs text-muted-foreground truncate">{userName}</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
