module.exports = function rejectOpenConversationsCreator(msgOptions) {
  const rejectOpenConversations = ({ handlerName }) => {
    const conversationIdsToReject = Object.keys(msgOptions.conversations).filter(
      (conversationId) =>
        msgOptions.conversations[conversationId].handler === handlerName &&
        !msgOptions.conversations[conversationId].serviceToService,
    );

    // console.log('xxxx', conversationIdsToReject, msgOptions.conversations[conversationIdsToReject[0]]);

    for (const id of conversationIdsToReject) {
      var convE = msgOptions.conversations[id];
      if (!convE) {
        // TODO: throw error here maybe?

        console.log(111111);

        delete msgOptions.conversations[id];
        continue;
      }

      if (!convE.ws) {
        // this happens when we started the do on this gateway

        console.log(2222222);

        convE.ownHandlers.reject(message.data);
        delete msgOptions.conversations[id];
        continue;
      }

      if (convE.ws.readyState > 1) {
        // TODO: throw error here maybe?

        console.log(33333333);

        delete msgOptions.conversations[id];
        continue;
      }
      console.log(4444444);

      convE.ws.send(
        JSON.stringify({
          cmd: 'error',
          data: 'handler disconnected',
          conversationId: id,
        }),
      );
      delete msgOptions.conversations[id];
    }
  };
  return rejectOpenConversations;
};
