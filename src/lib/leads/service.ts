import { supabaseRequest } from "@/src/lib/supabase/server";
export type LeadRecord=Record<string,unknown>&{id:string;instagram_username:string};
export async function getLeads(){return supabaseRequest<LeadRecord[]>("leads?select=*&order=created_at.desc");}
export async function getLead(id:string){const rows=await supabaseRequest<LeadRecord[]>(`leads?id=eq.${encodeURIComponent(id)}&select=*`);return rows[0]??null;}
export async function createLead(input:Record<string,unknown>){return(await supabaseRequest<LeadRecord[]>("leads",{method:"POST",body:JSON.stringify(input)}))[0];}
export async function updateLead(id:string,input:Record<string,unknown>){return(await supabaseRequest<LeadRecord[]>(`leads?id=eq.${encodeURIComponent(id)}`,{method:"PATCH",body:JSON.stringify({...input,updated_at:new Date().toISOString()})}))[0];}
export async function addLeadActivity(leadId:string,type:string,content?:string,metadata:Record<string,unknown>={}){return(await supabaseRequest<Record<string,unknown>[]>("lead_activities",{method:"POST",body:JSON.stringify({lead_id:leadId,type,content,metadata})}))[0];}
export async function getLeadActivities(leadId:string){return supabaseRequest<Record<string,unknown>[]>(`lead_activities?lead_id=eq.${encodeURIComponent(leadId)}&select=*&order=created_at.desc`);}
