export default () => ({
  RPC_HOST: process.env.RPC_HOST,
  SSV_NETWORK_ADDRESS: process.env.SSV_NETWORK_ADDRESS,
  OPERATOR_IDS: process.env.OPERATOR_IDS,
  SSV_API: process.env.SSV_API,
  GRPC_ADDRESS: process.env.GRPC_ADDRESS,
  OPERATOR_ADDRESS: process.env.OPERATOR_ADDRESS,
  OPERATOR_PRIV_KEY: process.env.OPERATOR_PRIV_KEY,
  TX_WAIT_TIME: parseInt(process.env.TX_WAIT_TIME, 10),
  KEYSTORE_PASSWORD: process.env.KEYSTORE_PASSWORD,
  OPERATION_PERIOD: parseInt(process.env.OPERATION_PERIOD), // in blocks
  SSV_TOKEN_ADDRESS: process.env.SSV_TOKEN_ADDRESS,
  SSV_APPROVE_LIMIT: process.env.SSV_APPROVE_LIMIT,
});
