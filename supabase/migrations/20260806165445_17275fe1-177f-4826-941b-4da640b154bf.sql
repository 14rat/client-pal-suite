CREATE TABLE public.cliente_anexos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id uuid NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  usuario_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome_arquivo text NOT NULL,
  caminho text NOT NULL UNIQUE,
  tipo_mime text,
  tamanho bigint,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cliente_anexos TO authenticated;
GRANT ALL ON public.cliente_anexos TO service_role;

ALTER TABLE public.cliente_anexos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anexos visiveis ao dono ou admin" ON public.cliente_anexos
  FOR SELECT TO authenticated
  USING (usuario_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Dono cria anexos" ON public.cliente_anexos
  FOR INSERT TO authenticated
  WITH CHECK (usuario_id = auth.uid() AND EXISTS (
    SELECT 1 FROM public.clientes c WHERE c.id = cliente_id AND (c.usuario_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  ));

CREATE POLICY "Dono ou admin remove anexos" ON public.cliente_anexos
  FOR DELETE TO authenticated
  USING (usuario_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_cliente_anexos_updated_at BEFORE UPDATE ON public.cliente_anexos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_cliente_anexos_cliente ON public.cliente_anexos(cliente_id);

-- Storage policies: arquivos organizados como {auth.uid()}/{cliente_id}/{arquivo}
CREATE POLICY "Usuario envia seus anexos" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'anexos-clientes' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Usuario le seus anexos" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'anexos-clientes' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.has_role(auth.uid(), 'admin')));

CREATE POLICY "Usuario remove seus anexos" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'anexos-clientes' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.has_role(auth.uid(), 'admin')));