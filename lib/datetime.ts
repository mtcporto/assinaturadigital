export function dateTimeBR(value:string):string{
 const d=new Date(value);
 return Number.isNaN(d.getTime())?value:new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',hour12:false,timeZone:'America/Sao_Paulo'}).format(d);
}
