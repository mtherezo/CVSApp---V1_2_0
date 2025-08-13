export interface ItemVenda {
  id: string;
  idVenda?: string;
  idProduto?: string;
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

export interface Pagamento {
  id: string;
  idVenda: string; 
  dataPagamento: string;
  valorPago: number;
  
}

export interface Venda {
  id: string;
  idCliente: string;
  clienteNome: string;
  clienteTelefone?: string | null; //  Permite que seja nulo, como no banco.
  itens: ItemVenda[];
  dataVenda: string;
  dataPagamento: string;
  subtotal: number;
  valorTotal: number;
  tipoPagamento: 'À Vista' | 'Parcelado';
  parcelasTotais?: number;
  parcelasPagas?: number;   
  pagamentos?: Pagamento[]; 
  desconto?: number;
  dataPrimeiraParcela?: string; 
 
}


export interface Usuario {
  username: string;
  passwordHash: string;
  
}

export interface Produto {
  id: string;
  descricao: string;
  valor: number;
  marca?: string;
  codigo?: string;
  quantidadeEstoque?: number;
  fotoUri?: string;
}