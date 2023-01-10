import { SSVOperator } from './types';
import fetch from 'node-fetch';

export class Client {
  constructor(private readonly url: string) {}

  async getOperator(id: number): Promise<SSVOperator> {
    const response = await fetch(`${this.url}/api/v1/operators/${id}`);
    if (response.status != 200 || !response.ok) {
      throw new Error(`request failed with status ${response.status}`);
    }
    return (await response.json()) as SSVOperator;
  }
}
