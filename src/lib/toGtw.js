const getRandomId = require('./getRandomId.js');

const RECEIPT_TIMEOUT = 15000;

module.exports = function toGtwCreator(msgOptions) {
  return function toGtw(cmd, data, conversationId, { confirmReceipt = false } = {}) {
    return new Promise(function (resolve, reject) {
      msgOptions.waitForConnection().then(function () {
        let confirmReceiptId;
        if (confirmReceipt) {
          confirmReceiptId = getRandomId();

          const timeOutId = setTimeout(() => {
            if (msgOptions.toGtwConfirmers[confirmReceiptId]) {
              delete msgOptions.toGtwConfirmers[confirmReceiptId];
              return reject(new Error(`toGtw timed out: ${cmd}: ${data.argObj && data.argObj.cmd}`));
            }
          }, RECEIPT_TIMEOUT);

          msgOptions.toGtwConfirmers[confirmReceiptId] = {
            resolve: (data) => {
              clearTimeout(timeOutId);
              return resolve(data);
            },
            reject: (error) => {
              clearTimeout(timeOutId);
              return reject(error);
            },
          };
        }

        try {
          msgOptions.connection.send(
            JSON.stringify(
              Object.assign(
                {
                  cmd: cmd,
                  data: data,
                  owner: msgOptions.serviceLongName,
                  conversationId: conversationId,
                  serviceName: msgOptions.serviceName,
                  serviceLongName: msgOptions.serviceLongName,
                  confirmReceiptId,
                },
                data,
              ),
            ),
          );
        } catch (e) {
          reject(e);
        }
      });
    });
  };
};
