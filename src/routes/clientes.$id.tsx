import { useEffect, useRef, useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Download, FileText, Loader2, Paperclip, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { buscarCliente } from "@/lib/clientes";
import {
  enviarAnexo,
  formatarTamanho,
  listarAnexos,
  removerAnexo,
  urlDownload,
  type Anexo,
} from "@/lib/anexos";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/clientes/$id")({
  head: () => ({
    meta: [
      { title: "Cliente e documentos | GestorBase" },
      {
        name: "description",
        content:
          "Ficha do cliente com dados de contato e anexos: envie PDFs e imagens de documentos e baixe os arquivos salvos.",
      },
      { property: "og:title", content: "Cliente e documentos | GestorBase" },
      {
        property: "og:description",
        content: "Consulte os dados do cliente e gerencie os documentos anexados.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PaginaCliente,
});

function PaginaCliente() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, loading } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [baixando, setBaixando] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  const clienteQuery = useQuery({
    queryKey: ["cliente", id],
    queryFn: () => buscarCliente(id),
    enabled: !!user,
  });

  const anexosQuery = useQuery({
    queryKey: ["anexos", id],
    queryFn: () => listarAnexos(id),
    enabled: !!user,
  });

  const upload = useMutation({
    mutationFn: (arquivo: File) => enviarAnexo(id, arquivo),
    onSuccess: () => {
      toast.success("Documento anexado.");
      queryClient.invalidateQueries({ queryKey: ["anexos", id] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const excluir = useMutation({
    mutationFn: (anexo: Anexo) => removerAnexo(anexo),
    onSuccess: () => {
      toast.success("Documento removido.");
      queryClient.invalidateQueries({ queryKey: ["anexos", id] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  async function baixar(anexo: Anexo) {
    setBaixando(anexo.id);
    try {
      const url = await urlDownload(anexo);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setBaixando(null);
    }
  }

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Carregando…
      </div>
    );
  }

  const cliente = clienteQuery.data;
  const anexos = anexosQuery.data ?? [];

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-brand text-primary-foreground">
        <div className="mx-auto flex max-w-4xl flex-col gap-4 px-6 py-8">
          <Button asChild variant="secondary" size="sm" className="w-fit">
            <Link to="/">
              <ArrowLeft className="size-4" /> Voltar
            </Link>
          </Button>
          <div>
            <span className="font-display text-sm tracking-widest uppercase opacity-80">
              Ficha do cliente
            </span>
            <h1 className="mt-1 text-3xl font-semibold">
              {clienteQuery.isLoading ? "Carregando…" : cliente?.nome ?? "Cliente não encontrado"}
            </h1>
            {cliente && <p className="text-sm opacity-80">{cliente.cpf_cnpj}</p>}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-6 px-6 py-8">
        {cliente && (
          <Card className="shadow-panel">
            <CardHeader>
              <CardTitle>Dados de contato</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
              <Info rotulo="Email" valor={cliente.email} />
              <Info rotulo="Telefone" valor={cliente.telefone} />
              <Info rotulo="Endereço" valor={cliente.endereco} />
            </CardContent>
          </Card>
        )}

        <Card className="shadow-panel">
          <CardHeader className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2">
              <Paperclip className="size-4" /> Anexos e documentos
            </CardTitle>
            <div>
              <input
                ref={inputRef}
                type="file"
                accept="application/pdf,image/*"
                className="hidden"
                onChange={(e) => {
                  const arquivo = e.target.files?.[0];
                  e.target.value = "";
                  if (arquivo) upload.mutate(arquivo);
                }}
              />
              <Button
                onClick={() => inputRef.current?.click()}
                disabled={upload.isPending || !cliente}
              >
                {upload.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Upload className="size-4" />
                )}
                Enviar documento
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-xs text-muted-foreground">
              PDF ou imagens (PNG, JPG, WEBP) de até 20 MB. Os arquivos ficam privados e são
              baixados por links temporários.
            </p>
            {anexosQuery.isLoading ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Carregando anexos…</p>
            ) : anexos.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Nenhum documento anexado ainda.
              </p>
            ) : (
              <ul className="divide-y">
                {anexos.map((anexo) => (
                  <li key={anexo.id} className="flex items-center gap-3 py-3">
                    <FileText className="size-5 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{anexo.nome_arquivo}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatarTamanho(anexo.tamanho)} ·{" "}
                        {new Date(anexo.created_at).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Baixar ${anexo.nome_arquivo}`}
                      disabled={baixando === anexo.id}
                      onClick={() => baixar(anexo)}
                    >
                      {baixando === anexo.id ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Download className="size-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Remover ${anexo.nome_arquivo}`}
                      onClick={() => excluir.mutate(anexo)}
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

function Info({ rotulo, valor }: { rotulo: string; valor: string | null }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{rotulo}</p>
      <p className="font-medium">{valor || "—"}</p>
    </div>
  );
}
