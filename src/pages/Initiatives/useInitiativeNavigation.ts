import { useEffect } from "react";
import { SET_ACTIVE_NAV_EVENT } from "@/components/AppShell/Navigation";
import { useReferenceData } from "@/hooks/useReferenceData";
import type { InitiativeListItem } from "@/types/initiatives";

/** A page inside an initiative, e.g. { title: "Costs", path: "costs" } for /initiatives/:id/costs */
interface InitiativeSubPage {
  title: string;
  path: string;
}

/**
 * Breadcrumb and sidebar for pages that belong to one initiative:
 * Initiatives › Events › Facility Expo 2026 (› Costs), with the channel's sidebar link highlighted
 * so the way back leads to that channel's list, not every initiative.
 */
export function useInitiativeNavigation(initiative: InitiativeListItem | undefined, subPage?: InitiativeSubPage) {
  const { data: reference } = useReferenceData();
  const channel = reference?.channels.find((c) => c.id === initiative?.channel_id);
  const subTitle = subPage?.title;
  const subPath = subPage?.path;

  useEffect(() => {
    if (!initiative) return;

    const initiativePath = `/initiatives/${initiative.id}`;
    const pagePath = subPath ? `${initiativePath}/${subPath}` : initiativePath;
    const channelPath = channel ? `/initiatives?channel=${channel.code}` : null;

    const items = [
      { title: "Initiatives", path: "/initiatives" },
      ...(channel && channelPath ? [{ title: channel.name, path: channelPath }] : []),
      subTitle ? { title: initiative.name, path: initiativePath } : { title: initiative.name },
      ...(subTitle ? [{ title: subTitle }] : []),
    ];

    document.dispatchEvent(new CustomEvent("set-breadcrumb-trail", { detail: { path: pagePath, items } }));
    if (channelPath) {
      document.dispatchEvent(new CustomEvent(SET_ACTIVE_NAV_EVENT, { detail: { path: pagePath, navPath: channelPath } }));
    }
  }, [initiative, channel, subTitle, subPath]);
}
