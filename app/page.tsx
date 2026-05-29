import Image from "next/image";

export default function Home() {
  return (
    <div className="fixed inset-0">
      <Image
        src="/deeping.png"
        alt="Deeping background"
        fill
        priority
        className="object-cover"
      />
    </div>
  );
}
