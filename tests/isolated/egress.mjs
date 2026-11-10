// Applied only to disposable build/server/test processes, never production.
import net from 'node:net';
import http from 'node:http';
import https from 'node:https';
import { syncBuiltinESMExports } from 'node:module';

function allowedHost(host) {
  return ['127.0.0.1', 'localhost', '::1', '[::1]'].includes(host);
}
function assertDestination(value) {
  const url = new URL(typeof value === 'string' || value instanceof URL ? value : value.url);
  if (!['http:', 'https:', 'ws:', 'wss:'].includes(url.protocol) || !allowedHost(url.hostname)) {
    throw new Error('Isolated process blocked external network destination');
  }
}
const originalFetch = globalThis.fetch;
globalThis.fetch = function (input, options) {
  assertDestination(input);
  // Do not let an allowed endpoint redirect to a real service.
  return originalFetch(input, { ...options, redirect: 'error' });
};
for (const transport of [http, https]) {
  for (const method of ['request', 'get']) {
    const original = transport[method];
    transport[method] = function (input, ...args) {
      if (typeof input === 'string' || input instanceof URL) assertDestination(input);
      else if (!allowedHost(input.hostname || input.host || 'localhost')) {
        throw new Error('Isolated process blocked external HTTP destination');
      }
      return original.call(this, input, ...args);
    };
  }
}
const originalConnect = net.Socket.prototype.connect;
net.Socket.prototype.connect = function (...args) {
  const options = Array.isArray(args[0]) ? args[0][0] : args[0];
  const host = typeof options === 'object' ? options.host : typeof args[1] === 'string' ? args[1] : 'localhost';
  if (host && !allowedHost(host)) throw new Error('Isolated process blocked external socket destination');
  return originalConnect.apply(this, args);
};
syncBuiltinESMExports();
