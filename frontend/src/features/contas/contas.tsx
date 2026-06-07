import { EntityManager } from "@/components/entity-manager";
import { useContaMutations, useContas } from "@/hooks/useContas";
import { CONTA_TIPO_LABEL } from "@/lib/constants";
import { CONTA_TYPES, type ContaType } from "@/types/api";

const TYPE_OPTIONS = CONTA_TYPES.map((value) => ({
  value,
  label: CONTA_TIPO_LABEL[value],
}));

/**
 * Tela de Contas (F3): grid de cards coloridos por tipo (Banco · Investimento ·
 * Carteira) com CRUD real contra a API. Lógica de UI no EntityManager.
 */
export function Contas() {
  const { data, isLoading, isError, refetch } = useContas();
  const { create, update, remove } = useContaMutations();

  return (
    <EntityManager<ContaType>
      kind="conta"
      typeOptions={TYPE_OPTIONS}
      typeLabel={CONTA_TIPO_LABEL}
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
