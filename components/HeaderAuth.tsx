import Link from "next/link";
import { logout } from "@/app/login/actions";
import CartLink from "@/components/CartLink";

export default function HeaderAuth({
  email,
  remainingBalance,
}: {
  email: string | null;
  remainingBalance: number | null;
}) {
  if (!email) {
    return (
      <Link href="/login" className="text-sm underline">
        Log in
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-4 text-sm">
      {remainingBalance !== null && (
        <span className="text-gray-500">
          ${remainingBalance.toLocaleString()} remaining
        </span>
      )}
      <CartLink />
      <Link href="/orders" className="underline">
        Orders
      </Link>
      <span className="text-gray-500">{email}</span>
      <form action={logout}>
        <button type="submit" className="underline cursor-pointer">
          Log out
        </button>
      </form>
    </div>
  );
}
