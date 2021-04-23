module.exports = function wsCreator(msgOptions){

  return function ws(route){
    msgOptions.wsRoutes[route] = {
      route: route,
      evtHandlers: {
        error: [msgOptions.log],
      },
      connections: [],
      connectionsByKey: {},
      distObjs: {},
      errorHandler: (...args) => {msgOptions.wsRoutes[route].evtHandlers.error.forEach(fn => fn(...args));},
    };

    msgOptions.toGtw('wsRoute', route).then(() => {}, msgOptions.wsRoutes[route].errorHandler);
    
    var on = require('./msWsOn')(msgOptions, route);
    var onEvt = require('./msWsOnEvt')(msgOptions, route);

    var distObj = function(_options){
      const options = typeof _options === 'string'
        ? {
          name: _options,
        }
        : _options;

      if (typeof options.onChange === 'function') options.onChange = [options.onChange];
      if (!options.onChange) options.onChange = [];
      if (!options.onNew) options.onNew = [];
      if (!options.store) options.store = {};

      Object.keys(options.store).forEach(k => {
        if (typeof options.store[k] === 'object') {
          const subDistObj = distObj({
            name: options.name + '\\' + k,
            store: options.store[k],
          });
          options.store[k] = subDistObj.data;
          options.onChange.forEach(subDistObj.onChange);
        }
      });

      const store = new Proxy(options.store, {
        set: function(obj, prop, value) {
          obj[prop] = value;
          if (typeof value === 'object') {

            const subDistObj = distObj({
              name: options.name + '\\' + prop,
              store: obj[prop],
            });

            obj[prop] = subDistObj.data;
            options.onChange.forEach(subDistObj.onChange);

            msgOptions.wsRoutes[route].connections.forEach(connection => {
              if (connection.followingDistObjs && connection.followingDistObjs[options.name])
                connection.followingDistObjs[options.name + '\\' + prop] = true;
            });

          }
          msgOptions.wsRoutes[route].connections.forEach(connection => {
            if ((connection.followingDistObjs || {})[options.name])
              connection.do('$$MSG_DISTOBJ_CHANGE_' + options.name, { name: options.name, prop, value }).catch(msgOptions.log);
          });
          return true;
        },
        deleteProperty: function(obj, prop) {
          delete obj[prop];
          msgOptions.wsRoutes[route].connections.forEach(connection => {
            if ((connection.followingDistObjs || {})[options.name])
              connection.do('$$MSG_DISTOBJ_CHANGE_' + options.name, { name: options.name, prop, deleted: true }).catch(msgOptions.log);
          });
          return true;
        },
      });

      msgOptions.wsRoutes[route].distObjs[options.name] = store;

      on('$$MSG_DISTOBJ_CHANGE_' + options.name, function(changeData, comms){

        const prop = changeData.prop;
        const value = changeData.value;
        const deleted = changeData.deleted;

        options.store[prop] = value;
        if (deleted) delete options.store[prop];

        if (typeof value === 'object') {

          const subDistObj = distObj({
            name: options.name + '\\' + prop,
            store: options.store[prop],
          });
          
          options.store[prop] = subDistObj.data;
          options.onChange.forEach(subDistObj.onChange);

          msgOptions.wsRoutes[route].connections.forEach(connection => {
            if (connection.followingDistObjs && connection.followingDistObjs[options.name])
              connection.followingDistObjs[options.name + '\\' + prop] = true;
          });

        }

        options.onChange.forEach(fn => fn({ prop, value, deleted }));
        
        msgOptions.wsRoutes[route].connections.forEach(connection => {
          if (
            connection.clientSocketKey !== comms.connection.clientSocketKey &&
            (connection.followingDistObjs || {})[options.name]
            ) connection.do('$$MSG_DISTOBJ_CHANGE_' + options.name, { name: options.name, prop, value, deleted }).catch(msgOptions.log);
        });

        comms.send({
          message: 'Change on distObj ' + options.name + ' registered',
          prop,
        });
       
      });


      on('$$MSG_GET_DISTOBJ_' + options.name, function(data, comms){
        const subDistObjs = [];
        function checkVal(key, val) {
          if (typeof val === 'object') {
            subDistObjs.push(key);
            Object.keys(val).forEach(k => checkVal(key + '\\' + k, val[k]));
          }
        }

        
        Object.assign(store, data.value);
        comms.send(store);
        Object.keys(store).forEach(k => checkVal(options.name + '\\' + k, store[k]));

        comms.connection.followingDistObjs = Object.assign(
          {},
          comms.connection.followingDistObjs,
          {[options.name]: true},
          subDistObjs.reduce((p, c) => {
            p[c] = true;
            return p;
          }, {})
        );

        msgOptions.log('onNew1', options.onNew)
        options.onNew.forEach(fn => fn({data, connection: comms.connection}));
      });

      on('$$MSG_GET_DISTOBJ_' + options.name + '_$$MSG_NEW', function(data, comms){
        const split = data.name.split('\\');
        const newProp = split.pop();
        const distObjName = split.join('\\');

        if (!msgOptions.wsRoutes[route].distObjs[distObjName][newProp]) msgOptions.wsRoutes[route].distObjs[distObjName][newProp] = data.value;
        // Object.assign(msgOptions.wsRoutes[route].distObjs[distObjName][newProp], data.value);
        
        comms.connection.followingDistObjs = Object.assign(
          {},
          comms.connection.followingDistObjs,
          {[data.name]: true}
        );



        comms.send(msgOptions.wsRoutes[route].distObjs[distObjName][newProp]);
        options.onNew.forEach(fn => fn({data, connection: comms.connection, newName: data.name, newProp}));
      });

      const onChange = function(fn){
        options.onChange.push(fn);  
      };

      return {
        data: store,
        onChange,
        onNew: function(fn){options.onNew.push(fn);},
        options,
        beforeUpdate: () => {},
        afterUpdate: () => {},
        beforeNextUpdate: () => {},
        afterNextUpdate: () => {},
      };
    };

    // onEvt('open', function(connection){
    // });

    // onEvt('close', function(connection){
    // });


    return {
      on: on,
      onEvt: onEvt,
      connections: msgOptions.wsRoutes[route].connections,
      connectionsByKey: msgOptions.wsRoutes[route].connectionsByKey,
      distObj,
    };
  };
};
