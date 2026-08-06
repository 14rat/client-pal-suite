import { useEffect, useState } from "react";
import { Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import type { Cliente, ClienteInput } from "@/lib/clientes";
import {
  apenasDigitos,
  consultarCep,
  consultarCnpj,
  formatarCep,
  montarEndereco,
} from "@/lib/consultas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const vazio: ClienteInput = { nome: "", cpf_cnpj: "", email: "", telefone: "", endereco: "" };

export function ClienteFormDialog({
  open,
  onOpenChange,
  cliente,
  onSubmit,
  saving,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cliente: Cliente | null;
  onSubmit: (input: ClienteInput) => void;
  saving: boolean;
}) {
  const [form, setForm] = useState<ClienteInput>(vazio);
  const [cep, setCep] = useState("");
  const [complemento, setComplemento] = useState("");
  const [buscandoCep, setBuscandoCep] = useState(false);
  const [buscandoCnpj, setBuscandoCnpj] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(
      cliente
        ? {
            nome: cliente.nome,
            cpf_cnpj: cliente.cpf_cnpj,
            email: cliente.email ?? "",
            telefone: cliente.telefone ?? "",
            endereco: cliente.endereco ?? "",
          }
        : vazio,
    );
    setCep("");
    setComplemento("");
  }, [open, cliente]);

  function campo(key: keyof ClienteInput, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function buscarCep() {
    setBuscandoCep(true);
    try {
      const endereco = await consultarCep(cep);
      setCep(endereco.cep);
      campo("endereco", montarEndereco(endereco, complemento));
      toast.success("Endereço preenchido pelo CEP.");
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setBuscandoCep(false);
    }
  }

  async function buscarCnpj() {
    setBuscandoCnpj(true);
    try {
      const dados = await consultarCnpj(form.cpf_cnpj);
      setForm((prev) => ({
        nome: dados.razaoSocial || prev.nome,
        cpf_cnpj: prev.cpf_cnpj,
        email: dados.email || prev.email,
        telefone: dados.telefone || prev.telefone,
        endereco: dados.endereco || prev.endereco,
      }));
      if (dados.cep) setCep(dados.cep);
      toast.success("Dados da empresa preenchidos pelo CNPJ.");
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setBuscandoCnpj(false);
    }
  }

  const cnpjValido = apenasDigitos(form.cpf_cnpj).length === 14;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{cliente ? "Editar cliente" : "Novo cliente"}</DialogTitle>
          <DialogDescription>
            Preencha os dados cadastrais. Use a busca por CEP ou CNPJ para preencher
            automaticamente.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit(form);
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="nome">Nome</Label>
              <Input
                id="nome"
                required
                value={form.nome}
                onChange={(e) => campo("nome", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cpf_cnpj">CPF / CNPJ</Label>
              <div className="flex gap-2">
                <Input
                  id="cpf_cnpj"
                  required
                  value={form.cpf_cnpj}
                  onChange={(e) => campo("cpf_cnpj", e.target.value)}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  aria-label="Consultar CNPJ"
                  title="Consultar CNPJ"
                  disabled={!cnpjValido || buscandoCnpj}
                  onClick={buscarCnpj}
                >
                  {buscandoCnpj ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Search className="size-4" />
                  )}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="telefone">Telefone</Label>
              <Input
                id="telefone"
                value={form.telefone}
                onChange={(e) => campo("telefone", e.target.value)}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => campo("email", e.target.value)}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="cep">CEP</Label>
              <div className="flex gap-2">
                <Input
                  id="cep"
                  inputMode="numeric"
                  placeholder="00000-000"
                  value={cep}
                  onChange={(e) => setCep(formatarCep(e.target.value))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      if (apenasDigitos(cep).length === 8) void buscarCep();
                    }
                  }}
                />
                <Input
                  aria-label="Número e complemento"
                  placeholder="Nº / complemento"
                  value={complemento}
                  onChange={(e) => setComplemento(e.target.value)}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  aria-label="Buscar CEP"
                  title="Buscar CEP"
                  disabled={apenasDigitos(cep).length !== 8 || buscandoCep}
                  onClick={buscarCep}
                >
                  {buscandoCep ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Search className="size-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                A consulta preenche o endereço automaticamente.
              </p>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="endereco">Endereço</Label>
              <Textarea
                id="endereco"
                rows={2}
                value={form.endereco}
                onChange={(e) => campo("endereco", e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {cliente ? "Salvar alterações" : "Cadastrar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}