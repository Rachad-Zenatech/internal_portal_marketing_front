import { Button } from "@/components/ui/button";
import type { OAuthConnection } from "@/services/oauthService";

interface Props {
  connections: OAuthConnection[];
  canManage: boolean;
  busy: boolean;
  onDisconnect: (id: string) => void;
}

function ConnectionRow({ connection, canManage, busy, onDisconnect }: Omit<Props, "connections"> & { connection: OAuthConnection }) {
  const raw: unknown = connection.connection_metadata?.discovered_accounts;
  const accounts = Array.isArray(raw) ? raw.filter((value: unknown): value is Record<string, unknown> => !!value && typeof value === "object") : [];
  const names = accounts.map((account, index) => <li key={String(account.account_id ?? index)}>{String(account.account_name ?? "LinkedIn Ads account")} · {String(account.account_id ?? "")} {String(account.currency ?? "")}</li>);
  const expires = connection.expires_at ? new Date(connection.expires_at).toLocaleString() : "Not provided";
  const legacy = connection.connection_metadata?.mode !== "live";
  const status = legacy ? "Reconnect required" : connection.is_expired ? "Expired — reconnect" : connection.status;
  return (
    <tr className="border-t align-top">
      <td className="p-3 font-medium">{connection.company_name ?? connection.organization_name ?? "Organization"}</td>
      <td className="p-3">{legacy ? "Reconnect to discover your LinkedIn accounts" : <ul className="space-y-1">{names}</ul>}</td>
      <td className="p-3">{status}</td><td className="p-3">{expires}</td>
      <td className="p-3">{canManage && connection.status !== "REVOKED" && <Button size="sm" variant="outline" disabled={busy} onClick={() => onDisconnect(connection.id)}>Disconnect</Button>}</td>
    </tr>
  );
}

export function LinkedInConnectionList({ connections, ...props }: Props) {
  const rows = connections.map((connection) => <ConnectionRow key={connection.id} connection={connection} {...props} />);
  if (!connections.length) return <p className="rounded-lg border border-dashed p-5 text-sm text-muted-foreground">No LinkedIn Ads accounts connected for this organization yet.</p>;
  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-left text-sm">
        <thead className="bg-muted text-xs"><tr><th className="p-3">Scope</th><th className="p-3">Advertising accounts</th><th className="p-3">Status</th><th className="p-3">Access expires</th><th className="p-3">Actions</th></tr></thead>
        <tbody>{rows}</tbody>
      </table>
    </div>
  );
}
