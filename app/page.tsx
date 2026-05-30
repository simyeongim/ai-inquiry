'use client';

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
    <div className="flex flex-col items-center justify-center w-full h-screen bg-white">
      {/* 이미지 영역 */}
      <div className="flex-1 flex items-center justify-center w-full overflow-hidden px-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/deeping.png"
          alt="디핑 DEEPING"
          className="max-w-full max-h-full object-contain"
        />
      </div>

      {/* 하단 내비게이션 */}
      <nav className="w-full flex gap-3 px-4 pb-8 pt-3 max-w-lg mx-auto">
        {NAV_ITEMS.map(({ emoji, label, href }) =>
          href ? (
            <Link
              key={label}
              href={href}
              className="flex-1 flex flex-col items-center gap-1.5 py-3 rounded-2xl
                         bg-black/10 border border-black/15 text-gray-800
                         hover:bg-black/20 active:scale-95 transition-all duration-150"
            >
              <span className="text-2xl leading-none">{emoji}</span>
              <span className="text-xs font-bold tracking-wide">{label}</span>
            </Link>
          ) : (
            <button
              key={label}
              onClick={() => comingSoon(label)}
              className="flex-1 flex flex-col items-center gap-1.5 py-3 rounded-2xl
                         bg-black/5 border border-black/10 text-gray-400
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
