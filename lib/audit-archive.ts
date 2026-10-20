import { randomUUID } from 'node:crypto';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { db } from './db';
import { createAuditSnapshot, verifyAuditSnapshot, type AuditSnapshot, type AuditSnapshotRow } from './audit-snapshot';

function config() {
 const bucket = process.env.R2_AUDIT_BUCKET;
 const account = process.env.R2_ACCOUNT_ID;
 const accessKeyId = process.env.R2_AUDIT_ACCESS_KEY_ID;
 const secretAccessKey = process.env.R2_AUDIT_SECRET_ACCESS_KEY;
 if (!bucket || !account || !accessKeyId || !secretAccessKey)
  throw new Error('R2 audit archive not configured');
 return { bucket, client: new S3Client({region:'auto',endpoint:`https://${account}.r2.cloudflarestorage.com`,credentials:{accessKeyId,secretAccessKey}}) };
}

async function rows(): Promise<AuditSnapshotRow[]> {
 const result = await db().execute('SELECT id, document_id, event_type, actor_id, created_at, details_json FROM audit_events ORDER BY id');
 return result.rows.map(row => ({
  id:String(row.id),document_id:String(row.document_id),event_type:String(row.event_type),
  actor_id:String(row.actor_id),created_at:String(row.created_at),details_json:String(row.details_json)
 }));
}

export async function archiveAuditSnapshot() {
 const records = await rows();
 const snapshot = createAuditSnapshot(records, new Date().toISOString());
 const { bucket, client } = config();
 // Unique immutable-by-convention key; If-None-Match prevents overwriting the same key.
 const key = `audit/v1/${snapshot.createdAt.slice(0,10)}/${randomUUID()}.json`;
 await client.send(new PutObjectCommand({
  Bucket:bucket,Key:key,Body:JSON.stringify(snapshot),ContentType:'application/json',
  IfNoneMatch:'*'
 }));
 return { key, snapshot };
}

export async function checkAuditSnapshot(key: string) {
 if (!/^audit\/v1\/\d{4}-\d{2}-\d{2}\/[0-9a-f-]{36}\.json$/.test(key))
  throw new Error('Invalid archive key');
 const {bucket,client}=config();
 const object=await client.send(new GetObjectCommand({Bucket:bucket,Key:key}));
 if (!object.Body) throw new Error('Empty archive');
 const snapshot=JSON.parse(await object.Body.transformToString()) as AuditSnapshot;
 const current=await rows();
 return {valid:verifyAuditSnapshot(snapshot,current),snapshot,currentEventCount:current.length};
}
