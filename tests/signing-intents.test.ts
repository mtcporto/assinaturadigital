import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createClient } from '@libsql/client';
import { randomUUID } from 'node:crypto';

async function fixture() {
 const client = createClient({ url: ':memory:' });
 await client.batch([
  'CREATE TABLE signing_intents (id TEXT PRIMARY KEY, signer_id TEXT, status TEXT, consumed_at TEXT, expires_at TEXT, document_id TEXT UNIQUE)',
  'CREATE TABLE webauthn_challenges (id TEXT PRIMARY KEY, signer_id TEXT, consumed_at TEXT, expires_at TEXT)',
  'CREATE TABLE documents (id TEXT PRIMARY KEY, intent_id TEXT UNIQUE)'
 ], 'write');
 const id = randomUUID(), signer = 'google:test', now = new Date();
 await client.execute({ sql: "INSERT INTO signing_intents (id,signer_id,status,expires_at) VALUES (?,?,'pending',?)", args: [id,signer,new Date(now.getTime()+60000).toISOString()] });
 await client.execute({ sql: 'INSERT INTO webauthn_challenges (id,signer_id,expires_at) VALUES (?,?,?)', args: [id,signer,new Date(now.getTime()+60000).toISOString()] });
 return {client,id,signer};
}
test('challenge is single-use even under concurrent consumption', async () => {
 const {client,id,signer} = await fixture();
 const consume = () => client.execute({sql:'UPDATE webauthn_challenges SET consumed_at = ? WHERE id = ? AND signer_id = ? AND consumed_at IS NULL AND expires_at > ? RETURNING id',args:[new Date().toISOString(),id,signer,new Date().toISOString()]});
 const results = await Promise.all([consume(),consume()]);
 assert.equal(results.filter(r=>r.rows.length===1).length,1);
 client.close();
});
test('expired challenge and intent cannot be consumed', async () => {
 const {client,id,signer}=await fixture();
 await client.execute({sql:'UPDATE webauthn_challenges SET expires_at = ? WHERE id = ?',args:['2000-01-01T00:00:00.000Z',id]});
 await client.execute({sql:'UPDATE signing_intents SET expires_at = ? WHERE id = ?',args:['2000-01-01T00:00:00.000Z',id]});
 const challenge=await client.execute({sql:'UPDATE webauthn_challenges SET consumed_at = ? WHERE id = ? AND signer_id = ? AND consumed_at IS NULL AND expires_at > ? RETURNING id',args:[new Date().toISOString(),id,signer,new Date().toISOString()]});
 const intent=await client.execute({sql:"UPDATE signing_intents SET status='completed',consumed_at=?,document_id=? WHERE id=? AND signer_id=? AND status='pending' AND consumed_at IS NULL AND expires_at > ? RETURNING id",args:[new Date().toISOString(),randomUUID(),id,signer,new Date().toISOString()]});
 assert.equal(challenge.rows.length,0);
 assert.equal(intent.rows.length,0);
 client.close();
});
test('concurrent finalization creates exactly one document', async () => {
 const {client,id,signer}=await fixture();
 const finalize = async () => {
  const docId=randomUUID(), now=new Date().toISOString();
  try {
   const results=await client.batch([
    {sql:"UPDATE signing_intents SET status='completed',consumed_at=?,document_id=? WHERE id=? AND signer_id=? AND status='pending' AND consumed_at IS NULL AND expires_at > ? RETURNING id",args:[now,docId,id,signer,now]},
    {sql:"INSERT INTO documents (id,intent_id) SELECT ?,? WHERE EXISTS (SELECT 1 FROM signing_intents WHERE id=? AND document_id=? AND status='completed')",args:[docId,id,id,docId]}
   ],'write');
   return results[0].rows.length;
  } catch { return 0; }
 };
 const results=await Promise.all([finalize(),finalize()]);
 assert.deepEqual(results.sort(),[0,1]);
 const docs=await client.execute({sql:'SELECT COUNT(*) AS n FROM documents'});
 assert.equal(Number(docs.rows[0].n),1);
 client.close();
});
