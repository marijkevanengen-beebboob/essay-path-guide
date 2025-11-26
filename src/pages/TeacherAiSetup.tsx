import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";

const AI_MODELS = [
  { id: "google/gemini-2.0-flash-exp:free", label: "Gemini 2.0 Flash (Gratis, Aanbevolen)" },
  { id: "google/gemini-pro", label: "Gemini Pro" },
  { id: "openai/gpt-4o-mini", label: "GPT-4o Mini" },
  { id: "openai/gpt-4o", label: "GPT-4o" },
];

// Simple encoding (not cryptographically secure, but obscures the key)
const encodeKey = (key: string): string => {
  return btoa(key);
};

export default function TeacherAiSetup() {
  const navigate = useNavigate();
  const [apiKey, setApiKey] = useState("");
  const [selectedModel, setSelectedModel] = useState(AI_MODELS[0].id);

  const handleSave = () => {
    if (!apiKey.trim()) {
      toast.error("Voer een geldige API-key in");
      return;
    }

    // Save encoded key and model to localStorage
    const config = {
      apiKey: encodeKey(apiKey),
      model: selectedModel,
    };

    localStorage.setItem("ai_config", JSON.stringify(config));
    toast.success("AI-instellingen opgeslagen!");
    navigate("/teacher");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4 flex items-center justify-center">
      <Card className="w-full max-w-2xl shadow-lg">
        <CardHeader>
          <CardTitle className="text-3xl font-bold">AI-instellingen voor PUNT!</CardTitle>
          <CardDescription>
            Configureer je OpenRouter instellingen om AI-feedback te gebruiken
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="api-key">OpenRouter API-key</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="text-sm">
                      Je voert hier je persoonlijke OpenRouter API-sleutel in.
                      Deze sleutel wordt gebruikt om AI-feedback te genereren voor PUNT!.
                      De sleutel wordt lokaal in je browser opgeslagen (niet op een server).
                      Leerlingen hebben geen toegang tot deze sleutel.
                    </p>
                    <p className="text-sm mt-2">
                      <strong>Let op:</strong> In een educatieve setting is dit acceptabel, 
                      maar voor productiegebruik raden we een echte backend aan.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Input
              id="api-key"
              type="password"
              placeholder="sk-or-v1-..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              autoComplete="off"
            />
            <p className="text-xs text-muted-foreground">
              Geen API-key? Maak er een aan op{" "}
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
            <div className="flex items-center gap-2">
              <Label htmlFor="model">Kies AI-model</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="text-sm">
                      Het gekozen model bepaalt hoe uitgebreid en snel de AI reageert.
                      Gemini 2.0 Flash is gratis en wordt aanbevolen voor educatief gebruik.
                      Je kunt dit later aanpassen door terug te gaan naar deze pagina.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Select value={selectedModel} onValueChange={setSelectedModel}>
              <SelectTrigger id="model">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AI_MODELS.map((model) => (
                  <SelectItem key={model.id} value={model.id}>
                    {model.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-3 pt-4">
            <Button onClick={handleSave} className="flex-1">
              Opslaan & verder
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate("/teacher")}
              className="flex-1"
            >
              Overslaan (AI uitgeschakeld)
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
