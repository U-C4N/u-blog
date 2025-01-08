import { headers } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import AddPromptButton from "./add-prompt-button";
import { Prompt } from "@/lib/supabase/config";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import EditPromptDialog from "./edit-prompt-dialog";
import DeletePromptButton from "./delete-prompt-button";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export default async function PromptsPage() {
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  const { data: prompts } = await supabase
    .from("prompts")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link
            href="/adminos/dashboard"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Link>
          <h1 className="text-2xl font-bold">Prompts</h1>
        </div>
        <AddPromptButton />
      </div>
      
      <div className="grid gap-4">
        {prompts?.map((prompt: Prompt) => (
          <div key={prompt.id} className="bg-white p-4 rounded-lg shadow">
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-medium">{prompt.title}</h3>
              <div className="flex gap-2">
                <EditPromptDialog prompt={prompt} />
                <DeletePromptButton promptId={prompt.id} />
              </div>
            </div>
            <p className="text-gray-600">{prompt.content}</p>
          </div>
        ))}
      </div>
    </div>
  );
} 