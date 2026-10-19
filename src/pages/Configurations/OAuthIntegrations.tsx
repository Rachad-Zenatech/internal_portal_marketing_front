import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Globe,
  Plus,
  RefreshCw,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Layers,
  ArrowRight,
  ShieldCheck,
  Lock,
} from 'lucide-react';

import {
  oauthService,
  type OAuthProvider,
  type OAuthConnection,
  type OAuthConnectionCreate,
} from '@/services/oauthService';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import HelpIcon from '@/components/ui/HelpIcon';
import { useAuth } from '@/lib/AuthContext';

const PROVIDER_METADATA: Record<
  OAuthProvider,
  { name: string; description: string; defaultScope: string; iconBg: string }
> = {
  GOOGLE_ADS: {
    name: 'Google Ads',
    description: 'Search, Display, YouTube, and Performance Max advertising data',
    iconBg: 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400',
    defaultScope: 'https://www.googleapis.com/auth/adwords',
  },
  MICROSOFT_ADS: {
    name: 'Microsoft Ads (Bing)',
    description: 'Bing Search, Microsoft Audience Network, and Copilot ads',
    iconBg: 'bg-cyan-50 dark:bg-cyan-950/40 text-cyan-600 dark:text-cyan-400',
    defaultScope: 'https://ads.microsoft.com/msads.manage',
  },
  META_ADS: {
    name: 'Meta Ads (Facebook & IG)',
    description: 'Facebook, Instagram, Messenger, and Audience Network campaigns',
    iconBg: 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400',
    defaultScope: 'ads_management,ads_read',
  },
  LINKEDIN_ADS: {
    name: 'LinkedIn Ads',
    description: 'B2B sponsored content, lead gen forms, and InMail campaigns',
    iconBg: 'bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-400',
    defaultScope: 'r_ads,r_ads_reporting',
  },
};

const PROVIDERS: OAuthProvider[] = ['GOOGLE_ADS', 'MICROSOFT_ADS', 'META_ADS', 'LINKEDIN_ADS'];

export default function OAuthIntegrations() {
  const queryClient = useQueryClient();
  const { hasRole, user, hasPermission } = useAuth();
  const canManage = Boolean(hasRole('SUPER_ADMIN') || user?.is_super_admin || hasPermission('CONFIG_ROLES_UPDATE'));

  const [selectedOrgId, setSelectedOrgId] = useState<string>('');
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('ALL');
  const [isConnectOpen, setIsConnectOpen] = useState(false);
  const [resolvingProvider, setResolvingProvider] = useState<OAuthProvider | null>(null);

  // Form State
  const [formData, setFormData] = useState<{
    provider: OAuthProvider;
    scopeType: 'ORGANIZATION' | 'COMPANY';
    companyId: string;
    accountName: string;
    providerAccountId: string;
    accessToken: string;
    refreshToken: string;
    scopes: string;
  }>({
    provider: 'GOOGLE_ADS',
    scopeType: 'ORGANIZATION',
    companyId: '',
    accountName: '',
    providerAccountId: '',
    accessToken: '',
    refreshToken: '',
    scopes: PROVIDER_METADATA.GOOGLE_ADS.defaultScope,
  });

  // Queries
  const { data: organizations = [], isLoading: loadingOrgs } = useQuery({
    queryKey: ['oauth-organizations'],
    queryFn: async () => {
      const res = await oauthService.getOrganizations();
      if (res.length > 0 && !selectedOrgId) {
        setSelectedOrgId(res[0].id);
      }
      return res;
    },
  });

  const activeOrgId = selectedOrgId || (organizations[0]?.id ?? '');

  const { data: companies = [], isLoading: loadingCompanies } = useQuery({
    queryKey: ['oauth-companies', activeOrgId],
    queryFn: () => oauthService.getCompanies(activeOrgId),
    enabled: !!activeOrgId,
  });

  const { data: connections = [] } = useQuery({
    queryKey: ['oauth-connections', activeOrgId],
    queryFn: () => oauthService.getConnections({ organization_id: activeOrgId }),
    enabled: !!activeOrgId,
  });

  // Mutations
  const storeMutation = useMutation({
    mutationFn: (data: OAuthConnectionCreate) => oauthService.storeConnection(data),
    onSuccess: (conn) => {
      toast.success(`${conn.provider} connection registered successfully!`);
      queryClient.invalidateQueries({ queryKey: ['oauth-connections'] });
      setIsConnectOpen(false);
      resetForm();
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to save connection');
    },
  });

  const refreshMutation = useMutation({
    mutationFn: (connectionId: string) => oauthService.refreshConnection(connectionId),
    onSuccess: () => {
      toast.success('Connection token refreshed successfully');
      queryClient.invalidateQueries({ queryKey: ['oauth-connections'] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to refresh token');
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: (connectionId: string) => oauthService.disconnectConnection(connectionId),
    onSuccess: () => {
      toast.success('Connection revoked successfully');
      queryClient.invalidateQueries({ queryKey: ['oauth-connections'] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to revoke connection');
    },
  });

  const resetForm = () => {
    setFormData({
      provider: 'GOOGLE_ADS',
      scopeType: 'ORGANIZATION',
      companyId: companies[0]?.id || '',
      accountName: '',
      providerAccountId: '',
      accessToken: '',
      refreshToken: '',
      scopes: PROVIDER_METADATA.GOOGLE_ADS.defaultScope,
    });
  };

  const handleProviderChange = (provider: OAuthProvider) => {
    setFormData((prev) => ({
      ...prev,
      provider,
      scopes: PROVIDER_METADATA[provider].defaultScope,
    }));
  };

  const handleConnectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.accessToken.trim()) {
      toast.error('Access token is required');
      return;
    }

    const payload: OAuthConnectionCreate = {
      organization_id: activeOrgId,
      company_id: formData.scopeType === 'COMPANY' ? formData.companyId : null,
      provider: formData.provider,
      account_name: formData.accountName.trim() || undefined,
      provider_account_id: formData.providerAccountId.trim() || undefined,
      access_token: formData.accessToken.trim(),
      refresh_token: formData.refreshToken.trim() || undefined,
      scopes: formData.scopes
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    };

    storeMutation.mutate(payload);
  };

  const handleTestResolution = async (provider: OAuthProvider) => {
    if (!activeOrgId) return;
    setResolvingProvider(provider);
    try {
      const companyId = selectedCompanyId === 'ALL' ? null : selectedCompanyId;
      const res = await oauthService.resolveConnection(activeOrgId, companyId, provider);
      if (res) {
        const entityLabel = companyId
          ? companies.find((c) => c.id === companyId)?.name || 'Selected Entity'
          : 'Organization Fallback';
        toast.success(
          `${provider} successfully resolved at ${res.scope_level} level for ${entityLabel}!`
        );
      }
    } catch (err: any) {
      toast.error(err.message || `No active ${provider} connection found`);
    } finally {
      setResolvingProvider(null);
    }
  };

  const providerConnections = useMemo(() => {
    const map: Record<OAuthProvider, { direct?: OAuthConnection; fallback?: OAuthConnection }> = {
      GOOGLE_ADS: {},
      MICROSOFT_ADS: {},
      META_ADS: {},
      LINKEDIN_ADS: {},
    };

    connections.forEach((conn) => {
      if (conn.status === 'REVOKED') return;
      if (selectedCompanyId !== 'ALL' && conn.company_id === selectedCompanyId) {
        map[conn.provider].direct = conn;
      }
      if (!conn.company_id) {
        map[conn.provider].fallback = conn;
      }
    });

    return map;
  }, [connections, selectedCompanyId]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/60 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Globe className="w-6 h-6 text-primary" />
              OAuth & Entity Integrations
            </h1>
            <HelpIcon text="Manage OAuth connections for multi-entity ad platforms. Companies automatically inherit the Organization-level fallback account unless an entity-specific connection is registered." />
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Configure API credentials and token lifecycles for Google Ads, Microsoft Ads, Meta, and LinkedIn.
          </p>
        </div>

        {canManage && (
          <div className="flex items-center gap-3">
            <Button
              onClick={() => {
                resetForm();
                setIsConnectOpen(true);
              }}
              className="gap-1.5 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Connect Account
            </Button>
          </div>
        )}
      </div>

      {/* Entity Selector Bar */}
      <Card className="border-border/70 shadow-sm bg-card/60 backdrop-blur-sm">
        <CardContent className="p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex items-center gap-2 min-w-[200px]">
                <Building2 className="w-4 h-4 text-muted-foreground" />
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Organization:
                </Label>
                <Select
                  value={activeOrgId}
                  onValueChange={(val) => {
                    setSelectedOrgId(val);
                    setSelectedCompanyId('ALL');
                  }}
                  disabled={loadingOrgs}
                >
                  <SelectTrigger className="h-9 w-[180px]">
                    <SelectValue placeholder="Select Org" />
                  </SelectTrigger>
                  <SelectContent>
                    {organizations.map((org) => (
                      <SelectItem key={org.id} value={org.id}>
                        {org.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="h-4 w-px bg-border hidden sm:block" />

              <div className="flex items-center gap-2 min-w-[260px]">
                <Layers className="w-4 h-4 text-muted-foreground" />
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Target Entity:
                </Label>
                <Select
                  value={selectedCompanyId}
                  onValueChange={setSelectedCompanyId}
                  disabled={loadingCompanies}
                >
                  <SelectTrigger className="h-9 w-[220px]">
                    <SelectValue placeholder="Choose Entity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">
                      🌐 Global Master (All Entities)
                    </SelectItem>
                    {companies.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name} ({c.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="text-xs text-muted-foreground flex items-center gap-1.5 bg-muted/50 px-3 py-1.5 rounded-md border border-border/40">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              Tokens encrypted with AES-256 Fernet in PostgreSQL
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Provider Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {PROVIDERS.map((provider) => {
          const meta = PROVIDER_METADATA[provider];
          const info = providerConnections[provider];
          const directConn = info.direct;
          const fallbackConn = info.fallback;
          const activeConn = directConn || fallbackConn;

          const isDirect = !!directConn;
          const isConnected = !!activeConn && activeConn.status === 'CONNECTED';

          return (
            <Card
              key={provider}
              className="border border-border/70 hover:border-border transition-all shadow-sm flex flex-col justify-between overflow-hidden"
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-lg ${meta.iconBg}`}>
                      {provider === 'GOOGLE_ADS' ? 'G' : provider === 'MICROSOFT_ADS' ? 'M' : provider === 'META_ADS' ? 'f' : 'in'}
                    </div>
                    <div>
                      <CardTitle className="text-base font-semibold">{meta.name}</CardTitle>
                      <CardDescription className="text-xs line-clamp-1">
                        {meta.description}
                      </CardDescription>
                    </div>
                  </div>

                  {isConnected ? (
                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800 gap-1 text-[11px]">
                      <CheckCircle2 className="w-3 h-3" />
                      Connected
                    </Badge>
                  ) : activeConn ? (
                    <Badge variant="outline" className="bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border-amber-300 dark:border-amber-800 gap-1 text-[11px]">
                      <AlertTriangle className="w-3 h-3" />
                      {activeConn.status}
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-[11px] text-muted-foreground">
                      Not Connected
                    </Badge>
                  )}
                </div>
              </CardHeader>

              <CardContent className="py-2 space-y-3 flex-1 text-sm">
                {activeConn ? (
                  <div className="p-3 rounded-md bg-muted/40 border border-border/50 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Hierarchy Scope:</span>
                      {isDirect ? (
                        <Badge variant="default" className="text-[10px] bg-primary/90">
                          Dedicated Company
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[10px] bg-secondary/80">
                          Org Fallback (Master)
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Account Name:</span>
                      <span className="font-medium text-foreground">
                        {activeConn.account_name || 'Standard Account'}
                      </span>
                    </div>

                    {activeConn.provider_account_id && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Customer / MCC ID:</span>
                        <span className="font-mono text-foreground">
                          {activeConn.provider_account_id}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Token Expiry:</span>
                      <span className="text-muted-foreground">
                        {activeConn.expires_at
                          ? new Date(activeConn.expires_at).toLocaleDateString()
                          : 'Auto-refreshing'}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-md border border-dashed border-border/80 text-center text-xs text-muted-foreground">
                    No active OAuth token registered for this entity or parent organization.
                  </div>
                )}
              </CardContent>

              <CardFooter className="pt-3 border-t border-border/40 bg-muted/10 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  {activeConn && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-xs gap-1 text-muted-foreground hover:text-foreground"
                      disabled={refreshMutation.isPending}
                      onClick={() => refreshMutation.mutate(activeConn.id)}
                    >
                      <RefreshCw className={`w-3 h-3 ${refreshMutation.isPending ? 'animate-spin' : ''}`} />
                      Refresh
                    </Button>
                  )}

                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs gap-1"
                    disabled={resolvingProvider === provider}
                    onClick={() => handleTestResolution(provider)}
                  >
                    <ArrowRight className="w-3 h-3" />
                    {resolvingProvider === provider ? 'Checking...' : 'Test Resolve'}
                  </Button>
                </div>

                {canManage && (
                  <div className="flex items-center gap-1.5">
                    {activeConn ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-xs text-destructive hover:bg-destructive/10"
                        disabled={disconnectMutation.isPending}
                        onClick={() => {
                          if (confirm(`Disconnect and revoke ${meta.name} connection?`)) {
                            disconnectMutation.mutate(activeConn.id);
                          }
                        }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        className="h-8 text-xs gap-1"
                        onClick={() => {
                          handleProviderChange(provider);
                          if (selectedCompanyId !== 'ALL') {
                            setFormData((prev) => ({
                              ...prev,
                              scopeType: 'COMPANY',
                              companyId: selectedCompanyId,
                            }));
                          } else {
                            setFormData((prev) => ({ ...prev, scopeType: 'ORGANIZATION' }));
                          }
                          setIsConnectOpen(true);
                        }}
                      >
                        <Plus className="w-3 h-3" />
                        Connect
                      </Button>
                    )}
                  </div>
                )}
              </CardFooter>
            </Card>
          );
        })}
      </div>

      {/* Connect Account Modal */}
      <Dialog open={isConnectOpen} onOpenChange={setIsConnectOpen}>
        <DialogContent className="sm:max-w-[540px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-primary" />
              Connect Ad Provider
            </DialogTitle>
            <DialogDescription>
              Store authorized OAuth tokens for your multi-entity marketing hierarchy. All tokens are encrypted at rest with Fernet cryptography.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleConnectSubmit} className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Provider Platform</Label>
                <Select
                  value={formData.provider}
                  onValueChange={(val) => handleProviderChange(val as OAuthProvider)}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PROVIDERS.map((p) => (
                      <SelectItem key={p} value={p}>
                        {PROVIDER_METADATA[p].name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Connection Scope</Label>
                <Select
                  value={formData.scopeType}
                  onValueChange={(val: 'ORGANIZATION' | 'COMPANY') =>
                    setFormData((prev) => ({ ...prev, scopeType: val }))
                  }
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ORGANIZATION">
                      🏢 Organization Master (Fallback)
                    </SelectItem>
                    <SelectItem value="COMPANY">
                      🎯 Subsidiary Entity Override
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {formData.scopeType === 'COMPANY' && (
              <div className="space-y-1.5">
                <Label className="text-xs">Target Subsidiary / Company</Label>
                <Select
                  value={formData.companyId}
                  onValueChange={(val) => setFormData((prev) => ({ ...prev, companyId: val }))}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select Company" />
                  </SelectTrigger>
                  <SelectContent>
                    {companies.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name} ({c.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Account Label / Name</Label>
                <Input
                  className="h-9 text-xs"
                  placeholder="e.g. DeskFlex US Ads"
                  value={formData.accountName}
                  onChange={(e) => setFormData((prev) => ({ ...prev, accountName: e.target.value }))}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Customer / MCC ID</Label>
                <Input
                  className="h-9 text-xs"
                  placeholder="e.g. 123-456-7890"
                  value={formData.providerAccountId}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, providerAccountId: e.target.value }))
                  }
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Access Token *</Label>
              <Input
                type="password"
                className="h-9 text-xs font-mono"
                placeholder="ya29.a0AfH6SMB..."
                value={formData.accessToken}
                onChange={(e) => setFormData((prev) => ({ ...prev, accessToken: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Refresh Token (Optional)</Label>
              <Input
                type="password"
                className="h-9 text-xs font-mono"
                placeholder="1//04..."
                value={formData.refreshToken}
                onChange={(e) => setFormData((prev) => ({ ...prev, refreshToken: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs">OAuth Scopes</Label>
                <button
                  type="button"
                  onClick={() =>
                    setFormData((prev) => ({
                      ...prev,
                      scopes: PROVIDER_METADATA[prev.provider].defaultScope,
                    }))
                  }
                  className="text-[11px] text-primary hover:underline"
                >
                  Reset Default
                </button>
              </div>
              <Input
                className="h-9 text-xs font-mono"
                value={formData.scopes}
                onChange={(e) => setFormData((prev) => ({ ...prev, scopes: e.target.value }))}
              />
            </div>

            <DialogFooter className="pt-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsConnectOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={storeMutation.isPending}>
                {storeMutation.isPending ? 'Encrypting & Saving...' : 'Save & Connect'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
