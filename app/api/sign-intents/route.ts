import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { currentSigner, relyingParty } from '../../../../lib/webauthn';
import { db } from '../../../../lib/db';
import { sha256 } from '../../../../lib/evidence';
import { putPdf, deletePdf } from '../../../../lib/r2';

export const runtime = 'nodejs';
const consent = 'Declaro que li o documento selecionado e concordo em registrar minha assinatura eletrônica e as evidências desta operação.';

export async function POST(request: Request) {
 const signer = await currentSigner();
 if (!signer) return NextResponse.json({ error: 'authentication_required' }, { status: 401 });
 let origin: string;
 try { origin = relyingParty().origin; } catch { return NextResponse.json({ error: 'webauthn_not_configured' }, { status: 503 }); }
 if (request.headers.get('origin') !== origin) return NextResponse.json({ error: 'invalid_origin' }, { status: 403 });
 if (!(request.headers.get('content-type') ?? '').includes('multipart/form-data')) return NextResponse.json({ error: 'multipart_required' }, { status: 415 });
 if (Number(request.headers.get('content-length') || 0) > 8 * 1024 * 1024) return NextResponse.json({ error: 'file_too_large' }, { status: 413 });
 let form: FormData;
 try { form = await request.formData(); } catch { return NextResponse.json({ error: 'invalid_form' }, { status: 400 }); }
 const file = form.get('file');
 if (!(file instanceof File) || form.get('consent') !== 'yes') return NextResponse.json({ error: 'file_and_consent_required' }, { status: 400 });
 if (file.size < 8 || file.size > 5 * 1024 * 1024) return NextResponse.json({ error: 'invalid_file_size' }, { status: 413 });
 const pdf = new Uint8Array(await file.arrayBuffer());
 if (new TextDecoder().decode(pdf.slice(0,5)) !== '%PDF-') return NextResponse.json({ error: 'not_a_pdf' }, { status: 415 });
 const id = randomUUID(), objectKey = `pending/${id}.pdf`, now = new Date(), expiresAt = new Date(now.getTime() + 5 * 60000);
 const hash = sha256(pdf);
 const client = db();
 try {
  const credentials = await client.execute({ sql: 'SELECT 1 FROM webauthn_credentials WHERE signer_id = ? LIMIT 1', args: [signer.id] });
  if (!credentials.rows.length) return NextResponse.json({ error: 'passkey_required' }, { status: 409 });
  const pending = await client.execute({ sql: "SELECT COUNT(*) AS n FROM signing_intents WHERE signer_id = ? AND status = 'pending' AND expires_at > ?", args: [signer.id, now.toISOString()] });
  if (Number(pending.rows[0]?.n ?? 0) >= 5) return NextResponse.json({ error: 'too_many_pending_intents' }, { status: 429 });
  await putPdf(objectKey, pdf);
  try {
   await client.execute({ sql: 'INSERT INTO signing_intents (id,signer_id,signer_email,document_sha256,consent_sha256,object_key,file_name,created_at,expires_at) VALUES (?,?,?,?,?,?,?,?,?)',
    args: [id, signer.id, signer.email, hash, sha256(new TextEncoder().encode(consent)), objectKey, file.name.slice(0,255), now.toISOString(), expiresAt.toISOString()] });
  } catch (error) { await deletePdf(objectKey).catch(() => {}); throw error; }
  return NextResponse.json({ intentId: id, sha256: hash, expiresAt: expiresAt.toISOString() }, { status: 201, headers: { 'Cache-Control': 'no-store' } });
 } catch { return NextResponse.json({ error: 'intent_unavailable' }, { status: 503 }); }
}
