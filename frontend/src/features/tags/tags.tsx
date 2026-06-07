import { EntityManager } from "@/components/entity-manager";
import { useTagMutations, useTags } from "@/hooks/useTags";
import { TAG_TIPO_INFO } from "@/lib/constants";
import { TAG_TYPES, type TagType } from "@/types/api";

const TYPE_OPTIONS = TAG_TYPES.map((value) => ({
  value,
  label: TAG_TIPO_INFO[value].label,
}));

const TYPE_LABEL = Object.fromEntries(
  TAG_TYPES.map((t) => [t, TAG_TIPO_INFO[t].label]),
) as Record<TagType, string>;

/**
 * Tela de Tags (F3): grid de cards coloridos por tipo (Despesa · Receita ·
 * Investimento) com CRUD real contra a API. Lógica de UI no EntityManager.
 */
export function Tags() {
  const { data, isLoading, isError, refetch } = useTags();
  const { create, update, remove } = useTagMutations();

  return (
    <EntityManager<TagType>
      kind="tag"
      typeOptions={TYPE_OPTIONS}
      typeLabel={TYPE_LABEL}
      items={data}
      isLoading={isLoading}
      isError={isError}
      onRetry={() => refetch()}
      onCreate={(values) => create.mutateAsync(values)}
      onUpdate={(id, values) => update.mutateAsync({ id, payload: values })}
      onDelete={(id) => remove.mutateAsync(id)}
      submitting={create.isPending || update.isPending}
      deleting={remove.isPending}
    />
  );
}
