import { NextRequest } from "next/server";
import { roundStore } from "../../../../lib/round-store";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const roundId = req.nextUrl.searchParams.get("roundId");
  if (!roundId) {
    return new Response("roundId required", { status: 400 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let lastIndex = 0;
      let emptyPolls = 0;
      const maxEmpty = 300; // 5 min timeout (300 * 1s)

      const send = (event: string, data: any) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };

      while (emptyPolls < maxEmpty) {
        const round = roundStore.get(roundId);
        if (!round) {
          // Round not created yet, wait
          await new Promise((r) => setTimeout(r, 200));
          emptyPolls++;
          continue;
        }

        const newMessages = roundStore.getMessages(roundId, lastIndex);
        if (newMessages.length > 0) {
          for (const msg of newMessages) {
            send(msg.phase, msg);
          }
          lastIndex += newMessages.length;
          emptyPolls = 0;

          // Send payment stats
          send("stats", {
            totalPayments: round.totalPayments,
            totalSpent: round.totalSpent.toFixed(3),
          });
        } else {
          emptyPolls++;
        }

        if (round.status === "done" && lastIndex >= round.messages.length) {
          send("done", {
            ejected: round.ejected,
            survivors: round.survivors,
            txHash: round.txHash,
            totalPayments: round.totalPayments,
            totalSpent: round.totalSpent.toFixed(3),
          });
          break;
        }

        await new Promise((r) => setTimeout(r, 200));
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
