'use client';

import Link from "next/link";

// 이미지(1254×1254) 기준 각 메뉴 영역의 % 좌표
// 실제 화면에서 조금 벗어나면 top/left/width/height 값을 조정하세요
const MENU_AREAS = [
  {
    label: "질문발견",
    href: "/question",
    pos: { left: "1%", top: "71%", width: "25%", height: "29%" },
  },
  {
    label: "개념학습",
    href: "/learn",
    pos: { left: "26%", top: "71%", width: "25%", height: "29%" },
  },
  {
    label: "탐구토론",
    href: "/explore",
    pos: { left: "51%", top: "71%", width: "24%", height: "29%" },
  },
  {
    label: "확장공유",
    href: null,
    pos: { left: "75%", top: "71%", width: "25%", height: "29%" },
  },
] as const;

export default function Home() {
  function comingSoon(name: string) {
    alert(`${name} 기능은 준비 중입니다.\n조금만 기다려 주세요! 😊`);
  }

  return (
    // 전체 화면 중앙 정렬, 흰 배경
    <div className="flex items-center justify-center w-screen h-screen bg-white overflow-hidden">

      {/*
        이미지가 1:1 정사각형이므로 래퍼도 1:1로 맞춤.
        min(100vw, 100vh)로 화면에 꽉 차되 잘리지 않게 유지.
        퍼센트 오버레이는 이 래퍼 기준으로 동작함.
      */}
      <div
        className="relative"
        style={{ width: "min(100vw, 100vh)", height: "min(100vw, 100vh)" }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/deeping.png"
          alt="디핑 DEEPING"
          className="w-full h-full"
          draggable={false}
        />

        {/* 교사용 버튼 — 이미지 오른쪽 상단 */}
        <Link href="/teacher"
          className="absolute z-20 no-underline transition-all hover:opacity-90"
          style={{ top: '2%', right: '2%' }}>
          <span className="text-white text-xl font-bold px-7 py-3.5 rounded-full shadow-md block"
            style={{ background: 'linear-gradient(135deg, #667eea, #764ba2)' }}>
            🔒 교사용
          </span>
        </Link>

        {/* 투명 클릭 오버레이 — z-index를 이미지(z-0)보다 높게 설정 */}
        {MENU_AREAS.map(({ label, href, pos }) =>
          href ? (
            <Link
              key={label}
              href={href}
              aria-label={label}
              className="absolute z-10 cursor-pointer"
              style={pos}
            />
          ) : (
            <div
              key={label}
              aria-label={label}
              className="absolute z-10 cursor-pointer"
              style={pos}
              onClick={() => comingSoon(label)}
            />
          )
        )}
      </div>
    </div>
  );
}
