import NextImage from "next/image";
import Link from "next/link";
import { supabase, Prompt } from "@/lib/supabase/config";
import AddPromptButton from "./add-prompt-button";
import EditPromptDialog from "./edit-prompt-dialog";
import DeletePromptButton from "./delete-prompt-button";
import CopyPromptButton from "./copy-prompt-button";
import { ArrowLeft, MessageSquare, Image as ImageIcon, Clock } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function PromptsPage() {
  
  const { data: prompts } = await supabase
    .from("prompts")
    .select("*")
    .order("created_at", { ascending: false });

  const totalPrompts = prompts?.length ?? 0;
  const promptsWithImages = prompts?.filter((prompt) => Boolean(prompt.image_url)).length ?? 0;
  const lastUpdatedRaw = prompts?.[0]?.updated_at ?? prompts?.[0]?.created_at;
  const lastUpdated = lastUpdatedRaw ? formatDate(lastUpdatedRaw) : "—";

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/adminos/dashboard">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Dashboard
              </Link>
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">AI Prompts</h1>
              <p className="text-muted-foreground">Manage your collection of AI prompts</p>
            </div>
          </div>
          <AddPromptButton />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{totalPrompts}</p>
                  <p className="text-sm text-muted-foreground">Total Prompts</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-green-500" />
                <div>
                  <p className="text-2xl font-bold">{promptsWithImages}</p>
                  <p className="text-sm text-muted-foreground">Prompts with Images</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold">{lastUpdated}</p>
                  <p className="text-sm text-muted-foreground">Latest Update</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Prompts Grid */}
        {prompts && prompts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {prompts.map((prompt: Prompt) => (
              <Card
                key={prompt.id}
                className="group overflow-hidden hover:shadow-lg transition-all duration-200 border-border/50 hover:border-border"
              >
                {prompt.image_url && (
                  <div className="relative h-40 w-full border-b border-border/60">
                    <NextImage
                      src={prompt.image_url}
                      alt={prompt.title}
                      fill
                      sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
                      className="object-cover"
                    />
                  </div>
                )}
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg font-semibold line-clamp-2 group-hover:text-primary transition-colors">
                        {prompt.title}
                      </CardTitle>
                      {prompt.created_at && (
                        <CardDescription className="mt-1">
                          {formatDate(prompt.created_at)}
                        </CardDescription>
                      )}
                    </div>
                    <div className="flex items-center gap-1 ml-2">
                      <EditPromptDialog prompt={prompt} />
                      <DeletePromptButton promptId={prompt.id} />
                    </div>
                  </div>
                </CardHeader>
                <Separator className="mx-6" />
                <CardContent className="pt-4">
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground line-clamp-4 leading-relaxed">
                      {prompt.content}
                    </p>
                    
                    <div className="flex items-center justify-between pt-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          AI Prompt
                        </Badge>
                        {prompt.image_url && (
                          <Badge variant="outline" className="text-xs">
                            Image attached
                          </Badge>
                        )}
                      </div>
                      <CopyPromptButton content={prompt.content} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-12">
            <div className="text-center">
              <MessageSquare className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
              <h3 className="text-xl font-semibold mb-2">No prompts yet</h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Get started by creating your first AI prompt. Build a collection of useful prompts for your workflow.
              </p>
              <AddPromptButton />
            </div>
          </Card>
        )}
      </div>
    </div>
  );
} 
