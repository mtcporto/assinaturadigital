import { headers } from 'next/headers';
export default async function VerifyPage({params}:{params:Promise<{id:string}>}) {
 const {id}=await params;
 return <main><h1>Verificar evidências</h1><p>Identificador: <code>{id}</code></p><p>Consulte o registro autenticado no endpoint <a href={`/api/verify/${encodeURIComponent(id)}`}>Verificar registro</a>.</p><p>Para confirmar que um PDF corresponde ao registro, compare seu SHA-256 com o hash retornado. A validação do registro isoladamente não verifica os bytes de um PDF apresentado.</p></main>;
}
