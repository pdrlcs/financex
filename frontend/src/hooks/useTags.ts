import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { api } from "@/lib/api";
import type { TagCreate, TagOut, TagUpdate } from "@/types/api";

/**
 * Tags — queries + mutations (PORT_FRONTEND.md §4.3). Uma única query traz todas
 * as tags ativas; a tela agrupa por `type` para as abas. Toda mutação invalida
 * `["tags"]` e também `["graphs"]` (cor/nome de tag muda os gráficos).
 */

export const tagsKey = ["tags"] as const;

export function useTags() {
  return useQuery({
    queryKey: tagsKey,
    queryFn: ({ signal }) => api.get<TagOut[]>("/tags/", undefined, signal),
  });
}

export function useTagMutations() {
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: tagsKey });
    qc.invalidateQueries({ queryKey: ["graphs"] });
  };

  const create = useMutation({
    mutationFn: (payload: TagCreate) => api.post<TagOut>("/tags/", payload),
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: TagUpdate }) =>
      api.put<TagOut>(`/tags/${id}`, payload),
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: (id: number) => api.delete<void>(`/tags/${id}`),
    onSuccess: invalidate,
  });

  return { create, update, remove };
}
