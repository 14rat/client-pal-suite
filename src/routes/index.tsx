import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  LogOut,
  Plus,
  Search,
  Trash2,
  Users,
  Pencil,
  ShieldCheck,
  Paperclip,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  atualizarCliente,
  buscarPerfilAtual,
  criarCliente,
  listarClientes,
  removerCliente,
  type Cliente,
  type ClienteInput,
} from "@/lib/clientes";
import { ClienteFormDialog } from "@/components/ClienteFormDialog";
import { contarAnexos } from "@/lib/anexos";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "GestorBase | Gestão de Clientes" },
      {
        name: "description",
        content:
          "Painel de gestão de clientes: cadastro de CPF/CNPJ, contatos e endereços com perfis de administrador e usuário comum.",
      },
      { property: "og:title", content: "GestorBase | Gestão de Clientes" },
      {
        property: "og:description",
        content: "Cadastre e gerencie sua carteira de clientes com controle de acesso por perfil.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Painel,
});

function Painel() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, loading } = useAuth();
  const [busca, setBusca] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editando, setEditando] = useState<Cliente | null>(null);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  const perfilQuery = useQuery({
    queryKey: ["perfil", user?.id],
    queryFn: buscarPerfilAtual,
    enabled: !!user,
  });

  const clientesQuery = useQuery({
    queryKey: ["clientes", user?.id],
    queryFn: listarClientes,
    enabled: !!user,
  });

  const anexosTotalQuery = useQuery({
    queryKey: ["anexos-total", user?.id],
    queryFn: contarAnexos,
    enabled: !!user,
  });

  const salvar = useMutation({
    mutationFn: async (input: ClienteInput) => {
      if (editando) return atualizarCliente(editando.id, input);
      return criarCliente(input, user!.id);
    },
    onSuccess: () => {
      toast.success(editando ? "Cliente atualizado." : "Cliente cadastrado.");
      setDialogOpen(false);
      setEditando(null);
      queryClient.invalidateQueries({ queryKey: ["clientes"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const excluir = useMutation({
    mutationFn: removerCliente,
    onSuccess: () => {
      toast.success("Cliente removido.");
      queryClient.invalidateQueries({ queryKey: ["clientes"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const clientes = clientesQuery.data ?? [];
  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return clientes;
    return clientes.filter((c) =>
      [c.nome, c.cpf_cnpj, c.email ?? "", c.telefone ?? ""].some((v) =>
        v.toLowerCase().includes(termo),
      ),
    );
  }, [clientes, busca]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Carregando…
      </div>
    );
  }

  const perfil = perfilQuery.data;

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-brand text-primary-foreground">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-10">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="font-display text-sm tracking-widest uppercase opacity-80">
                GestorBase
              </span>
              <h1 className="mt-1 text-3xl font-semibold">Gestão de Clientes</h1>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right text-sm">
                <p className="font-medium">{perfil?.nome || user.email}</p>
                <p className="flex items-center justify-end gap-1 text-xs opacity-80">
                  <ShieldCheck className="size-3" />
                  {perfil?.perfil === "admin" ? "Administrador" : "Usuário comum"}
                </p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={async () => {
                  await supabase.auth.signOut();
                  navigate({ to: "/auth" });
                }}
              >
                <LogOut className="size-4" /> Sair
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-6 py-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card className="shadow-panel">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Users className="size-4" /> Clientes cadastrados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-display text-3xl font-semibold">{clientes.length}</p>
            </CardContent>
          </Card>
          <Card className="shadow-panel">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Paperclip className="size-4" /> Arquivos enviados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-display text-3xl font-semibold">
                {anexosTotalQuery.isLoading ? "…" : (anexosTotalQuery.data ?? 0)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Documentos anexados às fichas de clientes.
              </p>
            </CardContent>
          </Card>
          <Card className="shadow-panel">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Nível de acesso
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Badge variant={perfil?.perfil === "admin" ? "default" : "secondary"}>
                {perfil?.perfil === "admin" ? "admin" : "comum"}
              </Badge>
              <p className="mt-2 text-xs text-muted-foreground">
                {perfil?.perfil === "admin"
                  ? "Você visualiza os clientes de todos os usuários."
                  : "Você visualiza apenas os clientes que cadastrou."}
              </p>
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-panel">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Clock className="size-4" /> Últimos cadastros
            </CardTitle>
          </CardHeader>
          <CardContent>
            {clientesQuery.isLoading ? (
              <p className="py-2 text-sm text-muted-foreground">Carregando…</p>
            ) : clientes.length === 0 ? (
              <p className="py-2 text-sm text-muted-foreground">Nenhum cadastro ainda.</p>
            ) : (
              <ul className="divide-y">
                {clientes.slice(0, 5).map((cliente) => (
                  <li key={cliente.id} className="flex items-center justify-between gap-3 py-2">
                    <div className="min-w-0">
                      <Link
                        to="/clientes/$id"
                        params={{ id: cliente.id }}
                        className="truncate text-sm font-medium hover:underline"
                      >
                        {cliente.nome}
                      </Link>
                      <p className="text-xs text-muted-foreground">{cliente.cpf_cnpj}</p>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(cliente.created_at).toLocaleDateString("pt-BR")}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-panel">
          <CardHeader className="flex flex-wrap items-center justify-between gap-4">
            <CardTitle>Clientes</CardTitle>
            <div className="flex flex-1 flex-wrap items-center justify-end gap-3">
              <div className="relative w-full max-w-xs">
                <Search className="absolute top-2.5 left-3 size-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Buscar por nome, CPF/CNPJ…"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                />
              </div>
              <Button
                onClick={() => {
                  setEditando(null);
                  setDialogOpen(true);
                }}
              >
                <Plus className="size-4" /> Novo cliente
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {clientesQuery.isLoading ? (
              <p className="py-10 text-center text-sm text-muted-foreground">Carregando clientes…</p>
            ) : filtrados.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                Nenhum cliente encontrado. Cadastre o primeiro.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>CPF / CNPJ</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Telefone</TableHead>
                      <TableHead>Endereço</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtrados.map((cliente) => (
                      <TableRow key={cliente.id}>
                        <TableCell className="font-medium">
                          <Link
                            to="/clientes/$id"
                            params={{ id: cliente.id }}
                            className="hover:underline"
                          >
                            {cliente.nome}
                          </Link>
                        </TableCell>
                        <TableCell>{cliente.cpf_cnpj}</TableCell>
                        <TableCell>{cliente.email || "—"}</TableCell>
                        <TableCell>{cliente.telefone || "—"}</TableCell>
                        <TableCell className="max-w-[16rem] truncate">
                          {cliente.endereco || "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              asChild
                              variant="ghost"
                              size="icon"
                              aria-label={`Anexos de ${cliente.nome}`}
                            >
                              <Link to="/clientes/$id" params={{ id: cliente.id }}>
                                <Paperclip className="size-4" />
                              </Link>
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={`Editar ${cliente.nome}`}
                              onClick={() => {
                                setEditando(cliente);
                                setDialogOpen(true);
                              }}
                            >
                              <Pencil className="size-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={`Remover ${cliente.nome}`}
                              onClick={() => excluir.mutate(cliente.id)}
                            >
                              <Trash2 className="size-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      <ClienteFormDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditando(null);
        }}
        cliente={editando}
        onSubmit={(input) => salvar.mutate(input)}
        saving={salvar.isPending}
      />
    </div>
  );
}
