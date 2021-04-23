// this will start up a node server (subdir prefix is in the type) and execute the custom code on that server.
import { exec } from 'child_process';
import { writeFileSync } from 'fs';
import { resolve } from 'path';

export const spawnServer = ({ type, code, env = {}, port, cb: _cb }) => {
  env.testRunId = `${Date.now()}-${Math.random()}`.replace('/', '-');
  env.port = port;

  const serverPath = resolve(`test/helpers/${type}Server/server.js`);
  const customCodePath = resolve(`test/_temp/customCode-${env.testRunId}.js`);
  const envString = Object.keys(env).map(key => `${key}=${env[key]} `).join(' ');

  const codeString = `module.exports = ${code.toString()};`;
  writeFileSync(customCodePath, codeString, 'utf8');

  const cb = (err, stdout, stderr) => {
    const logArray = (stdout || '').split('\n');
    
    const findInLogLines = (str) => logArray.find(line => line.indexOf(str) >= 0);
    _cb({ err, stdout, stderr, findInLogLines });
  }
  return exec(`${envString} node ${serverPath}`, cb);
};
