import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { type Ward, type SimulationResult, type CitizenPlanResponse, type CitizenPlanRequest, type SimulationRequest } from "@shared/schema";

// Helper for type-safe fetch with schema validation
async function fetchAndValidate<T>(url: string, schema: any): Promise<T> {
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) throw new Error(`Fetch failed: ${res.statusText}`);
  const data = await res.json();
  return schema.parse(data);
}

// GET /api/wards
export function useWards() {
  return useQuery({
    queryKey: [api.wards.list.path],
    queryFn: async () => {
      const res = await fetch(api.wards.list.path, { credentials: "include" });
      if (!res.ok) throw new Error(`Fetch failed: ${res.statusText}`);
      return await res.json() as { wards: Ward[], lastUpdated: string };
    },
    refetchInterval: 3000, // Poll every 3 seconds as requested
  });
}

// GET /api/wards/:id
export function useWard(id: number) {
  return useQuery({
    queryKey: [api.wards.get.path, id],
    queryFn: () => {
      const url = buildUrl(api.wards.get.path, { id });
      return fetchAndValidate<Ward>(url, api.wards.get.responses[200]);
    },
    enabled: !!id,
    refetchInterval: 10000, // Faster poll for active ward
  });
}

// POST /api/wards/:id/controls
export function useUpdateControls() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, controls }: { id: number; controls: string[] }) => {
      const url = buildUrl(api.wards.updateControls.path, { id });
      const res = await fetch(url, {
        method: api.wards.updateControls.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ controls }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to update controls");
      return api.wards.updateControls.responses[200].parse(await res.json());
    },
    onSuccess: (data) => {
      queryClient.setQueryData([api.wards.get.path, data.id], data);
      queryClient.invalidateQueries({ queryKey: [api.wards.list.path] });
    },
  });
}

// POST /api/wards/:id/emergency
export function useToggleEmergency() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, enabled }: { id: number; enabled: boolean }) => {
      const url = buildUrl(api.wards.toggleEmergency.path, { id });
      const res = await fetch(url, {
        method: api.wards.toggleEmergency.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to toggle emergency mode");
      return api.wards.toggleEmergency.responses[200].parse(await res.json());
    },
    onSuccess: (data) => {
      queryClient.setQueryData([api.wards.get.path, data.id], data);
      queryClient.invalidateQueries({ queryKey: [api.wards.list.path] });
    },
  });
}

// POST /api/wards/:id/simulate-policy
export function useSimulatePolicy() {
  return useMutation({
    mutationFn: async ({ id, params }: { id: number; params: any }) => {
      const res = await fetch(`/api/wards/${id}/simulate-policy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dustReduction: params.dustSuppression,
          trafficReduction: params.trafficReduction,
          constructionControl: params.constructionHalt ? 100 : 0
        }),
      });
      if (!res.ok) throw new Error("Simulation failed");
      return await res.json() as SimulationResult;
    },
  });
}

// POST /api/wards/:id/safe-plan
export function useGeneratePlan() {
  return useMutation({
    mutationFn: async ({ id, params }: { id: number; params: CitizenPlanRequest }) => {
      const url = buildUrl(api.wards.generatePlan.path, { id });
      const res = await fetch(url, {
        method: api.wards.generatePlan.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to generate plan");
      return api.wards.generatePlan.responses[200].parse(await res.json());
    },
  });
}

// POST /api/wards/:id/credits
export function useAddCredit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, action }: { id: number; action: string }) => {
      const url = buildUrl(api.wards.addCredit.path, { id });
      const res = await fetch(url, {
        method: api.wards.addCredit.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to add credit");
      return api.wards.addCredit.responses[200].parse(await res.json());
    },
    onSuccess: (data) => {
      queryClient.setQueryData([api.wards.get.path, data.id], data);
      queryClient.invalidateQueries({ queryKey: [api.wards.list.path] });
    },
  });
}

// GET /api/wards/:id/reports
export function useReports(wardId: number) {
  return useQuery({
    queryKey: ["reports", wardId],
    queryFn: async () => {
      const res = await fetch(`/api/wards/${wardId}/reports`);
      if (!res.ok) throw new Error("Failed to fetch reports");
      return await res.json() as any[];
    },
    enabled: !!wardId,
  });
}

// GET /api/wards/:id/intelligence
export function useWardIntelligence(id: number) {
  return useQuery({
    queryKey: ["intelligence", id],
    queryFn: async () => {
      const res = await fetch(`/api/wards/${id}/intelligence`);
      if (!res.ok) throw new Error("Failed to fetch intelligence");
      return await res.json();
    },
    enabled: !!id,
    refetchInterval: 3000, // Match ward polling for dynamic updates
  });
}

// POST /api/reports
export function useSubmitReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to submit report");
      return await res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["reports", variables.wardId] });
    },
  });
}

// POST /api/reports/:id/verify
export function useVerifyReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (reportId: number) => {
      const res = await fetch(`/api/reports/${reportId}/verify`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to verify report");
      return await res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["reports", data.wardId] });
    },
  });
}
