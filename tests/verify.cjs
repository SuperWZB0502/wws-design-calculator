const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
assert.match(html, /万唯嗣设计计算系统/);
const raw = html.match(/<script id="workbook" type="application\/json">([\s\S]*?)<\/script>/);
assert.ok(raw, '网页中必须包含完整计算数据');
const data = JSON.parse(raw[1]);
const script = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)][0];
assert.ok(script, '网页中必须包含离线计算引擎');
const context = vm.createContext({});
vm.runInContext(script[1], context);
const engine = new context.Engine(data);
const near = (a, b) => assert.ok(typeof a === 'number' && Math.abs(a-b) <= Math.max(1e-7, Math.abs(b)*1e-9), `${a} != ${b}`);
assert.equal(data.sheets.length, 10);
assert.equal(data.groups.length, 47);
let formulas = 0, compared = 0;
for (const sheet of data.sheets) {
  for (const cell of sheet.cells) {
    if (!cell.f) continue;
    formulas++;
    const value = engine.get(sheet.name, cell.a);
    assert.ok(!value?.error, `${sheet.name}!${cell.a}: ${value?.error}`);
    if (cell.v === null || cell.v === undefined) continue;
    compared++;
    if (typeof cell.v === 'number') near(value, cell.v);
    else assert.equal(String(value ?? ''), String(cell.v), `${sheet.name}!${cell.a}`);
  }
}
assert.equal(formulas, 785);
assert.equal(compared, 616);
engine.set('振动筛', 'B2', 4);
near(engine.get('振动筛', 'B17'), 804.65);
engine.set('收尘器', 'B2', 36000);
near(engine.get('收尘器', 'I3'), 39600);
engine.set('收尘器', 'B2', 18000);
engine.set('收尘器', 'B3', 5);
near(engine.get('收尘器', 'I1'), 600);
engine.set('收尘器', 'B3', 10);
near(engine.get('收尘器', 'I1'), 375);
engine.set('皮带机', 'B2', 1500);
near(engine.get('皮带机斜槽气力输送', 'A13'), 1500);
assert.equal(engine.eval('振动筛', '=IF(0,1/0,7)'), 7);
assert.equal(engine.eval('振动筛', '=1/0').error, '#DIV/0!');
console.log(`PASS: ${data.sheets.length} modules, ${data.groups.length} calculators, ${formulas} formulas, ${compared} cached results, and input-change checks`);
