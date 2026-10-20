import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Building2,
  ShieldCheck,
  Search,
  Plus,
  Edit2,
  Trash2,
  RefreshCw,
  Coins,
  CheckCircle2,
  XCircle,
  Tag,
  ArrowUpDown,
  Building,
} from "lucide-react";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import type { ColumnDef, SortingState } from "@tanstack/react-table";

import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { oauthService, type Company, type CompanyCreate, type Organization } from "@/services/oauthService";
import { apiClient } from "@/services/apiClient";
import { toast } from "sonner";
import { useAuth } from "@/lib/AuthContext";

const CURRENCIES = ["USD", "CAD", "EUR", "GBP", "AUD", "CHF", "JPY"];

export default function Entities() {
  const { hasPermission } = useAuth();
  const queryClient = useQueryClient();

  const canManage = hasPermission("CONFIG_ROLES") || hasPermission("CONFIG_ROLES_UPDATE");

  // Filters & State
  const [search, setSearch] = useState("");
  const [selectedOrgFilter, setSelectedOrgFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [sorting, setSorting] = useState<SortingState>([{ id: "name", desc: false }]);

  // Dialog States
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState<Company | null>(null);

  // Form State
  const [formData, setFormData] = useState<{
    organization_id: string;
    name: string;
    code: string;
    currency: string;
    brand_id: number | null;
    is_active: boolean;
  }>({
    organization_id: "",
    name: "",
    code: "",
    currency: "USD",
    brand_id: null,
    is_active: true,
  });

  // Queries
  const { data: organizations = [],  } = useQuery<Organization[]>({
    queryKey: ["oauth-organizations"],
    queryFn: () => oauthService.getOrganizations(),
  });

  const { data: companies = [], isLoading: loadingCompanies, refetch, isFetching } = useQuery<Company[]>({
    queryKey: ["oauth-companies"],
    queryFn: () => oauthService.getCompanies(),
  });

  const { data: refData } = useQuery<{ brands?: Array<{ id: number; name: string; code: string }> }>({
    queryKey: ["reference-data"],
    queryFn: () => apiClient.get("/api/initiatives/reference-data"),
    staleTime: 5 * 60 * 1000,
  });
  const brands = refData?.brands || [];

  // Mutations
  const createMutation = useMutation({
    mutationFn: (payload: CompanyCreate) => oauthService.createCompany(payload),
    onSuccess: (newComp) => {
      queryClient.invalidateQueries({ queryKey: ["oauth-companies"] });
      toast.success(`Entity "${newComp.name}" (${newComp.code}) created successfully`);
      setCreateDialogOpen(false);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || err?.message || "Failed to create entity");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<CompanyCreate> }) =>
      oauthService.updateCompany(id, payload),
    onSuccess: (updatedComp) => {
      queryClient.invalidateQueries({ queryKey: ["oauth-companies"] });
      toast.success(`Entity "${updatedComp.name}" updated successfully`);
      setEditDialogOpen(false);
      setSelectedEntity(null);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || err?.message || "Failed to update entity");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => oauthService.deleteCompany(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["oauth-companies"] });
      toast.success("Entity deleted successfully");
      setDeleteDialogOpen(false);
      setSelectedEntity(null);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || err?.message || "Failed to delete entity");
    },
  });

  // Dialog Handlers
  const handleOpenCreate = () => {
    const defaultOrgId = organizations[0]?.id || "";
    setFormData({
      organization_id: defaultOrgId,
      name: "",
      code: "",
      currency: "USD",
      brand_id: null,
      is_active: true,
    });
    setCreateDialogOpen(true);
  };

  const handleOpenEdit = (entity: Company) => {
    setSelectedEntity(entity);
    setFormData({
      organization_id: entity.organization_id,
      name: entity.name,
      code: entity.code,
      currency: entity.currency || "USD",
      brand_id: entity.brand_id ?? null,
      is_active: entity.is_active,
    });
    setEditDialogOpen(true);
  };

  const handleOpenDelete = (entity: Company) => {
    setSelectedEntity(entity);
    setDeleteDialogOpen(true);
  };

  const handleToggleActive = (entity: Company) => {
    updateMutation.mutate({
      id: entity.id,
      payload: { is_active: !entity.is_active },
    });
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error("Entity name is required");
      return;
    }
    if (!formData.code.trim()) {
      toast.error("Entity code is required");
      return;
    }
    if (!formData.organization_id) {
      toast.error("Organization is required");
      return;
    }

    createMutation.mutate({
      organization_id: formData.organization_id,
      name: formData.name.trim(),
      code: formData.code.trim().toUpperCase(),
      currency: formData.currency,
      brand_id: formData.brand_id,
      is_active: formData.is_active,
    });
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEntity) return;
    if (!formData.name.trim()) {
      toast.error("Entity name is required");
      return;
    }
    if (!formData.code.trim()) {
      toast.error("Entity code is required");
      return;
    }

    updateMutation.mutate({
      id: selectedEntity.id,
      payload: {
        organization_id: formData.organization_id,
        name: formData.name.trim(),
        code: formData.code.trim().toUpperCase(),
        currency: formData.currency,
        brand_id: formData.brand_id,
        is_active: formData.is_active,
      },
    });
  };

  // Filtered dataset
  const filteredEntities = useMemo(() => {
    return companies.filter((c) => {
      const matchSearch =
        search === "" ||
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.code.toLowerCase().includes(search.toLowerCase()) ||
        (c.organization_name && c.organization_name.toLowerCase().includes(search.toLowerCase()));

      const matchOrg = selectedOrgFilter === "ALL" || c.organization_id === selectedOrgFilter;

      const matchStatus =
        statusFilter === "ALL" ||
        (statusFilter === "ACTIVE" && c.is_active) ||
        (statusFilter === "INACTIVE" && !c.is_active);

      return matchSearch && matchOrg && matchStatus;
    });
  }, [companies, search, selectedOrgFilter, statusFilter]);

  // Summary Metrics
  const metrics = useMemo(() => {
    const total = companies.length;
    const active = companies.filter((c) => c.is_active).length;
    const inactive = total - active;
    const orgCount = new Set(companies.map((c) => c.organization_id)).size;
    return { total, active, inactive, orgCount };
  }, [companies]);

  // Table Columns
  const columns = useMemo<ColumnDef<Company>[]>(
    () => [
      {
        accessorKey: "name",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="p-0 hover:bg-transparent font-semibold text-xs tracking-wider uppercase text-muted-foreground"
          >
            Entity / Subsidiary
            <ArrowUpDown className="ml-2 h-3.5 w-3.5" />
          </Button>
        ),
        cell: ({ row }) => {
          const comp = row.original;
          return (
            <div className="flex items-center gap-3 py-1">
              <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0 border border-primary/20">
                {comp.code ? comp.code.slice(0, 2).toUpperCase() : "EN"}
              </div>
              <div className="flex flex-col">
                <span className="font-semibold text-foreground text-sm">{comp.name}</span>
                <span className="font-mono text-xs text-muted-foreground">{comp.code}</span>
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "organization_name",
        header: () => (
          <span className="font-semibold text-xs tracking-wider uppercase text-muted-foreground">
            Organization
          </span>
        ),
        cell: ({ row }) => {
          const orgName = row.original.organization_name || "ZenaTech Group";
          return (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Building className="w-3.5 h-3.5 text-muted-foreground/70" />
              <span>{orgName}</span>
            </div>
          );
        },
      },
      {
        accessorKey: "currency",
        header: () => (
          <span className="font-semibold text-xs tracking-wider uppercase text-muted-foreground">
            Currency
          </span>
        ),
        cell: ({ row }) => (
          <Badge variant="outline" className="font-mono text-xs gap-1 py-0.5 px-2">
            <Coins className="w-3 h-3 text-muted-foreground" />
            {row.original.currency || "USD"}
          </Badge>
        ),
      },
      {
        accessorKey: "brand_name",
        header: () => (
          <span className="font-semibold text-xs tracking-wider uppercase text-muted-foreground">
            Brand Binding
          </span>
        ),
        cell: ({ row }) => {
          const brandName = row.original.brand_name;
          return brandName ? (
            <Badge variant="secondary" className="text-xs font-normal gap-1">
              <Tag className="w-3 h-3 text-primary" />
              {brandName}
            </Badge>
          ) : (
            <span className="text-xs text-muted-foreground italic">None</span>
          );
        },
      },
      {
        accessorKey: "is_active",
        header: () => (
          <span className="font-semibold text-xs tracking-wider uppercase text-muted-foreground">
            Status
          </span>
        ),
        cell: ({ row }) => {
          const active = row.original.is_active;
          return (
            <Badge
              variant={active ? "default" : "secondary"}
              className={`text-xs gap-1 font-medium ${
                active
                  ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20"
                  : "bg-muted text-muted-foreground border-border"
              }`}
            >
              {active ? (
                <>
                  <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                  Active
                </>
              ) : (
                <>
                  <XCircle className="w-3 h-3 text-muted-foreground" />
                  Inactive
                </>
              )}
            </Badge>
          );
        },
      },
      {
        id: "actions",
        header: () => (
          <span className="font-semibold text-xs tracking-wider uppercase text-muted-foreground text-right block">
            Actions
          </span>
        ),
        cell: ({ row }) => {
          const comp = row.original;
          return (
            <div className="flex items-center justify-end gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleToggleActive(comp)}
                className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
                title={comp.is_active ? "Deactivate Entity" : "Activate Entity"}
              >
                {comp.is_active ? "Deactivate" : "Activate"}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleOpenEdit(comp)}
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                title="Edit Entity"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleOpenDelete(comp)}
                className="h-8 w-8 text-destructive/80 hover:text-destructive hover:bg-destructive/10"
                title="Delete Entity"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          );
        },
      },
    ],
    []
  );

  const table = useReactTable({
    data: filteredEntities,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: { pageSize: 10 },
    },
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider mb-1">
            <ShieldCheck className="w-3.5 h-3.5 text-primary" />
            <span>System & Security</span>
            <span>/</span>
            <span className="text-foreground font-medium">Entities</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Building2 className="w-6 h-6 text-primary" />
            Entities & Subsidiaries
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage legal entities, subsidiaries, operating companies, and currency mappings across the portal.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="h-9 gap-1.5 text-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </Button>

          <Button
            onClick={handleOpenCreate}
            size="sm"
            className="h-9 gap-1.5 text-xs shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>New Entity</span>
          </Button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="shadow-xs border-border/70">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Total Entities
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold text-foreground">{metrics.total}</div>
            <p className="text-[11px] text-muted-foreground mt-0.5">Registered operating units</p>
          </CardContent>
        </Card>

        <Card className="shadow-xs border-border/70">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Active Subsidiaries
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {metrics.active}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">Live across campaigns & OAuth</p>
          </CardContent>
        </Card>

        <Card className="shadow-xs border-border/70">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Inactive / Archived
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold text-muted-foreground">{metrics.inactive}</div>
            <p className="text-[11px] text-muted-foreground mt-0.5">Deactivated subsidiaries</p>
          </CardContent>
        </Card>

        <Card className="shadow-xs border-border/70">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Parent Orgs
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold text-primary">{metrics.orgCount}</div>
            <p className="text-[11px] text-muted-foreground mt-0.5">Organizational groups</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Table Card */}
      <Card className="shadow-xs border-border">
        <CardHeader className="pb-3 border-b border-border/60">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, code..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
            </div>

            {/* Filter Dropdowns */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Org Filter */}
              <Select value={selectedOrgFilter} onValueChange={setSelectedOrgFilter}>
                <SelectTrigger className="h-9 w-[180px] text-xs">
                  <SelectValue placeholder="All Organizations" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Organizations</SelectItem>
                  {organizations.map((org) => (
                    <SelectItem key={org.id} value={org.id}>
                      {org.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Status Filter */}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-9 w-[130px] text-xs">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Status</SelectItem>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="INACTIVE">Inactive</SelectItem>
                </SelectContent>
              </Select>

              <div className="text-xs text-muted-foreground font-medium pl-1">
                {filteredEntities.length} {filteredEntities.length === 1 ? "entity" : "entities"}
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loadingCompanies ? (
            <div className="p-6 space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : filteredEntities.length === 0 ? (
            <div className="p-12 text-center">
              <Building2 className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-foreground">No entities found</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                {search || selectedOrgFilter !== "ALL" || statusFilter !== "ALL"
                  ? "Try adjusting your filters or search keyword."
                  : "Get started by registering your first subsidiary or operating entity."}
              </p>
              {canManage && (
                <Button onClick={handleOpenCreate} size="sm" className="mt-4 text-xs">
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Create Entity
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id} className="hover:bg-transparent bg-muted/40">
                      {headerGroup.headers.map((header) => (
                        <TableHead key={header.id} className="py-2.5 px-4">
                          {header.isPlaceholder
                            ? null
                            : flexRender(header.column.columnDef.header, header.getContext())}
                        </TableHead>
                      ))}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody>
                  {table.getRowModel().rows.map((row) => (
                    <TableRow
                      key={row.id}
                      className="border-b border-border/60 hover:bg-muted/30 transition-colors"
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id} className="py-2.5 px-4 text-xs">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {filteredEntities.length > 0 && (
            <div className="p-3 border-t border-border">
              <DataTablePagination table={table} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* CREATE DIALOG */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <form onSubmit={handleCreateSubmit}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-primary" />
                <span>Create New Entity</span>
              </DialogTitle>
              <DialogDescription className="text-xs">
                Add a new subsidiary or legal entity to ZenaTech Group.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4 text-xs">
              <div className="space-y-1.5">
                <Label htmlFor="create-org" className="text-xs font-medium">
                  Parent Organization <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.organization_id}
                  onValueChange={(val) => setFormData((prev) => ({ ...prev, organization_id: val }))}
                >
                  <SelectTrigger id="create-org" className="h-9 text-xs">
                    <SelectValue placeholder="Select Organization" />
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

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="create-name" className="text-xs font-medium">
                    Entity Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="create-name"
                    placeholder="e.g. DeskFlex"
                    value={formData.name}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFormData((prev) => ({
                        ...prev,
                        name: val,
                        code: prev.code === "" ? val.replace(/[^a-zA-Z0-9]/g, "").toUpperCase() : prev.code,
                      }));
                    }}
                    className="h-9 text-xs"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="create-code" className="text-xs font-medium">
                    Entity Code <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="create-code"
                    placeholder="e.g. DESKFLEX"
                    value={formData.code}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        code: e.target.value.toUpperCase().replace(/\s+/g, "_"),
                      }))
                    }
                    className="h-9 text-xs font-mono"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="create-curr" className="text-xs font-medium">
                    Functional Currency
                  </Label>
                  <Select
                    value={formData.currency}
                    onValueChange={(val) => setFormData((prev) => ({ ...prev, currency: val }))}
                  >
                    <SelectTrigger id="create-curr" className="h-9 text-xs">
                      <SelectValue placeholder="Currency" />
                    </SelectTrigger>
                    <SelectContent>
                      {CURRENCIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="create-brand" className="text-xs font-medium">
                    Marketing Brand Link
                  </Label>
                  <Select
                    value={formData.brand_id ? String(formData.brand_id) : "NONE"}
                    onValueChange={(val) =>
                      setFormData((prev) => ({
                        ...prev,
                        brand_id: val === "NONE" ? null : Number(val),
                      }))
                    }
                  >
                    <SelectTrigger id="create-brand" className="h-9 text-xs">
                      <SelectValue placeholder="No Brand Linked" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NONE">No Brand Linked</SelectItem>
                      {brands.map((b) => (
                        <SelectItem key={b.id} value={String(b.id)}>
                          {b.name} ({b.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <Checkbox
                  id="create-active"
                  checked={formData.is_active}
                  onCheckedChange={(val) => setFormData((prev) => ({ ...prev, is_active: !!val }))}
                />
                <Label htmlFor="create-active" className="text-xs cursor-pointer select-none">
                  Active (Entity will be available for campaigns and integrations)
                </Label>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCreateDialogOpen(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={createMutation.isPending}
                className="text-xs"
              >
                {createMutation.isPending ? "Creating..." : "Create Entity"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* EDIT DIALOG */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <form onSubmit={handleEditSubmit}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-primary" />
                <span>Edit Entity: {selectedEntity?.name}</span>
              </DialogTitle>
              <DialogDescription className="text-xs">
                Update subsidiary details, currency, and brand associations.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4 text-xs">
              <div className="space-y-1.5">
                <Label htmlFor="edit-org" className="text-xs font-medium">
                  Parent Organization <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.organization_id}
                  onValueChange={(val) => setFormData((prev) => ({ ...prev, organization_id: val }))}
                >
                  <SelectTrigger id="edit-org" className="h-9 text-xs">
                    <SelectValue placeholder="Select Organization" />
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

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="edit-name" className="text-xs font-medium">
                    Entity Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="edit-name"
                    value={formData.name}
                    onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                    className="h-9 text-xs"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="edit-code" className="text-xs font-medium">
                    Entity Code <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="edit-code"
                    value={formData.code}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        code: e.target.value.toUpperCase().replace(/\s+/g, "_"),
                      }))
                    }
                    className="h-9 text-xs font-mono"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="edit-curr" className="text-xs font-medium">
                    Functional Currency
                  </Label>
                  <Select
                    value={formData.currency}
                    onValueChange={(val) => setFormData((prev) => ({ ...prev, currency: val }))}
                  >
                    <SelectTrigger id="edit-curr" className="h-9 text-xs">
                      <SelectValue placeholder="Currency" />
                    </SelectTrigger>
                    <SelectContent>
                      {CURRENCIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="edit-brand" className="text-xs font-medium">
                    Marketing Brand Link
                  </Label>
                  <Select
                    value={formData.brand_id ? String(formData.brand_id) : "NONE"}
                    onValueChange={(val) =>
                      setFormData((prev) => ({
                        ...prev,
                        brand_id: val === "NONE" ? null : Number(val),
                      }))
                    }
                  >
                    <SelectTrigger id="edit-brand" className="h-9 text-xs">
                      <SelectValue placeholder="No Brand Linked" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NONE">No Brand Linked</SelectItem>
                      {brands.map((b) => (
                        <SelectItem key={b.id} value={String(b.id)}>
                          {b.name} ({b.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <Checkbox
                  id="edit-active"
                  checked={formData.is_active}
                  onCheckedChange={(val) => setFormData((prev) => ({ ...prev, is_active: !!val }))}
                />
                <Label htmlFor="edit-active" className="text-xs cursor-pointer select-none">
                  Active (Entity will be available for campaigns and integrations)
                </Label>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setEditDialogOpen(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={updateMutation.isPending}
                className="text-xs"
              >
                {updateMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DELETE CONFIRMATION ALERT DIALOG */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="w-5 h-5" />
              <span>Delete Entity</span>
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              Are you sure you want to delete{" "}
              <strong className="text-foreground">{selectedEntity?.name} ({selectedEntity?.code})</strong>?
              This will remove the entity mapping. If campaigns or OAuth connections are linked to it, consider deactivating it instead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel size="sm" className="text-xs">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              size="sm"
              onClick={() => selectedEntity && deleteMutation.mutate(selectedEntity.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 text-xs"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete Entity"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
