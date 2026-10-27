import test from 'node:test';
import assert from 'node:assert/strict';
import { validateMessage } from '../lib/message-validation.ts';
test('trims valid bilingual content',()=>assert.deepEqual(validateMessage({name:' 江涛 ',body:' 我的第一条留言 '}),{name:'江涛',body:'我的第一条留言'}));
test('rejects malformed, empty or oversized fields',()=>{
 for(const value of [null,[],{}, {name:5,body:'a'}, {name:'a',body:' '}, {name:'x'.repeat(31),body:'a'}, {name:'a',body:'x'.repeat(501)}]) assert.equal(validateMessage(value),null);
});
test('accepts exact length limits as text',()=>assert(validateMessage({name:'x'.repeat(30),body:'x'.repeat(500)})));
