import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const TeacherAiSetup = () => {
  const navigate = useNavigate();
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("meta-llama/llama-3.3-70b-instruct");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!apiKey.trim()) {
      toast.error("Voer een API key in");
      return;
    }

    setIsSubmitting(true);

    try {
      const { data, error } = await supabase.functions.invoke('save-ai-config', {
        body: { apiKey, model }
      });

      if (error) throw error;

      if (data.success) {
        toast.success("AI-configuratie succesvol opgeslagen!");
        navigate("/teacher");
      } else {
        toast.error(data.message || "Fout bij opslaan");
      }
    } catch (error) {
      console.error('Error saving AI config:', error);
      toast.error("Fout bij opslaan van configuratie");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 p-4 md:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold">AI Configuratie</h1>
          <p className="text-muted-foreground">Stel de AI-instellingen in voor opdracht-analyse en feedback</p>
        </div>

        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Je API key wordt veilig opgeslagen op de server en is nooit zichtbaar voor leerlingen of in de frontend code.
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              OpenRouter API Instellingen
            </CardTitle>
            <CardDescription>
              Configureer je OpenRouter API key en kies een AI-model voor opdracht-analyse
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="apiKey">OpenRouter API Key</Label>
                <Input
                  id="apiKey"
                  type="password"
                  placeholder="sk-or-v1-..."
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  autoComplete="off"
                />
                <p className="text-xs text-muted-foreground">
                  Nog geen API key? Maak er een aan op{" "}
                  <a 
                    href="https://openrouter.ai/keys" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    openrouter.ai/keys
                  </a>
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="model">AI Model</Label>
                <Select value={model} onValueChange={setModel}>
                  <SelectTrigger id="model">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="meta-llama/llama-3.3-70b-instruct">
                      Llama 3.3 70B (Aanbevolen - Snel & Goed)
                    </SelectItem>
                    <SelectItem value="anthropic/claude-3.5-sonnet">
                      Claude 3.5 Sonnet (Hoogste kwaliteit)
                    </SelectItem>
                    <SelectItem value="openai/gpt-4o">
                      GPT-4o (Krachtig & Veelzijdig)
                    </SelectItem>
                    <SelectItem value="google/gemini-pro-1.5">
                      Gemini Pro 1.5 (Goede balans)
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Aanbeveling: Llama 3.3 70B voor goede kwaliteit tegen lage kosten
                </p>
              </div>

              <div className="flex gap-2 pt-4">
                <Button type="submit" disabled={isSubmitting} className="flex-1">
                  {isSubmitting ? "Bezig met opslaan..." : "Opslaan & Doorgaan"}
                </Button>
                <Button 
                  type="button" 
                  variant="ghost" 
                  onClick={() => navigate("/")}
                  disabled={isSubmitting}
                >
                  Annuleren
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <strong>Privacybescherming:</strong> De API key wordt versleuteld opgeslagen en alleen gebruikt voor:
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Analyseren van opdrachtteksten voor beoordelingscriteria</li>
              <li>Genereren van feedback voor leerlingen (indien ingeschakeld)</li>
            </ul>
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
};

export default TeacherAiSetup;
