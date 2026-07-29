import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import AgentChat from "@/components/AgentChat";

export default async function AgentPage() {
  const session = await getSession();
  if (!session.userId) {
    redirect("/login");
  }

  return (
    <div className="px-6 py-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold mb-1">Shopping assistant</h1>
      <p className="text-gray-500 mb-6">
        Ask in plain English — e.g. &quot;what&apos;s the cheapest black bar
        stool?&quot; or &quot;find me a cozy-looking armchair&quot;. It can
        search the catalogue, look up a product, and check your balance, but
        it will always show you the exact item and price and wait for your
        confirmation before any real purchase happens.
      </p>
      <AgentChat />
    </div>
  );
}
