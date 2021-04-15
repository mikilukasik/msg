import { startServer } from "./startServer";

const dirName = 'msgGatewayServer';

export const runOnMsgGateway = (code, cb) => {
  return startServer({ code, dirName, cb });
};
