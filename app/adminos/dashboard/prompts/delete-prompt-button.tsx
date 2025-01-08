"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

interface DeletePromptButtonProps {
  promptId: string;
}

export default function DeletePromptButton({ promptId }: DeletePromptButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient(supabaseUrl, supabaseKey);

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this prompt?")) return;
    
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from("prompts")
        .delete()
        .eq("id", promptId);

      if (error) throw error;
      router.refresh();
    } catch (error) {
      console.error("Error deleting prompt:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      className="text-red-500 hover:text-red-600 hover:bg-red-50"
      onClick={handleDelete}
      disabled={isLoading}
    >
      <Trash2 className="w-4 h-4" />
    </Button>
  );
} 