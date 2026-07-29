import Link from "next/link";
import { logout } from "@/app/login/actions";
import CartLink from "@/components/CartLink";

const navLinkClass =
  "text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors";

export default function HeaderAuth({
  email,
  remainingBalance,
}: {
  email: string | null;
  remainingBalance: number | null;
}) {
  if (!email) {
    return (
      <Link
        href="/login"
        className="text-sm font-medium border border-gray-300 rounded-md px-3 py-1.5 hover:bg-gray-50 transition-colors"
      >
        Log in
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-6">
      <nav className="hidden sm:flex items-center gap-5">
        <Link href="/" className={navLinkClass}>
          Product List
        </Link>
        <CartLink />
        <Link href="/orders" className={navLinkClass}>
          Orders
        </Link>
      </nav>

      <div className="flex items-center gap-3 pl-5 border-l border-gray-200">
        {remainingBalance !== null && (
          <span className="text-sm font-medium bg-gray-100 text-gray-700 rounded-full px-3 py-1 whitespace-nowrap">
            ${remainingBalance.toLocaleString()} remaining
          </span>
        )}
        <span className="hidden md:inline text-sm text-gray-500">
          {email}
        </span>
        <form action={logout}>
          <button
            type="submit"
            className="text-sm font-medium border border-gray-300 rounded-md px-3 py-1.5 hover:bg-gray-50 transition-colors cursor-pointer"
          >
            Log out
          </button>
        </form>
      </div>
    </div>
  );
}
