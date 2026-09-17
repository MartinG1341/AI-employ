import { supabaseRequest } from "@/src/lib/supabase/server";
export type LeadRecord=Record<string,unknown>&{id:string;instagram_username:string};
export async function getLeads(){return supabaseRequest<LeadRecord[]>("sales_leads?select=*&app_id=eq.sales_copilot&order=created_at.desc");}
export async function getLead(id:string){const rows=await supabaseRequest<LeadRecord[]>(`sales_leads?id=eq.${encodeURIComponent(id)}&app_id=eq.sales_copilot&select=*`);return rows[0]??null;}
export async function createLead(input:Record<string,unknown>){return(await supabaseRequest<LeadRecord[]>("sales_leads",{method:"POST",body:JSON.stringify({...input,app_id:"sales_copilot"})}))[0];}
export async function updateLead(id:string,input:Record<string,unknown>){return(await supabaseRequest<LeadRecord[]>(`sales_leads?id=eq.${encodeURIComponent(id)}&app_id=eq.sales_copilot`,{method:"PATCH",body:JSON.stringify({...input,updated_at:new Date().toISOString()})}))[0];}
export async function addLeadActivity(leadId:string,type:string,content?:string,metadata:Record<string,unknown>={}){return(await supabaseRequest<Record<string,unknown>[]>("sales_lead_activities",{method:"POST",body:JSON.stringify({app_id:"sales_copilot",lead_id:leadId,type,content,metadata})}))[0];}
export async function getLeadActivities(leadId:string){return supabaseRequest<Record<string,unknown>[]>(`sales_lead_activities?lead_id=eq.${encodeURIComponent(leadId)}&app_id=eq.sales_copilot&select=*&order=created_at.desc`);}
