import express from 'express';
import path from 'path';

let expressServer;

export const clientHoster = () => ({
  start: async() => {
    const app = express();
    app.use(express.static(path.resolve('test/helpers/clientHoster/public')));
    expressServer = app.listen(5678);
  },
  stop: () => {
    return expressServer.close();
  },
});
