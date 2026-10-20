import { auth } from '../../auth';
import { redirect } from 'next/navigation';
import { InviteForm } from './invite-form';
export default async function InvitePage(){
 const session=await auth();
 if(!session?.user?.id) redirect('/login');
 return <main><section className="hero"><span className="eyebrow">Assinatura por terceiros</span><h1>Enviar para assinatura</h1><p className="lead">Prepare um documento e crie um convite individual para um destinatário.</p></section><InviteForm/></main>;
}
