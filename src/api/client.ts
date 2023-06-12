import {
  ClusterOwnerResponse,
  ClusterResponse,
  HealthResponse,
  Operator,
} from './types';
import fetch from 'node-fetch';

export class Client {
  private readonly baseUrl;

  constructor(url: string, private readonly network: string) {
    let protocol = 'https://';
    if (url.startsWith(protocol)) {
      protocol = '';
    }
    if (!url.endsWith('/')) {
      url += '/';
    }
    this.baseUrl = protocol + url;
  }

  get v2() {
    const version = 'v2';
    return {
      getOperatorsBy: async (owner) =>
        this.get<any>(`operators/owned_by/${owner}`, version),
      getOperator: async (operatorId: number) =>
        this.get<Operator>(`operators/${operatorId}`, version),
      getValidatorsCostBy: async (owner) =>
        this.get<any>(`validators/owned_by/${owner}/cost`, version),
      getValidatorsBy: async (operator) =>
        this.get<any>(`validators/in_operator/${operator}`, version),
      getValidator: async (validator) =>
        this.get(`validators/${validator}`, version),
      health: async () => this.get<HealthResponse>(`health`),
    };
  }

  get v3() {
    return {
      getCluster: async (clusterId) =>
        this.get<ClusterResponse>(`clusters/${clusterId}`),
      getClusterCount: async () => this.get<any>('clusters/count'),
      getClusterOwner: async (
        ownerAddress,
        order = 'validator_count:asc,id:asc',
        page = 1,
        perPage = 100,
      ) =>
        this.get<ClusterOwnerResponse>(
          `clusters/owner/${ownerAddress}?page=${page}&perPage=${perPage}&ordering=${order}`,
        ),
      getOperatorsBy: async (owner) =>
        this.get<any>(`operators/owned_by/${owner}`),
      getOperator: async (operatorId) =>
        this.get<Operator>(`operators/${operatorId}`),
      getValidatorsCostBy: async (owner) =>
        this.get<any>(`validators/owned_by/${owner}/cost`),
      getValidatorsBy: async (operator) =>
        this.get<any>(`validators/in_operator/${operator}`),
      getValidator: async (validator) => this.get(`validators/${validator}`),
      health: async () => this.get<HealthResponse>(`health`),
    };
  }

  private async get<T>(
    endpoint: string,
    version: 'v2' | 'v3' = 'v3',
  ): Promise<T> {
    const response = await fetch(
      `${this.baseUrl}${version}/${this.network}/${endpoint}`,
    );
    if (response.status != 200 || !response.ok) {
      throw new Error(
        `request failed with status ${
          response.status
        }: ${await response.text()}`,
      );
    }
    return (await response.json()) as T;
  }
}
