var axios = require('axios');

module.exports = function setRuleCreator(msgOptions) {
  var log = msgOptions.log || console.log;

  function setRule(rule) {
    switch (rule.type) {
      case 'httpRedirect':
        if (!msgOptions.httpRoutes[rule.method + ' ' + rule.inPath])
          msgOptions.httpRoutes[rule.method + ' ' + rule.inPath] = [];
        var thisRoutes = msgOptions.httpRoutes[rule.method + ' ' + rule.inPath];
        thisRoutes.push({
          rule: rule,
        });
        var getRoute = function () {
          const route = thisRoutes[0];
          if (!route)
            throw new Error(
              `NO AVAILABLE ROUTE, ${JSON.stringify(Object.assign({}, rule, { ws: undefined }), null, 2)}`,
            );
          return route;
        };
        msgOptions.app[rule.method.toLowerCase()](rule.inPath, function (req, res) {
          var useRule = getRoute().rule;
          // req
          //   .pipe(
          //     request(
          //       {
          //         url: 'http://' + useRule.outHost + ':' + useRule.outPort + req.originalUrl,
          //         followRedirect: false,
          //         headers: req.headers,
          //       },
          //       function (e, response, body) {
          //         if (e) log('FATAL ERROR in pipe', e, Object.assign({}, rule, { ws: undefined }));
          //       },
          //     ),
          //   )
          //   .pipe(res);

          // console.log(1111, rule.method);

          axios(
            {
              url: 'http://' + useRule.outHost + ':' + useRule.outPort + req.originalUrl,

              responseType: 'stream',
              headers: req.headers,
              maxRedirects: 0,
              validateStatus: function (status) {
                return status >= 200 && status < 400;
              },
            },
            req,
            {
              headers: req.headers,
            },
          )
            .then((response) => {
              // console.log({ response });
              response.data.pipe(res);
            })
            .catch(console.error);

          // req
          //   .pipe(
          //     request(
          //       {
          //         url: 'http://' + useRule.outHost + ':' + useRule.outPort + req.originalUrl,
          //         followRedirect: false,
          //         headers: req.headers,
          //       },
          //       function (e, response, body) {
          //         if (e) log('FATAL ERROR in pipe', e, Object.assign({}, rule, { ws: undefined }));
          //       },
          //     ),
          //   )
          //   .pipe(res);
        });
        break;
      case 'httpPrivate':
        log('httpPrivate rule received, but isnt implemented ', rule);
        break;
      case 'socket':
        msgOptions.socketRules.push(rule);

        if (msgOptions.suspendedConversationsPerRoute.serviceToService[rule.cmd]) {
          if (msgOptions.suspendedConversationsPerRoute.serviceToService[rule.cmd].length) {
            // console.log(
            //   `${msgOptions.suspendedConversationsPerRoute.serviceToService[rule.cmd].length} waiting for ${rule.cmd}`,
            // );

            Object.keys(msgOptions.suspendedConversationsPerRoute.serviceToService).forEach((cmd) => {
              // console.log({ cmd });
              const conversations = msgOptions.suspendedConversationsPerRoute.serviceToService[cmd];
              let conversationIndex = conversations.length;
              while (conversationIndex--) {
                try {
                  rule.ws.send(
                    JSON.stringify({
                      cmd: 'do',
                      argObj: conversations[conversationIndex].argObj,
                      conversationId: conversations[conversationIndex].conversationId,
                      clientSocketKey: conversations[conversationIndex].clientSocketKey,
                      clientSocketRoute: conversations[conversationIndex].route,
                      route: conversations[conversationIndex].route,
                    }),
                  );
                } catch (e) {
                  conversations[conversationIndex].ws.send(
                    toStr({
                      cmd: 'error',
                      conversationId: conversations[conversationIndex].conversationId,
                      error: e,
                      message: e.message,
                      stack: e.stack,
                      clientSocketKey: conversations[conversationIndex].clientSocketKey,
                      clientSocketRoute: conversations[conversationIndex].route,
                      route: conversations[conversationIndex].route,
                    }),
                  );
                }

                conversations.splice(conversationIndex, 1);
              }
            });
          }
        } else {
          msgOptions.suspendedConversationsPerRoute.serviceToService[rule.cmd] = [];
        }

        log(`socket rule stored: ${rule.cmd}`);

        // TODO: waitForRule shouldn't only know about socket rules
        (msgOptions.waitForRuleResolvers[rule.cmd] || []).forEach((resolve) => resolve(rule));
        break;
      case 'publicSocket':
        if (!rule.ws) {
          log('ERROR: RULE WITHOUT WS ', rule);
        }
        msgOptions.publicSocketRoutes[rule.publicSocketRoute].rules.push(rule);
        // log('publicSocket rule from ' + rule.owner + ' stored: ' + rule.cmd);
        break;
      default:
        throw new Error('Unknown rule type: ' + rule.type + '\nRule: ' + JSON.stringify(rule));
    }
    msgOptions.slaveFunctions.publishRule(rule);
    // log('New rule added.');
  }

  return setRule;
};
