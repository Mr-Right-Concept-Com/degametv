import { supabase } from "@/integrations/supabase/client";
import { invokeFn } from "@/lib/invokeFn";
import { baseCurrencyPricingSchema, creatorContentSchema, rightsDeclarationSchema, type CreatorContentInput } from "@/lib/validations/creatorOS";

export type PublishDraftInput = {
  content: CreatorContentInput;
  pricing: { amount:number; currency:string; replayAmount?:number };
  rights: unknown;
  assetIds?: string[];
  submitForReview?: boolean;
};

export type CreatorAIAssist = "logline" | "synopsis" | "genres" | "tags" | "policy_precheck" | "pricing" | "chapters";

export async function assistCreatorMetadata(operation: CreatorAIAssist, context: Record<string, unknown>) {
  const result = await invokeFn<{output:string;requiresHumanReview:boolean}>("platform-ai", {
    workflowKey: operation === "pricing" ? "creator.pricing" : "creator.metadata",
    operation: "text",
    dataClass: "user_content",
    input: JSON.stringify({ operation, context, instruction: "Return suggestions only. Do not certify ownership, rights, policy compliance, age rating, identity, or legal suitability. The creator must review all output." }),
  });
  if (!result.ok) return { available:false, suggestion:null, reason:result.error ?? "AI assistance is unavailable." };
  return { available:true, suggestion:result.data?.output ?? null, reason:null };
}

export async function createUniversalDraft(input: PublishDraftInput) {
  const content = creatorContentSchema.parse(input.content);
  const pricing = baseCurrencyPricingSchema.parse(input.pricing);
  const rights = rightsDeclarationSchema.parse(input.rights);
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new Error("Sign in to create content.");
  const { data: studio, error: studioError } = await supabase.from("studio_accounts")
    .select("id,base_currency,status").eq("user_id",user.id).eq("status","approved").maybeSingle();
  if (studioError || !studio) throw new Error("An approved creator or studio account is required.");
  if (!studio.base_currency || pricing.currency !== studio.base_currency) throw new Error("Pricing must use your immutable creator base currency.");
  const application = {
    title:content.title, synopsis:content.synopsis, logline:content.logline, type:content.format.toLowerCase(),
    dynamic_metadata:{contentType:content.format,...content,asset_ids:input.assetIds ?? []},
    content_format:content.format, creator_base_currency:studio.base_currency,
    price_amount:pricing.amount, price_currency:pricing.currency,
    replay_price_amount:pricing.replayAmount ?? null, replay_price_currency:pricing.replayAmount == null ? null : pricing.currency,
    territory_rights:rights, rights_status:"DECLARED", submit_for_review:input.submitForReview === true,
  };
  const { data, error } = await supabase.rpc("create_creator_submission",{_application:application});
  if (error) throw new Error(error.message || "Content draft could not be created.");
  return data;
}

export async function publishApprovedContent(contentId: string) {
  const { data, error } = await supabase.rpc("publish_creator_content",{p_content_id:contentId});
  if (error) throw new Error(error.message || "Content could not be published.");
  return data;
}
