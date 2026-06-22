import type { NomosHandler } from "../middleware/core";
import { createDtoValidator } from "../middleware/schema";
import { sendSuccess } from "../response";
import type { DbConnection } from "../../infrastructure/database/connection";
import type { TransactionManager } from "../../infrastructure/database/transaction";
import { AuditLogger } from "../../infrastructure/audit/audit";
import { SystemDataService } from "../../application/system/service";
import { validationError } from "../../domain/shared/errors";

type Dict=Record<string,unknown>;
const backupInput=createDtoValidator<Dict>({confirm:{type:"boolean"},reason:{type:"string",minLength:2,maxLength:80,default:"manual",optional:true}});
const restoreInput=createDtoValidator<Dict>({confirm:{type:"boolean"}});
const migrationPath=createDtoValidator<Dict>({sourcePath:{type:"string",minLength:1,maxLength:2048,optional:true}});
const migrationImport=createDtoValidator<Dict>({sourcePath:{type:"string",minLength:1,maxLength:2048,optional:true},sourceHash:{type:"string",minLength:64,maxLength:64},confirm:{type:"boolean"}});
function valid(result:ReturnType<typeof backupInput>,requestId:string){if(!result.success||!result.data)throw validationError("请求字段不符合合同",requestId,result.errors);return result.data;}

export function systemRouter(db:DbConnection,tx:TransactionManager){
 const service=new SystemDataService(db);
 const listBackups:NomosHandler=(_req,res,ctx)=>sendSuccess(res,200,service.listBackups(),ctx.requestId);
 const createBackup:NomosHandler=async(_req,res,ctx)=>{const input=valid(backupInput(ctx.body),ctx.requestId);const backup=service.createBackup(input.confirm===true,String(input.reason||"manual"));await tx.run((s)=>{new AuditLogger(s).append({action:"system.backup.created",summary:`创建 SQLite 备份 ${backup.fileName}`,metadata:{fileName:backup.fileName,size:backup.size},actor:{type:"user",id:null,name:"本机 Owner"},targetType:"backup",targetId:backup.fileName,requestId:ctx.requestId});});sendSuccess(res,201,backup,ctx.requestId);};
 const inspectBackup:NomosHandler=(_req,res,ctx)=>sendSuccess(res,200,service.inspectBackup(ctx.params.fileName),ctx.requestId);
 const restoreBackup:NomosHandler=async(_req,res,ctx)=>{const input=valid(restoreInput(ctx.body),ctx.requestId);const result=service.restore(ctx.params.fileName,input.confirm===true);await tx.run((s)=>{new AuditLogger(s).append({action:"system.backup.restored",summary:`恢复 SQLite 备份 ${ctx.params.fileName}`,metadata:{protectionBackup:result.protectionBackup.fileName},actor:{type:"user",id:null,name:"本机 Owner"},targetType:"backup",targetId:ctx.params.fileName,requestId:ctx.requestId});});sendSuccess(res,200,result,ctx.requestId);};
 const diagnostics:NomosHandler=(_req,res,ctx)=>sendSuccess(res,200,service.diagnostics(),ctx.requestId);
 const migrationStatus:NomosHandler=(_req,res,ctx)=>sendSuccess(res,200,{candidates:service.legacyCandidates(),imports:db.all<Record<string,unknown>>("SELECT id,source_path,source_hash,source_version,imported_at FROM legacy_imports ORDER BY imported_at DESC")},ctx.requestId);
 const migrationPreview:NomosHandler=(_req,res,ctx)=>{const input=valid(migrationPath(ctx.body||{}),ctx.requestId);sendSuccess(res,200,service.previewLegacy(input.sourcePath as string|undefined),ctx.requestId);};
 const migrationConfirm:NomosHandler=async(_req,res,ctx)=>{const input=valid(migrationImport(ctx.body),ctx.requestId);const report=await tx.run((s)=>{const result=service.importLegacy(s,{sourcePath:input.sourcePath as string|undefined,sourceHash:String(input.sourceHash),confirm:input.confirm===true},ctx.requestId);new AuditLogger(s).append({action:"system.legacy.imported",summary:"确认导入旧版 v9 数据",metadata:{sourceHash:result.sourceHash,imported:result.imported,skipped:result.skipped},actor:{type:"user",id:null,name:"本机 Owner"},targetType:"legacy_import",targetId:result.sourceHash,requestId:ctx.requestId});return result;});sendSuccess(res,201,report,ctx.requestId);};
 const audits:NomosHandler=(_req,res,ctx)=>sendSuccess(res,200,db.all<Record<string,unknown>>("SELECT id,action,summary,actor_type,actor_id,actor_name,target_type,target_id,reason,created_at FROM audit_events ORDER BY created_at DESC LIMIT 200").map((r)=>({id:r.id,action:r.action,summary:r.summary,actor:{type:r.actor_type,id:r.actor_id,name:r.actor_name},targetType:r.target_type,targetId:r.target_id,reason:r.reason,createdAt:r.created_at})),ctx.requestId);
 return{listBackups,createBackup,inspectBackup,restoreBackup,diagnostics,migrationStatus,migrationPreview,migrationConfirm,audits};
}
