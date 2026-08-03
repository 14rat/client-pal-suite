import { supabase } from "@/integrations/supabase/client";

export type Cliente = {
  id: string;
  nome: string;
  cpf_cnpj: string;
  email: string | null;
  telefone: string | null;
  endereco: string | null;
  usuario_id: string;
  created_at: string;
};

export type ClienteInput = {
  nome: string;
  cpf_cnpj: string;
  email: string;
  telefone: string;
  endereco: string;
};

export async function listarClientes(): Promise<Cliente[]> {
  const { data, error } = await supabase
    .from("clientes")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Cliente[];
}

export async function criarCliente(input: ClienteInput, usuarioId: string) {
  const { error } = await supabase.from("clientes").insert({
    ...normalizar(input),
    usuario_id: usuarioId,
  });
  if (error) throw error;
}

export async function atualizarCliente(id: string, input: ClienteInput) {
  const { error } = await supabase.from("clientes").update(normalizar(input)).eq("id", id);
  if (error) throw error;
}

export async function removerCliente(id: string) {
  const { error } = await supabase.from("clientes").delete().eq("id", id);
  if (error) throw error;
}

export async function buscarPerfilAtual() {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return null;

  const [{ data: profile }, { data: roles }] = await Promise.all([
    supabase.from("profiles").select("id, nome, email").eq("id", userId).maybeSingle(),
    supabase.from("user_roles").select("role").eq("user_id", userId),
  ]);

  const perfil = roles?.some((r) => r.role === "admin") ? "admin" : "comum";
  return {
    id: userId,
    nome: profile?.nome || userData.user?.email || "",
    email: profile?.email || userData.user?.email || "",
    perfil: perfil as "admin" | "comum",
  };
}

function normalizar(input: ClienteInput) {
  return {
    nome: input.nome.trim(),
    cpf_cnpj: input.cpf_cnpj.trim(),
    email: input.email.trim() || null,
    telefone: input.telefone.trim() || null,
    endereco: input.endereco.trim() || null,
  };
}