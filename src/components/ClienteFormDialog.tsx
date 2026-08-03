import { useEffect, useState } from "react";
import type { Cliente, ClienteInput } from "@/lib/clientes";
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
  }, [open, cliente]);

  function campo(key: keyof ClienteInput, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{cliente ? "Editar cliente" : "Novo cliente"}</DialogTitle>
          <DialogDescription>Preencha os dados cadastrais do cliente.</DialogDescription>
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
              <Input
                id="cpf_cnpj"
                required
                value={form.cpf_cnpj}
                onChange={(e) => campo("cpf_cnpj", e.target.value)}
              />
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