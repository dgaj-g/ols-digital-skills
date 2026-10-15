// quick engine smoke (not a gate): solo help order, then a pair over a 2 s lagged bus
var E = require('../../../platform/assets/twolights/engine.js');
var t = 1e6, q = [];
var T = { now: function () { return t; }, setTimeout: function (f, d) { q.push([t + d, f]); } };
function adv(ms) { var end = t + ms; for (;;) { q.sort(function (a, b) { return a[0] - b[0]; }); if (!q.length || q[0][0] > end) break; var x = q.shift(); t = x[0]; x[1](); } t = end; }
var J = JSON.stringify;
var e = E.makeEngine({ seat: 'A', seats: ['A', 'B'], room: 'abc123def456', stage: 'ch1', mode: 'solo', clock: T });
e.run(); adv(45000); e.tick(); console.log('solo help', J(e.help()));
var lines = e.code().split('\n'); lines[8] = 'lamp_on()'; e.edit(lines.join('\n'), 9); e.run();
console.log('after name fix', J(e.bar()), J(e.help()));
var bus = E.makeLocalBus(2000, T), ea = bus.endpoint(), eb = bus.endpoint();
var a = E.makeEngine({ seat: 'A', seats: ['A', 'B'], room: 'r1', stage: 'ch2', bus: ea, clock: T }); ea.on(a.receive);
var b = E.makeEngine({ seat: 'B', seats: ['A', 'B'], room: 'r1', stage: 'ch2', bus: eb, clock: T }); eb.on(b.receive);
a.hello(); b.hello(); adv(3000);
a.run(); adv(3000); a.tick(); b.tick(); console.log('B bar', J(b.bar()), 'A bar', J(a.bar()));
adv(30000); a.tick(); b.tick(); console.log('B bar after 30 s', J(b.bar()));
b.radio('A', 'horn'); adv(2500); console.log('A bar', J(a.bar()), J(a.help()));
var c = a.code().split('\n'); c.push('fog_horn()'); a.edit(c.join('\n'), c.length); a.run(); adv(2500); a.tick(); b.tick();
console.log('A done', a.seatDone('A'), 'B sees', J(b.windowSeats()), J(b.presence()));
