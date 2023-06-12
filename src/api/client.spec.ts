import { Client } from './client';

describe('Client', () => {
  let client: Client;

  it('test', async () => {
    client = new Client('https://api.ssv.network/api', 'prater');

    const res = await client.v3.getOperator(1);
    console.log(res);
  });
});
