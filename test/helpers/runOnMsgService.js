import { startServer } from "./startServer";

const dirName = 'msgServiceServer';

export const runOnMsgService = (code, cb) => {
  const env = { MSG_ADDRESS: '0.0.0.0:11220' };
  return startServer({ code, env, dirName, cb });
};
