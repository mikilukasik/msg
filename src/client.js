
window.MSG = (
  function createMsgService(optionalOptions) {
    var getArgs = require('./lib/getargs')();
   
    var msgOptions = {
      mySocketRules: {},
      waitingHandlersByConvId: {},
      serviceName: 'client-' + Math.random() * Math.random(),
      waitingCbsByConvId: {},
      waitingErrHandlersByConvId: {},
      wsRoutes: {},
    };

    // msgOptions.createRule = require('./lib/createRule')(msgOptions); 
    msgOptions.createSocketRule = require('./lib/createSocketRule')(msgOptions);
    // msgOptions.toGtw = require('./lib/toGtw')(msgOptions); 

    optionalOptions = optionalOptions || {};
    if (optionalOptions && typeof optionalOptions === 'object') Object.keys(optionalOptions).forEach(function (key) {
      msgOptions[key] = optionalOptions[key];
      // if(key === 'console.log') console.log = optionalOptions.console.log
    });

    if (!msgOptions.serviceLongName) msgOptions.serviceLongName = msgOptions.serviceName;
    console.log('MSG Client starting...');

    var msgClient = {
      cookies: require('./lib/cookies'),
      sharedWorker(scriptLocation){
        console.log('Starting MSG Shared Worker from ' + scriptLocation);
        return new SharedWorker(scriptLocation);
      },
      ws: function (route) {

        var wsOptions = {
          onConnect: () => {},
          onReConnect: () => {},
          connectCount: 0,
        };

        var waitForConnect = function () {
          const timeout = 20; //sec
          const deadLine = new Date().getTime() + timeout * 1000;
          return new Promise(function (res, rej) {
            function check() {
              if (msgOptions.wsRoutes[route].ws.readyState === 1) return res();
              if (new Date().getTime() > deadLine) return rej('Connect timeout (' + timeout + 's)');
              setTimeout(check, 100);
            }
            check();
          });
        };

        function start() {
          var ws = new WebSocket(route);
          msgOptions.wsRoutes[route].ws = ws;

          ws.onopen = function (openEvent) {
            msgOptions.log('WS route ' + route + ' connected.');
            if (wsOptions.connectCount) wsOptions.onReConnect(openEvent);
            wsOptions.connectCount += 1;
            wsOptions.onConnect(openEvent);
          };
          ws.onmessage = function (evt) {
            var message;
            try {
              message = JSON.parse(evt.data);
            } catch (e) {
              message = evt.data;
            }
            var callBack = msgOptions.wsRoutes[route].callBacks[message.command];
            if (!callBack) return console.log('No callback found, message:', message, callbacks);
            callBack(message);
          };
          ws.onerror = function (err) {
            console.log('WS ERROR on route ' + route + ': ' + err.message + '\n' + err.stack);
          };
          ws.onclose = function () {
            console.log('WS connection on route ' + route + ' closed, retry in 2s...');
            setTimeout(function () {
              start();
            }, 2000);
          };
        }

        function askGtw(command, data) {
          return new Promise(function (res3, rej3) {
            var tempConversationId = Math.random().toString();
            data.command = command;
            try {
              msgOptions.waitingCbsByConvId[tempConversationId] = function (reply) {
                delete msgOptions.waitingCbsByConvId[tempConversationId];
                delete msgOptions.waitingErrHandlersByConvId[tempConversationId];
                return res3(reply);
              };

              msgOptions.waitingErrHandlersByConvId[tempConversationId] = function(e) {
                delete msgOptions.waitingCbsByConvId[tempConversationId];
                delete msgOptions.waitingErrHandlersByConvId[tempConversationId];
                return rej3(e);
              };

              waitForConnect()
                .then(function () {
                  try {
                    msgOptions.wsRoutes[route].ws.send(JSON.stringify(Object.assign({
                      owner: msgOptions.serviceName,
                      tempConversationId: tempConversationId
                    }, data)));
                  } catch (ex) {
                    return rej3(ex);
                  }
                }, rej3);
            } catch (te) {
              rej3(te);
            }
          });
        }

        function toGtw(command, data, conversationId) {
          return new Promise(function (res3, rej3) {
            try {
              waitForConnect()
                .then(function () {
                  try {
                    msgOptions.wsRoutes[route].ws.send(JSON.stringify(Object.assign({
                      command: command,
                      data: data,
                      owner: msgOptions.serviceLongName,
                      conversationId: conversationId,
                      serviceName: msgOptions.serviceName,
                      serviceLongName: msgOptions.serviceLongName,
                    }, data)));
                  } catch (ex) {
                    return rej3(ex);
                  }


                }, rej3).then(res3, rej3);
            } catch (te) {
              rej3(te);
            }
          });
        }

        var myCallBacks = {
          doStarted: function doStarted(message) {
            msgOptions.waitingCbsByConvId[message.tempConversationId](message);
            delete msgOptions.waitingCbsByConvId[message.tempConversationId];
          },
          answer: function answer(message) {
            msgOptions.waitingCbsByConvId[message.conversationId](message.data);
            delete msgOptions.waitingCbsByConvId[message.conversationId];
          },
          error: function error(message) {
            console.error(message);
            msgOptions.waitingHandlersByConvId[message.conversationId].errorHandler(message.data);
          },
          do: function (message) {
            // console.log({msgOptions, message}, '#############')
            var thisHandler = msgOptions.mySocketRules[message.argObj.cmd].cb;
            var newArgObj = getArgs(message.argObj.args, msgOptions.mySocketRules[message.argObj.cmd].cmdArgs.keys);
            thisHandler(newArgObj, {
              message: message,
              conversationId: message.conversationId,
              send: function (data) {
                toGtw('answer', data, message.conversationId);
              },
              error: function (err) {
                toGtw('error', err, message.conversationId);
              },
            });
          },
        };

        if (!msgOptions.wsRoutes[route]) {
          var callbacks = Object.assign({}, myCallBacks);
          msgOptions.wsRoutes[route] = {
            callBacks: callbacks,
            route: route,
          };

          start();
        }

        // var waitForConnect = function(){
        //   return new Promise(function(res, rej){
        //     function check(){
        //       if (msgOptions.wsRoutes[route].ws.readyState === 1) return res();
        //       setTimeout(check, 100);
        //     }
        //     check();
        //   });
        // };

        function objDo(cmd1) {
          var argObj = getArgs(arguments);

          var handlers = {
            dataHandler: function () { msgOptions.log('in pure datahandler!!!!!!!!!!!'); },
            errorHandler: function (e) { msgOptions.log(e, 'in pure errorhandler!!!!!!!!!!!'); },
          };

          if (argObj.cb) {

            var comms = {
              onData: function (onDataCb) {
                handlers.dataHandler = onDataCb;
              }
            };
            argObj.cb(comms);
          }

          return new Promise(function (res, rej) {
            waitForConnect()
              .then(function () {
                return askGtw('do', { argObj });
              })
              .then(function (askRes) {
      
                handlers.errorHandler = function (e) {
                  delete msgOptions.waitingCbsByConvId[askRes.conversationId];
                  delete msgOptions.waitingHandlersByConvId[askRes.conversationId];
                  return rej(e);
                };
                
                msgOptions.waitingCbsByConvId[askRes.conversationId] = function (answer) {
                  delete msgOptions.waitingCbsByConvId[askRes.conversationId];
                  delete msgOptions.waitingHandlersByConvId[askRes.conversationId];
                  return res(answer);
                };

                msgOptions.waitingHandlersByConvId[askRes.conversationId] = handlers;
              }, function (error) { msgOptions.log(error); rej(error.message + '\n' + error.stack); });
          });
        }

        function objOn(cmd1) {
          var argObj = getArgs(arguments);
          return new Promise(function (res, rej) {
            return msgOptions.createSocketRule(argObj);
          });
        }

        function distObj(_options) {
          let gotInitValue = false;
          const waitForInitValues = () => new Promise((res, rej) => {
            const check = () => {
              if (gotInitValue) return res();
              setTimeout(check, 100);
            };
            check();
          });
          const options = typeof _options === 'string'
            ? {
              name: _options,
            }
            : _options;

          if (typeof options.onChange === 'function') options.onChange = [options.onChange];
          if (!options.onChange) options.onChange = [];
          if (!options.store) options.store = {};

          Object.keys(options.store).forEach(k => {
            if (typeof options.store[k] === 'object') {
              const subDistObj = distObj({
                name: options.name + '\\' + k,
                store: options.store[k],
                dontGetInitVal: true,
              });
              options.store[k] = subDistObj.data;
              options.onChange.forEach(subDistObj.onChange);
            }
          });

          const data = new Proxy(options.store, {
            set: function (obj, prop, value) {
              // The default behavior to store the value
              obj[prop] = value;

              waitForInitValues()
                .then(
                  () => {
                    return objDo('$$MSG_DISTOBJ_CHANGE_' + options.name, { name: options.name, prop, value });
                  }
                )
                .then(function (re) {
                  options.onChange.forEach(fn => fn({ prop, value, self: true }));
                  
                  if (typeof value === 'object') {

                    const subDistObj = distObj({
                      name: options.name + '\\' + prop,
                      store: value,
                      dontGetInitVal: true,
                    });

                    obj[prop] = subDistObj.data;
                    options.onChange.forEach(subDistObj.onChange);

                  }
                }, console.error);

              // Indicate success
              return true;
            },
            deleteProperty: function(obj, prop) {
              delete obj[prop];
              objDo('$$MSG_DISTOBJ_CHANGE_' + options.name, { name: options.name, prop, deleted: true }).then(function (){
                options.onChange.forEach(fn => fn({ prop, deleted: true, self: true }));
              }, console.error);
              return true;
            },
          });

          if (options.dontGetInitVal) gotInitValue = true;
          if (!options.dontGetInitVal) objDo('$$MSG_GET_DISTOBJ_' + options.name, { name: options.name, value: options.store }).then(
            obj => {
              Object.keys(obj).forEach(k => {
                options.store[k] = obj[k];
                if (typeof obj[k] === 'object') {
                  const subDistObj = distObj({
                    name: options.name + '\\' + k,
                    store: obj[k],
                    dontGetInitVal: true,
                  });
                  options.store[k] = subDistObj.data;
                  options.onChange.forEach(subDistObj.onChange);
                }
                options.onChange.forEach(fn => fn({ prop: k, value: obj[k] }));
              });
              gotInitValue = true;
            },
            msgOptions.log
          );

          console.log('signing up for $$MSG_DISTOBJ_CHANGE_' + options.name); 
          objOn('$$MSG_DISTOBJ_CHANGE_' + options.name, {}, function (argObj, comms) {

            const prop = argObj.cmdArgs.prop;
            const value = argObj.cmdArgs.value;
            const deleted = argObj.cmdArgs.deleted;

            options.store[prop] = value;
            if (deleted) delete options.store[prop];

            if (typeof value === 'object') {

              const subDistObj = distObj({
                name: options.name + '\\' + prop,
                store: value,
                dontGetInitVal: true,
              });

              options.store[prop] = subDistObj.data;
              options.onChange.forEach(subDistObj.onChange);

            }
            
            options.onChange.forEach(fn => fn({ prop, value, deleted }));

            comms.send({
              message: 'Change on distObj ' + options.name + ' registered',
              prop,
            });

          });

          const onChange = function (fn) {
            options.onChange.push(fn);
          };

          return {
            data,
            onChange,
            options,
            waitForReady: waitForInitValues,
          };
        }

        return {
          do: objDo,
          on: objOn,
          distObj: distObj,
          onConnect: (fn) => wsOptions.onConnect = fn,
          onReConnect: (fn) => wsOptions.onReConnect = fn,
          options: wsOptions,
        };
      },
    };

    return msgClient;
  }
)({
  serviceName: 'client-' + Math.random(),
  PORT: 9876,
  log: console.log,
});