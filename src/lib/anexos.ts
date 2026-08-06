import { supabase } from "@/integrations/supabase/client";

const BUCKET = "anexos-clientes";

export type Anexo = {
  id: string;
  cliente_id: string;
  usuario_id: string;
  nome_arquivo: string;
  caminho: string;
  tipo_mime: string | null;
  tamanho: number | null;
  created_at: string;
};

export const TIPOS_PERMITIDOS = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/heic",
];
export const TAMANHO_MAXIMO = 20 * 1024 * 1024;

export async function listarAnexos(clienteId: string): Promise<Anexo[]> {
  const { data, error } = await supabase
    .from("cliente_anexos")
    .select("*")
    .eq("cliente_id", clienteId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Anexo[];
}

export async function enviarAnexo(clienteId: string, arquivo: File) {
  if (arquivo.size > TAMANHO_MAXIMO) {
    throw new Error("Arquivo maior que 20 MB.");
  }
  if (arquivo.type && !TIPOS_PERMITIDOS.includes(arquivo.type)) {
    throw new Error("Formato não permitido. Envie PDF ou imagem.");
  }

  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) throw new Error("Sessão expirada. Faça login novamente.");

  const extensao = arquivo.name.includes(".") ? arquivo.name.split(".").pop() : undefined;
  const nomeSeguro = `${crypto.randomUUID()}${extensao ? `.${extensao}` : ""}`;
  const caminho = `${userId}/${clienteId}/${nomeSeguro}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(caminho, arquivo, {
      upsert: false,
      ...(arquivo.type ? { contentType: arquivo.type } : {}),
    });
  if (uploadError) throw uploadError;

  const { error } = await supabase.from("cliente_anexos").insert({
    cliente_id: clienteId,
    usuario_id: userId,
    nome_arquivo: arquivo.name.slice(0, 200),
    caminho,
    tipo_mime: arquivo.type || null,
    tamanho: arquivo.size,
  });
  if (error) {
    await supabase.storage.from(BUCKET).remove([caminho]);
    throw error;
  }
}

export async function urlDownload(anexo: Anexo): Promise<string> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(anexo.caminho, 60, { download: anexo.nome_arquivo });
  if (error) throw error;
  return data.signedUrl;
}

export async function removerAnexo(anexo: Anexo) {
  const { error } = await supabase.from("cliente_anexos").delete().eq("id", anexo.id);
  if (error) throw error;
  await supabase.storage.from(BUCKET).remove([anexo.caminho]);
}

export function formatarTamanho(bytes: number | null) {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export async function contarAnexos(): Promise<number> {
  const { count, error } = await supabase
    .from("cliente_anexos")
    .select("id", { count: "exact", head: true });
  if (error) throw error;
  return count ?? 0;
}
