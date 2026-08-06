export type EnderecoCep = {
  cep: string;
  logradouro: string;
  bairro: string;
  cidade: string;
  uf: string;
};

export type DadosCnpj = {
  razaoSocial: string;
  email: string;
  telefone: string;
  endereco: string;
  cep: string;
};

export function apenasDigitos(valor: string) {
  return valor.replace(/\D/g, "");
}

export function formatarCep(valor: string) {
  const d = apenasDigitos(valor).slice(0, 8);
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
}

export function montarEndereco(e: EnderecoCep, complemento = "") {
  const partes = [
    [e.logradouro, complemento].filter(Boolean).join(", "),
    e.bairro,
    [e.cidade, e.uf].filter(Boolean).join(" - "),
    e.cep,
  ];
  return partes.filter(Boolean).join(" · ");
}

export async function consultarCep(cep: string): Promise<EnderecoCep> {
  const digitos = apenasDigitos(cep);
  if (digitos.length !== 8) throw new Error("Informe um CEP com 8 dígitos.");

  const resposta = await fetch(`https://brasilapi.com.br/api/cep/v2/${digitos}`);
  if (resposta.ok) {
    const json = (await resposta.json()) as {
      cep: string;
      street?: string | null;
      neighborhood?: string | null;
      city?: string | null;
      state?: string | null;
    };
    return {
      cep: formatarCep(json.cep ?? digitos),
      logradouro: json.street ?? "",
      bairro: json.neighborhood ?? "",
      cidade: json.city ?? "",
      uf: json.state ?? "",
    };
  }

  // Fallback: ViaCEP
  const via = await fetch(`https://viacep.com.br/ws/${digitos}/json/`);
  if (!via.ok) throw new Error("Não foi possível consultar o CEP agora.");
  const dados = (await via.json()) as Record<string, string> & { erro?: boolean | string };
  if (dados.erro) throw new Error("CEP não encontrado.");
  return {
    cep: formatarCep(dados.cep ?? digitos),
    logradouro: dados.logradouro ?? "",
    bairro: dados.bairro ?? "",
    cidade: dados.localidade ?? "",
    uf: dados.uf ?? "",
  };
}

export async function consultarCnpj(cnpj: string): Promise<DadosCnpj> {
  const digitos = apenasDigitos(cnpj);
  if (digitos.length !== 14) throw new Error("Informe um CNPJ com 14 dígitos.");

  const resposta = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${digitos}`);
  if (resposta.status === 404) throw new Error("CNPJ não encontrado.");
  if (!resposta.ok) throw new Error("Não foi possível consultar o CNPJ agora.");

  const json = (await resposta.json()) as Record<string, unknown>;
  const texto = (chave: string) => {
    const valor = json[chave];
    return typeof valor === "string" ? valor : typeof valor === "number" ? String(valor) : "";
  };

  const cep = formatarCep(texto("cep"));
  const endereco = [
    [texto("descricao_tipo_de_logradouro"), texto("logradouro")].filter(Boolean).join(" "),
    texto("numero"),
    texto("complemento"),
    texto("bairro"),
    [texto("municipio"), texto("uf")].filter(Boolean).join(" - "),
    cep,
  ]
    .filter(Boolean)
    .join(" · ");

  const telefone = texto("ddd_telefone_1");

  return {
    razaoSocial: texto("razao_social") || texto("nome_fantasia"),
    email: texto("email").toLowerCase(),
    telefone,
    endereco,
    cep,
  };
}
