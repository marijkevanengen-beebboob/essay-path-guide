import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ArrowLeft, AlertTriangle, Sparkles, Download, CheckCircle, Shield, ChevronDown } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { RichTextEditor } from "@/components/RichTextEditor";

type AssignmentCriterion = {
  id: string;
  label: string;
  description: string;
  isAiSuggestion?: boolean;
  isCustom?: boolean;
};

type AssignmentData = {
  level: string;
  assignmentText: string;
  criteria: AssignmentCriterion[];
};

type FeedbackItem = {
  id: string;
  range: { start: number; end: number };
  color: string;
  type: "spelling" | "grammar" | "structure" | "content";
  hint: string;
  criterionLabel?: string;
  sentenceIndex?: number;
};

type ChecklistResult = {
  id: string;
  label: string;
  met: boolean;
  explanation: string;
};

const StudentWorkspace = () => {
  const navigate = useNavigate();
  const { code } = useParams<{ code: string }>();
  const [assignmentData, setAssignmentData] = useState<AssignmentData | null>(null);
  const [isInvalidCode, setIsInvalidCode] = useState(false);
  const [text, setText] = useState("");
  const [wordCount, setWordCount] = useState(0);
  const [feedbackTokens, setFeedbackTokens] = useState(3);
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [checklistResults, setChecklistResults] = useState<ChecklistResult[]>([]);
  const [previousFeedback, setPreviousFeedback] = useState<FeedbackItem[]>([]);
  const [activeFeedbackId, setActiveFeedbackId] = useState<string | null>(null);
  const [activeChecklistId, setActiveChecklistId] = useState<string | null>(null);
  const [checklistOpen, setChecklistOpen] = useState(true);
  const [showExitWarning, setShowExitWarning] = useState(true);
  const [hasDownloaded, setHasDownloaded] = useState(false);
  
  // PDF generation tracking states
  const [firstFeedbackVersion, setFirstFeedbackVersion] = useState<string>("");
  const [hasRequestedFeedbackOnce, setHasRequestedFeedbackOnce] = useState(false);
  const [copyPasteTriggered, setCopyPasteTriggered] = useState(false);

  const activeFeedback = feedback.find(f => f.id === activeFeedbackId) || null;

  useEffect(() => {
    console.log("StudentWorkspace - Code from URL:", code);
    console.log("StudentWorkspace - All localStorage keys:", Object.keys(localStorage));
    
    if (!code) {
      console.log("StudentWorkspace - No code provided");
      setIsInvalidCode(true);
      return;
    }
    
    const key = `assignment_${code}`;
    console.log("StudentWorkspace - Looking for key:", key);
    const storedData = localStorage.getItem(key);
    console.log("StudentWorkspace - Stored data:", storedData);
    
    if (storedData) {
      try {
        const parsedData = JSON.parse(storedData);
        console.log("StudentWorkspace - Parsed data:", parsedData);
        setAssignmentData(parsedData);
        setIsInvalidCode(false);
      } catch (error) {
        console.error("Error parsing assignment data:", error);
        setIsInvalidCode(true);
        toast.error("Ongeldige opdrachtdata");
      }
    } else {
      console.log("StudentWorkspace - No data found for key:", key);
      setIsInvalidCode(true);
      toast.error("Deze link is ongeldig of verlopen");
    }
  }, [code]);

  useEffect(() => {
    const words = text.trim().split(/\s+/).filter(Boolean).length;
    setWordCount(words);
  }, [text]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!hasDownloaded && text.trim()) {
        e.preventDefault();
        e.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasDownloaded, text]);

  const handleTextChange = (value: string) => {
    const words = value.trim().split(/\s+/).filter(Boolean).length;
    if (words <= 1000) {
      setText(value);
    } else {
      toast.error("Maximaal 1000 woorden bereikt");
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const pastedText = e.clipboardData.getData('text');
    const wordCount = pastedText.trim().split(/\s+/).filter(Boolean).length;
    
    if (wordCount > 50) {
      setCopyPasteTriggered(true);
      console.log('Large paste detected:', wordCount, 'words');
    }
  };

  const requestFeedback = async () => {
    if (feedbackTokens === 0) {
      toast.error("Geen feedback-kansen meer beschikbaar");
      return;
    }

    if (!text.trim()) {
      toast.error("Schrijf eerst wat tekst voordat je feedback vraagt");
      return;
    }

    if (!assignmentData || !assignmentData.criteria || assignmentData.criteria.length === 0) {
      toast.error("Er zijn geen beoordelingscriteria ingesteld door de docent");
      return;
    }

    // Track first feedback request for PDF
    if (!hasRequestedFeedbackOnce) {
      setFirstFeedbackVersion(text);
      setHasRequestedFeedbackOnce(true);
    }

    // Calculate current round (3 tokens = round 1, 2 tokens = round 2, 1 token = round 3)
    const currentRound = 4 - feedbackTokens;
    
    setFeedbackTokens((prev) => prev - 1);

    // Show loading state
    const loadingToast = toast.info(`AI analyseert je tekst... (Ronde ${currentRound}/3)`, {
      description: "Dit kan enkele seconden duren"
    });

    try {
      // Call the secure edge function
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          assignmentText: assignmentData.assignmentText,
          level: assignmentData.level,
          criteria: assignmentData.criteria,
          round: currentRound,
          previousFeedback: previousFeedback.map(f => ({
            sentenceIndex: f.sentenceIndex,
            criterionLabel: f.criterionLabel,
            hint: f.hint
          }))
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Fout bij ophalen van feedback');
      }

      const responseData = await response.json();

      // All rounds now return checklist results
      setChecklistResults(responseData.checklistResults || []);
      const newFeedback = responseData.feedbackItems || [];
      setFeedback(newFeedback);
      
      if (currentRound === 1) {
        setPreviousFeedback(newFeedback);
      } else {
        setPreviousFeedback([...previousFeedback, ...newFeedback]);
      }
      
      if (newFeedback.length === 0) {
        toast.info("Checklist bijgewerkt", {
          description: "De belangrijkste inhoudelijke punten zijn al benoemd"
        });
      } else {
        toast.success(`Checklist bijgewerkt + ${newFeedback.length} ${currentRound > 1 ? 'nieuwe ' : ''}feedbackpunten`, {
          description: "Klik op onderstreepte tekst om feedback te zien"
        });
      }

    } catch (error) {
      console.error('Error requesting feedback:', error);
      const errorMessage = error instanceof Error ? error.message : 'Onbekende fout';
      toast.error("Fout bij ophalen van feedback", {
        description: errorMessage
      });
      // Refund the token on error
      setFeedbackTokens((prev) => prev + 1);
    }
  };

  const dismissFeedback = (id: string) => {
    setFeedback(feedback.filter(f => f.id !== id));
  };

  const downloadPDF = async () => {
    if (!text.trim()) {
      toast.error("Er is geen tekst om te downloaden");
      return;
    }

    if (!assignmentData) {
      toast.error("Opdracht data niet beschikbaar");
      return;
    }

    toast.info("PDF wordt gegenereerd...", {
      description: "Dit kan een paar seconden duren"
    });

    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-pdf`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          assignmentData: {
            level: assignmentData.level,
            assignmentText: assignmentData.assignmentText,
            criteria: assignmentData.criteria
          },
          firstFeedbackVersion: firstFeedbackVersion || "",
          hasRequestedFeedbackOnce,
          copyPasteTriggered,
          finalText: text,
          code: code || "UNKNOWN"
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Fout bij genereren van PDF');
      }

      // Get the PDF blob
      const blob = await response.blob();
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `opdracht-${code}-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setHasDownloaded(true);
      toast.success("PDF succesvol gedownload!");

    } catch (error) {
      console.error('Error downloading PDF:', error);
      const errorMessage = error instanceof Error ? error.message : 'Onbekende fout';
      toast.error("Fout bij downloaden van PDF", {
        description: errorMessage
      });
    }
  };

  const wordProgress = (wordCount / 1000) * 100;

  if (isInvalidCode) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 p-4 md:p-8 flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Link ongeldig
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Deze link is ongeldig of verlopen. Vraag je docent om een nieuwe link.
            </p>
            <Button onClick={() => navigate("/")} className="w-full">
              Terug naar home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">Schrijfomgeving</h1>
              <p className="text-sm text-muted-foreground">Werken aan je opdracht</p>
            </div>
          </div>
          <Badge variant="outline" className="hidden md:flex">
            Code: {code?.toUpperCase() || 'ABC-123'}
          </Badge>
        </div>

        <Alert className="border-2 border-destructive/50 bg-destructive/5">
          <Shield className="h-5 w-5 text-destructive" />
          <AlertDescription className="space-y-2">
            <div className="font-semibold text-base text-destructive flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Privacy & AI-gebruik
            </div>
            <div className="text-sm space-y-1">
              <p>
                <strong>Belangrijk:</strong> Je tekst wordt geanalyseerd door een AI-systeem om je te helpen met feedback.
              </p>
              <p className="text-destructive font-medium">
                Deel NOOIT persoonlijke of privacy-gevoelige informatie zoals:
              </p>
              <ul className="list-disc list-inside ml-2 space-y-0.5 text-muted-foreground">
                <li>Telefoonnummers (bijv. 06-nummers)</li>
                <li>Adressen of postcodes</li>
                <li>Achternamen van jezelf of anderen</li>
                <li>E-mailadressen of gebruikersnamen</li>
                <li>Geboortedatums of BSN-nummers</li>
              </ul>
            </div>
          </AlertDescription>
        </Alert>

        {assignmentData && (
          <Card className="max-w-4xl mx-auto">
            <CardHeader>
              <CardTitle className="text-lg">Opdracht</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={assignmentData.assignmentText}
                readOnly
                className="min-h-[100px] resize-none bg-muted/50"
              />
            </CardContent>
          </Card>
        )}

        <div className="flex gap-6 items-start">
          {/* Left Column - Writing Area */}
          <div className="flex-1 space-y-4">
            <Card>
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">Woordenteller</span>
                      <Badge variant={wordCount > 900 ? "destructive" : "secondary"}>
                        {wordCount} / 1000
                      </Badge>
                    </div>
                    <Progress value={wordProgress} className="h-2" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium">
                      {feedbackTokens} feedback {feedbackTokens === 1 ? "kans" : "kansen"}
                    </span>
                  </div>
                </div>

                <RichTextEditor
                  placeholder="Begin hier met schrijven..."
                  value={text}
                  onChange={handleTextChange}
                  onPaste={handlePaste}
                  feedbackItems={feedback}
                  onFeedbackClick={setActiveFeedbackId}
                  activeFeedbackId={activeFeedbackId}
                />

                {checklistResults.length > 0 && (
                  <Collapsible open={checklistOpen} onOpenChange={setChecklistOpen}>
                    <Card className="border-2 border-primary/20 mt-4">
                      <CollapsibleTrigger className="w-full">
                        <CardHeader className="pb-3 cursor-pointer hover:bg-muted/50 transition-colors">
                          <CardTitle className="text-base flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <CheckCircle className="w-4 h-4" />
                              Checklist uit de opdracht
                            </div>
                            <ChevronDown className={`w-4 h-4 transition-transform ${checklistOpen ? 'rotate-180' : ''}`} />
                          </CardTitle>
                        </CardHeader>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <CardContent className="space-y-1">
                          {checklistResults.map((item) => (
                            <div key={item.id} className="group">
                              <div
                                className="flex items-center gap-2 py-1.5 px-2 rounded cursor-pointer hover:bg-muted/50 transition-colors"
                                onClick={() => setActiveChecklistId(activeChecklistId === item.id ? null : item.id)}
                                onMouseEnter={() => setActiveChecklistId(item.id)}
                                onMouseLeave={() => setActiveChecklistId(null)}
                              >
                                <div className="flex-shrink-0">
                                  {item.met ? (
                                    <CheckCircle className="w-4 h-4 text-green-600" />
                                  ) : (
                                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                                  )}
                                </div>
                                <p className="text-sm flex-1">
                                  {item.label}
                                </p>
                              </div>
                              {activeChecklistId === item.id && (
                                <p className="text-xs text-muted-foreground ml-6 px-2 py-1 bg-muted/30 rounded-sm mt-0.5 animate-in fade-in-50 slide-in-from-top-1 duration-200">
                                  {item.explanation}
                                </p>
                              )}
                            </div>
                          ))}
                        </CardContent>
                      </CollapsibleContent>
                    </Card>
                  </Collapsible>
                )}

                <div className="flex gap-2">
                  <Button
                    onClick={requestFeedback}
                    disabled={feedbackTokens === 0 || !text.trim()}
                    className="flex-1"
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    Vraag Feedback ({feedbackTokens === 0 ? "0 - Geen meer beschikbaar" : `${feedbackTokens}/3`})
                  </Button>
                  <Button
                    onClick={downloadPDF}
                    variant="outline"
                    className="flex-1"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download PDF
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Feedback Panel */}
          <div className="w-80 sticky top-4">
            {activeFeedback ? (
              <Card className="bg-card border shadow-md">
                <CardHeader>
                  <CardTitle className="text-sm flex items-center justify-between">
                    Feedback
                    <Badge variant="outline" className="text-xs capitalize">
                      {activeFeedback.type}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm leading-relaxed">
                    {activeFeedback.hint}
                  </p>
                  <div className="flex gap-2 justify-end">
                    <Button
                      size="sm"
                      onClick={() => {
                        setFeedback(prev => prev.filter(f => f.id !== activeFeedback.id));
                        setActiveFeedbackId(null);
                        toast.success("Feedback geaccepteerd");
                      }}
                    >
                      Accepteren
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setFeedback(prev => prev.filter(f => f.id !== activeFeedback.id));
                        setActiveFeedbackId(null);
                        toast.message("Feedback genegeerd");
                      }}
                    >
                      Negeren
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : feedback.length > 0 ? (
              <Card className="bg-muted/30 border-dashed">
                <CardContent className="p-6 text-center text-sm text-muted-foreground">
                  <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>Klik op een onderstreept stuk tekst om de feedback te zien</p>
                </CardContent>
              </Card>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentWorkspace;
