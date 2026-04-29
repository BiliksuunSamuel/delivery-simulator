"use client";

import Link from "next/link";
import { use } from "react";
import { formatDistanceToNow } from "date-fns";
import { Check, ChevronLeft, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CountdownBar } from "@/components/domain/CountdownBar";
import {
  EligibilityPill,
  NotificationStatusBadge,
  RiderStateBadge,
} from "@/components/domain/StateBadge";
import {
  POLL,
  useNotifications,
  useRespondNotification,
  useRider,
} from "@/lib/hooks/useApi";
import { toast } from "sonner";

export default function RiderInboxPage(props: PageProps<"/notifications/[riderId]/inbox">) {
  const { riderId } = use(props.params);
  const rider = useRider(riderId);
  const notifications = useNotifications({ riderId }, POLL.fast);
  const respond = useRespondNotification();

  const list = (notifications.data ?? []).slice();
  const pending = list.filter((n) => n.status === "Pending");
  const past = list.filter((n) => n.status !== "Pending");

  const respondTo = async (id: string, action: "accept" | "decline") => {
    await respond.mutateAsync({ id, action });
    toast.success(action === "accept" ? "Offer accepted." : "Offer declined.");
  };

  if (!rider.data) {
    return <div className="text-sm text-muted-foreground">Loading inbox…</div>;
  }
  const r = rider.data;

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      <div className="flex items-center gap-2">
        <Link
          href="/notifications"
          className="inline-flex items-center text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Notifications
        </Link>
      </div>

      <Card>
        <CardContent className="py-4 flex flex-wrap items-center gap-3">
          <div className="flex flex-col">
            <Link
              href={`/riders/${r.id}`}
              className="text-base font-semibold underline-offset-2 hover:underline"
            >
              {r.fullName}
            </Link>
            <span className="text-xs text-muted-foreground font-mono">{r.phone}</span>
          </div>
          <RiderStateBadge state={r.state} />
          <EligibilityPill eligible={r.isEligible} reason={r.ineligibilityReason} />
          <span className="ml-auto text-xs text-muted-foreground">
            Acceptance <span className="font-mono">{r.acceptanceRate}%</span>
          </span>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <h3 className="text-sm font-medium">Pending offers</h3>
        {pending.length === 0 && (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              No pending offers right now.
            </CardContent>
          </Card>
        )}
        {pending.map((n) => (
          <Card
            key={n.id}
            className="border-[var(--color-brand-orange)]/50"
          >
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center justify-between">
                <span>Offer · rank #{n.offerRank}</span>
                <NotificationStatusBadge status={n.status} />
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div>
                  <div className="text-xs text-muted-foreground">Order</div>
                  <Link
                    href={`/orders/${n.orderId}`}
                    className="font-mono underline-offset-2 hover:underline"
                  >
                    {n.orderId.slice(0, 8)}
                  </Link>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Distance</div>
                  <div className="font-mono tabular-nums">{(n.distanceMeters / 1000).toFixed(2)} km</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Score</div>
                  <div className="font-mono tabular-nums">{n.score.toFixed(3)}</div>
                </div>
              </div>
              <CountdownBar issuedAt={n.issuedAt} timesOutAt={n.timesOutAt} />
              <div className="grid grid-cols-2 gap-2">
                <Button
                  size="lg"
                  className="bg-[var(--color-brand-teal)] text-[var(--color-brand-teal-fg)] hover:bg-[var(--color-brand-teal)]/90"
                  onClick={() => respondTo(n.id, "accept")}
                  disabled={respond.isPending}
                >
                  <Check className="h-4 w-4 mr-1.5" /> Accept
                </Button>
                <Button
                  size="lg"
                  variant="destructive"
                  onClick={() => respondTo(n.id, "decline")}
                  disabled={respond.isPending}
                >
                  <X className="h-4 w-4 mr-1.5" /> Decline
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-medium">Past offers</h3>
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Rank</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Issued</TableHead>
                  <TableHead>Responded</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {past.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-6">
                      No past offers.
                    </TableCell>
                  </TableRow>
                )}
                {past.map((n) => (
                  <TableRow key={n.id}>
                    <TableCell>
                      <Link
                        href={`/orders/${n.orderId}`}
                        className="font-mono text-xs underline-offset-2 hover:underline"
                      >
                        {n.orderId.slice(0, 8)}
                      </Link>
                    </TableCell>
                    <TableCell><NotificationStatusBadge status={n.status} /></TableCell>
                    <TableCell className="font-mono tabular-nums">#{n.offerRank}</TableCell>
                    <TableCell className="font-mono tabular-nums">{n.score.toFixed(3)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {(() => {
                        try {
                          return formatDistanceToNow(new Date(n.issuedAt), { addSuffix: true });
                        } catch {
                          return "—";
                        }
                      })()}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {n.respondedAt
                        ? formatDistanceToNow(new Date(n.respondedAt), { addSuffix: true })
                        : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
