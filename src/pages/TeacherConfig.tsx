import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, Plus, Sparkles, Copy, Check, Settings } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { getGroupedCriteria, masterCriteria } from "@/data/masterCriteria";

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
  const [hasAiConfig, setHasAiConfig] = useState(false);
  const [level, setLevel] = useState<string>("");
  const [assignmentText, setAssignmentText] = useState("");
  const [studentCount, setStudentCount] = useState("");
  const [criteria, setCriteria] = useState<Criterion[]>([]);
  const [customCriterion, setCustomCriterion] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [generatedLinks, setGeneratedLinks] = useState<string[]>([]);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // Check if AI config exists
  useEffect(() => {
    const configStr = localStorage.getItem("ai_config");
    setHasAiConfig(!!configStr);
  }, []);

  const handleAnalyze = async () => {
    if (!level || !assignmentText) {
      toast.error("Selecteer een niveau en voer een opdrachttekst in");
      return;
    }

    if (!hasAiConfig) {
      toast.error("Configureer eerst je AI-instellingen om deze functie te gebruiken");
      navigate("/teacher/ai-setup");
      return;
    }

    // Simulate AI analysis - in production this would call the backend
    toast.success("AI analyseert de opdracht...");
    
    // Get grouped criteria for selected level
    const groupedCriteria = getGroupedCriteria(level);
    
    // Create criteria list with ALL criteria selected by default
    const allCriteria: Criterion[] = [];
    
    groupedCriteria.forEach(group => {
      group.categories.forEach(category => {
        category.criteria.forEach(criterion => {
          allCriteria.push({
            id: criterion.id,
            label: criterion.label,
            description: criterion.description,
            selected: true, // All criteria selected by default
            isAiSuggestion: false,
            isCustom: false,
          });
        });
      });
    });
    
    // Mock AI suggestions based on assignment text (also selected by default)
    const mockAiSuggestions: Criterion[] = [
      { id: "ai1", label: "Onderbouwing van standpunt", description: "Specifiek voor dit type opdracht", selected: true, isAiSuggestion: true },
      { id: "ai2", label: "Gebruik van voorbeelden", description: "Concrete voorbeelden ter ondersteuning", selected: true, isAiSuggestion: true },
    ];
    
    setCriteria([...allCriteria, ...mockAiSuggestions]);
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
      
      // Get AI config to include with assignment
      const aiConfigStr = localStorage.getItem("ai_config");
      const aiConfig = aiConfigStr ? JSON.parse(aiConfigStr) : null;
      
      // Store assignment data in localStorage for this code
      const assignmentData = {
        level,
        assignmentText,
        criteria: selectedCriteria.map(c => ({
          id: c.id,
          label: c.label,
          description: c.description,
          isAiSuggestion: c.isAiSuggestion,
          isCustom: c.isCustom
        })),
        // Include AI config so students can use AI features
        aiConfig: aiConfig
      };
      const key = `assignment_${code}`;
      console.log("TeacherConfig - Storing with key:", key);
      console.log("TeacherConfig - Assignment data:", assignmentData);
      localStorage.setItem(key, JSON.stringify(assignmentData));
      console.log("TeacherConfig - Verification - Data stored:", localStorage.getItem(key));
      
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
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/teacher/ai-setup")}
          >
            <Settings className="mr-2 h-4 w-4" />
            AI-instellingen
          </Button>
        </div>

        {/* AI Config Warning */}
        {!hasAiConfig && (
          <Alert className="border-yellow-500/50 bg-yellow-500/10">
            <AlertDescription className="flex items-center justify-between">
              <span>
                AI-functies zijn uitgeschakeld. Configureer je OpenRouter API-key om AI-feedback te gebruiken.
              </span>
              <Button
                size="sm"
                onClick={() => navigate("/teacher/ai-setup")}
              >
                Configureer nu
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <div>
            <h1 className="text-3xl font-bold">Opdracht Configuratie</h1>
            <p className="text-muted-foreground">Stel je schrijfopdracht samen met AI-ondersteuning</p>
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
                Maak de opdracht
              </Button>
            </CardContent>
          </Card>

          {criteria.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Beoordelingscriteria</CardTitle>
                <CardDescription>
                  Alle criteria zijn aangevinkt. Vink uit wat je niet wilt gebruiken. Voeg eigen criteria toe indien gewenst.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Group criteria by Inhoud, Vorm, Taal */}
                {(() => {
                  const grouped = getGroupedCriteria(level);
                  
                  return grouped.map(group => {
                    const groupCriteria = criteria.filter(c => 
                      !c.isAiSuggestion && !c.isCustom && 
                      group.categories.some(cat => 
                        cat.criteria.some(mc => mc.id === c.id)
                      )
                    );
                    
                    if (groupCriteria.length === 0) return null;
                    
                    return (
                      <div key={group.group} className="space-y-3">
                        <h3 className="text-lg font-semibold text-primary border-b pb-2">
                          {group.group}
                        </h3>
                        <div className="space-y-2 pl-2">
                          {groupCriteria.map((criterion) => (
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
                                  className="cursor-pointer font-medium"
                                >
                                  {criterion.label}
                                </Label>
                                <p className="text-sm text-muted-foreground">{criterion.description}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  });
                })()}

                {/* AI Suggestions Section */}
                {criteria.filter(c => c.isAiSuggestion).length > 0 && (
                  <div className="space-y-3 pt-4 border-t">
                    <h3 className="text-lg font-semibold text-primary flex items-center gap-2">
                      <Sparkles className="w-5 h-5" />
                      AI Suggesties
                    </h3>
                    <div className="space-y-2 pl-2">
                      {criteria.filter(c => c.isAiSuggestion).map((criterion) => (
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
                              className="flex items-center gap-2 cursor-pointer font-medium"
                            >
                              {criterion.label}
                              <Badge variant="secondary" className="text-xs">
                                AI
                              </Badge>
                            </Label>
                            <p className="text-sm text-muted-foreground">{criterion.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Custom Criteria Section */}
                {criteria.filter(c => c.isCustom).length > 0 && (
                  <div className="space-y-3 pt-4 border-t">
                    <h3 className="text-lg font-semibold text-primary">
                      Eigen Criteria
                    </h3>
                    <div className="space-y-2 pl-2">
                      {criteria.filter(c => c.isCustom).map((criterion) => (
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
                              className="flex items-center gap-2 cursor-pointer font-medium"
                            >
                              {criterion.label}
                              <Badge variant="outline" className="text-xs">
                                Eigen
                              </Badge>
                            </Label>
                            <p className="text-sm text-muted-foreground">{criterion.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Add Custom Criterion */}
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
                  {generatedLinks.map((link, index) => {
                    const code = link.split('/').pop() || '';
                    return (
                      <div
                        key={index}
                        className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex-1 space-y-1">
                          <a 
                            href={link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-mono text-sm block truncate text-primary hover:underline"
                          >
                            {link}
                          </a>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="font-mono text-xs">
                              Code: {code}
                            </Badge>
                          </div>
                        </div>
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
                    );
                  })}
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
