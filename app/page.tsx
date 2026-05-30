'use client';

import Image from "next/image";
import Link from "next/link";

const NAV_ITEMS = [
  { emoji: "🔍", label: "질문발견", href: "/question" },
  { emoji: "💡", label: "개념학습", href: null },
  { emoji: "💬", label: "탐구토론", href: null },
  { emoji: "🌟", label: "확장공유", href: null },
] as const;

export default function Home() {
  function comingSoon(name: string) {
    alert(`${name} 기능은 준비 중입니다.\n조금만 기다려 주세요! 😊`);
  }

  return (
    <div className="fixed inset-0">
      {/* 전체 화면 이미지 */}
      <Image
        src="/deeping.png"
        alt="디핑 DEEPING"
        fill
        priority
        className="object-cover"
      />

      {/* 하단 그라디언트 오버레이 */}
      <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />

      {/* 하단 내비게이션 */}
      <nav className="absolute inset-x-0 bottom-0 flex gap-3 px-4 pb-8 pt-4 max-w-lg mx-auto">
        {NAV_ITEMS.map(({ emoji, label, href }) =>
          href ? (
            <Link
              key={label}
              href={href}
              className="flex-1 flex flex-col items-center gap-1.5 py-3 rounded-2xl
                         bg-white/15 backdrop-blur border border-white/25 text-white
                         hover:bg-white/25 active:scale-95 transition-all duration-150"
            >
              <span className="text-2xl leading-none">{emoji}</span>
              <span className="text-xs font-bold tracking-wide">{label}</span>
            </Link>
          ) : (
            <button
              key={label}
              onClick={() => comingSoon(label)}
              className="flex-1 flex flex-col items-center gap-1.5 py-3 rounded-2xl
                         bg-white/8 border border-white/15 text-white/50
                         active:scale-95 transition-all duration-150"
            >
              <span className="text-2xl leading-none">{emoji}</span>
              <span className="text-xs font-bold tracking-wide">{label}</span>
            </button>
          )
        )}
      </nav>
    </div>
  );
}
