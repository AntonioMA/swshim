'use strict';

(function() {

  var count = 0;

  function debug(str) {
    console.log("CJC APP -*-:" + str);
  }

  console.log('nos vamos a dar un castañazo');

  if (!('serviceWorker' in navigator)) {
    debug('navigator has not ServiceWorker');
    return;
  }

  var register = function(evt) {
    debug('executing register...');
    navigator.serviceWorker.register('sw.js', {scope: '/swshim/'}
    ).then(function(reg) {
      debug('Registration succeeded. Scope: ' + reg.scope);
      if (reg.installing) {
        debug('registration --> installing');
      } else if (reg.waiting) {
        debug('registration --> waiting');
      } else if (reg.active) {
        debug('registration --> active');
      }
    }).catch(function(error) {
      debug('Registration failed with ' + error);
    });
  };

  var unregister = function(evt) {
    debug('Unregister...');
    navigator.serviceWorker.getRegistrations().then(function(registrations) {
      registrations.forEach(function (registration) {
        registration.unregister();
        debug('Unregister done');
      });
    });
  };

  function sendMessageByIAC() {
    debug("sendMessageByIAC not implemented yet!");
  }

  function generateNewUUID() {
    var d = new Date().getTime();
    var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = (d + Math.random()*16)%16 | 0;
        d = Math.floor(d/16);
        return (c=='x' ? r : (r&0x3|0x8)).toString(16);
    });
    debug('generateNewUUID(): ' + uuid);
    return uuid;
  }

  // This should be in navigator_connect_shim_svr.js
  // When iac connection message is received this has to be executed
  var sendConnectionMessage = function () {
    debug('sendConnectionMessage!!');
    navigator.serviceWorker.getRegistrations().then(function(regs) {
      debug('Got regs: ' + JSON.stringify(regs));
      regs.forEach(reg => {
        debug('Got reg: ' + JSON.stringify(reg.active));
        // We need to create a dedicated MessageChannel to get the answer back
        var messageChannel = new MessageChannel();
        messageChannel.port1.onmessage = function(event) {
          // We will get the answer here. To do the complete flow, this can be encapsulated on a Promise or whatever we need
          // At this point, just log the response
          if (event.data.error) {
            debug("Got an error as a response: " + event.data.error);
          } else {
            debug("Got an answer for the request!: " + JSON.stringify(event.data));
            // Here I have to check if the connection was accepted...
            if (event.data.accepted) {
              // And then I have to store the messageport (messageChannel.port1) associated to this connection
              // and answer to the client telling him the ID that I have generated for this connection and that the answer was accepted
              // Something like:
              var newConnectionId = generateNewUUID();
              connections[newConnectionId] = messageChannel.port1;
              // And replace the event handler to process messages!
              messageChannel.port1.onmessage = function(messageEvent) {
                // Here we have to pass this message to the other side of the IAC connection...
                sendMessageByIAC(newConnectionId, messageEvent);
              };
            }
          }
        };

        // We must construct a structure here to indicate our sw partner that
        var message = {
          isFromIAC: true,
          data: "Hello from the main thread!",
          count: count++
        };
        // This sends the message data as well as transferring messageChannel.port2 to the service worker.
        // The service worker can then use the transferred port to reply via postMessage(), which
        // will in turn trigger the onmessage handler on messageChannel.port1.
        // See https://html.spec.whatwg.org/multipage/workers.html#dom-worker-postmessage
        reg.active && reg.active.postMessage(message, [messageChannel.port2]);
      });
    });
  };

  window.addEventListener('load', function () {
    debug('Document loaded!');
    var regBto = document.querySelector('#regBto');
    var unRegBto = document.querySelector('#unregBto');
    var sendMessageBto = document.querySelector('#sendMsgBto');
    regBto.addEventListener('click', register);
    unRegBto.addEventListener('click', unregister);
    sendMessageBto.addEventListener('click', sendConnectionMessage);
  });
})();
