// Four tools wrapping the furniture shop's API for use by an AI agent
// (e.g. via an LLM function-calling / tool-use loop). Each is a thin,
// side-effect-minimal wrapper — no coupling to this app's own login session
// or local database, so they can be reused by any agent integration.
//
// Naming note: "search_catalogue" and "get_product" match names the shop
// API's own docs already assume ("...search_catalogue/get_product tools
// both strip [image data]"); "check_balance" and "place_order" are this
// app's proposal, following the same snake_case verb_noun convention.

import { randomUUID } from "node:crypto";
import { fetchProductDetail, ProductNotFoundError } from "@/lib/catalogue-api";
import { fetchLedgerUser } from "@/lib/ledger-api";
import {
  placeRealOrder,
  InsufficientBalanceError,
  ItemNotFoundError,
} from "@/lib/orders-api";
import { searchLocalCatalogue } from "@/lib/catalogue-rag";

// ---------------------------------------------------------------------------
// 1. search_catalogue — searches a local, offline copy of the catalogue
// (see lib/catalogue-rag.ts) rather than calling the shop API live. Same
// 762-item dataset, much faster (no 3-8s round trip), and adds dimension
// filters the live API's search-index never exposed — but it has no colour
// field, since that data isn't in this local copy.

export type SearchCatalogueArgs = {
  category?: string;
  keyword?: string;
  minPrice?: number;
  maxPrice?: number;
  maxWidth?: number;
  maxHeight?: number;
  maxDepth?: number;
  limit?: number;
};

export type SearchCatalogueItem = {
  itemId: string;
  name: string;
  price: number;
  category: string | null;
  width: number | null;
  height: number | null;
  depth: number | null;
};

export type SearchCatalogueResult = {
  results: SearchCatalogueItem[];
  totalMatches: number;
  truncated: boolean;
};

export const searchCatalogueTool = {
  name: "search_catalogue",
  description:
    "Lists furniture products from our local copy of the catalogue, with optional filters for category, keyword, price range, and maximum width/height/depth (cm). Filtering matches case-insensitive substrings locally — it is not a real search engine: it won't understand synonyms, typos, or style/'vibe' descriptions (e.g. 'cozy'), only literal substrings actually present in the product name or category. It does NOT have colour data — never claim a colour filter worked, and if the user needs a specific colour, say you can't filter by colour and suggest they check a product's photo/detail page instead.",
  parameters: {
    type: "object",
    properties: {
      category: {
        type: "string",
        description:
          "Substring to match against the product's category (case-insensitive), e.g. 'chair' matches 'Chairs' and 'Bar stool' style categories. Not an exact category enum.",
      },
      keyword: {
        type: "string",
        description:
          "Substring to match against the product name or category (case-insensitive), e.g. 'bar table'.",
      },
      minPrice: { type: "number", description: "Minimum price, inclusive." },
      maxPrice: { type: "number", description: "Maximum price, inclusive." },
      maxWidth: { type: "number", description: "Maximum width, cm." },
      maxHeight: { type: "number", description: "Maximum height, cm." },
      maxDepth: { type: "number", description: "Maximum depth, cm." },
      limit: {
        type: "integer",
        description: "Max results to return (default 20, capped at 50).",
      },
    },
  },
  async execute(args: SearchCatalogueArgs): Promise<SearchCatalogueResult> {
    return searchLocalCatalogue(args);
  },
};

// ---------------------------------------------------------------------------
// 2. get_product

export type GetProductArgs = { itemId: string };

export type GetProductResult =
  | {
      found: true;
      product: {
        itemId: string;
        name: string;
        price: number;
        category: string | null;
        width: number | null;
        height: number | null;
        depth: number | null;
        colours: string[] | null;
        link: string | null;
      };
    }
  | { found: false; message: string };

export const getProductTool = {
  name: "get_product",
  description:
    "Fetches full detail (name, price, category, dimensions, colours, original listing link) for one already-known item_id. It cannot search by name or fuzzy-match a description — the caller must already have the exact item_id, typically from search_catalogue first. Image data is intentionally left out of this result; a photo (if needed for display, not for the model) is available at a separate image URL keyed by the same item_id.",
  parameters: {
    type: "object",
    properties: {
      itemId: {
        type: "string",
        description: "Exact item_id, e.g. from a search_catalogue result.",
      },
    },
    required: ["itemId"],
  },
  async execute(args: GetProductArgs): Promise<GetProductResult> {
    try {
      const product = await fetchProductDetail(args.itemId);
      return { found: true, product };
    } catch (err) {
      if (err instanceof ProductNotFoundError) {
        return { found: false, message: "This item is no longer available." };
      }
      throw err;
    }
  },
};

// ---------------------------------------------------------------------------
// 3. check_balance

export type CheckBalanceResult = {
  userId: string;
  name: string;
  balance: number;
};

export const checkBalanceTool = {
  name: "check_balance",
  description:
    "Returns the user's current real balance, computed live from their ledger — use it to confirm affordability before placing an order. It's recalculated on every call (not cached), so two calls seconds apart can legitimately differ if something else changed the balance meanwhile; it returns only the current total, not a transaction history.",
  parameters: { type: "object", properties: {} },
  async execute(): Promise<CheckBalanceResult> {
    return fetchLedgerUser();
  },
};

// ---------------------------------------------------------------------------
// 4. place_order

export type PlaceOrderArgs = { itemId: string; quantity?: number };

export type PlaceOrderResult =
  | {
      success: true;
      orderId: string;
      totalPrice: number;
      remainingBalance: number;
    }
  | { success: false; error: string };

export const placeOrderTool = {
  name: "place_order",
  description:
    "Places a real order for one item_id/quantity and immediately, irreversibly debits the user's balance — this is the actual checkout step, not a price quote or dry run, so only call it once the purchase is genuinely decided. It rejects clearly if the balance is insufficient or the item no longer exists; there is no stock/inventory check of its own (a huge quantity is only ever blocked by balance, never by availability), and there is no cancel/refund endpoint, so mistakes can't be undone through this API.",
  parameters: {
    type: "object",
    properties: {
      itemId: { type: "string", description: "Exact item_id to buy." },
      quantity: {
        type: "integer",
        description: "How many units to buy (default 1).",
      },
    },
    required: ["itemId"],
  },
  async execute(args: PlaceOrderArgs): Promise<PlaceOrderResult> {
    try {
      // Generated per call, not by the caller — retries of the same logical
      // request from an agent's own retry logic wouldn't reliably reuse a
      // caller-supplied key anyway, and a fresh key per invocation is the
      // safe default (each call is a genuinely new purchase intent).
      const order = await placeRealOrder(
        args.itemId,
        args.quantity ?? 1,
        randomUUID()
      );
      return {
        success: true,
        orderId: order.orderId,
        totalPrice: order.totalPrice,
        remainingBalance: order.remainingBalance,
      };
    } catch (err) {
      if (err instanceof InsufficientBalanceError) {
        return {
          success: false,
          error: `Insufficient balance to complete this purchase (${err.message}).`,
        };
      }
      if (err instanceof ItemNotFoundError) {
        return { success: false, error: "This item is no longer available." };
      }
      throw err;
    }
  },
};

// ---------------------------------------------------------------------------
// propose_purchase — NOT one of the four shop-API actions. This is a no-op,
// LLM-facing "stop and ask" tool used by the chat agent (see lib/agent.ts):
// it just echoes back a structured proposal, it never touches the real
// order-placing API. The chat agent is deliberately never given the real
// place_order tool at all — the actual purchase can only be triggered by a
// human clicking "Confirm & Buy" in the UI on the exact item/price this
// produced, never by the model deciding on its own that the user agreed.

export type ProposePurchaseArgs = {
  itemId: string;
  name: string;
  quantity?: number;
  unitPrice: number;
  reason?: string;
};

export type ProposePurchaseResult = ProposePurchaseArgs & {
  quantity: number;
  totalPrice: number;
};

export const proposePurchaseTool = {
  name: "propose_purchase",
  description:
    "Present ONE specific item, quantity, and price to the user as something you'd buy, then stop and wait — this does not purchase anything by itself, and you must never treat calling this as if the purchase happened. Only call it once you have a concrete item_id and price (from search_catalogue or get_product), and never call it just because the user described what they want — only when they've asked you to buy/order/get something specific. Never assume a later message is confirmation unless the user clearly says so.",
  parameters: {
    type: "object",
    properties: {
      itemId: { type: "string", description: "Exact item_id being proposed." },
      name: { type: "string", description: "Product name, for display." },
      quantity: { type: "integer", description: "Quantity (default 1)." },
      unitPrice: { type: "number", description: "Price per unit." },
      reason: {
        type: "string",
        description:
          "One short phrase on why this item fits the request (e.g. 'cheapest black option found').",
      },
    },
    required: ["itemId", "name", "unitPrice"],
  },
  async execute(args: ProposePurchaseArgs): Promise<ProposePurchaseResult> {
    const quantity = args.quantity ?? 1;
    return { ...args, quantity, totalPrice: args.unitPrice * quantity };
  },
};

// All four real shop-API actions, as originally designed.
export const agentTools = [
  searchCatalogueTool,
  getProductTool,
  checkBalanceTool,
  placeOrderTool,
];

// What the chat agent is actually allowed to call — place_order is
// deliberately excluded (see propose_purchase above).
export const chatAgentTools = [
  searchCatalogueTool,
  getProductTool,
  checkBalanceTool,
  proposePurchaseTool,
];
