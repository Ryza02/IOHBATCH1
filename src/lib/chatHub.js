import { EventEmitter } from "events";

const emitter = new EventEmitter();
emitter.setMaxListeners(1000);

export function subscribe(roomId, cb) {
  const ch = String(roomId);
  const h = (payload) => cb(payload);
  emitter.on(ch, h);
  return () => emitter.off(ch, h);
}

export function publishMessage(roomId, msg) {
  emitter.emit(String(roomId), msg);
}

export function publishDelete(roomId, id) {
  emitter.emit(String(roomId), { kind: "delete", id });
}

export function publishClear(roomId) {
  emitter.emit(String(roomId), { kind: "clear" });
}
