import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, Sparkles, Copy, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { getCriteriaForLevel, masterCriteria } from "@/data/masterCriteria";

type Criterion = {
  id: string;
  label: string;
  description: string;
  selected: boolean;
  isAiSuggestion?: boolean;
  isCustom?: boolean;
};

const TeacherConfig = () => {
  const navigate = useNavigate();
  const [level, setLevel] = useState<string>("");
  const [assignmentText, setAssignmentText] = useState("");
  const [studentCount, setStudentCount] = useState("");
  const [criteria, setCriteria] = useState<Criterion[]>([]);
  const [customCriterion, setCustomCriterion] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [generatedLinks, setGeneratedLinks] = useState<string[]>([]);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleAnalyze = async () => {
    if (!level || !assignmentText) {
      toast.error("Selecteer een niveau en voer een opdrachttekst in");
      return;
    }

    // Simulate AI analysis - in production this would call the backend
    toast.success("AI analyseert de opdracht...");
    
    // Get master criteria for selected level
    const masterCriteriaForLevel = getCriteriaForLevel(level);
    
    // Mock AI selection and suggestions - in production this would call OpenRouter API
    // For now, randomly select some master criteria and add mock AI suggestions
    const selectedMasterIds = masterCriteriaForLevel
      .slice(0, Math.min(5, Math.floor(masterCriteriaForLevel.length / 2)))
      .map(c => c.id);
    
    const masterCriteriaList: Criterion[] = masterCriteriaForLevel.map(mc => ({
      id: mc.id,
      label: mc.label,
      description: mc.description,
      selected: selectedMasterIds.includes(mc.id),
      isAiSuggestion: false,
      isCustom: false,
    }));
    
    // Mock AI suggestions based on assignment text
    const mockAiSuggestions: Criterion[] = [
      { id: "ai1", label: "Onderbouwing van standpunt", description: "Specifiek voor dit type opdracht", selected: true, isAiSuggestion: true },
      { id: "ai2", label: "Gebruik van voorbeelden", description: "Concrete voorbeelden ter ondersteuning", selected: true, isAiSuggestion: true },
    ];
    
    setCriteria([...masterCriteriaList, ...mockAiSuggestions]);
  };

  const toggleCriterion = (id: string) => {
    setCriteria(criteria.map(c => c.id === id ? { ...c, selected: !c.selected } : c));
  };

  const addCustomCriterion = () => {
    if (!customCriterion.trim()) return;
    
    const newCriterion: Criterion = {
      id: `custom-${Date.now()}`,
      label: customCriterion,
      description: "Eigen criterium",
      selected: true,
      isCustom: true,
    };
    
    setCriteria([...criteria, newCriterion]);
    setCustomCriterion("");
    setShowCustomInput(false);
    toast.success("Criterium toegevoegd");
  };

  const generateLinks = () => {
    const count = parseInt(studentCount);
    if (!count || count < 1) {
      toast.error("Voer een geldig aantal leerlingen in");
      return;
    }

    const selectedCriteria = criteria.filter(c => c.selected);
    if (selectedCriteria.length === 0) {
      toast.error("Selecteer minimaal één beoordelingscriterium");
      return;
    }

    // Generate unique codes for each student
    const links = Array.from({ length: count }, (_, i) => {
      const code = Math.random().toString(36).substring(2, 10).toUpperCase();
      return `${window.location.origin}/student/${code}`;
    });
    
    setGeneratedLinks(links);
    toast.success(`${count} unieke links gegenereerd!`);
  };

  const copyToClipboard = (link: string, index: number) => {
    navigator.clipboard.writeText(link);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
    toast.success("Link gekopieerd naar klembord");
  };

  const copyAllLinks = () => {
    const allLinks = generatedLinks.join('\n');
    navigator.clipboard.writeText(allLinks);
    toast.success("Alle links gekopieerd naar klembord");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Opdracht Configuratie</h1>
            <p className="text-muted-foreground">Stel je schrijfopdracht samen met AI-ondersteuning</p>
          </div>
        </div>

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Basis Instellingen</CardTitle>
              <CardDescription>Kies het referentieniveau en voer de opdracht in</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="level">Referentieniveau</Label>
                  <Select value={level} onValueChange={setLevel}>
                    <SelectTrigger id="level">
                      <SelectValue placeholder="Selecteer niveau" />
                    </SelectTrigger>
                    <SelectContent>
                      {masterCriteria.map((levelData) => (
                        <SelectItem key={levelData.level} value={levelData.level}>
                          {levelData.levelName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="students">Aantal Leerlingen</Label>
                  <Input
                    id="students"
                    type="number"
                    min="1"
                    placeholder="Bijv. 25"
                    value={studentCount}
                    onChange={(e) => setStudentCount(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="assignment">Opdrachttekst</Label>
                <Textarea
                  id="assignment"
                  placeholder="Beschrijf de schrijfopdracht voor leerlingen..."
                  rows={6}
                  value={assignmentText}
                  onChange={(e) => setAssignmentText(e.target.value)}
                />
              </div>

              <Button onClick={handleAnalyze} className="w-full md:w-auto">
                <Sparkles className="w-4 h-4 mr-2" />
                Analyseer met AI
              </Button>
            </CardContent>
          </Card>

          {criteria.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Beoordelingscriteria</CardTitle>
                <CardDescription>
                  Selecteer criteria uit de masterlijst en AI-suggesties, of voeg eigen criteria toe
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  {criteria.map((criterion) => (
                    <div
                      key={criterion.id}
                      className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                    >
                      <Checkbox
                        id={criterion.id}
                        checked={criterion.selected}
                        onCheckedChange={() => toggleCriterion(criterion.id)}
                      />
                      <div className="flex-1 space-y-1">
                        <Label
                          htmlFor={criterion.id}
                          className="flex items-center gap-2 cursor-pointer"
                        >
                          {criterion.label}
                          {criterion.isAiSuggestion && (
                            <Badge variant="secondary" className="text-xs">
                              <Sparkles className="w-3 h-3 mr-1" />
                              AI Suggestie
                            </Badge>
                          )}
                          {criterion.isCustom && (
                            <Badge variant="outline" className="text-xs">
                              Eigen
                            </Badge>
                          )}
                        </Label>
                        <p className="text-sm text-muted-foreground">{criterion.description}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-4 border-t">
                  {showCustomInput ? (
                    <div className="flex gap-2">
                      <Input
                        placeholder="Eigen criterium toevoegen..."
                        value={customCriterion}
                        onChange={(e) => setCustomCriterion(e.target.value)}
                        onKeyPress={(e) => e.key === "Enter" && addCustomCriterion()}
                      />
                      <Button onClick={addCustomCriterion}>Toevoegen</Button>
                      <Button variant="ghost" onClick={() => setShowCustomInput(false)}>
                        Annuleren
                      </Button>
                    </div>
                  ) : (
                    <Button variant="outline" onClick={() => setShowCustomInput(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Voeg Eigen Criterium Toe
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {criteria.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Genereer Links</CardTitle>
                <CardDescription>Unieke start-links voor elke leerling</CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={generateLinks} className="w-full md:w-auto" size="lg">
                  Genereer {studentCount || "X"} Unieke Links
                </Button>
              </CardContent>
            </Card>
          )}

          {generatedLinks.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Gegenereerde Links</CardTitle>
                    <CardDescription>Deel deze unieke links met je leerlingen</CardDescription>
                  </div>
                  <Button variant="outline" onClick={copyAllLinks}>
                    Kopieer Alles
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {generatedLinks.map((link, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                    >
                      <span className="font-mono text-sm flex-1 truncate">{link}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => copyToClipboard(link, index)}
                      >
                        {copiedIndex === index ? (
                          <Check className="w-4 h-4 text-success" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default TeacherConfig;
