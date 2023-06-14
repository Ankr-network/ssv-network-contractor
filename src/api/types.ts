export interface Operator {
  id: number;
  id_str: string;
  declared_fee: string;
  previous_fee: string;
  fee: string;
  public_key: string;
  owner_address: string;
  address: string;
  location: string;
  setup_provider: string;
  eth1_node_client: string;
  eth2_node_client: string;
  description: string;
  website_url: string;
  twitter_url: string;
  linkedin_url: string;
  logo: string;
  type: string;
  name: string;
  performance: { [key: string]: number };
  is_valid: boolean;
  is_deleted: boolean;
  is_active: number;
  status: string;
  validators_count: number;
  version: string;
  network: string;
}

export interface HealthResponse {
  operators: number;
  validators: number;
  operators_graph: number;
  operator: number;
  validators_cost_by_owner: number;
  validator: number;
  validators_incentivized: number;
  validators_in_operator: number;
}

export interface Pagination {
  total: number;
  page: number;
  pages: number;
  per_page: number;
}

export interface Cluster {
  id: number;
  id_str: string;
  owner_address: string;
  validator_count: number;
  network_fee_index: number;
  index: number;
  balance: string;
  active: boolean;
  operators: number[];
}

export interface ClusterOwnerResponse {
  pagination: Pagination;
  clusters: Cluster[];
}

export interface ClusterResponse {
  type: string;
  cluster: {
    id: number;
    clusterId: string;
    network: string;
    version: string;
    ownerAddress: string;
    validatorCount: number;
    networkFeeIndex: string;
    index: string;
    balance: string;
    active: boolean;
    operators: number[];
    blockNumber: string;
    createdAt: Date;
    updatedAt: Date;
  };
}
