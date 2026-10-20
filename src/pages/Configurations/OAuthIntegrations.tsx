import { useState, useMemo, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
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
  ArrowRight,
  ShieldCheck,
  Lock,
  KeyRound,
  Megaphone,
  Share2,
  ExternalLink,
  FlaskConical,
} from 'lucide-react';

import {
  oauthService,
  type OAuthProvider,
  type OAuthConnection,
} from '@/services/oauthService';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardHeader,
  CardTitle,
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
import { isAdSyncProvider } from '@/services/adSyncService';
import { AdPlatformLastSynced, AdSyncModeBadge, SyncAdPlatformButton, useSuggestAdSync } from '@/pages/PaidAds/AdSyncStatus';

export type IntegrationCategory = 'PAID_ADS' | 'SOCIAL_MEDIA';

interface ProviderMeta {
  name: string;
  category: 'PAID_ADS' | 'SOCIAL_MEDIA';
  description: string;
  defaultScope: string;
  iconBg: string;
  iconChar: string;
  idLabel: string;
  idPlaceholder: string;
  authPermissions: string[];
}

const PROVIDER_METADATA: Record<OAuthProvider, ProviderMeta> = {
  // --- Paid Advertising ---
  GOOGLE_ADS: {
    name: 'Google Ads',
    category: 'PAID_ADS',
    description: 'Search, Display, YouTube, and Performance Max advertising data',
    iconBg: 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400',
    iconChar: 'G',
    defaultScope: 'https://www.googleapis.com/auth/adwords',
    idLabel: 'Customer / MCC ID',
    idPlaceholder: 'e.g. 123-456-7890',
    authPermissions: [
      'Read ad performance & campaign reporting',
      'Discover Customer IDs and MCC accounts',
      'Automatic offline refresh token renewal',
    ],
  },
  MICROSOFT_ADS: {
    name: 'Microsoft Ads (Bing)',
    category: 'PAID_ADS',
    description: 'Bing Search, Microsoft Audience Network, and Copilot ads',
    iconBg: 'bg-cyan-50 dark:bg-cyan-950/40 text-cyan-600 dark:text-cyan-400',
    iconChar: 'M',
    defaultScope: 'https://ads.microsoft.com/msads.manage offline_access',
    idLabel: 'Account ID',
    idPlaceholder: 'e.g. MS-1234-567',
    authPermissions: [
      'Access Bing Search and Audience Network metrics',
      'Discover linked Microsoft Advertising accounts',
      'Manage offline token renewal lifecycle',
    ],
  },
  META_ADS: {
    name: 'Meta Ads (Facebook & IG)',
    category: 'PAID_ADS',
    description: 'Facebook, Instagram, Messenger, and Audience Network campaigns',
    iconBg: 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400',
    iconChar: 'f',
    defaultScope: 'ads_management,ads_read',
    idLabel: 'Ad Account ID',
    idPlaceholder: 'e.g. act_1234567890',
    authPermissions: [
      'Read Meta Pixel and Ads Manager conversions',
      'Access ad sets, reach, and CPM spend telemetry',
      'Long-lived 60-day token auto-management',
    ],
  },
  LINKEDIN_ADS: {
    name: 'LinkedIn Ads',
    category: 'PAID_ADS',
    description: 'B2B sponsored content, lead gen forms, and InMail campaigns',
    iconBg: 'bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-400',
    iconChar: 'in',
    defaultScope: 'r_ads,r_ads_reporting',
    idLabel: 'Sponsored Account ID',
    idPlaceholder: 'e.g. 501234567',
    authPermissions: [
      'Read sponsored content and lead form metrics',
      'Access B2B campaign ROI analytics',
      'Auto-renew access via LinkedIn OAuth 2.0',
    ],
  },

  // --- Organic Social Media ---
  LINKEDIN_PAGE: {
    name: 'LinkedIn Company Page',
    category: 'SOCIAL_MEDIA',
    description: 'Company updates, organic post publishing, analytics, and follower growth',
    iconBg: 'bg-sky-100 dark:bg-sky-900/40 text-sky-800 dark:text-sky-300',
    iconChar: 'in',
    defaultScope: 'w_organization_social,r_organization_social',
    idLabel: 'Organization URN / Page ID',
    idPlaceholder: 'e.g. urn:li:organization:1234567',
    authPermissions: [
      'Read organic company page updates & impressions',
      'Sync engagement, comments, and follower metrics',
      'Offline renewal support',
    ],
  },
  X_TWITTER: {
    name: 'X (Twitter)',
    category: 'SOCIAL_MEDIA',
    description: 'Company tweets, thread publishing, timeline impressions, and engagement',
    iconBg: 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100',
    iconChar: '𝕏',
    defaultScope: 'tweet.read,tweet.write,users.read,offline.access',
    idLabel: 'Handle / User ID',
    idPlaceholder: 'e.g. @ZenaTechUSA',
    authPermissions: [
      'Read company timeline tweets and impressions',
      'Access profile statistics and engagement rates',
      'PKCE OAuth 2.0 secure session handling',
    ],
  },
  FACEBOOK_PAGE: {
    name: 'Facebook Page',
    category: 'SOCIAL_MEDIA',
    description: 'Official brand pages, feed posts, community updates, and page metrics',
    iconBg: 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300',
    iconChar: 'fb',
    defaultScope: 'pages_manage_posts,pages_read_engagement',
    idLabel: 'Page ID',
    idPlaceholder: 'e.g. 109283746501928',
    authPermissions: [
      'Read organic page feed posts & reach',
      'Aggregate reactions, comments, and shares',
    ],
  },
  INSTAGRAM: {
    name: 'Instagram Business',
    category: 'SOCIAL_MEDIA',
    description: 'Feed posts, reels publishing, story insights, and audience demographics',
    iconBg: 'bg-pink-50 dark:bg-pink-950/40 text-pink-600 dark:text-pink-400',
    iconChar: 'ig',
    defaultScope: 'instagram_basic,instagram_content_publish',
    idLabel: 'IG Business ID / Handle',
    idPlaceholder: 'e.g. @othership.work',
    authPermissions: [
      'Read business account media insights',
      'Sync audience growth and demographic telemetry',
    ],
  },
  YOUTUBE: {
    name: 'YouTube Channel',
    category: 'SOCIAL_MEDIA',
    description: 'Corporate video uploads, views, watch time, and subscriber telemetry',
    iconBg: 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400',
    iconChar: 'yt',
    defaultScope: 'https://www.googleapis.com/auth/youtube.readonly',
    idLabel: 'Channel ID',
    idPlaceholder: 'e.g. UC_x5XG1OV2P6uZZ5FSM9Ttw',
    authPermissions: [
      'Read channel watch time, views, and subscribers',
      'Discover official corporate brand channels',
    ],
  },
  TIKTOK: {
    name: 'TikTok Business',
    category: 'SOCIAL_MEDIA',
    description: 'Organic video publishing, sound insights, and engagement analytics',
    iconBg: 'bg-stone-100 dark:bg-stone-800 text-stone-900 dark:text-stone-100',
    iconChar: 'tt',
    defaultScope: 'user.info.basic,video.list',
    idLabel: 'Open ID / Username',
    idPlaceholder: 'e.g. @zenatech_official',
    authPermissions: [
      'Read video views and profile analytics',
      'Sync engagement telemetry across video catalog',
    ],
  },
};

const ALL_PROVIDERS: OAuthProvider[] = [
  'GOOGLE_ADS',
  'MICROSOFT_ADS',
  'META_ADS',
  'LINKEDIN_ADS',
  'LINKEDIN_PAGE',
  'X_TWITTER',
  'FACEBOOK_PAGE',
  'INSTAGRAM',
  'YOUTUBE',
  'TIKTOK',
];

export default function OAuthIntegrations() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const { hasPermission } = useAuth();
  // Super admins pass every permission check
  const canManage = hasPermission('CONFIG_ROLES_UPDATE');
  const canSyncAds = hasPermission('INITIATIVES_UPDATE');
  // Platforms with a campaign sync (Google Ads, Microsoft Ads) show their mode and last sync on their cards
  const canViewAdSync = hasPermission('INITIATIVES_VIEW');
  // ... and suggest syncing once they're connected
  const suggestAdSync = useSuggestAdSync(canSyncAds);

  // Back from the sign-in (OAuthCallbackPage adds ?connected=GOOGLE_ADS or MICROSOFT_ADS): suggest syncing once
  const connectedParam = searchParams.get('connected');
  useEffect(() => {
    if (!isAdSyncProvider(connectedParam)) return;
    const next = new URLSearchParams(searchParams);
    next.delete('connected');
    setSearchParams(next, { replace: true });
    suggestAdSync(connectedParam);
    // Runs once per return from the sign-in
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectedParam]);

  const [selectedOrgId, setSelectedOrgId] = useState<string>('');
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('ALL');

  // Sub-nav category: defaults to PAID_ADS if not specified or unrecognized
  const categoryParam = searchParams.get('category');
  const activeCategory: IntegrationCategory =
    categoryParam === 'SOCIAL_MEDIA' ? 'SOCIAL_MEDIA' : 'PAID_ADS';

  // Ensure category is reflected in the URL so sidebar sub-nav link highlights
  useEffect(() => {
    if (!categoryParam) {
      const next = new URLSearchParams(searchParams);
      next.set('category', 'PAID_ADS');
      setSearchParams(next, { replace: true });
    }
  }, [categoryParam, searchParams, setSearchParams]);

  // OAuth Connect Modal State
  const [isConnectOpen, setIsConnectOpen] = useState(false);
  const [connectProvider, setConnectProvider] = useState<OAuthProvider>(
    activeCategory === 'SOCIAL_MEDIA' ? 'LINKEDIN_PAGE' : 'GOOGLE_ADS'
  );
  const [connectScopeType, setConnectScopeType] = useState<'ORGANIZATION' | 'COMPANY'>('ORGANIZATION');
  const [connectCompanyId, setConnectCompanyId] = useState<string>('');
  const [resolvingProvider, setResolvingProvider] = useState<OAuthProvider | null>(null);
  const [isRedirecting, setIsRedirecting] = useState(false);

  // Queries
  const { data: organizations = [], isLoading: loadingOrgs } = useQuery({
    queryKey: ['oauth-organizations'],
    queryFn: () => oauthService.getOrganizations(),
  });

  const fallbackOrgId = organizations[0]?.id || '00000000-0000-0000-0000-000000000001';
  const activeOrgId = selectedOrgId || fallbackOrgId;

  const { data: companies = [] } = useQuery({
    queryKey: ['oauth-companies', activeOrgId],
    queryFn: () => oauthService.getCompanies(activeOrgId),
    enabled: !!activeOrgId,
  });

  const { data: connections = [], isLoading: loadingConnections } = useQuery({
    queryKey: ['oauth-connections', activeOrgId],
    queryFn: () => oauthService.getConnections({ organization_id: activeOrgId }),
    enabled: !!activeOrgId,
  });

  // 1. Instant / Test Connection Mutation (with fake/demo data)
  const connectMutation = useMutation({
    mutationFn: ({
      provider,
      orgId,
      companyId,
    }: {
      provider: OAuthProvider;
      orgId: string;
      companyId?: string | null;
    }) => {
      return oauthService.connectInstant(provider, {
        organization_id: orgId,
        company_id: companyId || null,
      });
    },
    onSuccess: (data, variables) => {
      const meta = PROVIDER_METADATA[variables.provider];
      toast.success(
        `Connected test account for ${meta.name} as ${data.connection.account_name} (${data.connection.provider_account_id})!`
      );
      queryClient.invalidateQueries({ queryKey: ['oauth-connections'] });
      setIsConnectOpen(false);
      if (isAdSyncProvider(variables.provider)) suggestAdSync(variables.provider);
    },
    onError: (err: any) => {
      toast.error('Test connection failed: ' + (err?.response?.data?.detail || err.message || 'Unknown error'));
    },
  });

  // 2. Real Live OAuth 2.0 Authorization Flow (redirect to provider consent screen)
  const handleLiveOAuth = async (provider: OAuthProvider) => {
    setIsRedirecting(true);
    try {
      const compId =
        connectScopeType === 'COMPANY' && connectCompanyId ? connectCompanyId : undefined;
      const redirectUri = `${window.location.origin}/oauth/callback`;

      const res = await oauthService.getAuthorizationUrl(provider, {
        organization_id: activeOrgId,
        company_id: compId,
        redirect_uri: redirectUri,
      });

      if (res?.authorization_url) {
        toast.info(`Redirecting to ${PROVIDER_METADATA[provider].name} sign-in screen...`);
        window.location.href = res.authorization_url;
      } else {
        toast.error('Failed to generate OAuth authorization URL');
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || err.message || 'OAuth authorization failed');
    } finally {
      setIsRedirecting(false);
    }
  };

  const handleTestConnect = (provider: OAuthProvider) => {
    connectMutation.mutate({
      provider,
      orgId: activeOrgId,
      companyId: connectScopeType === 'COMPANY' ? connectCompanyId : null,
    });
  };

  const handleCardTestConnect = (provider: OAuthProvider) => {
    const compId = selectedCompanyId !== 'ALL' ? selectedCompanyId : null;
    connectMutation.mutate({
      provider,
      orgId: activeOrgId,
      companyId: compId,
    });
  };

  const refreshMutation = useMutation({
    mutationFn: (id: string) => oauthService.refreshConnection(id),
    onSuccess: () => {
      toast.success('OAuth token refreshed successfully');
      queryClient.invalidateQueries({ queryKey: ['oauth-connections'] });
    },
    onError: (err: any) => {
      toast.error('Token refresh failed: ' + (err?.response?.data?.detail || err.message));
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: (id: string) => oauthService.disconnectConnection(id),
    onSuccess: () => {
      toast.success('Connection disconnected and credentials purged');
      queryClient.invalidateQueries({ queryKey: ['oauth-connections'] });
    },
    onError: (err: any) => {
      toast.error('Disconnect failed: ' + (err?.response?.data?.detail || err.message));
    },
  });

  const handleOpenConnect = (provider: OAuthProvider) => {
    setConnectProvider(provider);
    if (selectedCompanyId !== 'ALL') {
      setConnectScopeType('COMPANY');
      setConnectCompanyId(selectedCompanyId);
    } else {
      setConnectScopeType('ORGANIZATION');
      setConnectCompanyId(companies[0]?.id || '');
    }
    setIsConnectOpen(true);
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
          PROVIDER_METADATA[provider].name + ' resolved at ' + res.scope_level + ' level for ' + entityLabel + '!'
        );
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || err.message || 'No active connection found for ' + PROVIDER_METADATA[provider].name);
    } finally {
      setResolvingProvider(null);
    }
  };

  const providerConnections = useMemo(() => {
    const map: Record<string, { direct?: OAuthConnection; fallback?: OAuthConnection }> = {};
    ALL_PROVIDERS.forEach((p) => {
      map[p] = {};
    });

    connections.forEach((conn) => {
      if (conn.status === 'REVOKED') return;
      if (!map[conn.provider]) map[conn.provider] = {};
      if (selectedCompanyId !== 'ALL' && conn.company_id === selectedCompanyId) {
        map[conn.provider].direct = conn;
      }
      if (!conn.company_id) {
        map[conn.provider].fallback = conn;
      }
    });

    return map;
  }, [connections, selectedCompanyId]);

  // Filter strictly to current sub-nav category
  const filteredProviders = useMemo(() => {
    return ALL_PROVIDERS.filter((p) => PROVIDER_METADATA[p].category === activeCategory);
  }, [activeCategory]);

  const counts = useMemo(() => {
    let paidCount = 0;
    let socialCount = 0;
    ALL_PROVIDERS.forEach((p) => {
      const info = providerConnections[p];
      if (info && (info.direct || info.fallback)) {
        if (PROVIDER_METADATA[p].category === 'PAID_ADS') paidCount++;
        else socialCount++;
      }
    });
    return { paidCount, socialCount, total: paidCount + socialCount };
  }, [providerConnections]);

  const isPaidAds = activeCategory === 'PAID_ADS';

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/60 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              {isPaidAds ? (
                <>
                  <Megaphone className="w-6 h-6 text-primary" />
                  Paid Advertising OAuth Integrations
                </>
              ) : (
                <>
                  <Share2 className="w-6 h-6 text-primary" />
                  Organic Social Media OAuth Integrations
                </>
              )}
            </h1>
            <HelpIcon
              text={
                isPaidAds
                  ? 'Connect and manage OAuth 2.0 authorization for Google Ads, Microsoft Ads, Meta Ads, and LinkedIn Ads. Supports both live third-party OAuth 2.0 sign-in and simulated sandbox testing with fake data.'
                  : 'Connect and manage OAuth 2.0 authorization for LinkedIn Pages, X (Twitter), Facebook Pages, Instagram, YouTube, and TikTok Business.'
              }
            />
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {isPaidAds
              ? 'Multi-entity advertising account authorization. Connect with real OAuth 2.0 or test instantly with simulated sandbox data.'
              : 'Multi-entity organic social profile authorization. Connect with real OAuth 2.0 or test instantly with simulated sandbox data.'}
          </p>
        </div>

        {canManage && (
          <div className="flex items-center gap-3">
            <Button
              onClick={() => handleOpenConnect(isPaidAds ? 'GOOGLE_ADS' : 'LINKEDIN_PAGE')}
              className="gap-1.5 shadow-sm bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="w-4 h-4" />
              {isPaidAds ? 'Connect Ad Account' : 'Connect Social Channel'}
            </Button>
          </div>
        )}
      </div>

      {/* Sub-Nav Menu Switcher (matching sidebar sub-navigation) */}
      <div className="flex items-center justify-between border-b border-border/60 pb-3">
        <div className="flex items-center gap-2">
          <Link
            to="/configurations/integrations?category=PAID_ADS"
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs transition-all ${isPaidAds
              ? 'bg-primary text-primary-foreground shadow-xs font-semibold'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/70 font-medium'
              }`}
          >
            <Megaphone className="w-3.5 h-3.5" />
            <span>Paid Advertising</span>
            <span
              className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-semibold ${isPaidAds
                ? 'bg-primary-foreground/20 text-primary-foreground'
                : 'bg-muted text-muted-foreground'
                }`}
            >
              {counts.paidCount} / 4
            </span>
          </Link>

          <Link
            to="/configurations/integrations?category=SOCIAL_MEDIA"
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs transition-all ${!isPaidAds
              ? 'bg-primary text-primary-foreground shadow-xs font-semibold'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/70 font-medium'
              }`}
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Organic Social Media</span>
            <span
              className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-semibold ${!isPaidAds
                ? 'bg-primary-foreground/20 text-primary-foreground'
                : 'bg-muted text-muted-foreground'
                }`}
            >
              {counts.socialCount} / 6
            </span>
          </Link>
        </div>

        <span className="text-xs text-muted-foreground hidden md:inline">
          {filteredProviders.length} platforms available in this section
        </span>
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

              <div className="flex items-center gap-2 min-w-[240px]">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Entity Filter:
                </Label>
                <Select
                  value={selectedCompanyId}
                  onValueChange={setSelectedCompanyId}
                  disabled={loadingConnections}
                >
                  <SelectTrigger className="h-9 w-[220px]">
                    <SelectValue placeholder="Select Entity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">
                      🏢 Organization Master + All Subsidiaries
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

            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs gap-1 font-normal py-1 px-2.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                <span className="font-semibold text-foreground">
                  {isPaidAds ? counts.paidCount : counts.socialCount}
                </span>
                <span className="text-muted-foreground">active</span>
              </Badge>
              <Badge variant="outline" className="text-xs gap-1 font-normal py-1 px-2.5">
                <Lock className="w-3.5 h-3.5 text-primary" />
                <span>AES-256-GCM Encrypted</span>
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Provider Cards Grid */}
      <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,22rem),1fr))] gap-5">
        {filteredProviders.map((provider) => {
          const meta = PROVIDER_METADATA[provider];
          const info = providerConnections[provider];
          const directConn = info?.direct;
          const fallbackConn = info?.fallback;
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
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-base shadow-xs ${meta.iconBg}`}>
                      {meta.iconChar}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <CardTitle className="text-sm font-semibold">{meta.name}</CardTitle>
                        {isAdSyncProvider(provider) && <AdSyncModeBadge provider={provider} enabled={canViewAdSync} />}
                      </div>
                      <Badge
                        variant="outline"
                        className="text-[9px] mt-0.5 px-1.5 py-0 font-normal uppercase tracking-wider text-muted-foreground"
                      >
                        {meta.category === 'PAID_ADS' ? 'Paid Advertising' : 'Social Media'}
                      </Badge>
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
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {meta.description}
                </p>

                {activeConn ? (
                  <div className="p-3 rounded-md bg-muted/40 border border-border/50 space-y-2 text-xs">
                    <div className="flex items-center justify-between gap-3">
                      <span className="shrink-0 text-muted-foreground">Hierarchy Scope:</span>
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

                    <div className="flex items-center justify-between gap-3">
                      <span className="shrink-0 text-muted-foreground">Authorized Account:</span>
                      <span className="min-w-0 truncate text-right font-medium text-foreground" title={activeConn.account_name || undefined}>
                        {activeConn.account_name || 'Active Account'}
                      </span>
                    </div>

                    {activeConn.provider_account_id && (
                      <div className="flex items-center justify-between gap-3">
                        <span className="shrink-0 text-muted-foreground">{meta.idLabel}:</span>
                        <span className="min-w-0 truncate text-right font-mono text-foreground">
                          {activeConn.provider_account_id}
                        </span>
                      </div>
                    )}

                    {isAdSyncProvider(provider) && isConnected && canViewAdSync && (
                      <div className="flex items-center justify-between gap-3">
                        <span className="shrink-0 text-muted-foreground">Campaign Data:</span>
                        <AdPlatformLastSynced provider={provider} />
                      </div>
                    )}

                    <div className="flex items-center justify-between gap-3">
                      <span className="shrink-0 text-muted-foreground">Token Life:</span>
                      <span className="shrink-0 text-muted-foreground">
                        {activeConn.expires_at
                          ? 'Expires ' + new Date(activeConn.expires_at).toLocaleDateString()
                          : 'Auto-refreshing via OAuth 2.0'}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 rounded-md border border-dashed border-border/80 text-center text-xs text-muted-foreground bg-muted/10 space-y-1.5">
                    <p className="font-medium text-foreground/80">OAuth 2.0 Authorization Ready</p>
                    <p className="text-[11px]">Connect using live OAuth 2.0 or test instantly with simulated sandbox data.</p>
                  </div>
                )}
              </CardContent>

              <CardFooter className="pt-3 border-t border-border/40 bg-muted/10 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  {isAdSyncProvider(provider) && isConnected && canSyncAds && (
                    <SyncAdPlatformButton provider={provider} className="h-8 text-xs gap-1" label="Sync now" />
                  )}
                  {activeConn && canManage && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-xs gap-1 text-muted-foreground hover:text-foreground"
                      disabled={refreshMutation.isPending}
                      onClick={() => refreshMutation.mutate(activeConn.id)}
                      title="Renew the sign-in token for this connection"
                    >
                      <RefreshCw className={`w-3 h-3 ${refreshMutation.isPending ? 'animate-spin' : ''}`} />
                      Refresh token
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
                    {resolvingProvider === provider ? 'Checking...' : 'Resolve'}
                  </Button>
                </div>

                {canManage && (
                  <div className="ml-auto flex flex-wrap items-center justify-end gap-1.5">
                    {activeConn ? (
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs gap-1"
                          onClick={() => handleOpenConnect(provider)}
                          title="Switch account or re-authenticate"
                        >
                          <KeyRound className="w-3 h-3 text-muted-foreground" />
                          Reconnect
                        </Button>
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
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        {/* 1. Test Button with Fake Data */}
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs gap-1 text-primary border-primary/30 hover:bg-primary/10"
                          disabled={connectMutation.isPending}
                          onClick={() => handleCardTestConnect(provider)}
                          title="Connect simulated sandbox account with fake data"
                        >
                          <FlaskConical className="w-3.5 h-3.5 text-primary" />
                          Test (Fake Data)
                        </Button>

                        {/* 2. Live OAuth 2.0 Connect Button */}
                        <Button
                          size="sm"
                          className="h-8 text-xs gap-1 bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs"
                          onClick={() => handleOpenConnect(provider)}
                          title="Authorize real live account via OAuth 2.0"
                        >
                          <Globe className="w-3.5 h-3.5" />
                          Live OAuth
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </CardFooter>
            </Card>
          );
        })}
      </div>

      {/* OAuth 2.0 Connect Dialog: Dual Options (Fake Data vs Live OAuth 2.0) */}
      <Dialog open={isConnectOpen} onOpenChange={setIsConnectOpen}>
        <DialogContent className="sm:max-w-[540px]">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-base shadow-xs ${PROVIDER_METADATA[connectProvider]?.iconBg || 'bg-primary/10 text-primary'
                  }`}
              >
                {PROVIDER_METADATA[connectProvider]?.iconChar || '•'}
              </div>
              <div>
                <DialogTitle className="text-base font-semibold">
                  Connect {PROVIDER_METADATA[connectProvider]?.name}
                </DialogTitle>
                <DialogDescription className="text-xs mt-0.5">
                  Choose between simulated testing with demo data or live OAuth 2.0 sign-in.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Entity Target Selection */}
            <div className="p-3.5 rounded-xl border border-border/70 bg-muted/30 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-foreground">
                  Connect for which business entity?
                </Label>
                <Badge variant="secondary" className="text-[10px]">
                  Hierarchy Assignment
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={connectScopeType === 'ORGANIZATION' ? 'default' : 'outline'}
                  size="sm"
                  className="h-9 text-xs justify-start px-3"
                  onClick={() => setConnectScopeType('ORGANIZATION')}
                >
                  <Building2 className="w-3.5 h-3.5 mr-1.5" />
                  Org Master (ZenaTech)
                </Button>

                <Button
                  type="button"
                  variant={connectScopeType === 'COMPANY' ? 'default' : 'outline'}
                  size="sm"
                  className="h-9 text-xs justify-start px-3"
                  onClick={() => {
                    setConnectScopeType('COMPANY');
                    if (!connectCompanyId && companies.length > 0) {
                      setConnectCompanyId(companies[0].id);
                    }
                  }}
                >
                  <ArrowRight className="w-3.5 h-3.5 mr-1.5" />
                  Subsidiary Company
                </Button>
              </div>

              {connectScopeType === 'COMPANY' && (
                <div className="space-y-1.5 pt-1">
                  <Label className="text-[11px] text-muted-foreground">Select Subsidiary Entity:</Label>
                  <Select value={connectCompanyId} onValueChange={setConnectCompanyId}>
                    <SelectTrigger className="h-9 text-xs">
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
            </div>

            {/* Requested Permissions */}
            <div className="p-3 rounded-lg border border-border/70 bg-card space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Requested Permissions:</span>
              </div>
              <ul className="space-y-1 text-xs text-muted-foreground pl-1">
                {PROVIDER_METADATA[connectProvider]?.authPermissions.map((perm, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                    <span>{perm}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* The 2 Connection Options */}
            <div className="space-y-3 pt-1">
              {/* Option 1: Test Button with Fake Data */}
              <div className="p-3.5 rounded-xl border border-dashed border-primary/40 bg-primary/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <FlaskConical className="w-4 h-4 text-primary" />
                    <span className="text-xs font-semibold text-foreground">
                      Option 1: Test with Fake Data (Sandbox)
                    </span>
                    <Badge variant="outline" className="text-[9px] bg-background">Demo Mode</Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Connects simulated accounts instantly with mock tokens. Perfect for UI & workflow testing without developer keys.
                  </p>
                </div>

                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={connectMutation.isPending || isRedirecting}
                  onClick={() => handleTestConnect(connectProvider)}
                  className="w-full sm:w-auto text-xs shrink-0 border-primary/40 text-primary hover:bg-primary/10 gap-1.5"
                >
                  {connectMutation.isPending ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Testing...
                    </>
                  ) : (
                    <>
                      <FlaskConical className="w-3.5 h-3.5" />
                      Test (Fake Data)
                    </>
                  )}
                </Button>
              </div>

              {/* Option 2: Actual OAuth 2.0 Sign-In */}
              <div className="p-3.5 rounded-xl border border-border bg-card shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <Globe className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-xs font-semibold text-foreground">
                      Option 2: Live OAuth 2.0 Sign In (Real)
                    </span>
                    <Badge variant="outline" className="text-[9px] bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-300">
                      Live Connect
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Redirects directly to {PROVIDER_METADATA[connectProvider]?.name} sign-in screen to authenticate your real advertising account.
                  </p>
                </div>

                <Button
                  type="button"
                  size="sm"
                  disabled={isRedirecting || connectMutation.isPending}
                  onClick={() => handleLiveOAuth(connectProvider)}
                  className="w-full sm:w-auto text-xs shrink-0 bg-primary text-primary-foreground hover:bg-primary/90 gap-1.5"
                >
                  {isRedirecting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Redirecting...
                    </>
                  ) : (
                    <>
                      <ExternalLink className="w-3.5 h-3.5" />
                      Live OAuth 2.0 ↗
                    </>
                  )}
                </Button>
              </div>
            </div>

            <DialogFooter className="pt-2 flex justify-end">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsConnectOpen(false)}
                className="text-xs"
              >
                Cancel
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
