import { NextResponse } from "next/server"; import { addLeadActivity,getLeadActivities } from "@/src/lib/leads/service";
export async function GET(_:Request,{params}:{params:Promise<{id:string}>}){try{return NextResponse.json(await getLeadActivities((await params).id))}catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Unable to load activity"},{status:500})}}
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){try{const body=await request.json() as Record<string,unknown>;return NextResponse.json(await addLeadActivity((await params).id,String(body.type||"note"),typeof body.content==="string"?body.content:undefined,body.metadata as Record<string,unknown>||{}))}catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Unable to add activity"},{status:400})}}


