import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { oauthService } from "@/services/oauthService";

export function useLinkedInAds(enabled: boolean) {
  const client = useQueryClient();
  const [organization, setOrganization] = useState("");
  const [companyId, setCompanyId] = useState("");
  const organizations = useQuery({ queryKey: ["organizations"], queryFn: oauthService.getOrganizations, enabled });
  const organizationId = organization || organizations.data?.[0]?.id || "";
  const companies = useQuery({
    queryKey: ["companies", organizationId], queryFn: () => oauthService.getCompanies(organizationId),
    enabled: enabled && !!organizationId,
  });
  const connections = useQuery({
    queryKey: ["linkedinAdsConnections", organizationId],
    queryFn: () => oauthService.getConnections({ provider: "LINKEDIN_ADS", organization_id: organizationId }),
    enabled: enabled && !!organizationId,
  });
  const authorize = useMutation({
    mutationFn: (redirectUri: string) => oauthService.getAuthorizationUrl("LINKEDIN_ADS", {
      organization_id: organizationId, company_id: companyId || undefined, redirect_uri: redirectUri,
    }),
  });
  const disconnect = useMutation({
    mutationFn: oauthService.disconnectConnection,
    onSuccess: () => client.invalidateQueries({ queryKey: ["linkedinAdsConnections"] }),
  });
  const selectOrganization = (value: string) => { setOrganization(value); setCompanyId(""); };
  return { organizations, organizationId, selectOrganization, companies, companyId, setCompanyId, connections, authorize, disconnect };
}
