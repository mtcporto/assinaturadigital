import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
const bucket = () => { const value=process.env.R2_BUCKET; if(!value) throw new Error('R2_BUCKET not configured'); return value; };
function client() {
 const account=process.env.R2_ACCOUNT_ID, accessKeyId=process.env.R2_ACCESS_KEY_ID, secretAccessKey=process.env.R2_SECRET_ACCESS_KEY;
 if(!account||!accessKeyId||!secretAccessKey) throw new Error('R2 credentials not configured');
 return new S3Client({region:'auto',endpoint:`https://${account}.r2.cloudflarestorage.com`,credentials:{accessKeyId,secretAccessKey}});
}
export async function putPdf(key:string,body:Uint8Array) { await client().send(new PutObjectCommand({Bucket:bucket(),Key:key,Body:body,ContentType:'application/pdf'})); }
export async function deletePdf(key:string) { await client().send(new DeleteObjectCommand({Bucket:bucket(),Key:key})); }
export async function getPdf(key:string) { const result=await client().send(new GetObjectCommand({Bucket:bucket(),Key:key})); if(!result.Body) throw new Error('Empty R2 object'); return new Uint8Array(await result.Body.transformToByteArray()); }
