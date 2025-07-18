export interface ItemVenda {
  id: string;
  idVenda?: string;
  descricao: string;
  valor: number;
  quantidade: number;
  
}

export interface Cliente {
  id:string;
  nome: string; 
  telefone: string;
  email?: string;
  endereco?: string;
}

export interface Produto {
  id: string;
  nome: string;
  tipo: string;
  marca?: string; 
  quantidade: number;
  preco: number;
  precovenda: number;
}

export interface Pagamento {
  id: string;
  idVenda: string; 
  dataPagamento: string; // ISO string
  valorPago: number;
}

export interface Venda {
  id: string;
  idCliente: string;
  clienteNome: string;
  clienteTelefone?: string | null; // ✨ CORREÇÃO: Permite que seja nulo, como no banco.
  itens: ItemVenda[];
  dataVenda: string; 
  subtotal: number;
  valorTotal: number;
  // ✨ CORREÇÃO: Removido 'totalFinal' por ser um duplicado de 'valorTotal'.
  tipoPagamento: 'À Vista' | 'Parcelado';
  parcelasTotais?: number;
  parcelasPagas?: number;   
  pagamentos?: Pagamento[]; 
  desconto?: number;
  dataPrimeiraParcela?: string; 
  // ✨ CORREÇÃO: Removido 'dataDemaisParcelas' que não existe na tabela do banco.
}


export interface Usuario {
  username: string;
  passwordHash: string;
}