import Link from "next/link";

export default function NavBar() {
  return (
    <nav className="flex gap-6 border-b border-black/10 dark:border-white/10 px-6 py-4 text-sm">
      <Link href="/" className="font-semibold">
        Sentimo
      </Link>
      <Link href="/" className="hover:underline">
        Dashboard
      </Link>
      <Link href="/reviews" className="hover:underline">
        Reviews
      </Link>
    </nav>
  );
}
